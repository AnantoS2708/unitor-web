"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface TutorProfile {
  fullName: string;
  universityEmail: string;
  universityName: string;
  major: string;
  profileImageUrl: string;
  tutorStatus: string;
  roles: string[];
  courseCodesToTeach: string;
  courses: string[];
}

interface AvailableProposal {
  id: string;
  title: string;
  courseCode: string;
  description: string;
  budget: number;
  estimatedHours: number;
  dateFrom: string;
  dateTo: string;
  studentName: string;
  status: string;
  createdAt?: Timestamp;
}

export default function TutorDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<TutorProfile | null>(null);

  const [availableProposals, setAvailableProposals] =
    useState<AvailableProposal[]>([]);

  const [applicationCount, setApplicationCount] =
    useState(0);

  const [activeChatCount, setActiveChatCount] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeProposals:
      | (() => void)
      | undefined;
    let unsubscribeApplications:
      | (() => void)
      | undefined;
    let unsubscribeChats: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        unsubscribeProfile = onSnapshot(
          doc(firestore, "users", user.uid),
          (snapshot) => {
            if (!snapshot.exists()) {
              router.replace("/login");
              return;
            }

            const data = snapshot.data();
            const roles = data.roles ?? [];
            const tutorStatus = (
              data.tutorStatus ?? ""
            ).toLowerCase();

            if (
              !roles.includes("tutor") ||
              tutorStatus !== "approved"
            ) {
              router.replace(
                "/student/dashboard"
              );
              return;
            }

            setProfile({
              fullName: data.fullName ?? "Tutor",
              universityEmail:
                data.universityEmail ??
                user.email ??
                "",
              universityName:
                data.universityName ?? "",
              major: data.major ?? "",
              profileImageUrl:
                data.profileImageUrl ?? "",
              tutorStatus:
                data.tutorStatus ?? "",
              roles,
              courseCodesToTeach:
                data.courseCodesToTeach ?? "",
              courses: data.courses ?? [],
            });

            setLoading(false);
          },
          (error) => {
            console.error(
              "Tutor profile error:",
              error
            );

            setError(
              "Unable to load your tutor profile."
            );

            setLoading(false);
          }
        );

        unsubscribeProposals = onSnapshot(
          collection(firestore, "proposals"),
          (snapshot) => {
            const proposalList = snapshot.docs
              .map((proposalDocument) => {
                const data =
                  proposalDocument.data();

                return {
                  id: proposalDocument.id,
                  title: data.title ?? "",
                  courseCode:
                    data.courseCode ?? "",
                  description:
                    data.description ?? "",
                  budget: data.budget ?? 0,
                  estimatedHours:
                    data.estimatedHours ?? 0,
                  dateFrom:
                    data.dateFrom ?? "",
                  dateTo: data.dateTo ?? "",
                  studentName:
                    data.studentName ??
                    "Student",
                  status:
                    data.status ?? "unknown",
                  createdAt: data.createdAt,
                } as AvailableProposal;
              })
              .filter((proposal) => {
                const status =
                  proposal.status.toLowerCase();

                return (
                  status === "open" ||
                  status === "active" ||
                  status === "pending"
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

            setAvailableProposals(proposalList);
          },
          (error) => {
            console.error(
              "Available proposals error:",
              error
            );
          }
        );

        const applicationsQuery = query(
          collection(firestore, "jobProposals"),
          where("tutorId", "==", user.uid)
        );

        unsubscribeApplications = onSnapshot(
          applicationsQuery,
          (snapshot) => {
            setApplicationCount(snapshot.size);
          }
        );

        const chatsQuery = query(
          collection(firestore, "chats"),
          where("tutorId", "==", user.uid)
        );

        unsubscribeChats = onSnapshot(
          chatsQuery,
          (snapshot) => {
            const activeCount =
              snapshot.docs.filter(
                (chatDocument) =>
                  chatDocument.data().isActive ===
                  true
              ).length;

            setActiveChatCount(activeCount);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
      unsubscribeProposals?.();
      unsubscribeApplications?.();
      unsubscribeChats?.();
    };
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading tutor dashboard...
        </p>
      </main>
    );
  }

  const firstName =
    profile?.fullName.split(" ")[0] || "Tutor";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor Tutor
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/tutor/dashboard"
              className="font-semibold text-emerald-600"
            >
              Dashboard
            </Link>

            <Link
              href="/tutor/proposals"
              className="text-slate-600 hover:text-emerald-600"
            >
              Available Proposals
            </Link>

            <Link
              href="/tutor/applications"
              className="text-slate-600 hover:text-emerald-600"
            >
              Applications
            </Link>

            <Link
              href="/tutor/messages"
              className="text-slate-600 hover:text-emerald-600"
            >
              Messages
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() =>
                router.push("/role-selection")
              }
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              Switch view
            </button>

            <Link href="/tutor/profile">
              {profile?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profileImageUrl}
                  alt={profile.fullName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-600">
                  {profile?.fullName
                    .charAt(0)
                    .toUpperCase() || "T"}
                </div>
              )}
            </Link>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 md:hidden"
          >
            ☰
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link href="/tutor/dashboard">
                Dashboard
              </Link>

              <Link href="/tutor/proposals">
                Available Proposals
              </Link>

              <Link href="/tutor/applications">
                Applications
              </Link>

              <Link href="/tutor/messages">
                Messages
              </Link>

              <Link href="/tutor/profile">
                Profile
              </Link>

              <button
                onClick={() =>
                  router.push("/role-selection")
                }
                className="text-left font-medium text-emerald-600"
              >
                Switch to Student View
              </button>

              <button
                onClick={handleLogout}
                className="text-left font-medium text-red-600"
              >
                Log out
              </button>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <p className="mb-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="rounded-3xl bg-gradient-to-r from-emerald-700 to-emerald-500 p-8 text-white shadow-sm md:p-10">
          <p className="font-medium text-emerald-100">
            Tutor Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Welcome back, {firstName}
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-emerald-50">
            Browse academic proposals, support fellow
            students and manage your tutoring sessions.
          </p>

          <Link
            href="/tutor/proposals"
            className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Browse Available Proposals
          </Link>
        </section>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Available proposals"
            value={availableProposals.length}
            href="/tutor/proposals"
          />

          <StatCard
            label="My applications"
            value={applicationCount}
            href="/tutor/applications"
          />

          <StatCard
            label="Active sessions"
            value={activeChatCount}
            href="/tutor/messages"
          />
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="font-semibold text-emerald-600">
                Latest opportunities
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Available Proposals
              </h2>
            </div>

            <Link
              href="/tutor/proposals"
              className="font-semibold text-emerald-600 hover:underline"
            >
              View all →
            </Link>
          </div>

          {availableProposals.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-slate-600">
                No proposals are currently available.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {availableProposals
                .slice(0, 3)
                .map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                  />
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-500 hover:shadow-md"
    >
      <p className="text-slate-500">{label}</p>

      <p className="mt-3 text-4xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-4 font-medium text-emerald-600">
        View details →
      </p>
    </Link>
  );
}

function ProposalCard({
  proposal,
}: {
  proposal: AvailableProposal;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-semibold text-emerald-600">
        {proposal.courseCode}
      </p>

      <h3 className="mt-2 text-xl font-bold text-slate-900">
        {proposal.title || "Untitled proposal"}
      </h3>

      <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
        {proposal.description ||
          "No description provided."}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
        <div>
          <p className="text-sm text-slate-500">
            Budget
          </p>

          <p className="font-bold text-slate-900">
            ৳{proposal.budget}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">
            Student
          </p>

          <p className="font-semibold text-slate-900">
            {proposal.studentName}
          </p>
        </div>
      </div>

      <Link
        href={`/tutor/proposals/${proposal.id}`}
        className="mt-6 block rounded-lg bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-700"
      >
        View Proposal
      </Link>
    </article>
  );
}