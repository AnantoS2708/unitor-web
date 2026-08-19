"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface TutorProfile {
  fullName: string;
  profileImageUrl: string;
  major: string;
  bio: string;
  cgpa: string;
  tutorStatus: string;
  courses: string[];
  courseCodesToTeach: string;
}

interface TutorApplication {
  id: string;
  proposalId: string;
  studentId: string;
  tutorId: string;
  courseCode: string;
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
  appliedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  tutor: TutorProfile;
}

interface ProposalSummary {
  title: string;
  courseCode: string;
  studentId: string;
  status: string;
}

const emptyTutor: TutorProfile = {
  fullName: "Tutor",
  profileImageUrl: "",
  major: "",
  bio: "",
  cgpa: "",
  tutorStatus: "",
  courses: [],
  courseCodesToTeach: "",
};

export default function TutorApplicationsPage() {
  const router = useRouter();
  const params = useParams<{ proposalId: string }>();
  const proposalId = params.proposalId;

  const [proposal, setProposal] =
    useState<ProposalSummary | null>(null);

  const [applications, setApplications] = useState<
    TutorApplication[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProposal: (() => void) | undefined;
    let unsubscribeApplications:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const proposalReference = doc(
          firestore,
          "proposals",
          proposalId
        );

        unsubscribeProposal = onSnapshot(
          proposalReference,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("This proposal could not be found.");
              setLoading(false);
              return;
            }

            const data = snapshot.data();

            if (data.studentId !== user.uid) {
              setError(
                "You do not have permission to view these applications."
              );
              setLoading(false);
              return;
            }

            setProposal({
              title: data.title ?? "Untitled proposal",
              courseCode: data.courseCode ?? "",
              studentId: data.studentId ?? "",
              status: data.status ?? "",
            });
          },
          (error) => {
            console.error(
              "Proposal loading error:",
              error
            );

            setError("Unable to load the proposal.");
            setLoading(false);
          }
        );

        const applicationsQuery = query(
          collection(firestore, "jobProposals"),
          where("proposalId", "==", proposalId)
        );

        unsubscribeApplications = onSnapshot(
          applicationsQuery,
          async (snapshot) => {
            try {
              const applicationList =
                await Promise.all(
                  snapshot.docs.map(
                    async (applicationDocument) => {
                      const data =
                        applicationDocument.data();

                      let tutor = emptyTutor;

                      if (data.tutorId) {
                        const tutorSnapshot =
                          await getDoc(
                            doc(
                              firestore,
                              "users",
                              data.tutorId
                            )
                          );

                        if (tutorSnapshot.exists()) {
                          const tutorData =
                            tutorSnapshot.data();

                          tutor = {
                            fullName:
                              tutorData.fullName ??
                              "Tutor",
                            profileImageUrl:
                              tutorData.profileImageUrl ??
                              "",
                            major:
                              tutorData.major ?? "",
                            bio: tutorData.bio ?? "",
                            cgpa: tutorData.cgpa ?? "",
                            tutorStatus:
                              tutorData.tutorStatus ??
                              "",
                            courses:
                              tutorData.courses ?? [],
                            courseCodesToTeach:
                              tutorData.courseCodesToTeach ??
                              "",
                          };
                        }
                      }

                      return {
                        id: applicationDocument.id,
                        proposalId:
                          data.proposalId ?? "",
                        studentId:
                          data.studentId ?? "",
                        tutorId: data.tutorId ?? "",
                        courseCode:
                          data.courseCode ?? "",
                        description:
                          data.description ?? "",
                        estimatedHours:
                          data.estimatedHours ?? 0,
                        payment: data.payment ?? 0,
                        paymentId:
                          data.paymentId ?? "",
                        paymentStatus:
                          data.paymentStatus ?? "",
                        status:
                          data.status ?? "applied",
                        dateFrom:
                          data.dateFrom ?? "",
                        dateTo: data.dateTo ?? "",
                        timeFrom:
                          data.timeFrom ?? "",
                        timeTo: data.timeTo ?? "",
                        appliedAt:
                          data.appliedAt,
                        createdAt:
                          data.createdAt,
                        updatedAt:
                          data.updatedAt,
                        tutor,
                      } as TutorApplication;
                    }
                  )
                );

              applicationList.sort(
                (first, second) => {
                  const firstTime =
                    first.appliedAt?.toMillis?.() ??
                    first.createdAt?.toMillis?.() ??
                    0;

                  const secondTime =
                    second.appliedAt?.toMillis?.() ??
                    second.createdAt?.toMillis?.() ??
                    0;

                  return secondTime - firstTime;
                }
              );

              setApplications(applicationList);
              setError("");
              setLoading(false);
            } catch (error) {
              console.error(
                "Tutor profile loading error:",
                error
              );

              setError(
                "Unable to load tutor information."
              );

              setLoading(false);
            }
          },
          (error) => {
            console.error(
              "Applications loading error:",
              error
            );

            setError(
              "Unable to load tutor applications."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProposal?.();
      unsubscribeApplications?.();
    };
  }, [proposalId, router]);

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <Link
            href={`/student/proposals/${proposalId}`}
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Proposal details
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="font-medium text-unitor-primary">
            {proposal?.courseCode || "Proposal"}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Tutor Applications
          </h1>

          {proposal && (
            <p className="mt-3 text-unitor-gray-dark">
              Tutors who applied for “{proposal.title}”
            </p>
          )}
        </div>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading tutor applications...
            </p>
          </section>
        )}

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          applications.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">🎓</div>

              <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                No tutor applications yet
              </h2>

              <p className="mt-3 text-unitor-gray-dark">
                Tutor applications will appear here in
                real time.
              </p>
            </section>
          )}

        {!loading && applications.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ApplicationCard({
  application,
}: {
  application: TutorApplication;
}) {
  const tutorInitial =
    application.tutor.fullName
      .charAt(0)
      .toUpperCase() || "T";

  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {application.tutor.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={application.tutor.profileImageUrl}
            alt={application.tutor.fullName}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-unitor-blue-light text-2xl font-bold text-unitor-primary">
            {tutorInitial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-unitor-black">
                {application.tutor.fullName}
              </h2>

              <p className="mt-1 text-unitor-gray-dark">
                {application.tutor.major ||
                  "Major not provided"}
              </p>
            </div>

            <ApplicationStatus
              status={application.status}
            />
          </div>

          {application.tutor.tutorStatus && (
            <p className="mt-2 text-sm font-medium capitalize text-unitor-primary">
              Tutor status:{" "}
              {application.tutor.tutorStatus}
            </p>
          )}
        </div>
      </div>

      {application.tutor.bio && (
        <p className="mt-5 leading-7 text-unitor-gray-dark">
          {application.tutor.bio}
        </p>
      )}

      <div className="mt-6 rounded-xl bg-unitor-background p-5">
        <p className="text-sm text-unitor-gray-dark">
          Tutor&apos;s message
        </p>

        <p className="mt-2 leading-7 text-unitor-black">
          {application.description ||
            "No application message provided."}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <InformationItem
          label="Requested payment"
          value={`৳${application.payment}`}
        />

        <InformationItem
          label="Estimated hours"
          value={`${application.estimatedHours} hour${
            application.estimatedHours === 1 ? "" : "s"
          }`}
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
          label="Time"
          value={`${application.timeFrom} – ${application.timeTo}`}
        />
      </div>

      {application.appliedAt && (
        <p className="mt-6 border-t border-unitor-gray-soft pt-4 text-xs text-unitor-gray-dark/70">
          Applied{" "}
          {application.appliedAt
            .toDate()
            .toLocaleString("en-BD", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
        </p>
      )}

      {application.status.toLowerCase() === "applied" &&
        !application.paymentId && (
            <Link
            href={`/student/payments/new/${application.id}`}
            className="mt-6 block w-full rounded-lg bg-unitor-primary px-5 py-3 text-center font-medium text-white hover:bg-unitor-primary-hover"
            >
            Select Tutor and Continue to Payment
            </Link>
        )}
    </article>
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

      <p className="mt-1 font-medium text-unitor-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ApplicationStatus({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let classes = "bg-amber-50 text-amber-700";

  if (
    normalizedStatus === "selected" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "approved"
  ) {
    classes = "bg-unitor-background text-unitor-primary-hover";
  } else if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled"
  ) {
    classes = "bg-red-50 text-red-700";
  } else if (
    normalizedStatus === "completed"
  ) {
    classes = "bg-unitor-background text-unitor-primary-hover";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${classes}`}
    >
      {status || "applied"}
    </span>
  );
}