"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

interface JobProposal {
  id: string;
  proposalId: string;
  courseCode: string;
  description: string;
  estimatedHours: number;
  payment: number;
  paymentId: string;
  paymentStatus: string;
  status: string;
  studentId: string;
  tutorId: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  createdAt?: Timestamp;
  appliedAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface UserRecord {
  id: string;
  fullName: string;
  universityEmail: string;
}

type ApplicationFilter =
  | "all"
  | "applied"
  | "selected"
  | "completed"
  | "paid";

export default function AdminJobProposalsPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<
    JobProposal[]
  >([]);

  const [users, setUsers] = useState<UserRecord[]>([]);

  const [selectedApplication, setSelectedApplication] =
    useState<JobProposal | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] =
    useState<ApplicationFilter>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeFunctions: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        const unsubscribeApplications = onSnapshot(
          collection(firestore, "jobProposals"),
          (snapshot) => {
            const applicationList = snapshot.docs.map(
              (applicationDocument) => {
                const data =
                  applicationDocument.data();

                return {
                  id: applicationDocument.id,
                  proposalId: data.proposalId ?? "",
                  courseCode: data.courseCode ?? "",
                  description:
                    data.description ?? "",
                  estimatedHours: Number(
                    data.estimatedHours ?? 0
                  ),
                  payment: Number(data.payment ?? 0),
                  paymentId: data.paymentId ?? "",
                  paymentStatus:
                    data.paymentStatus ?? "",
                  status: data.status ?? "applied",
                  studentId: data.studentId ?? "",
                  tutorId: data.tutorId ?? "",
                  dateFrom: data.dateFrom ?? "",
                  dateTo: data.dateTo ?? "",
                  timeFrom: data.timeFrom ?? "",
                  timeTo: data.timeTo ?? "",
                  createdAt: data.createdAt,
                  appliedAt: data.appliedAt,
                  updatedAt: data.updatedAt,
                } as JobProposal;
              }
            );

            applicationList.sort((first, second) => {
              const firstTime =
                first.appliedAt?.toMillis?.() ??
                first.createdAt?.toMillis?.() ??
                0;

              const secondTime =
                second.appliedAt?.toMillis?.() ??
                second.createdAt?.toMillis?.() ??
                0;

              return secondTime - firstTime;
            });

            setApplications(applicationList);

            setSelectedApplication(
              (currentApplication) => {
                if (!currentApplication) {
                  return null;
                }

                return (
                  applicationList.find(
                    (application) =>
                      application.id ===
                      currentApplication.id
                  ) ?? null
                );
              }
            );

            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin job proposal loading error:",
              loadError
            );

            setError(
              "Unable to load tutor applications."
            );

            setLoading(false);
          }
        );

        const unsubscribeUsers = onSnapshot(
          collection(firestore, "users"),
          (snapshot) => {
            setUsers(
              snapshot.docs.map((userDocument) => {
                const data = userDocument.data();

                return {
                  id: userDocument.id,
                  fullName:
                    data.fullName ?? "Unknown user",
                  universityEmail:
                    data.universityEmail ?? "",
                } as UserRecord;
              })
            );
          },
          (loadError) => {
            console.error(
              "Admin application user loading error:",
              loadError
            );
          }
        );

        unsubscribeFunctions.push(
          unsubscribeApplications,
          unsubscribeUsers
        );
      }
    );

    return () => {
      unsubscribeAuth();

      unsubscribeFunctions.forEach(
        (unsubscribe) => unsubscribe()
      );
    };
  }, [router]);

  function getUserName(userId: string) {
    return (
      users.find((user) => user.id === userId)
        ?.fullName ?? "Unknown user"
    );
  }

  function getUserEmail(userId: string) {
    return (
      users
        .find((user) => user.id === userId)
        ?.universityEmail.toLowerCase() ?? ""
    );
  }

  const filteredApplications = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return applications.filter((application) => {
      const status = application.status.toLowerCase();
      const paymentStatus =
        application.paymentStatus.toLowerCase();

      let matchesFilter = true;

      if (filter === "applied") {
        matchesFilter = status === "applied";
      }

      if (filter === "selected") {
        matchesFilter =
          status === "selected" ||
          status === "accepted";
      }

      if (filter === "completed") {
        matchesFilter = status === "completed";
      }

      if (filter === "paid") {
        matchesFilter =
          paymentStatus === "successful";
      }

      const tutorName = getUserName(
        application.tutorId
      ).toLowerCase();

      const studentName = getUserName(
        application.studentId
      ).toLowerCase();

      const matchesSearch =
        !search ||
        application.courseCode
          .toLowerCase()
          .includes(search) ||
        application.description
          .toLowerCase()
          .includes(search) ||
        application.proposalId
          .toLowerCase()
          .includes(search) ||
        tutorName.includes(search) ||
        studentName.includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, searchText, users]);

  const appliedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.status.toLowerCase() ===
          "applied"
      ).length,
    [applications]
  );

  const selectedCount = useMemo(
    () =>
      applications.filter((application) => {
        const status =
          application.status.toLowerCase();

        return (
          status === "selected" ||
          status === "accepted"
        );
      }).length,
    [applications]
  );

  const completedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.status.toLowerCase() ===
          "completed"
      ).length,
    [applications]
  );

  const totalApplicationValue = useMemo(
    () =>
      applications.reduce(
        (total, application) =>
          total + application.payment,
        0
      ),
    [applications]
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-emerald-400"
          >
            Unitor Admin
          </Link>

          <Link
            href="/admin/dashboard"
            className="font-medium text-slate-300 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-semibold text-emerald-600">
          Platform activity
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Tutor job applications
        </h1>

        <p className="mt-3 text-slate-600">
          Monitor applications submitted by tutors for student
          proposals.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total applications"
            value={String(applications.length)}
            color="blue"
          />

          <SummaryCard
            title="Applied"
            value={String(appliedCount)}
            color="amber"
          />

          <SummaryCard
            title="Selected"
            value={String(selectedCount)}
            color="purple"
          />

          <SummaryCard
            title="Completed"
            value={String(completedCount)}
            color="emerald"
          />
        </section>

        <section className="mt-5 rounded-2xl bg-slate-900 p-6 text-white">
          <p className="text-sm font-semibold text-slate-300">
            Combined application value
          </p>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {formatMoney(totalApplicationValue)}
          </p>
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <label
            htmlFor="applicationSearch"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Search applications
          </label>

          <input
            id="applicationSearch"
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search by course, tutor, student or proposal ID"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            {(
              [
                "all",
                "applied",
                "selected",
                "paid",
                "completed",
              ] as ApplicationFilter[]
            ).map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                onClick={() =>
                  setFilter(filterValue)
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                  filter === filterValue
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filterValue}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading tutor applications...
            </p>
          </section>
        ) : filteredApplications.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📨</div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              No applications found
            </h2>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <TableHeading>Course</TableHeading>
                    <TableHeading>Tutor</TableHeading>
                    <TableHeading>Student</TableHeading>
                    <TableHeading>Schedule</TableHeading>
                    <TableHeading>Payment</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Action</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map(
                    (application) => (
                      <tr
                        key={application.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <p className="font-bold text-blue-600">
                            {application.courseCode ||
                              "No course"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              application.appliedAt ??
                                application.createdAt
                            )}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-900">
                            {getUserName(
                              application.tutorId
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {getUserEmail(
                              application.tutorId
                            )}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-900">
                            {getUserName(
                              application.studentId
                            )}
                          </p>
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          <p>
                            {application.dateFrom ||
                              "No date"}{" "}
                            –{" "}
                            {application.dateTo ||
                              "No date"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {application.timeFrom} –{" "}
                            {application.timeTo}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-900">
                            {formatMoney(
                              application.payment
                            )}
                          </p>

                          {application.paymentStatus && (
                            <PaymentStatus
                              status={
                                application.paymentStatus
                              }
                            />
                          )}
                        </td>

                        <td className="p-4">
                          <ApplicationStatus
                            status={
                              application.status
                            }
                          />
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedApplication(
                                application
                              )
                            }
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-600"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && (
          <p className="mt-4 text-sm text-slate-500">
            Showing {filteredApplications.length} of{" "}
            {applications.length} applications
          </p>
        )}
      </div>

      {selectedApplication && (
        <ApplicationModal
          application={selectedApplication}
          tutorName={getUserName(
            selectedApplication.tutorId
          )}
          tutorEmail={getUserEmail(
            selectedApplication.tutorId
          )}
          studentName={getUserName(
            selectedApplication.studentId
          )}
          onClose={() =>
            setSelectedApplication(null)
          }
        />
      )}
    </main>
  );
}

function ApplicationModal({
  application,
  tutorName,
  tutorEmail,
  studentName,
  onClose,
}: {
  application: JobProposal;
  tutorName: string;
  tutorEmail: string;
  studentName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Tutor application
            </h2>

            <p className="mt-1 font-semibold text-blue-600">
              {application.courseCode}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-3xl text-slate-500"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <ApplicationStatus
              status={application.status}
            />

            {application.paymentStatus && (
              <PaymentStatus
                status={application.paymentStatus}
              />
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InformationItem
              label="Tutor"
              value={tutorName}
            />

            <InformationItem
              label="Tutor email"
              value={tutorEmail}
            />

            <InformationItem
              label="Student"
              value={studentName}
            />

            <InformationItem
              label="Payment"
              value={formatMoney(
                application.payment
              )}
            />

            <InformationItem
              label="Estimated hours"
              value={String(
                application.estimatedHours
              )}
            />

            <InformationItem
              label="Application date"
              value={formatDate(
                application.appliedAt ??
                  application.createdAt
              )}
            />

            <InformationItem
              label="Starting date"
              value={application.dateFrom}
            />

            <InformationItem
              label="Ending date"
              value={application.dateTo}
            />

            <InformationItem
              label="Starting time"
              value={application.timeFrom}
            />

            <InformationItem
              label="Ending time"
              value={application.timeTo}
            />

            <InformationItem
              label="Proposal ID"
              value={application.proposalId}
            />

            <InformationItem
              label="Payment ID"
              value={application.paymentId}
            />
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-slate-900">
              Tutor message
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
              {application.description ||
                "No description provided."}
            </p>
          </div>

          {application.proposalId && (
            <Link
              href={`/admin/proposals`}
              className="mt-8 inline-block rounded-lg border border-emerald-600 px-5 py-3 font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              View proposals
            </Link>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-3 mt-8 rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationStatus({
  status,
}: {
  status: string;
}) {
  const cleanStatus =
    status.toLowerCase() || "unknown";

  const style =
    cleanStatus === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : cleanStatus === "selected" ||
          cleanStatus === "accepted"
        ? "bg-purple-100 text-purple-700"
        : cleanStatus === "rejected"
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {cleanStatus}
    </span>
  );
}

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const cleanStatus = status.toLowerCase();

  const style =
    cleanStatus === "successful"
      ? "bg-emerald-100 text-emerald-700"
      : cleanStatus === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {cleanStatus}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "blue" | "amber" | "purple" | "emerald";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-semibold ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </article>
  );
}

function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="p-4 text-sm font-semibold text-slate-600">
      {children}
    </th>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all font-semibold text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}