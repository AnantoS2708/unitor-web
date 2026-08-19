"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { UnitorBrand } from "@/components/UnitorBrand";
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

  /* =========================================================
     PROFILE
  ========================================================= */

  const [
    profile,
    setProfile,
  ] =
    useState<TutorProfile | null>(
      null
    );

  /* =========================================================
     PROPOSALS
  ========================================================= */

  const [
    allProposals,
    setAllProposals,
  ] =
    useState<AvailableProposal[]>(
      []
    );

  /* =========================================================
     ACTIVE SESSIONS
  ========================================================= */

  const [
    activeChatCount,
    setActiveChatCount,
  ] = useState(0);

  /* =========================================================
     UI
  ========================================================= */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

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
          /* ===============================================
             USER NOT LOGGED IN
          =============================================== */

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
                          String(
                            role
                          )
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

                /* -----------------------------------------
                   TUTOR ACCESS CHECK
                ----------------------------------------- */

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

                /* -----------------------------------------
                   REMOVE DUPLICATES
                ----------------------------------------- */

                approvedCourses =
                  Array.from(
                    new Set(
                      approvedCourses
                    )
                  );

                /* -----------------------------------------
                   SAVE PROFILE
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
             AVAILABLE PROPOSALS
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
                          normalizeCourseCode(
                            String(
                              data.courseCode ??
                                ""
                            )
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
                   NEWEST FIRST
                ----------------------------------------- */

                proposalList.sort(
                  (
                    first,
                    second
                  ) =>
                    (second.createdAt
                      ?.toMillis() ??
                      0) -
                    (first.createdAt
                      ?.toMillis() ??
                      0)
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
             ACTIVE CHATS
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
            normalizeCourseCode
          )
        );

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

          /* -----------------------------------------
             MUST MATCH APPROVED COURSE
          ----------------------------------------- */

          if (
            !approvedCourseSet.has(
              proposalCourse
            )
          ) {
            return false;
          }

          /* -----------------------------------------
             PROPOSAL STATUS
          ----------------------------------------- */

          const status =
            proposal.status
              .trim()
              .toLowerCase();

          return [
            "open",
            "active",
            "available",
            "pending",
          ].includes(
            status
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
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">

        <p className="text-unitor-gray-dark">
          Loading tutor dashboard...
        </p>

      </main>
    );
  }

  /* =========================================================
     FIRST NAME
  ========================================================= */

  const firstName =
    profile?.fullName
      ?.trim()
      .split(
        /\s+/
      )[0] ||
    "Tutor";

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-unitor-background">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO */}

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor Tutor" />
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION

              Course Request removed from navigation.
          ================================================= */}

          <nav className="hidden items-center gap-8 md:flex">

            <Link
              href="/tutor/dashboard"
              className="font-medium text-unitor-primary"
            >
              Dashboard
            </Link>

            <Link
              href="/tutor/proposals"
              className="text-unitor-gray-dark transition hover:text-unitor-primary"
            >
              Available Proposals
            </Link>

            <Link
              href="/tutor/messages"
              className="text-unitor-gray-dark transition hover:text-unitor-primary"
            >
              Messages
            </Link>

            <Link
              href="/tutor/card"
              className="text-unitor-gray-dark transition hover:text-unitor-primary"
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
              className="rounded-lg border border-unitor-primary px-4 py-2 text-sm font-medium text-unitor-primary transition hover:bg-unitor-background"
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
                  className="h-10 w-10 rounded-full border border-unitor-gray-light object-cover"
                />

              ) : (

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">

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
            className="rounded-lg border border-unitor-gray-light px-3 py-2 text-unitor-gray-dark md:hidden"
            aria-label={
              mobileMenuOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={
              mobileMenuOpen
            }
          >
            {mobileMenuOpen
              ? "✕"
              : "☰"}
          </button>

        </div>

        {/* ===================================================
            MOBILE MENU

            Course Request removed from mobile menu.
        =================================================== */}

        {mobileMenuOpen && (

          <nav className="border-t border-unitor-gray-light bg-white px-6 py-4 md:hidden">

            <div className="flex flex-col gap-4">

              <MobileLink
                href="/tutor/dashboard"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="font-medium text-unitor-primary"
              >
                Dashboard
              </MobileLink>

              <MobileLink
                href="/tutor/proposals"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Available Proposals
              </MobileLink>

              <MobileLink
                href="/tutor/messages"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Messages
              </MobileLink>

              <MobileLink
                href="/tutor/card"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                💳 My Card
              </MobileLink>

              <MobileLink
                href="/tutor/profile"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Profile
              </MobileLink>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(
                    false
                  );

                  router.push(
                    "/role-selection"
                  );
                }}
                className="text-left font-medium text-unitor-primary"
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

            Only Browse Available Proposals button here.
        =================================================== */}

        <section className="rounded-3xl bg-gradient-to-r from-unitor-primary-hover to-unitor-primary p-8 text-white shadow-sm md:p-10">

          <p className="font-medium text-unitor-blue-light">
            Tutor Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Welcome back,{" "}
            {firstName}
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-unitor-background">
            Browse academic proposals for
            the courses you are approved
            to teach and manage your
            tutoring sessions.
          </p>

          <div className="mt-7">

            <Link
              href="/tutor/proposals"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-medium text-unitor-primary-hover transition hover:bg-unitor-background"
            >
              Browse Available Proposals
            </Link>

          </div>

        </section>

        {/* ===================================================
            APPROVED COURSES

            THIS IS THE ONLY COURSE REQUEST BUTTON.
        =================================================== */}

        <section className="mt-6 rounded-2xl border border-unitor-blue-light bg-unitor-background p-5">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            {/* COURSES */}

            <div>

              <p className="text-sm font-medium text-unitor-primary">
                Your approved teaching courses
              </p>

              {profile &&
              profile
                .courseCodesToTeach
                .length >
                0 ? (

                <div className="mt-3 flex flex-wrap gap-2">

                  {profile.courseCodesToTeach.map(
                    (
                      course
                    ) => (

                      <span
                        key={
                          course
                        }
                        className="rounded-full border border-unitor-blue-light bg-white px-4 py-2 text-sm font-bold text-unitor-primary-hover shadow-sm"
                      >
                        {course}
                      </span>

                    )
                  )}

                </div>

              ) : (

                <p className="mt-2 text-sm text-unitor-gray-dark">
                  No courses have been
                  approved for your tutor
                  account.
                </p>

              )}

            </div>

            {/* ===============================================
                ONLY COURSE REQUEST BUTTON
            =============================================== */}

            <Link
              href="/tutor/course-request"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-unitor-primary bg-white px-5 py-3 font-medium text-unitor-primary shadow-sm transition hover:bg-unitor-primary hover:text-white"
            >
              + Request Extra Course
            </Link>

          </div>

        </section>

        {/* ===================================================
            DASHBOARD STATS

            Only 2 cards now.
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

          {/* TITLE */}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <p className="font-medium text-unitor-primary">
                Latest opportunities
              </p>

              <h2 className="mt-1 text-2xl font-bold text-unitor-black">
                Available Proposals
              </h2>

              <p className="mt-2 text-sm text-unitor-gray-dark">
                Only proposals matching
                your approved courses
                appear here.
              </p>

            </div>

            <Link
              href="/tutor/proposals"
              className="font-medium text-unitor-primary hover:underline"
            >
              View all →
            </Link>

          </div>

          {/* =================================================
              NO PROPOSALS

              No course request button here.
          ================================================= */}

          {availableProposals.length ===
          0 ? (

            <div className="mt-6 rounded-2xl border border-unitor-gray-light bg-white p-10 text-center shadow-sm">

              <div className="text-4xl">
                📚
              </div>

              <h3 className="mt-4 font-bold text-unitor-black">
                No proposals available
              </h3>

              <p className="mt-2 text-unitor-gray-dark">
                No proposals are currently
                available for your approved
                courses.
              </p>

            </div>

          ) : (

            /* ===============================================
               PROPOSALS
            =============================================== */

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
   MOBILE LINK
========================================================= */

function MobileLink({
  href,
  onClick,
  className =
    "text-unitor-gray-dark",
  children,
}: {
  href: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={
        href
      }
      onClick={
        onClick
      }
      className={
        className
      }
    >
      {children}
    </Link>
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
      href={
        href
      }
      className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-unitor-primary hover:shadow-md"
    >

      <p className="text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold text-unitor-black">
        {value}
      </p>

      <p className="mt-4 font-medium text-unitor-primary">
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
  proposal:
    AvailableProposal;
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">

      {/* COURSE */}

      <p className="font-medium text-unitor-primary">
        {
          proposal.courseCode
        }
      </p>

      {/* TITLE */}

      <h3 className="mt-2 text-xl font-bold text-unitor-black">

        {proposal.title ||
          "Untitled proposal"}

      </h3>

      {/* DESCRIPTION */}

      <p className="mt-3 line-clamp-3 leading-7 text-unitor-gray-dark">

        {proposal.description ||
          "No description provided."}

      </p>

      {/* DETAILS */}

      <div className="mt-5 flex items-center justify-between border-t border-unitor-gray-soft pt-5">

        {/* BUDGET */}

        <div>

          <p className="text-sm text-unitor-gray-dark">
            Budget
          </p>

          <p className="font-bold text-unitor-black">
            ৳
            {formatMoney(
              proposal.budget
            )}
          </p>

        </div>

        {/* STUDENT */}

        <div className="text-right">

          <p className="text-sm text-unitor-gray-dark">
            Student
          </p>

          <p className="font-medium text-unitor-black">
            {
              proposal.studentName
            }
          </p>

        </div>

      </div>

      {/* VIEW */}

      <Link
        href={`/tutor/proposals/${proposal.id}`}
        className="mt-6 block rounded-lg bg-unitor-primary px-4 py-3 text-center font-medium text-white transition hover:bg-unitor-primary-hover"
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
   MONEY
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