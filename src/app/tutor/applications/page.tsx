"use client";

import { useEffect, useState } from "react";
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
import { auth, firestore } from "@/lib/firebase";

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
  | "completed";

export default function TutorApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<
    TutorApplication[]
  >([]);

  const [filter, setFilter] =
    useState<FilterOption>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeApplications:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const applicationsQuery = query(
          collection(firestore, "jobProposals"),
          where("tutorId", "==", user.uid)
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

                      let proposalTitle =
                        "Proposal";

                      let studentName =
                        "Student";

                      if (data.proposalId) {
                        const proposalSnapshot =
                          await getDoc(
                            doc(
                              firestore,
                              "proposals",
                              data.proposalId
                            )
                          );

                        if (proposalSnapshot.exists()) {
                          const proposal =
                            proposalSnapshot.data();

                          proposalTitle =
                            proposal.title ??
                            "Proposal";

                          studentName =
                            proposal.studentName ??
                            "Student";
                        }
                      }

                      return {
                        id: applicationDocument.id,
                        proposalId:
                          data.proposalId ?? "",
                        proposalTitle,
                        studentId:
                          data.studentId ?? "",
                        studentName,
                        tutorId:
                          data.tutorId ?? "",
                        courseCode:
                          data.courseCode ?? "",
                        description:
                          data.description ?? "",
                        estimatedHours:
                          data.estimatedHours ?? 0,
                        payment:
                          data.payment ?? 0,
                        paymentId:
                          data.paymentId ?? "",
                        paymentStatus:
                          data.paymentStatus ??
                          "pending",
                        status:
                          data.status ?? "applied",
                        dateFrom:
                          data.dateFrom ?? "",
                        dateTo:
                          data.dateTo ?? "",
                        timeFrom:
                          data.timeFrom ?? "",
                        timeTo:
                          data.timeTo ?? "",
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
                "Application profile error:",
                error
              );

              setError(
                "Unable to load application information."
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

  const filteredApplications =
    applications.filter((application) => {
      if (filter === "all") return true;

      const status =
        application.status.toLowerCase();

      const paymentStatus =
        application.paymentStatus.toLowerCase();

      if (filter === "applied") {
        return (
          status === "applied" &&
          paymentStatus !== "successful"
        );
      }

      if (filter === "selected") {
        return (
          Boolean(application.paymentId) &&
          paymentStatus !== "successful"
        );
      }

      if (filter === "completed") {
        return (
          status === "completed" ||
          paymentStatus === "successful"
        );
      }

      return true;
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor Tutor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="font-semibold text-emerald-600">
            Tutor activity
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My Applications
          </h1>

          <p className="mt-3 text-slate-600">
            Track the proposals you applied to and their
            payment status.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <FilterButton
            label="All"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <FilterButton
            label="Applied"
            active={filter === "applied"}
            onClick={() => setFilter("applied")}
          />

          <FilterButton
            label="Selected"
            active={filter === "selected"}
            onClick={() => setFilter("selected")}
          />

          <FilterButton
            label="Paid/Completed"
            active={filter === "completed"}
            onClick={() => setFilter("completed")}
          />
        </div>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
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
          filteredApplications.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">📄</div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                No applications found
              </h2>

              <p className="mt-3 text-slate-600">
                Applications matching this filter will
                appear here.
              </p>

              <Link
                href="/tutor/proposals"
                className="mt-7 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Browse proposals
              </Link>
            </section>
          )}

        {!loading &&
          filteredApplications.length > 0 && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {filteredApplications.map(
                (application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
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
  application: TutorApplication;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-emerald-600">
            {application.courseCode}
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            {application.proposalTitle}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Student: {application.studentName}
          </p>
        </div>

        <ApplicationStatus
          status={application.status}
        />
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-5">
        <p className="text-sm text-slate-500">
          Your application message
        </p>

        <p className="mt-2 line-clamp-4 leading-7 text-slate-700">
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
            application.estimatedHours === 1
              ? ""
              : "s"
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

      <div className="mt-6 flex items-center justify-between gap-5 border-t border-slate-100 pt-5">
        <div>
          <p className="text-sm text-slate-500">
            Payment status
          </p>

          <PaymentStatus
            status={application.paymentStatus}
          />
        </div>

        {application.appliedAt && (
          <p className="text-right text-xs text-slate-400">
            Applied{" "}
            {application.appliedAt
              .toDate()
              .toLocaleDateString("en-BD", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
          </p>
        )}
      </div>

      {application.proposalId && (
        <Link
          href={`/tutor/proposals/${application.proposalId}`}
          className="mt-6 block rounded-lg border border-emerald-600 px-5 py-3 text-center font-semibold text-emerald-600 hover:bg-emerald-50"
        >
          View Proposal
        </Link>
      )}
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
      onClick={onClick}
      className={`rounded-full px-5 py-2 font-semibold transition ${
        active
          ? "bg-emerald-600 text-white"
          : "border border-slate-300 bg-white text-slate-600 hover:border-emerald-600 hover:text-emerald-600"
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
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
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
    classes = "bg-emerald-50 text-emerald-700";
  } else if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled"
  ) {
    classes = "bg-red-50 text-red-700";
  } else if (
    normalizedStatus === "completed"
  ) {
    classes = "bg-blue-50 text-blue-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${classes}`}
    >
      {status || "applied"}
    </span>
  );
}

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let classes = "bg-amber-50 text-amber-700";

  if (
    normalizedStatus === "successful" ||
    normalizedStatus === "approved"
  ) {
    classes = "bg-emerald-50 text-emerald-700";
  } else if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "failed"
  ) {
    classes = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold capitalize ${classes}`}
    >
      {status || "pending"}
    </span>
  );
}