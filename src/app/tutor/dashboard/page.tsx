"use client";

import { useEffect, useMemo, useState } from "react";
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

import {
  auth,
  firestore,
} from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

interface TutorProfile {
  fullName: string;
  universityEmail: string;
  universityName: string;
  major: string;
  profileImageUrl: string;
  tutorStatus: string;
  roles: string[];
  courseCodesToTeach: string[];
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

/* =========================================================
   PAGE
========================================================= */

export default function TutorDashboardPage() {
  const router = useRouter();

  const [
    profile,
    setProfile,
  ] =
    useState<TutorProfile | null>(
      null
    );

  const [
    allProposals,
    setAllProposals,
  ] =
    useState<AvailableProposal[]>(
      []
    );

  const [
    activeChatCount,
    setActiveChatCount,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =========================================================
     FIREBASE LISTENERS
  ========================================================= */

  useEffect(() => {
    let unsubscribeProfile:
      | (() => void)
      | undefined;

    let unsubscribeProposals:
      | (() => void)
      | undefined;

    let unsubscribeChats:
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

          /* =================================================
             TUTOR PROFILE
          ================================================= */

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

                const data =
                  snapshot.data();

                /* -----------------------------------------
                   ROLES
                ----------------------------------------- */

                const roles =
                  Array.isArray(
                    data.roles
                  )
                    ? data.roles.map(
                        (
                          role: unknown
                        ) =>
                          String(role)
                            .trim()
                            .toLowerCase()
                      )
                    : [];

                /* -----------------------------------------
                   TUTOR STATUS
                ----------------------------------------- */

                const tutorStatus =
                  String(
                    data.tutorStatus ??
                      ""
                  )
                    .trim()
                    .toLowerCase();

                /*
                 * Tutor must:
                 *
                 * 1. Have tutor role
                 * 2. Be approved
                 */

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

                /* -----------------------------------------
                   APPROVED COURSES
                ----------------------------------------- */

                let approvedCourses:
                  string[] = [];

                /*
                 * IMPORTANT:
                 *
                 * Use ONLY:
                 * courseCodesToTeach
                 */

                if (
                  Array.isArray(
                    data.courseCodesToTeach
                  )
                ) {
                  approvedCourses =
                    data.courseCodesToTeach
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
                  typeof data.courseCodesToTeach ===
                  "string"
                ) {
                  approvedCourses =
                    data.courseCodesToTeach
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

                /* -----------------------------------------
                   SET PROFILE
                ----------------------------------------- */

                setProfile({
                  fullName:
                    String(
                      data.fullName ??
                        "Tutor"
                    ),

                  universityEmail:
                    String(
                      data.universityEmail ??
                        user.email ??
                        ""
                    ),

                  universityName:
                    String(
                      data.universityName ??
                        ""
                    ),

                  major:
                    String(
                      data.major ??
                        ""
                    ),

                  profileImageUrl:
                    String(
                      data.profileImageUrl ??
                        ""
                    ),

                  tutorStatus,

                  roles,

                  courseCodesToTeach:
                    approvedCourses,
                });

                setLoading(
                  false
                );
              },

              (
                profileError
              ) => {
                console.error(
                  "Tutor profile error:",
                  profileError
                );

                setError(
                  "Unable to load your tutor profile."
                );

                setLoading(
                  false
                );
              }
            );

          /* =================================================
             LOAD PROPOSALS
          ================================================= */

          unsubscribeProposals =
            onSnapshot(
              collection(
                firestore,
                "proposals"
              ),

              (snapshot) => {
                const proposalList =
                  snapshot.docs.map(
                    (
                      proposalDocument
                    ) => {
                      const data =
                        proposalDocument.data();

                      return {
                        id:
                          proposalDocument.id,

                        title:
                          String(
                            data.title ??
                              ""
                          ),

                        courseCode:
                          String(
                            data.courseCode ??
                              ""
                          ),

                        description:
                          String(
                            data.description ??
                              ""
                          ),

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
                          String(
                            data.dateFrom ??
                              ""
                          ),

                        dateTo:
                          String(
                            data.dateTo ??
                              ""
                          ),

                        studentName:
                          String(
                            data.studentName ??
                              "Student"
                          ),

                        status:
                          String(
                            data.status ??
                              "unknown"
                          ),

                        createdAt:
                          data.createdAt instanceof
                          Timestamp
                            ? data.createdAt
                            : undefined,
                      } as AvailableProposal;
                    }
                  );

                /* -----------------------------------------
                   NEWEST PROPOSALS FIRST
                ----------------------------------------- */

                proposalList.sort(
                  (
                    first,
                    second
                  ) => {
                    const firstTime =
                      first.createdAt
                        ?.toMillis() ??
                      0;

                    const secondTime =
                      second.createdAt
                        ?.toMillis() ??
                      0;

                    return (
                      secondTime -
                      firstTime
                    );
                  }
                );

                setAllProposals(
                  proposalList
                );
              },

              (
                proposalError
              ) => {
                console.error(
                  "Available proposals error:",
                  proposalError
                );

                setError(
                  "Unable to load available proposals."
                );
              }
            );

          /* =================================================
             ACTIVE CHATS / SESSIONS
          ================================================= */

          const chatsQuery =
            query(
              collection(
                firestore,
                "chats"
              ),

              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribeChats =
            onSnapshot(
              chatsQuery,

              (snapshot) => {
                const activeCount =
                  snapshot.docs.filter(
                    (
                      chatDocument
                    ) =>
                      chatDocument.data()
                        .isActive ===
                      true
                  ).length;

                setActiveChatCount(
                  activeCount
                );
              },

              (
                chatError
              ) => {
                console.error(
                  "Chats error:",
                  chatError
                );
              }
            );
        }
      );

    /* =======================================================
       CLEANUP
    ======================================================= */

    return () => {
      unsubscribeAuth();

      unsubscribeProfile?.();

      unsubscribeProposals?.();

      unsubscribeChats?.();
    };
  }, [router]);

  /* =========================================================
     AVAILABLE PROPOSALS FILTER
  ========================================================= */

  const availableProposals =
    useMemo(() => {
      if (!profile) {
        return [];
      }

      const approvedCourseSet =
        new Set(
          profile.courseCodesToTeach.map(
            (course) =>
              normalizeCourseCode(
                course
              )
          )
        );

      /*
       * Tutor with no approved
       * course sees no proposals.
       */

      if (
        approvedCourseSet.size ===
        0
      ) {
        return [];
      }

      return allProposals.filter(
        (proposal) => {
          const proposalCourse =
            normalizeCourseCode(
              proposal.courseCode
            );

          /* -------------------------------------
             COURSE MUST MATCH
          ------------------------------------- */

          if (
            !approvedCourseSet.has(
              proposalCourse
            )
          ) {
            return false;
          }

          /* -------------------------------------
             PROPOSAL MUST BE AVAILABLE
          ------------------------------------- */

          const status =
            proposal.status
              .trim()
              .toLowerCase();

          return (
            status === "open" ||
            status === "active" ||
            status ===
              "available" ||
            status === "pending"
          );
        }
      );
    }, [
      allProposals,
      profile,
    ]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await signOut(
        auth
      );

      router.replace(
        "/login"
      );
    } catch (
      logoutError
    ) {
      console.error(
        "Logout error:",
        logoutError
      );

      setError(
        "Unable to log out. Please try again."
      );
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

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
    profile?.fullName
      ?.trim()
      .split(/\s+/)[0] ||
    "Tutor";

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO */}

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor Tutor
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav className="hidden items-center gap-8 md:flex">

            <Link
              href="/tutor/dashboard"
              className="font-semibold text-emerald-600"
            >
              Dashboard
            </Link>

            <Link
              href="/tutor/proposals"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Available Proposals
            </Link>

            <Link
              href="/tutor/messages"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Messages
            </Link>

            <Link
              href="/tutor/card"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              My Card
            </Link>

          </nav>

          {/* =================================================
              DESKTOP RIGHT SIDE
          ================================================= */}

          <div className="hidden items-center gap-3 md:flex">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/role-selection"
                )
              }
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
            >
              Switch view
            </button>

            <Link
              href="/tutor/profile"
              aria-label="Tutor profile"
            >

              {profile?.profileImageUrl ? (

                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profile.profileImageUrl
                  }
                  alt={
                    profile.fullName
                  }
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />

              ) : (

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">

                  {profile?.fullName
                    ?.charAt(0)
                    .toUpperCase() ||
                    "T"}

                </div>

              )}

            </Link>

          </div>

          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(
                (
                  current
                ) =>
                  !current
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

        </div>

        {/* ===================================================
            MOBILE MENU
        =================================================== */}

        {mobileMenuOpen && (

          <nav className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">

            <div className="flex flex-col gap-4">

              <Link
                href="/tutor/dashboard"
                className="font-semibold text-emerald-600"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Dashboard
              </Link>

              <Link
                href="/tutor/proposals"
                className="text-slate-700"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Available Proposals
              </Link>

              <Link
                href="/tutor/messages"
                className="text-slate-700"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Messages
              </Link>

              <Link
                href="/tutor/card"
                className="font-medium text-slate-700"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                💳 My Card
              </Link>

              <Link
                href="/tutor/profile"
                className="text-slate-700"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Profile
              </Link>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/role-selection"
                  )
                }
                className="text-left font-medium text-emerald-600"
              >
                Switch to Student View
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="text-left font-medium text-red-600"
              >
                Log out
              </button>

            </div>

          </nav>

        )}

      </header>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (

          <div className="mb-8 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
            {error}
          </div>

        )}

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="rounded-3xl bg-gradient-to-r from-emerald-700 to-emerald-500 p-8 text-white shadow-sm md:p-10">

          <p className="font-medium text-emerald-100">
            Tutor Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Welcome back,{" "}
            {firstName}
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-emerald-50">
            Browse academic proposals for
            the courses you are approved
            to teach and manage your
            tutoring sessions.
          </p>

          <Link
            href="/tutor/proposals"
            className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Browse Available Proposals
          </Link>

        </section>

        {/* ===================================================
            APPROVED COURSES
        =================================================== */}

        <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

          <p className="text-sm font-semibold text-emerald-600">
            Your approved teaching
            courses
          </p>

          {profile &&
          profile.courseCodesToTeach
            .length > 0 ? (

            <div className="mt-3 flex flex-wrap gap-2">

              {profile.courseCodesToTeach.map(
                (course) => (

                  <span
                    key={course}
                    className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm"
                  >
                    {course}
                  </span>

                )
              )}

            </div>

          ) : (

            <p className="mt-2 text-sm text-slate-600">
              No courses have been
              approved for your tutor
              account.
            </p>

          )}

        </section>

        {/* ===================================================
            DASHBOARD STATS
        =================================================== */}

        <section className="mt-10 grid gap-5 md:grid-cols-2">

          <StatCard
            label="Available proposals"
            value={
              availableProposals.length
            }
            href="/tutor/proposals"
          />

          <StatCard
            label="Active sessions"
            value={
              activeChatCount
            }
            href="/tutor/messages"
          />

        </section>

        {/* ===================================================
            LATEST PROPOSALS
        =================================================== */}

        <section className="mt-10">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <p className="font-semibold text-emerald-600">
                Latest opportunities
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Available Proposals
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Only proposals matching
                your approved courses
                appear here.
              </p>

            </div>

            <Link
              href="/tutor/proposals"
              className="font-semibold text-emerald-600 hover:underline"
            >
              View all →
            </Link>

          </div>

          {/* =================================================
              NO PROPOSALS
          ================================================= */}

          {availableProposals.length ===
          0 ? (

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-4xl">
                📚
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                No proposals available
              </h3>

              <p className="mt-2 text-slate-600">
                No proposals are currently
                available for your approved
                courses.
              </p>

            </div>

          ) : (

            <div className="mt-6 grid gap-6 lg:grid-cols-3">

              {availableProposals
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    proposal
                  ) => (

                    <ProposalCard
                      key={
                        proposal.id
                      }
                      proposal={
                        proposal
                      }
                    />

                  )
                )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

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

      <p className="text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-4 font-medium text-emerald-600">
        View details →
      </p>

    </Link>
  );
}

/* =========================================================
   PROPOSAL CARD
========================================================= */

function ProposalCard({
  proposal,
}: {
  proposal: AvailableProposal;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* COURSE */}

      <p className="font-semibold text-emerald-600">
        {proposal.courseCode}
      </p>

      {/* TITLE */}

      <h3 className="mt-2 text-xl font-bold text-slate-900">

        {proposal.title ||
          "Untitled proposal"}

      </h3>

      {/* DESCRIPTION */}

      <p className="mt-3 line-clamp-3 leading-7 text-slate-600">

        {proposal.description ||
          "No description provided."}

      </p>

      {/* DETAILS */}

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">

        <div>

          <p className="text-sm text-slate-500">
            Budget
          </p>

          <p className="font-bold text-slate-900">
            ৳
            {formatMoney(
              proposal.budget
            )}
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

      {/* BUTTON */}

      <Link
        href={`/tutor/proposals/${proposal.id}`}
        className="mt-6 block rounded-lg bg-emerald-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
      >
        View Proposal
      </Link>

    </article>
  );
}

/* =========================================================
   NORMALIZE COURSE CODE
========================================================= */

function normalizeCourseCode(
  courseCode: string
) {
  return courseCode
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();
}

/* =========================================================
   MONEY FORMAT
========================================================= */

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    Number.isFinite(
      amount
    )
      ? amount
      : 0
  );
}