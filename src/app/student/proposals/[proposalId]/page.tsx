"use client";

import { useEffect, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

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
  paymentStatus: string;
  willingToTeach: number;
  selectedTutorId: string;
  selectedJobProposalId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function ProposalDetailsPage() {
  const router = useRouter();
  const params = useParams<{ proposalId: string }>();
  const proposalId = params.proposalId;

  const [proposal, setProposal] =
    useState<Proposal | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProposal: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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
              "You do not have permission to view this proposal."
            );
            setLoading(false);
            return;
          }

          setProposal({
            id: snapshot.id,
            studentId: data.studentId ?? "",
            studentName: data.studentName ?? "",
            title: data.title ?? "",
            courseCode: data.courseCode ?? "",
            facultyInitial: data.facultyInitial ?? "",
            problemTopics: data.problemTopics ?? "",
            description: data.description ?? "",
            budget: data.budget ?? 0,
            estimatedHours: data.estimatedHours ?? 0,
            dateFrom: data.dateFrom ?? "",
            dateTo: data.dateTo ?? "",
            timeFrom: data.timeFrom ?? "",
            timeTo: data.timeTo ?? "",
            university: data.university ?? "",
            status: data.status ?? "unknown",
            paymentStatus: data.paymentStatus ?? "pending",
            willingToTeach: data.willingToTeach ?? 0,
            selectedTutorId: data.selectedTutorId ?? "",
            selectedJobProposalId:
              data.selectedJobProposalId ?? "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });

          setError("");
          setLoading(false);
        },
        (error) => {
          console.error("Proposal loading error:", error);
          setError("Unable to load the proposal.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProposal?.();
    };
  }, [proposalId, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">
        <p className="text-unitor-gray-dark">
          Loading proposal...
        </p>
      </main>
    );
  }

  if (error || !proposal) {
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
            href="/student/proposals"
            className="mt-6 inline-block rounded-lg bg-unitor-primary px-5 py-3 font-medium text-white"
          >
            Return to proposals
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/student/proposals"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← My Proposals
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="font-medium text-unitor-primary">
                {proposal.courseCode}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-unitor-black">
                {proposal.title || "Untitled proposal"}
              </h1>

              <p className="mt-3 text-unitor-gray-dark">
                Created by {proposal.studentName}
              </p>
            </div>

            <StatusBadge status={proposal.status} />
          </div>

          <div className="mt-8 border-t border-unitor-gray-soft pt-8">
            <h2 className="text-xl font-bold text-unitor-black">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
              {proposal.description ||
                "No description was provided."}
            </p>
          </div>

          <div className="mt-8 rounded-xl bg-unitor-background p-6">
            <h2 className="text-lg font-bold text-unitor-black">
              Problem topics
            </h2>

            <p className="mt-2 text-unitor-gray-dark">
              {proposal.problemTopics || "Not provided"}
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold text-unitor-black">
              Academic information
            </h2>

            <div className="mt-6 space-y-4">
              <InformationRow
                label="Course code"
                value={proposal.courseCode}
              />

              <InformationRow
                label="Faculty initial"
                value={proposal.facultyInitial}
              />

              <InformationRow
                label="University"
                value={proposal.university}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold text-unitor-black">
              Schedule and budget
            </h2>

            <div className="mt-6 space-y-4">
              <InformationRow
                label="Budget"
                value={`৳${proposal.budget}`}
              />

              <InformationRow
                label="Estimated hours"
                value={`${proposal.estimatedHours}`}
              />

              <InformationRow
                label="Date"
                value={
                  proposal.dateFrom === proposal.dateTo
                    ? proposal.dateFrom
                    : `${proposal.dateFrom} – ${proposal.dateTo}`
                }
              />

              <InformationRow
                label="Time"
                value={`${proposal.timeFrom} – ${proposal.timeTo}`}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-unitor-black">
            Proposal progress
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <ProgressItem
              label="Tutor interest"
              value={`${proposal.willingToTeach} tutor${
                proposal.willingToTeach === 1 ? "" : "s"
              }`}
            />

            <ProgressItem
              label="Payment status"
              value={proposal.paymentStatus}
            />

            <ProgressItem
              label="Tutor selected"
              value={
                proposal.selectedTutorId ? "Yes" : "Not yet"
              }
            />
          </div>
        </section>

        <Link
        href={`/student/proposals/${proposal.id}/applications`}
        className="mt-8 block w-full rounded-lg bg-unitor-primary px-6 py-3 text-center font-medium text-white hover:bg-unitor-primary-hover">
        View Tutor Applications ({proposal.willingToTeach})
        </Link>

        {(proposal.createdAt || proposal.updatedAt) && (
          <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-6 text-sm text-unitor-gray-dark">
            {proposal.createdAt && (
              <p>
                Created:{" "}
                {formatTimestamp(proposal.createdAt)}
              </p>
            )}

            {proposal.updatedAt && (
              <p className="mt-2">
                Last updated:{" "}
                {formatTimestamp(proposal.updatedAt)}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-unitor-gray-soft pb-3">
      <span className="text-unitor-gray-dark">{label}</span>

      <span className="text-right font-medium text-unitor-black">
        {value || "Not provided"}
      </span>
    </div>
  );
}

function ProgressItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-unitor-background p-5">
      <p className="text-sm text-unitor-gray-dark">{label}</p>

      <p className="mt-2 font-bold capitalize text-unitor-black">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let classes = "bg-unitor-gray-soft text-unitor-gray-dark";

  if (
    normalizedStatus === "open" ||
    normalizedStatus === "active"
  ) {
    classes = "bg-unitor-background text-unitor-primary-hover";
  } else if (
    normalizedStatus === "pending" ||
    normalizedStatus === "in progress"
  ) {
    classes = "bg-amber-50 text-amber-700";
  } else if (normalizedStatus === "completed") {
    classes = "bg-unitor-background text-unitor-primary-hover";
  } else if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "rejected"
  ) {
    classes = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}

function formatTimestamp(timestamp: Timestamp) {
  return timestamp.toDate().toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}