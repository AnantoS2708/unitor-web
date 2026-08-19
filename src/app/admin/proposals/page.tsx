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

interface Proposal {
  id: string;
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
  universityName: string;
  studentId: string;
  studentName: string;
  selectedTutorId: string;
  selectedJobProposalId: string;
  paymentId: string;
  paymentStatus: string;
  status: string;
  willingToTeach: number;
  tags: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

type ProposalFilter =
  | "all"
  | "open"
  | "completed"
  | "selected"
  | "paid";

export default function AdminProposalsPage() {
  const router = useRouter();

  const [proposals, setProposals] = useState<
    Proposal[]
  >([]);

  const [selectedProposal, setSelectedProposal] =
    useState<Proposal | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] =
    useState<ProposalFilter>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProposals: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        unsubscribeProposals = onSnapshot(
          collection(firestore, "proposals"),
          (snapshot) => {
            const proposalList = snapshot.docs.map(
              (proposalDocument) => {
                const data = proposalDocument.data();

                return {
                  id: proposalDocument.id,
                  title:
                    data.title ?? "Untitled proposal",
                  courseCode: data.courseCode ?? "",
                  facultyInitial:
                    data.facultyInitial ?? "",
                  problemTopics:
                    data.problemTopics ?? "",
                  description:
                    data.description ?? "",
                  budget: Number(data.budget ?? 0),
                  estimatedHours: Number(
                    data.estimatedHours ?? 0
                  ),
                  dateFrom: data.dateFrom ?? "",
                  dateTo: data.dateTo ?? "",
                  timeFrom: data.timeFrom ?? "",
                  timeTo: data.timeTo ?? "",
                  university: data.university ?? "",
                  universityName:
                    data.universityName ?? "",
                  studentId: data.studentId ?? "",
                  studentName:
                    data.studentName ?? "Student",
                  selectedTutorId:
                    data.selectedTutorId ?? "",
                  selectedJobProposalId:
                    data.selectedJobProposalId ?? "",
                  paymentId: data.paymentId ?? "",
                  paymentStatus:
                    data.paymentStatus ?? "",
                  status: data.status ?? "open",
                  willingToTeach: Number(
                    data.willingToTeach ?? 0
                  ),
                  tags: Array.isArray(data.tags)
                    ? data.tags
                    : [],
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                } as Proposal;
              }
            );

            proposalList.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis?.() ?? 0;

              const secondTime =
                second.createdAt?.toMillis?.() ?? 0;

              return secondTime - firstTime;
            });

            setProposals(proposalList);

            setSelectedProposal(
              (currentProposal) => {
                if (!currentProposal) {
                  return null;
                }

                return (
                  proposalList.find(
                    (proposal) =>
                      proposal.id ===
                      currentProposal.id
                  ) ?? null
                );
              }
            );

            setError("");
            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin proposal loading error:",
              loadError
            );

            setError("Unable to load proposals.");
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProposals?.();
    };
  }, [router]);

  const filteredProposals = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return proposals.filter((proposal) => {
      const status = proposal.status.toLowerCase();
      const paymentStatus =
        proposal.paymentStatus.toLowerCase();

      let matchesFilter = true;

      if (filter === "open") {
        matchesFilter =
          status === "open" ||
          status === "active" ||
          status === "available";
      }

      if (filter === "completed") {
        matchesFilter = status === "completed";
      }

      if (filter === "selected") {
        matchesFilter =
          Boolean(proposal.selectedTutorId) ||
          Boolean(proposal.selectedJobProposalId);
      }

      if (filter === "paid") {
        matchesFilter =
          paymentStatus === "successful";
      }

      const matchesSearch =
        !search ||
        proposal.title.toLowerCase().includes(search) ||
        proposal.courseCode
          .toLowerCase()
          .includes(search) ||
        proposal.studentName
          .toLowerCase()
          .includes(search) ||
        proposal.facultyInitial
          .toLowerCase()
          .includes(search) ||
        proposal.problemTopics
          .toLowerCase()
          .includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [filter, proposals, searchText]);

  const completedCount = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          proposal.status.toLowerCase() ===
          "completed"
      ).length,
    [proposals]
  );

  const paidCount = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          proposal.paymentStatus.toLowerCase() ===
          "successful"
      ).length,
    [proposals]
  );

  const totalBudget = useMemo(
    () =>
      proposals.reduce(
        (total, proposal) =>
          total + proposal.budget,
        0
      ),
    [proposals]
  );

  return (
    <main className="min-h-screen bg-unitor-gray-soft">
      <header className="border-b border-unitor-black bg-unitor-black text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor Admin
          </Link>

          <Link
            href="/admin/dashboard"
            className="font-medium text-unitor-gray-light hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-medium text-unitor-primary">
          Platform activity
        </p>

        <h1 className="mt-2 text-3xl font-bold text-unitor-black">
          Student proposals
        </h1>

        <p className="mt-3 text-unitor-gray-dark">
          Monitor tutoring requests created by students.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total proposals"
            value={String(proposals.length)}
            color="blue"
          />

          <SummaryCard
            title="Completed"
            value={String(completedCount)}
            color="emerald"
          />

          <SummaryCard
            title="Paid"
            value={String(paidCount)}
            color="purple"
          />

          <SummaryCard
            title="Combined budget"
            value={formatMoney(totalBudget)}
            color="amber"
          />
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <label
            htmlFor="proposalSearch"
            className="mb-2 block text-sm font-medium text-unitor-gray-dark"
          >
            Search proposals
          </label>

          <input
            id="proposalSearch"
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search by title, course, topic or student"
            className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            {(
              [
                "all",
                "open",
                "selected",
                "paid",
                "completed",
              ] as ProposalFilter[]
            ).map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                onClick={() =>
                  setFilter(filterValue)
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                  filter === filterValue
                    ? "bg-unitor-primary text-white"
                    : "border border-unitor-gray-light text-unitor-gray-dark hover:bg-unitor-background"
                }`}
              >
                {filterValue}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading proposals...
            </p>
          </section>
        ) : filteredProposals.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📝</div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No proposals found
            </h2>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="bg-unitor-background text-left">
                  <tr>
                    <TableHeading>Proposal</TableHeading>
                    <TableHeading>Student</TableHeading>
                    <TableHeading>Schedule</TableHeading>
                    <TableHeading>Budget</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Action</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-unitor-gray-soft">
                  {filteredProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className="hover:bg-unitor-background"
                    >
                      <td className="p-4">
                        <p className="font-medium text-unitor-black">
                          {proposal.title}
                        </p>

                        <p className="mt-1 text-sm font-medium text-unitor-primary">
                          {proposal.courseCode ||
                            "No course code"}
                        </p>

                        <p className="mt-1 text-xs text-unitor-gray-dark/70">
                          {formatDate(proposal.createdAt)}
                        </p>
                      </td>

                      <TableData>
                        {proposal.studentName}
                      </TableData>

                      <td className="p-4 text-sm text-unitor-gray-dark">
                        <p>
                          {proposal.dateFrom ||
                            "No date"}{" "}
                          –{" "}
                          {proposal.dateTo ||
                            "No date"}
                        </p>

                        <p className="mt-1 text-xs text-unitor-gray-dark">
                          {proposal.timeFrom} –{" "}
                          {proposal.timeTo}
                        </p>
                      </td>

                      <td className="p-4 font-medium text-unitor-black">
                        {formatMoney(proposal.budget)}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <StatusBadge
                            status={proposal.status}
                          />

                          {proposal.paymentStatus && (
                            <PaymentBadge
                              status={
                                proposal.paymentStatus
                              }
                            />
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProposal(proposal)
                          }
                          className="rounded-lg border border-unitor-gray-light px-4 py-2 text-sm font-medium text-unitor-gray-dark hover:border-unitor-primary hover:text-unitor-primary"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && (
          <p className="mt-4 text-sm text-unitor-gray-dark">
            Showing {filteredProposals.length} of{" "}
            {proposals.length} proposals
          </p>
        )}
      </div>

      {selectedProposal && (
        <ProposalModal
          proposal={selectedProposal}
          onClose={() =>
            setSelectedProposal(null)
          }
        />
      )}
    </main>
  );
}

function ProposalModal({
  proposal,
  onClose,
}: {
  proposal: Proposal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-unitor-gray-light bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-unitor-black">
              {proposal.title}
            </h2>

            <p className="mt-1 font-medium text-unitor-primary">
              {proposal.courseCode}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-3xl text-unitor-gray-dark"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <StatusBadge status={proposal.status} />

            {proposal.paymentStatus && (
              <PaymentBadge
                status={proposal.paymentStatus}
              />
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InformationItem
              label="Student"
              value={proposal.studentName}
            />

            <InformationItem
              label="Faculty initial"
              value={proposal.facultyInitial}
            />

            <InformationItem
              label="Problem topics"
              value={proposal.problemTopics}
            />

            <InformationItem
              label="Budget"
              value={formatMoney(proposal.budget)}
            />

            <InformationItem
              label="Estimated hours"
              value={String(
                proposal.estimatedHours || 0
              )}
            />

            <InformationItem
              label="Willing tutors"
              value={String(
                proposal.willingToTeach || 0
              )}
            />

            <InformationItem
              label="Starting date"
              value={proposal.dateFrom}
            />

            <InformationItem
              label="Ending date"
              value={proposal.dateTo}
            />

            <InformationItem
              label="Starting time"
              value={proposal.timeFrom}
            />

            <InformationItem
              label="Ending time"
              value={proposal.timeTo}
            />

            <InformationItem
              label="Selected tutor ID"
              value={proposal.selectedTutorId}
            />

            <InformationItem
              label="Payment ID"
              value={proposal.paymentId}
            />
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-unitor-black">
              Description
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
              {proposal.description ||
                "No description provided."}
            </p>
          </div>

          {proposal.tags.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold text-unitor-black">
                Tags
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {proposal.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full bg-unitor-gray-soft px-4 py-2 text-sm font-medium text-unitor-gray-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-unitor-gray-light pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-unitor-black px-6 py-3 font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cleanStatus =
    status.toLowerCase() || "unknown";

  const style =
    cleanStatus === "completed"
      ? "bg-green-100 text-green-700"
      : cleanStatus === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-unitor-blue-light text-unitor-primary-hover";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${style}`}
    >
      {cleanStatus}
    </span>
  );
}

function PaymentBadge({
  status,
}: {
  status: string;
}) {
  const cleanStatus = status.toLowerCase();

  const style =
    cleanStatus === "successful"
      ? "bg-green-100 text-green-700"
      : cleanStatus === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${style}`}
    >
      Payment: {cleanStatus}
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
  color: "blue" | "emerald" | "purple" | "amber";
}) {
  const styles = {
    blue: "bg-unitor-background text-unitor-primary-hover",
    emerald: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-medium ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-2xl font-bold text-unitor-black">
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
    <th className="p-4 text-sm font-medium text-unitor-gray-dark">
      {children}
    </th>
  );
}

function TableData({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="p-4 text-sm text-unitor-gray-dark">
      {children}
    </td>
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
    <div className="border-b border-unitor-gray-soft pb-4">
      <p className="text-sm text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-1 break-all font-medium text-unitor-black">
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
