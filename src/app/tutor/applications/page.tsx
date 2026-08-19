"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

import {
  auth,
  firestore,
} from "@/lib/firebase";

interface TutorApplication {
  id: string;
  proposalId: string;
  proposalTitle: string;
  studentId: string;
  studentName: string;
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
}

type FilterOption =
  | "all"
  | "applied"
  | "selected"
  | "completed"
  | "rejected";

export default function TutorApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] =
    useState<TutorApplication[]>([]);

  const [filter, setFilter] =
    useState<FilterOption>("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let unsubscribeApplications:
      | (() => void)
      | undefined;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/login"
            );
            return;
          }

          /*
           * =========================================
           * VERIFY APPROVED TUTOR
           * =========================================
           */
          try {
            const userSnapshot =
              await getDoc(
                doc(
                  firestore,
                  "users",
                  user.uid
                )
              );

            if (
              !userSnapshot.exists()
            ) {
              router.replace(
                "/login"
              );
              return;
            }

            const userData =
              userSnapshot.data();

            const roles =
              Array.isArray(
                userData.roles
              )
                ? userData.roles
                : [];

            const tutorStatus =
              String(
                userData.tutorStatus ??
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
          } catch (
            verificationError
          ) {
            console.error(
              "Tutor verification error:",
              verificationError
            );

            setError(
              "Unable to verify your tutor account."
            );

            setLoading(false);
            return;
          }

          /*
           * =========================================
           * LOAD THIS TUTOR'S APPLICATIONS
           * =========================================
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
              async (
                snapshot
              ) => {
                try {
                  const applicationList =
                    await Promise.all(
                      snapshot.docs.map(
                        async (
                          applicationDocument
                        ) => {
                          const data =
                            applicationDocument.data();

                          let proposalTitle =
                            data.proposalTitle ??
                            "Proposal";

                          let studentName =
                            data.studentName ??
                            "Student";

                          /*
                           * Load proposal information
                           * when proposal still exists.
                           */
                          if (
                            data.proposalId
                          ) {
                            try {
                              const proposalSnapshot =
                                await getDoc(
                                  doc(
                                    firestore,
                                    "proposals",
                                    data.proposalId
                                  )
                                );

                              if (
                                proposalSnapshot.exists()
                              ) {
                                const proposalData =
                                  proposalSnapshot.data();

                                proposalTitle =
                                  proposalData.title ??
                                  proposalTitle;

                                studentName =
                                  proposalData.studentName ??
                                  studentName;
                              }
                            } catch (
                              proposalError
                            ) {
                              console.error(
                                "Proposal information error:",
                                proposalError
                              );
                            }
                          }

                          return {
                            id:
                              applicationDocument.id,

                            proposalId:
                              data.proposalId ??
                              "",

                            proposalTitle,

                            studentId:
                              data.studentId ??
                              "",

                            studentName,

                            tutorId:
                              data.tutorId ??
                              "",

                            courseCode:
                              String(
                                data.courseCode ??
                                  ""
                              ),

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
                              String(
                                data.paymentStatus ??
                                  "pending"
                              ),

                            status:
                              String(
                                data.status ??
                                  "applied"
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

                            appliedAt:
                              data.appliedAt,

                            createdAt:
                              data.createdAt,

                            updatedAt:
                              data.updatedAt,
                          } as TutorApplication;
                        }
                      )
                    );

                  applicationList.sort(
                    (
                      first,
                      second
                    ) => {
                      const firstTime =
                        first.appliedAt
                          ?.toMillis?.() ??
                        first.createdAt
                          ?.toMillis?.() ??
                        0;

                      const secondTime =
                        second.appliedAt
                          ?.toMillis?.() ??
                        second.createdAt
                          ?.toMillis?.() ??
                        0;

                      return (
                        secondTime -
                        firstTime
                      );
                    }
                  );

                  setApplications(
                    applicationList
                  );

                  setError("");
                  setLoading(false);
                } catch (
                  loadError
                ) {
                  console.error(
                    "Application information error:",
                    loadError
                  );

                  setError(
                    "Unable to load application information."
                  );

                  setLoading(false);
                }
              },
              (
                loadError
              ) => {
                console.error(
                  "Applications loading error:",
                  loadError
                );

                setError(
                  "Unable to load your applications."
                );

                setLoading(false);
              }
            );
        }
      );

    return () => {
      unsubscribeAuth();
      unsubscribeApplications?.();
    };
  }, [router]);

  /*
   * =========================================
   * APPLICATION COUNTS
   * =========================================
   */

  const appliedCount =
    useMemo(
      () =>
        applications.filter(
          (
            application
          ) => {
            const status =
              normalizeStatus(
                application.status
              );

            return (
              status ===
                "applied" ||
              status ===
                "pending"
            );
          }
        ).length,
      [applications]
    );

  const selectedCount =
    useMemo(
      () =>
        applications.filter(
          (
            application
          ) => {
            const status =
              normalizeStatus(
                application.status
              );

            return (
              status ===
                "selected" ||
              status ===
                "accepted" ||
              status ===
                "approved"
            );
          }
        ).length,
      [applications]
    );

  const completedCount =
    useMemo(
      () =>
        applications.filter(
          (
            application
          ) => {
            const status =
              normalizeStatus(
                application.status
              );

            const paymentStatus =
              normalizeStatus(
                application.paymentStatus
              );

            return (
              status ===
                "completed" ||
              paymentStatus ===
                "successful"
            );
          }
        ).length,
      [applications]
    );

  const rejectedCount =
    useMemo(
      () =>
        applications.filter(
          (
            application
          ) => {
            const status =
              normalizeStatus(
                application.status
              );

            return (
              status ===
                "rejected" ||
              status ===
                "cancelled"
            );
          }
        ).length,
      [applications]
    );

  /*
   * =========================================
   * FILTER
   * =========================================
   */
  const filteredApplications =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return applications;
      }

      return applications.filter(
        (
          application
        ) => {
          const status =
            normalizeStatus(
              application.status
            );

          const paymentStatus =
            normalizeStatus(
              application.paymentStatus
            );

          if (
            filter ===
            "applied"
          ) {
            return (
              (status ===
                "applied" ||
                status ===
                  "pending") &&
              paymentStatus !==
                "successful"
            );
          }

          if (
            filter ===
            "selected"
          ) {
            return (
              status ===
                "selected" ||
              status ===
                "accepted" ||
              status ===
                "approved"
            );
          }

          if (
            filter ===
            "completed"
          ) {
            return (
              status ===
                "completed" ||
              paymentStatus ===
                "successful"
            );
          }

          if (
            filter ===
            "rejected"
          ) {
            return (
              status ===
                "rejected" ||
              status ===
                "cancelled"
            );
          }

          return true;
        }
      );
    }, [
      applications,
      filter,
    ]);

  return (
    <main className="min-h-screen bg-unitor-background">

      {/* HEADER */}

      <header className="border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor Tutor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        <div>

          <p className="font-medium text-unitor-primary">
            Tutor activity
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            My Applications
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Track tutoring proposals you have applied to and
            see whether the student selected you.
          </p>

        </div>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            label="Applied"
            value={
              appliedCount
            }
          />

          <SummaryCard
            label="Selected"
            value={
              selectedCount
            }
          />

          <SummaryCard
            label="Completed"
            value={
              completedCount
            }
          />

          <SummaryCard
            label="Rejected"
            value={
              rejectedCount
            }
          />

        </section>

        {/* FILTERS */}

        <div className="mt-8 flex flex-wrap gap-3">

          <FilterButton
            label={`All (${applications.length})`}
            active={
              filter === "all"
            }
            onClick={() =>
              setFilter("all")
            }
          />

          <FilterButton
            label={`Applied (${appliedCount})`}
            active={
              filter ===
              "applied"
            }
            onClick={() =>
              setFilter(
                "applied"
              )
            }
          />

          <FilterButton
            label={`Selected (${selectedCount})`}
            active={
              filter ===
              "selected"
            }
            onClick={() =>
              setFilter(
                "selected"
              )
            }
          />

          <FilterButton
            label={`Completed (${completedCount})`}
            active={
              filter ===
              "completed"
            }
            onClick={() =>
              setFilter(
                "completed"
              )
            }
          />

          <FilterButton
            label={`Rejected (${rejectedCount})`}
            active={
              filter ===
              "rejected"
            }
            onClick={() =>
              setFilter(
                "rejected"
              )
            }
          />

        </div>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-unitor-gray-dark">
              Loading your applications...
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
          filteredApplications.length ===
            0 && (

            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📄
              </div>

              <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                No applications found
              </h2>

              <p className="mt-3 text-unitor-gray-dark">
                Applications matching this filter will
                appear here.
              </p>

              <Link
                href="/tutor/proposals"
                className="mt-7 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
              >
                Browse proposals
              </Link>

            </section>
          )}

        {!loading &&
          !error &&
          filteredApplications.length >
            0 && (

            <div className="mt-8 grid gap-6 lg:grid-cols-2">

              {filteredApplications.map(
                (
                  application
                ) => (

                  <ApplicationCard
                    key={
                      application.id
                    }
                    application={
                      application
                    }
                  />

                )
              )}

            </div>
          )}

      </div>

    </main>
  );
}

function ApplicationCard({
  application,
}: {
  application:
    TutorApplication;
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <p className="font-medium text-unitor-primary">
            {application.courseCode ||
              "Course"}
          </p>

          <h2 className="mt-2 text-xl font-bold text-unitor-black">
            {application.proposalTitle}
          </h2>

          <p className="mt-2 text-sm text-unitor-gray-dark">
            Student:{" "}
            {application.studentName}
          </p>

        </div>

        <ApplicationStatus
          status={
            application.status
          }
        />

      </div>

      <div className="mt-6 rounded-xl bg-unitor-background p-5">

        <p className="text-sm text-unitor-gray-dark">
          Your application message
        </p>

        <p className="mt-2 line-clamp-4 leading-7 text-unitor-gray-dark">
          {application.description ||
            "No application message."}
        </p>

      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">

        <InformationItem
          label="Requested payment"
          value={`৳${application.payment}`}
        />

        <InformationItem
          label="Estimated time"
          value={`${application.estimatedHours} hour${
            application.estimatedHours ===
            1
              ? ""
              : "s"
          }`}
        />

        <InformationItem
          label="Date"
          value={
            formatDateRange(
              application.dateFrom,
              application.dateTo
            )
          }
        />

        <InformationItem
          label="Time"
          value={
            formatTimeRange(
              application.timeFrom,
              application.timeTo
            )
          }
        />

      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-5 border-t border-unitor-gray-soft pt-5">

        <div>

          <p className="text-sm text-unitor-gray-dark">
            Payment status
          </p>

          <PaymentStatus
            status={
              application.paymentStatus
            }
          />

        </div>

        {application.appliedAt && (

          <p className="text-right text-xs text-unitor-gray-dark/70">
            Applied{" "}
            {application.appliedAt
              .toDate()
              .toLocaleDateString(
                "en-BD",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              )}
          </p>

        )}

      </div>

      {application.proposalId && (

        <Link
          href={`/tutor/proposals/${application.proposalId}`}
          className="mt-6 block rounded-lg border border-unitor-primary px-5 py-3 text-center font-medium text-unitor-primary hover:bg-unitor-background"
        >
          View Proposal
        </Link>

      )}

    </article>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold text-unitor-black">
        {value}
      </p>

    </article>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-full px-5 py-2 font-medium transition ${
        active
          ? "bg-unitor-primary text-white"
          : "border border-unitor-gray-light bg-white text-unitor-gray-dark hover:border-unitor-primary hover:text-unitor-primary"
      }`}
    >
      {label}
    </button>
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
        {value ||
          "Not provided"}
      </p>

    </div>
  );
}

function ApplicationStatus({
  status,
}: {
  status: string;
}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );

  let classes =
    "bg-amber-50 text-amber-700";

  let label =
    status || "applied";

  if (
    normalizedStatus ===
      "selected" ||
    normalizedStatus ===
      "accepted" ||
    normalizedStatus ===
      "approved"
  ) {
    classes =
      "bg-unitor-background text-unitor-primary-hover";

    label =
      normalizedStatus ===
      "accepted"
        ? "Selected"
        : status;
  } else if (
    normalizedStatus ===
      "rejected" ||
    normalizedStatus ===
      "cancelled"
  ) {
    classes =
      "bg-red-50 text-red-700";
  } else if (
    normalizedStatus ===
      "completed"
  ) {
    classes =
      "bg-unitor-background text-unitor-primary-hover";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${classes}`}
    >
      {label}
    </span>
  );
}

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );

  let classes =
    "bg-amber-50 text-amber-700";

  let label =
    status || "pending";

  if (
    normalizedStatus ===
      "successful" ||
    normalizedStatus ===
      "approved"
  ) {
    classes =
      "bg-unitor-background text-unitor-primary-hover";

    label = "Paid";
  } else if (
    normalizedStatus ===
      "pending_admin_approval" ||
    normalizedStatus ===
      "submitted"
  ) {
    classes =
      "bg-amber-50 text-amber-700";

    label =
      "Awaiting approval";
  } else if (
    normalizedStatus ===
      "rejected" ||
    normalizedStatus ===
      "failed"
  ) {
    classes =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium capitalize ${classes}`}
    >
      {label.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

function normalizeStatus(
  value: string
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}

function formatDateRange(
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

function formatTimeRange(
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