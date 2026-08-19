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

  const proposalId = params.proposalId;

  const [currentTutorId, setCurrentTutorId] =
    useState("");

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
  ] = useState<ExistingApplication | null>(
    null
  );

  const [
    invitationDocumentId,
    setInvitationDocumentId,
  ] = useState("");

  const [
    editingApplication,
    setEditingApplication,
  ] = useState(false);

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
           * ========================================
           * TUTOR PROFILE
           * ========================================
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
              (
                profileError
              ) => {
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
           * ========================================
           * PROPOSAL
           * ========================================
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
           * ========================================
           * JOB PROPOSALS / APPLICATIONS
           * ========================================
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
                const proposalApplications =
                  snapshot.docs.filter(
                    (
                      applicationDocument
                    ) =>
                      applicationDocument.data()
                        .proposalId ===
                      proposalId
                  );

                /*
                 * Invitation only
                 */
                const invitationDocument =
                  proposalApplications.find(
                    (
                      applicationDocument
                    ) =>
                      normalizeStatus(
                        applicationDocument.data()
                          .status
                      ) ===
                      "invited"
                  );

                if (
                  invitationDocument
                ) {
                  setInvitationDocumentId(
                    invitationDocument.id
                  );
                } else {
                  setInvitationDocumentId(
                    ""
                  );
                }

                /*
                 * Real submitted application
                 *
                 * invited is NOT considered submitted.
                 */
                const submittedDocument =
                  proposalApplications.find(
                    (
                      applicationDocument
                    ) => {
                      const status =
                        normalizeStatus(
                          applicationDocument.data()
                            .status
                        );

                      return (
                        status !==
                        "invited"
                      );
                    }
                  );

                if (
                  !submittedDocument
                ) {
                  setExistingApplication(
                    null
                  );

                  return;
                }

                const data =
                  submittedDocument.data();

                setExistingApplication(
                  {
                    id:
                      submittedDocument.id,

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
   * ========================================
   * CHECK COURSE PERMISSION
   * ========================================
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

  /*
   * ========================================
   * OPEN EDIT MODE
   * ========================================
   */
  function startEditingApplication() {
    if (
      !existingApplication
    ) {
      return;
    }

    const status =
      normalizeStatus(
        existingApplication.status
      );

    if (
      status !== "applied" &&
      status !== "pending"
    ) {
      setError(
        "This application can no longer be edited."
      );

      return;
    }

    setForm({
      description:
        existingApplication.description,

      estimatedHours:
        String(
          existingApplication.estimatedHours ||
            1
        ),

      payment:
        String(
          existingApplication.payment ||
            ""
        ),

      dateFrom:
        existingApplication.dateFrom,

      dateTo:
        existingApplication.dateTo,

      timeFrom:
        existingApplication.timeFrom,

      timeTo:
        existingApplication.timeTo,
    });

    setError("");

    setEditingApplication(
      true
    );
  }

  /*
   * ========================================
   * SUBMIT NEW APPLICATION
   * ========================================
   */
  async function handleApply(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!courseAllowed) {
      setError(
        "You are not approved to teach this course."
      );

      return;
    }

    if (
      !proposal ||
      !currentTutorId
    ) {
      return;
    }

    if (
      existingApplication
    ) {
      setError(
        "You have already applied to this proposal."
      );

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

    /*
     * NO MAXIMUM-BUDGET RESTRICTION.
     *
     * Tutor can request more than the student's budget.
     * Student decides whether to accept.
     */

    setSubmitting(true);
    setError("");

    try {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        router.replace(
          "/login"
        );

        return;
      }

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

      /*
       * INVITED TUTOR:
       * update invitation document.
       */
      if (
        invitationDocumentId
      ) {
        const invitationReference =
          doc(
            firestore,
            "jobProposals",
            invitationDocumentId
          );

        batch.update(
          invitationReference,
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

            updatedAt:
              serverTimestamp(),
          }
        );
      } else {
        /*
         * NORMAL APPLICATION:
         * create new jobProposal.
         */
        const applicationReference =
          doc(
            collection(
              firestore,
              "jobProposals"
            )
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
      }

      /*
       * Increase number of tutors
       * who actually applied.
       */
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
   * ========================================
   * UPDATE EXISTING APPLICATION
   * ========================================
   */
  async function handleUpdateApplication(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !existingApplication ||
      !proposal ||
      !courseAllowed
    ) {
      return;
    }

    const status =
      normalizeStatus(
        existingApplication.status
      );

    /*
     * Tutor can edit only while waiting.
     */
    if (
      status !== "applied" &&
      status !== "pending"
    ) {
      setError(
        "This application can no longer be edited because the student has already made a decision."
      );

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

    setSubmitting(true);
    setError("");

    try {
      const applicationReference =
        doc(
          firestore,
          "jobProposals",
          existingApplication.id
        );

      const batch =
        writeBatch(
          firestore
        );

      batch.update(
        applicationReference,
        {
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

          updatedAt:
            serverTimestamp(),
        }
      );

      await batch.commit();

      setEditingApplication(
        false
      );

    } catch (
      updateError
    ) {
      console.error(
        "Application update error:",
        updateError
      );

      setError(
        "Unable to update your application."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ========================================
   * LOADING
   * ========================================
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">

        <p className="text-unitor-gray-dark">
          Loading proposal...
        </p>

      </main>
    );
  }

  /*
   * ========================================
   * PROPOSAL ERROR
   * ========================================
   */
  if (
    error &&
    !proposal
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">

        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-2xl font-bold text-red-600">
            Proposal unavailable
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            {error}
          </p>

          <Link
            href="/tutor/proposals"
            className="mt-6 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white"
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
   * ========================================
   * WRONG COURSE
   * ========================================
   */
  if (!courseAllowed) {
    return (
      <main className="min-h-screen bg-unitor-background">

        <header className="border-b border-unitor-gray-light bg-white">

          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

            <Link
              href="/tutor/dashboard"
              className="text-2xl font-bold text-unitor-primary"
            >
              Unitor Tutor
            </Link>

            <Link
              href="/tutor/proposals"
              className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
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

            <h1 className="mt-5 text-2xl font-bold text-unitor-black">
              Proposal not available
            </h1>

            <p className="mt-4 leading-7 text-unitor-gray-dark">
              This proposal is for{" "}
              <span className="font-bold text-unitor-black">
                {proposal.courseCode}
              </span>
              , but this course is not included in your
              approved teaching courses.
            </p>

            <div className="mt-5 rounded-xl bg-unitor-background p-4">

              <p className="text-sm font-medium text-unitor-primary-hover">
                Your approved courses
              </p>

              <p className="mt-2 font-bold text-unitor-black">
                {approvedCourseCodes.length > 0
                  ? approvedCourseCodes.join(
                      ", "
                    )
                  : "No courses assigned"}
              </p>

            </div>

            <Link
              href="/tutor/proposals"
              className="mt-7 inline-flex rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
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
    <main className="min-h-screen bg-unitor-background">

      {/* HEADER */}

      <header className="border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor Tutor
          </Link>

          <Link
            href="/tutor/proposals"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Available proposals
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* PROPOSAL DETAILS */}

        <section className="rounded-2xl bg-white p-8 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <p className="font-medium text-unitor-primary">
                {proposal.courseCode}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-unitor-black">
                {proposal.title}
              </h1>

              <p className="mt-3 text-unitor-gray-dark">
                Posted by{" "}
                {proposal.studentName}
              </p>

            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                proposalAvailable
                  ? "bg-unitor-background text-unitor-primary-hover"
                  : "bg-unitor-gray-soft text-unitor-gray-dark"
              }`}
            >
              {proposal.status}
            </span>

          </div>

          <div className="mt-8 border-t border-unitor-gray-soft pt-8">

            <h2 className="text-xl font-bold text-unitor-black">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
              {proposal.description ||
                "No description provided."}
            </p>

          </div>

          <div className="mt-7 rounded-xl bg-unitor-background p-6">

            <p className="text-sm text-unitor-gray-dark">
              Problem topics
            </p>

            <p className="mt-2 font-medium text-unitor-black">
              {proposal.problemTopics ||
                "Not provided"}
            </p>

          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <InformationItem
              label="Student budget"
              value={`৳${proposal.budget}`}
            />

            <InformationItem
              label="Estimated hours"
              value={`${proposal.estimatedHours}`}
            />

            <InformationItem
              label="Date"
              value={
                formatRange(
                  proposal.dateFrom,
                  proposal.dateTo
                )
              }
            />

            <InformationItem
              label="Time"
              value={
                formatRange(
                  proposal.timeFrom,
                  proposal.timeTo
                )
              }
            />

          </div>

        </section>

        {/* INVITATION NOTICE */}

        {!existingApplication &&
          invitationDocumentId &&
          proposalAvailable && (

            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">

              <p className="font-bold text-amber-800">
                You were invited to this proposal
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-700">
                The student invited you to help with this course.
                Complete the application below if you want to
                accept the opportunity.
              </p>

            </section>
          )}

        {/* EXISTING APPLICATION */}

        {existingApplication ? (

          editingApplication ? (

            <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

              <div className="flex flex-wrap items-start justify-between gap-4">

                <div>

                  <p className="font-medium text-unitor-primary">
                    Application submitted
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-unitor-black">
                    Edit Application
                  </h2>

                  <p className="mt-2 text-unitor-gray-dark">
                    You can update your offer until the student
                    selects you.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingApplication(
                      false
                    );

                    setError("");
                  }}
                  className="rounded-lg border border-unitor-gray-light px-4 py-2 font-medium text-unitor-gray-dark hover:bg-unitor-background"
                >
                  Cancel
                </button>

              </div>

              <div className="mt-6 rounded-xl bg-unitor-background p-5">

                <p className="text-sm text-unitor-primary-hover">
                  Student&apos;s original budget
                </p>

                <p className="mt-1 text-2xl font-bold text-unitor-black">
                  ৳{proposal.budget}
                </p>

                <p className="mt-2 text-sm leading-6 text-unitor-primary-hover">
                  You may request a lower or higher amount.
                  The student will decide whether to accept
                  your offer.
                </p>

              </div>

              {error && (
                <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                  {error}
                </p>
              )}

              <form
                onSubmit={
                  handleUpdateApplication
                }
                className="mt-7"
              >

                <ApplicationFormFields
                  form={form}
                  updateField={
                    updateField
                  }
                />

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="mt-8 w-full rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Saving changes..."
                    : "Save Changes"}
                </button>

              </form>

            </section>

          ) : (

            <ExistingApplicationCard
              application={
                existingApplication
              }
              onEdit={
                startEditingApplication
              }
            />

          )

        ) : proposalAvailable ? (

          /* NEW APPLICATION FORM */

          <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold text-unitor-black">
              {invitationDocumentId
                ? "Respond to invitation"
                : "Apply to this proposal"}
            </h2>

            <p className="mt-2 text-unitor-gray-dark">
              Explain how you can help and confirm your proposed
              schedule and payment.
            </p>

            <div className="mt-6 rounded-xl bg-unitor-background p-5">

              <p className="text-sm text-unitor-primary-hover">
                Student&apos;s budget
              </p>

              <p className="mt-1 text-2xl font-bold text-unitor-black">
                ৳{proposal.budget}
              </p>

              <p className="mt-2 text-sm leading-6 text-unitor-primary-hover">
                You can request a different amount, including
                more than the student&apos;s original budget.
                The student can then decide whether to accept.
              </p>

            </div>

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

              <ApplicationFormFields
                form={form}
                updateField={
                  updateField
                }
              />

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="mt-8 w-full rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting application..."
                  : invitationDocumentId
                    ? "Accept & Submit Application"
                    : "Submit Application"}
              </button>

            </form>

          </section>

        ) : (

          <section className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">

            <h2 className="text-xl font-bold text-unitor-black">
              Applications are closed
            </h2>

            <p className="mt-3 text-unitor-gray-dark">
              This proposal is no longer accepting tutor
              applications.
            </p>

          </section>
        )}

      </div>

    </main>
  );
}

function ApplicationFormFields({
  form,
  updateField,
}: {
  form: ApplicationForm;

  updateField: (
    field: keyof ApplicationForm,
    value: string
  ) => void;
}) {
  return (
    <>

      <div>

        <label
          htmlFor="description"
          className="mb-2 block font-medium text-unitor-gray-dark"
        >
          Application message
        </label>

        <textarea
          id="description"
          value={
            form.description
          }
          onChange={(event) =>
            updateField(
              "description",
              event.target.value
            )
          }
          rows={5}
          required
          placeholder="Explain your experience with this course and how you can help."
          className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
        />

      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">

        <FormInput
          label="Estimated hours"
          type="number"
          value={
            form.estimatedHours
          }
          onChange={(value) =>
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
          onChange={(value) =>
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
          onChange={(value) =>
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
          onChange={(value) =>
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
          onChange={(value) =>
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
          onChange={(value) =>
            updateField(
              "timeTo",
              value
            )
          }
        />

      </div>

    </>
  );
}

function ExistingApplicationCard({
  application,
  onEdit,
}: {
  application:
    ExistingApplication;

  onEdit:
    () => void;
}) {
  const status =
    normalizeStatus(
      application.status
    );

  const canEdit =
    status ===
      "applied" ||
    status ===
      "pending";

  return (
    <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-5">

        <div>

          <p className="font-medium text-unitor-primary">
            Application submitted
          </p>

          <h2 className="mt-2 text-2xl font-bold text-unitor-black">
            Your Application
          </h2>

        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
            canEdit
              ? "bg-amber-50 text-amber-700"
              : "bg-unitor-background text-unitor-primary-hover"
          }`}
        >
          {application.status}
        </span>

      </div>

      <p className="mt-6 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
        {application.description ||
          "No application message."}
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
            formatRange(
              application.dateFrom,
              application.dateTo
            )
          }
        />

        <InformationItem
          label="Payment status"
          value={
            application.paymentStatus
          }
        />

      </div>

      {canEdit && (

        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">

          <p className="font-medium text-amber-800">
            Waiting for student selection
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            You can edit your requested payment, schedule and
            application message until the student selects you.
          </p>

        </div>

      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">

        {canEdit && (

          <button
            type="button"
            onClick={
              onEdit
            }
            className="flex-1 rounded-lg bg-unitor-primary px-5 py-3 text-center font-medium text-white hover:bg-unitor-primary-hover"
          >
            Edit Application
          </button>

        )}

        <Link
          href="/tutor/applications"
          className="flex-1 rounded-lg border border-unitor-primary px-5 py-3 text-center font-medium text-unitor-primary hover:bg-unitor-background"
        >
          View All Applications
        </Link>

      </div>

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

      <label className="mb-2 block font-medium text-unitor-gray-dark">
        {label}
      </label>

      <input
        type={
          type
        }
        value={
          value
        }
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
        className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
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

      <p className="text-sm text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-1 font-medium capitalize text-unitor-black">
        {value ||
          "Not provided"}
      </p>

    </div>
  );
}

function normalizeCourseCode(
  courseCode: string
) {
  return String(
    courseCode ?? ""
  )
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();
}

function normalizeStatus(
  status: unknown
) {
  return String(
    status ?? ""
  )
    .trim()
    .toLowerCase();
}

function formatRange(
  from: string,
  to: string
) {
  if (
    !from &&
    !to
  ) {
    return "Not provided";
  }

  if (
    from === to ||
    !to
  ) {
    return (
      from ||
      "Not provided"
    );
  }

  if (!from) {
    return to;
  }

  return `${from} – ${to}`;
}