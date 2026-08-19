"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

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
  status: string;
  paymentStatus: string;
  willingToTeach: number;
  selectedTutorId: string;
  createdAt?: Timestamp;
}

export default function StudentProposalsPage() {
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProposals: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const proposalsQuery = query(
        collection(firestore, "proposals"),
        where("studentId", "==", user.uid)
      );

      unsubscribeProposals = onSnapshot(
        proposalsQuery,
        (snapshot) => {
          const proposalList = snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
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
              status: data.status ?? "unknown",
              paymentStatus: data.paymentStatus ?? "pending",
              willingToTeach: data.willingToTeach ?? 0,
              selectedTutorId: data.selectedTutorId ?? "",
              createdAt: data.createdAt,
            } as Proposal;
          });

          proposalList.sort((first, second) => {
            const firstTime =
              first.createdAt?.toMillis?.() ?? 0;

            const secondTime =
              second.createdAt?.toMillis?.() ?? 0;

            return secondTime - firstTime;
          });

          setProposals(proposalList);
          setError("");
          setLoading(false);
        },
        (error) => {
          console.error("Proposal loading error:", error);
          setError("Unable to load your proposals.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProposals?.();
    };
  }, [router]);

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

          <div className="flex items-center gap-4">
            <Link
              href="/student/dashboard"
              className="hidden font-medium text-unitor-gray-dark hover:text-unitor-primary sm:block"
            >
              Dashboard
            </Link>

            <Link
              href="/student/proposals/create"
              className="rounded-lg bg-unitor-primary px-4 py-2 font-medium text-white hover:bg-unitor-primary-hover"
            >
              Create Proposal
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="font-medium text-unitor-primary">
            Student proposals
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            My Proposals
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Review your academic requests, tutor interest and payment
            status.
          </p>
        </div>

        {loading && (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading your proposals...
            </p>
          </div>
        )}

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && proposals.length === 0 && (
          <section className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📝</div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No proposals yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-unitor-gray-dark">
              Create your first proposal to connect with a suitable
              peer tutor.
            </p>

            <Link
              href="/student/proposals/create"
              className="mt-7 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
            >
              Create your first proposal
            </Link>
          </section>
        )}

        {!loading && proposals.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProposalCard({
  proposal,
}: {
  proposal: Proposal;
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-unitor-primary">
            {proposal.courseCode}
          </p>

          <h2 className="mt-1 text-xl font-bold text-unitor-black">
            {proposal.title || "Untitled proposal"}
          </h2>

          {proposal.facultyInitial && (
            <p className="mt-1 text-sm text-unitor-gray-dark">
              Faculty: {proposal.facultyInitial}
            </p>
          )}
        </div>

        <StatusBadge status={proposal.status} />
      </div>

      <p className="mt-5 line-clamp-3 leading-7 text-unitor-gray-dark">
        {proposal.description || "No description provided."}
      </p>

      {proposal.problemTopics && (
        <div className="mt-5 rounded-lg bg-unitor-background p-4">
          <p className="text-sm text-unitor-gray-dark">
            Problem topics
          </p>

          <p className="mt-1 font-medium text-unitor-black">
            {proposal.problemTopics}
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <InformationItem
          label="Budget"
          value={`৳${proposal.budget}`}
        />

        <InformationItem
          label="Estimated time"
          value={`${proposal.estimatedHours} hour${
            proposal.estimatedHours === 1 ? "" : "s"
          }`}
        />

        <InformationItem
          label="Date"
          value={
            proposal.dateFrom === proposal.dateTo
              ? proposal.dateFrom
              : `${proposal.dateFrom} – ${proposal.dateTo}`
          }
        />

        <InformationItem
          label="Time"
          value={`${proposal.timeFrom} – ${proposal.timeTo}`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-unitor-gray-soft pt-5">
        <div>
          <p className="text-sm text-unitor-gray-dark">
            Tutor interest
          </p>

          <p className="font-medium text-unitor-black">
            {proposal.willingToTeach} tutor
            {proposal.willingToTeach === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-unitor-gray-dark">
            Payment
          </p>

          <PaymentBadge status={proposal.paymentStatus} />
        </div>
      </div>

      {proposal.createdAt && (
        <p className="mt-5 text-xs text-unitor-gray-dark/70">
          Created{" "}
          {proposal.createdAt.toDate().toLocaleDateString(
            "en-BD",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          )}
        </p>
      )}
      <Link
      href={`/student/proposals/${proposal.id}`}
      className="mt-6 block w-full rounded-lg border border-unitor-primary px-4 py-3 text-center font-medium text-unitor-primary hover:bg-unitor-background"
      >
      View details
      </Link>
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
      <p className="text-sm text-unitor-gray-dark">{label}</p>

      <p className="mt-1 font-medium text-unitor-black">
        {value || "Not provided"}
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

  let classes =
    "bg-unitor-gray-soft text-unitor-gray-dark";

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
      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}

function PaymentBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let classes = "bg-amber-50 text-amber-700";

  if (
    normalizedStatus === "successful" ||
    normalizedStatus === "approved" ||
    normalizedStatus === "paid"
  ) {
    classes = "bg-unitor-background text-unitor-primary-hover";
  } else if (
    normalizedStatus === "failed" ||
    normalizedStatus === "rejected"
  ) {
    classes = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium capitalize ${classes}`}
    >
      {status || "pending"}
    </span>
  );
}