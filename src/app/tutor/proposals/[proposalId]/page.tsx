"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";

interface Proposal {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  courseCode: string;
  facultyInitial: string;
  problemTopics: string;
  description: string;
  budget: number;
  estimatedHours: number;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  university: string;
  status: string;
}

interface ExistingApplication {
  id: string;
  description: string;
  estimatedHours: number;
  payment: number;
  paymentId: string;
  paymentStatus: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
}

interface ApplicationForm {
  description: string;
  estimatedHours: string;
  payment: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
}

const initialForm: ApplicationForm = {
  description: "",
  estimatedHours: "1",
  payment: "",
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
};

export default function TutorProposalDetailsPage() {
  const router = useRouter();

  const params = useParams<{
    proposalId: string;
  }>();

  const proposalId =
    params.proposalId;

  const [currentTutorId, setCurrentTutorId] =
    useState("");

  /*
   * Only admin-approved courses.
   */
  const [
    approvedCourseCodes,
    setApprovedCourseCodes,
  ] = useState<string[]>([]);

  const [profileLoaded, setProfileLoaded] =
    useState(false);

  const [proposalLoaded, setProposalLoaded] =
    useState(false);

  const [proposal, setProposal] =
    useState<Proposal | null>(null);

  const [
    existingApplication,
    setExistingApplication,
  ] =
    useState<ExistingApplication | null>(
      null
    );

  const [form, setForm] =
    useState<ApplicationForm>(
      initialForm
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let unsubscribeProfile:
      | (() => void)
      | undefined;

    let unsubscribeProposal:
      | (() => void)
      | undefined;

    let unsubscribeApplications:
      | (() => void)
      | undefined;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.replace(
              "/login"
            );
            return;
          }

          setCurrentTutorId(
            user.uid
          );

          /*
           * ======================================
           * TUTOR PROFILE
           * ======================================
           *
           * Read only:
           * courseCodesToTeach
           *
           * Do NOT use:
           * courses
           * requestedCourseCodes
           */
          unsubscribeProfile =
            onSnapshot(
              doc(
                firestore,
                "users",
                user.uid
              ),
              (snapshot) => {
                if (
                  !snapshot.exists()
                ) {
                  router.replace(
                    "/login"
                  );
                  return;
                }

                const profile =
                  snapshot.data();

                const roles =
                  Array.isArray(
                    profile.roles
                  )
                    ? profile.roles.map(
                        (
                          role: unknown
                        ) =>
                          String(
                            role
                          )
                      )
                    : [];

                const tutorStatus =
                  String(
                    profile.tutorStatus ??
                      ""
                  )
                    .trim()
                    .toLowerCase();

                /*
                 * Must be an approved tutor.
                 */
                if (
                  !roles.includes(
                    "tutor"
                  ) ||
                  tutorStatus !==
                    "approved"
                ) {
                  router.replace(
                    "/student/dashboard"
                  );
                  return;
                }

                let approvedCourses: string[] =
                  [];

                if (
                  Array.isArray(
                    profile.courseCodesToTeach
                  )
                ) {
                  approvedCourses =
                    profile.courseCodesToTeach
                      .map(
                        (
                          course: unknown
                        ) =>
                          normalizeCourseCode(
                            String(
                              course
                            )
                          )
                      )
                      .filter(
                        Boolean
                      );
                } else if (
                  typeof profile.courseCodesToTeach ===
                  "string"
                ) {
                  approvedCourses =
                    profile.courseCodesToTeach
                      .split(",")
                      .map(
                        (
                          course: string
                        ) =>
                          normalizeCourseCode(
                            course
                          )
                      )
                      .filter(
                        Boolean
                      );
                }

                approvedCourses =
                  Array.from(
                    new Set(
                      approvedCourses
                    )
                  );

                setApprovedCourseCodes(
                  approvedCourses
                );

                setProfileLoaded(
                  true
                );
              },
              (profileError) => {
                console.error(
                  "Tutor verification error:",
                  profileError
                );

                setError(
                  "Unable to verify your tutor account."
                );

                setProfileLoaded(
                  true
                );
              }
            );

          /*
           * ======================================
           * PROPOSAL
           * ======================================
           */
          const proposalReference =
            doc(
              firestore,
              "proposals",
              proposalId
            );

          unsubscribeProposal =
            onSnapshot(
              proposalReference,
              (snapshot) => {
                if (
                  !snapshot.exists()
                ) {
                  setProposal(
                    null
                  );

                  setError(
                    "This proposal could not be found."
                  );

                  setProposalLoaded(
                    true
                  );

                  return;
                }

                const data =
                  snapshot.data();

                /*
                 * Tutor cannot apply to their own
                 * student proposal.
                 */
                if (
                  data.studentId ===
                  user.uid
                ) {
                  setProposal(
                    null
                  );

                  setError(
                    "You cannot apply to your own student proposal."
                  );

                  setProposalLoaded(
                    true
                  );

                  return;
                }

                const loadedProposal: Proposal =
                  {
                    id:
                      snapshot.id,

                    studentId:
                      data.studentId ??
                      "",

                    studentName:
                      data.studentName ??
                      "Student",

                    title:
                      data.title ??
                      "Untitled proposal",

                    courseCode:
                      String(
                        data.courseCode ??
                          ""
                      ),

                    facultyInitial:
                      data.facultyInitial ??
                      "",

                    problemTopics:
                      data.problemTopics ??
                      "",

                    description:
                      data.description ??
                      "",

                    budget:
                      Number(
                        data.budget ??
                          0
                      ),

                    estimatedHours:
                      Number(
                        data.estimatedHours ??
                          0
                      ),

                    dateFrom:
                      data.dateFrom ??
                      "",

                    dateTo:
                      data.dateTo ??
                      "",

                    timeFrom:
                      data.timeFrom ??
                      "",

                    timeTo:
                      data.timeTo ??
                      "",

                    university:
                      data.university ??
                      "",

                    status:
                      data.status ??
                      "unknown",
                  };

                setProposal(
                  loadedProposal
                );

                setForm(
                  (
                    currentForm
                  ) => ({
                    ...currentForm,

                    estimatedHours:
                      currentForm.estimatedHours ===
                      "1"
                        ? String(
                            loadedProposal.estimatedHours ||
                              1
                          )
                        : currentForm.estimatedHours,

                    payment:
                      currentForm.payment ||
                      String(
                        loadedProposal.budget ||
                          ""
                      ),

                    dateFrom:
                      currentForm.dateFrom ||
                      loadedProposal.dateFrom,

                    dateTo:
                      currentForm.dateTo ||
                      loadedProposal.dateTo,

                    timeFrom:
                      currentForm.timeFrom ||
                      loadedProposal.timeFrom,

                    timeTo:
                      currentForm.timeTo ||
                      loadedProposal.timeTo,
                  })
                );

                setProposalLoaded(
                  true
                );
              },
              (
                proposalError
              ) => {
                console.error(
                  "Proposal loading error:",
                  proposalError
                );

                setError(
                  "Unable to load the proposal."
                );

                setProposalLoaded(
                  true
                );
              }
            );

          /*
           * ======================================
           * EXISTING APPLICATION
           * ======================================
           */
          const applicationsQuery =
            query(
              collection(
                firestore,
                "jobProposals"
              ),
              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribeApplications =
            onSnapshot(
              applicationsQuery,
              (snapshot) => {
                const matchingDocument =
                  snapshot.docs.find(
                    (
                      applicationDocument
                    ) =>
                      applicationDocument.data()
                        .proposalId ===
                      proposalId
                  );

                if (
                  !matchingDocument
                ) {
                  setExistingApplication(
                    null
                  );

                  return;
                }

                const data =
                  matchingDocument.data();

                setExistingApplication(
                  {
                    id:
                      matchingDocument.id,

                    description:
                      data.description ??
                      "",

                    estimatedHours:
                      Number(
                        data.estimatedHours ??
                          0
                      ),

                    payment:
                      Number(
                        data.payment ??
                          0
                      ),

                    paymentId:
                      data.paymentId ??
                      "",

                    paymentStatus:
                      data.paymentStatus ??
                      "pending",

                    status:
                      data.status ??
                      "applied",

                    dateFrom:
                      data.dateFrom ??
                      "",

                    dateTo:
                      data.dateTo ??
                      "",

                    timeFrom:
                      data.timeFrom ??
                      "",

                    timeTo:
                      data.timeTo ??
                      "",
                  }
                );
              },
              (
                applicationError
              ) => {
                console.error(
                  "Application checking error:",
                  applicationError
                );
              }
            );
        }
      );

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
      unsubscribeProposal?.();
      unsubscribeApplications?.();
    };
  }, [
    proposalId,
    router,
  ]);

  /*
   * ==========================================
   * CHECK WHETHER THIS COURSE IS APPROVED
   * ==========================================
   */
  const courseAllowed =
    useMemo(() => {
      if (!proposal) {
        return false;
      }

      const proposalCourse =
        normalizeCourseCode(
          proposal.courseCode
        );

      return approvedCourseCodes.includes(
        proposalCourse
      );
    }, [
      proposal,
      approvedCourseCodes,
    ]);

  const loading =
    !profileLoaded ||
    !proposalLoaded;

  function updateField(
    field:
      keyof ApplicationForm,
    value: string
  ) {
    setForm(
      (
        currentForm
      ) => ({
        ...currentForm,
        [field]: value,
      })
    );
  }

  async function handleApply(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /*
     * IMPORTANT:
     * Check permission again before
     * creating the application.
     */
    if (!courseAllowed) {
      setError(
        "You are not approved to teach this course."
      );

      return;
    }

    if (
      !proposal ||
      !currentTutorId ||
      existingApplication
    ) {
      return;
    }

    const estimatedHours =
      Number(
        form.estimatedHours
      );

    const payment =
      Number(
        form.payment
      );

    if (
      form.description
        .trim()
        .length < 10
    ) {
      setError(
        "Please write at least 10 characters explaining how you can help."
      );

      return;
    }

    if (
      !Number.isFinite(
        estimatedHours
      ) ||
      estimatedHours <= 0
    ) {
      setError(
        "Estimated hours must be greater than zero."
      );

      return;
    }

    if (
      !Number.isFinite(
        payment
      ) ||
      payment <= 0
    ) {
      setError(
        "Requested payment must be greater than zero."
      );

      return;
    }

    if (
      proposal.budget >
        0 &&
      payment >
        proposal.budget
    ) {
      setError(
        `Requested payment cannot exceed the student budget of ৳${proposal.budget}.`
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      /*
       * Check the tutor profile one more
       * time before writing.
       *
       * This protects against the admin
       * removing the course while this page
       * is open.
       */
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        router.replace(
          "/login"
        );
        return;
      }

      const applicationReference =
        doc(
          collection(
            firestore,
            "jobProposals"
          )
        );

      const proposalReference =
        doc(
          firestore,
          "proposals",
          proposal.id
        );

      const batch =
        writeBatch(
          firestore
        );

      batch.set(
        applicationReference,
        {
          proposalId:
            proposal.id,

          studentId:
            proposal.studentId,

          tutorId:
            currentTutorId,

          courseCode:
            normalizeCourseCode(
              proposal.courseCode
            ),

          description:
            form.description.trim(),

          estimatedHours,

          payment,

          dateFrom:
            form.dateFrom.trim(),

          dateTo:
            form.dateTo.trim(),

          timeFrom:
            form.timeFrom.trim(),

          timeTo:
            form.timeTo.trim(),

          status:
            "applied",

          paymentId:
            "",

          paymentStatus:
            "pending",

          appliedAt:
            serverTimestamp(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      batch.update(
        proposalReference,
        {
          willingToTeach:
            increment(1),

          updatedAt:
            serverTimestamp(),
        }
      );

      await batch.commit();

    } catch (
      applicationError
    ) {
      console.error(
        "Tutor application error:",
        applicationError
      );

      setError(
        "Unable to submit your application. Check your connection and Firebase permissions."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <p className="text-slate-600">
          Loading proposal...
        </p>

      </main>
    );
  }

  /*
   * ==========================================
   * PROPOSAL NOT AVAILABLE
   * ==========================================
   */
  if (
    error &&
    !proposal
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-2xl font-bold text-red-600">
            Proposal unavailable
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <Link
            href="/tutor/proposals"
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white"
          >
            Return to proposals
          </Link>

        </div>

      </main>
    );
  }

  if (!proposal) {
    return null;
  }

  /*
   * ==========================================
   * WRONG COURSE
   * ==========================================
   *
   * Example:
   *
   * Tutor approved:
   * ["CSE115"]
   *
   * URL:
   * /tutor/proposals/ENG111-PROPOSAL
   *
   * Result:
   * BLOCKED
   */
  if (!courseAllowed) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b border-slate-200 bg-white">

          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

            <Link
              href="/tutor/dashboard"
              className="text-2xl font-bold text-emerald-600"
            >
              Unitor Tutor
            </Link>

            <Link
              href="/tutor/proposals"
              className="font-medium text-slate-600 hover:text-emerald-600"
            >
              ← Available proposals
            </Link>

          </div>

        </header>

        <div className="mx-auto max-w-xl px-6 py-20">

          <section className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Proposal not available
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              This proposal is for{" "}
              <span className="font-bold text-slate-900">
                {proposal.courseCode}
              </span>
              , but this course is not included in your
              administrator-approved teaching courses.
            </p>

            <div className="mt-5 rounded-xl bg-emerald-50 p-4">

              <p className="text-sm font-semibold text-emerald-700">
                Your approved courses
              </p>

              <p className="mt-2 font-bold text-emerald-800">
                {approvedCourseCodes.length >
                0
                  ? approvedCourseCodes.join(
                      ", "
                    )
                  : "No courses assigned"}
              </p>

            </div>

            <Link
              href="/tutor/proposals"
              className="mt-7 inline-flex rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              View my available proposals
            </Link>

          </section>

        </div>

      </main>
    );
  }

  const proposalStatus =
    proposal.status
      .trim()
      .toLowerCase();

  const proposalAvailable =
    proposalStatus ===
      "open" ||
    proposalStatus ===
      "active" ||
    proposalStatus ===
      "available" ||
    proposalStatus ===
      "pending";

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor Tutor
          </Link>

          <Link
            href="/tutor/proposals"
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Available proposals
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* PROPOSAL */}

        <section className="rounded-2xl bg-white p-8 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <p className="font-semibold text-emerald-600">
                {proposal.courseCode}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {proposal.title}
              </h1>

              <p className="mt-3 text-slate-500">
                Posted by{" "}
                {proposal.studentName}
              </p>

            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                proposalAvailable
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {proposal.status}
            </span>

          </div>

          <div className="mt-8 border-t border-slate-100 pt-8">

            <h2 className="text-xl font-bold text-slate-900">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
              {proposal.description ||
                "No description provided."}
            </p>

          </div>

          <div className="mt-7 rounded-xl bg-slate-50 p-6">

            <p className="text-sm text-slate-500">
              Problem topics
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {proposal.problemTopics ||
                "Not provided"}
            </p>

          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <InformationItem
              label="Budget"
              value={`৳${proposal.budget}`}
            />

            <InformationItem
              label="Estimated hours"
              value={`${proposal.estimatedHours}`}
            />

            <InformationItem
              label="Date"
              value={
                proposal.dateFrom ===
                proposal.dateTo
                  ? proposal.dateFrom
                  : `${proposal.dateFrom} – ${proposal.dateTo}`
              }
            />

            <InformationItem
              label="Time"
              value={`${proposal.timeFrom} – ${proposal.timeTo}`}
            />

          </div>

        </section>

        {/* EXISTING APPLICATION */}

        {existingApplication ? (
          <ExistingApplicationCard
            application={
              existingApplication
            }
          />
        ) : proposalAvailable ? (

          /* APPLICATION FORM */

          <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold text-slate-900">
              Apply to this proposal
            </h2>

            <p className="mt-2 text-slate-600">
              Explain how you can help and confirm your proposed
              schedule and payment.
            </p>

            {error && (
              <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                {error}
              </p>
            )}

            <form
              onSubmit={
                handleApply
              }
              className="mt-7"
            >

              <div>

                <label
                  htmlFor="description"
                  className="mb-2 block font-medium text-slate-700"
                >
                  Application message
                </label>

                <textarea
                  id="description"
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={5}
                  required
                  placeholder="Explain your experience with this course and how you can help."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">

                <FormInput
                  label="Estimated hours"
                  type="number"
                  value={
                    form.estimatedHours
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "estimatedHours",
                      value
                    )
                  }
                />

                <FormInput
                  label="Requested payment (BDT)"
                  type="number"
                  value={
                    form.payment
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "payment",
                      value
                    )
                  }
                />

                <FormInput
                  label="Starting date"
                  value={
                    form.dateFrom
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "dateFrom",
                      value
                    )
                  }
                />

                <FormInput
                  label="Ending date"
                  value={
                    form.dateTo
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "dateTo",
                      value
                    )
                  }
                />

                <FormInput
                  label="Starting time"
                  value={
                    form.timeFrom
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "timeFrom",
                      value
                    )
                  }
                />

                <FormInput
                  label="Ending time"
                  value={
                    form.timeTo
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "timeTo",
                      value
                    )
                  }
                />

              </div>

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="mt-8 w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting application..."
                  : "Submit Application"}
              </button>

            </form>

          </section>

        ) : (

          <section className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">

            <h2 className="text-xl font-bold text-slate-900">
              Applications are closed
            </h2>

            <p className="mt-3 text-slate-600">
              This proposal is no longer accepting tutor
              applications.
            </p>

          </section>

        )}

      </div>

    </main>
  );
}

function ExistingApplicationCard({
  application,
}: {
  application:
    ExistingApplication;
}) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-5">

        <div>

          <p className="font-semibold text-emerald-600">
            Application submitted
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Your Application
          </h2>

        </div>

        <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold capitalize text-amber-700">
          {application.status}
        </span>

      </div>

      <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-600">
        {application.description}
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

        <InformationItem
          label="Requested payment"
          value={`৳${application.payment}`}
        />

        <InformationItem
          label="Estimated hours"
          value={`${application.estimatedHours}`}
        />

        <InformationItem
          label="Date"
          value={
            application.dateFrom ===
            application.dateTo
              ? application.dateFrom
              : `${application.dateFrom} – ${application.dateTo}`
          }
        />

        <InformationItem
          label="Payment status"
          value={
            application.paymentStatus
          }
        />

      </div>

      <Link
        href="/tutor/applications"
        className="mt-7 block rounded-lg border border-emerald-600 px-5 py-3 text-center font-semibold text-emerald-600 hover:bg-emerald-50"
      >
        View All Applications
      </Link>

    </section>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange:
    (value: string) =>
      void;
  type?: string;
}) {
  return (
    <div>

      <label className="mb-2 block font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={
          type === "number"
            ? "1"
            : undefined
        }
        required
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />

    </div>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold capitalize text-slate-900">
        {value ||
          "Not provided"}
      </p>

    </div>
  );
}

function normalizeCourseCode(
  courseCode: string
) {
  return courseCode
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}