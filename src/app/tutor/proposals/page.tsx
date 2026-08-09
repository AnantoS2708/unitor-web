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
  willingToTeach: number;
  createdAt?: Timestamp;
}

export default function TutorProposalsPage() {
  const router = useRouter();

  const [proposals, setProposals] = useState<
    Proposal[]
  >([]);

  const [
    appliedProposalIds,
    setAppliedProposalIds,
  ] = useState<string[]>([]);

  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("");

  const [proposalsLoaded, setProposalsLoaded] =
    useState(false);

  const [applicationsLoaded, setApplicationsLoaded] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProposals:
      | (() => void)
      | undefined;

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

        try {
          const profileSnapshot = await getDoc(
            doc(firestore, "users", user.uid)
          );

          if (!profileSnapshot.exists()) {
            router.replace("/login");
            return;
          }

          const profile = profileSnapshot.data();
          const roles = profile.roles ?? [];

          if (
            !roles.includes("tutor") ||
            profile.tutorStatus
              ?.toLowerCase() !== "approved"
          ) {
            router.replace("/student/dashboard");
            return;
          }
        } catch (error) {
          console.error(
            "Tutor verification error:",
            error
          );

          setError(
            "Unable to verify your tutor account."
          );

          return;
        }

        unsubscribeProposals = onSnapshot(
          collection(firestore, "proposals"),
          (snapshot) => {
            const proposalList = snapshot.docs
              .map((proposalDocument) => {
                const data =
                  proposalDocument.data();

                return {
                  id: proposalDocument.id,
                  studentId:
                    data.studentId ?? "",
                  studentName:
                    data.studentName ??
                    "Student",
                  title: data.title ?? "",
                  courseCode:
                    data.courseCode ?? "",
                  facultyInitial:
                    data.facultyInitial ?? "",
                  problemTopics:
                    data.problemTopics ?? "",
                  description:
                    data.description ?? "",
                  budget: data.budget ?? 0,
                  estimatedHours:
                    data.estimatedHours ?? 0,
                  dateFrom:
                    data.dateFrom ?? "",
                  dateTo: data.dateTo ?? "",
                  timeFrom:
                    data.timeFrom ?? "",
                  timeTo: data.timeTo ?? "",
                  university:
                    data.university ?? "",
                  status:
                    data.status ?? "unknown",
                  willingToTeach:
                    data.willingToTeach ?? 0,
                  createdAt:
                    data.createdAt,
                } as Proposal;
              })
              .filter((proposal) => {
                const status =
                  proposal.status.toLowerCase();

                const available =
                  status === "open" ||
                  status === "active" ||
                  status === "pending";

                const belongsToAnotherStudent =
                  proposal.studentId !== user.uid;

                return (
                  available &&
                  belongsToAnotherStudent
                );
              });

            proposalList.sort(
              (first, second) => {
                const firstTime =
                  first.createdAt?.toMillis?.() ??
                  0;

                const secondTime =
                  second.createdAt?.toMillis?.() ??
                  0;

                return secondTime - firstTime;
              }
            );

            setProposals(proposalList);
            setProposalsLoaded(true);
          },
          (error) => {
            console.error(
              "Proposal loading error:",
              error
            );

            setError(
              "Unable to load available proposals."
            );

            setProposalsLoaded(true);
          }
        );

        const applicationsQuery = query(
          collection(firestore, "jobProposals"),
          where("tutorId", "==", user.uid)
        );

        unsubscribeApplications = onSnapshot(
          applicationsQuery,
          (snapshot) => {
            const proposalIds = snapshot.docs
              .map(
                (applicationDocument) =>
                  applicationDocument.data()
                    .proposalId ?? ""
              )
              .filter(Boolean);

            setAppliedProposalIds(proposalIds);
            setApplicationsLoaded(true);
          },
          (error) => {
            console.error(
              "Application loading error:",
              error
            );

            setApplicationsLoaded(true);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProposals?.();
      unsubscribeApplications?.();
    };
  }, [router]);

  const loading =
    !proposalsLoaded || !applicationsLoaded;

  const courseCodes = Array.from(
    new Set(
      proposals
        .map((proposal) => proposal.courseCode)
        .filter(Boolean)
    )
  ).sort();

  const filteredProposals = proposals.filter(
    (proposal) => {
      const search = searchText
        .trim()
        .toLowerCase();

      const matchesSearch =
        !search ||
        proposal.title
          .toLowerCase()
          .includes(search) ||
        proposal.courseCode
          .toLowerCase()
          .includes(search) ||
        proposal.problemTopics
          .toLowerCase()
          .includes(search) ||
        proposal.description
          .toLowerCase()
          .includes(search);

      const matchesCourse =
        !courseFilter ||
        proposal.courseCode === courseFilter;

      return matchesSearch && matchesCourse;
    }
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="font-semibold text-emerald-600">
            Tutoring opportunities
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Available Proposals
          </h1>

          <p className="mt-3 text-slate-600">
            Find students who need academic support in
            courses you know.
          </p>
        </div>

        <section className="mt-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_240px]">
          <div>
            <label
              htmlFor="proposalSearch"
              className="sr-only"
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
              placeholder="Search by title, course or topic"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="courseFilter"
              className="sr-only"
            >
              Filter by course
            </label>

            <select
              id="courseFilter"
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All courses</option>

              {courseCodes.map((courseCode) => (
                <option
                  key={courseCode}
                  value={courseCode}
                >
                  {courseCode}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading available proposals...
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
          filteredProposals.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">📚</div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                No matching proposals
              </h2>

              <p className="mt-3 text-slate-600">
                Try changing your search or course
                filter.
              </p>
            </section>
          )}

        {!loading &&
          filteredProposals.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  alreadyApplied={appliedProposalIds.includes(
                    proposal.id
                  )}
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
  alreadyApplied,
}: {
  proposal: Proposal;
  alreadyApplied: boolean;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-emerald-600">
            {proposal.courseCode}
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            {proposal.title || "Untitled proposal"}
          </h2>
        </div>

        {alreadyApplied && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Applied
          </span>
        )}
      </div>

      {proposal.problemTopics && (
        <p className="mt-3 text-sm font-medium text-slate-500">
          {proposal.problemTopics}
        </p>
      )}

      <p className="mt-4 line-clamp-3 flex-1 leading-7 text-slate-600">
        {proposal.description ||
          "No description provided."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
        <InformationItem
          label="Budget"
          value={`৳${proposal.budget}`}
        />

        <InformationItem
          label="Hours"
          value={`${proposal.estimatedHours}`}
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
          label="Applications"
          value={`${proposal.willingToTeach}`}
        />
      </div>

      <div className="mt-5">
        <p className="text-sm text-slate-500">
          Student
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {proposal.studentName}
        </p>
      </div>

      <Link
        href={`/tutor/proposals/${proposal.id}`}
        className={`mt-6 block rounded-lg px-5 py-3 text-center font-semibold ${
          alreadyApplied
            ? "border border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {alreadyApplied
          ? "View Application"
          : "View and Apply"}
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
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}