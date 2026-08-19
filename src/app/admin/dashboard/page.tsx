"use client";

import {
  useEffect,
  useMemo,
  useState,
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
  onSnapshot,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";

/* =========================================================
   ADMIN
========================================================= */

const ADMIN_EMAIL =
  "unitor.4dmin@gmail.com";

/* =========================================================
   TYPES
========================================================= */

interface UserRecord {
  id: string;
  roles: string[];
  tutorStatus: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  platformFee: number;
  status: string;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminDashboardPage() {
  const router = useRouter();

  /* =========================================================
     USERS
  ========================================================= */

  const [
    users,
    setUsers,
  ] = useState<UserRecord[]>([]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const [
    proposalCount,
    setProposalCount,
  ] = useState(0);

  const [
    jobProposalCount,
    setJobProposalCount,
  ] = useState(0);

  const [
    chatCount,
    setChatCount,
  ] = useState(0);

  const [
    pendingCourseRequestCount,
    setPendingCourseRequestCount,
  ] = useState(0);

  /* =========================================================
     PAYMENTS
  ========================================================= */

  const [
    payments,
    setPayments,
  ] = useState<PaymentRecord[]>([]);

  /* =========================================================
     WITHDRAWALS
  ========================================================= */

  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<WithdrawalRecord[]>([]);

  /* =========================================================
     UI
  ========================================================= */

  const [
    checkingAdmin,
    setCheckingAdmin,
  ] = useState(true);

  const [
    loadingData,
    setLoadingData,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /* =========================================================
     FIREBASE LISTENERS
  ========================================================= */

  useEffect(() => {
    const unsubscribers:
      Array<() => void> = [];

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          const email =
            user?.email
              ?.trim()
              .toLowerCase() ??
            "";

          /* -----------------------------------------
             ADMIN SECURITY
          ----------------------------------------- */

          if (
            !user ||
            email !== ADMIN_EMAIL
          ) {
            router.replace(
              "/admin/login"
            );

            return;
          }

          setCheckingAdmin(false);

          /* =================================================
             USERS
          ================================================= */

          const unsubscribeUsers =
            onSnapshot(
              collection(
                firestore,
                "users"
              ),

              (snapshot) => {
                const userList =
                  snapshot.docs.map(
                    (
                      userDocument
                    ) => {
                      const data =
                        userDocument.data();

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

                      return {
                        id:
                          userDocument.id,

                        roles,

                        tutorStatus:
                          String(
                            data.tutorStatus ??
                              ""
                          )
                            .trim()
                            .toLowerCase(),
                      } as UserRecord;
                    }
                  );

                setUsers(
                  userList
                );

                setLoadingData(
                  false
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "users",
                  snapshotError
                );
              }
            );

          /* =================================================
             STUDENT PROPOSALS
          ================================================= */

          const unsubscribeProposals =
            onSnapshot(
              collection(
                firestore,
                "proposals"
              ),

              (snapshot) => {
                setProposalCount(
                  snapshot.size
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "proposals",
                  snapshotError
                );
              }
            );

          /* =================================================
             JOB PROPOSALS
          ================================================= */

          const unsubscribeJobProposals =
            onSnapshot(
              collection(
                firestore,
                "jobProposals"
              ),

              (snapshot) => {
                setJobProposalCount(
                  snapshot.size
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "job proposals",
                  snapshotError
                );
              }
            );

          /* =================================================
             CHATS
          ================================================= */

          const unsubscribeChats =
            onSnapshot(
              collection(
                firestore,
                "chats"
              ),

              (snapshot) => {
                setChatCount(
                  snapshot.size
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "chats",
                  snapshotError
                );
              }
            );

          /* =================================================
             PAYMENTS
          ================================================= */

          const unsubscribePayments =
            onSnapshot(
              collection(
                firestore,
                "payments"
              ),

              (snapshot) => {
                const paymentList =
                  snapshot.docs.map(
                    (
                      paymentDocument
                    ) => {
                      const data =
                        paymentDocument.data();

                      return {
                        id:
                          paymentDocument.id,

                        amount:
                          toNumber(
                            data.amount
                          ),

                        platformFee:
                          toNumber(
                            data.platformFee
                          ),

                        status:
                          String(
                            data.status ??
                              "pending_admin_approval"
                          )
                            .trim()
                            .toLowerCase(),
                      } as PaymentRecord;
                    }
                  );

                setPayments(
                  paymentList
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "payments",
                  snapshotError
                );
              }
            );

          /* =================================================
             WITHDRAWALS

             IMPORTANT:
             Uses withdrawRequests
             SAME COLLECTION AS TUTOR WALLET
             AND ADMIN WITHDRAWAL PAGE
          ================================================= */

          const unsubscribeWithdrawals =
            onSnapshot(
              collection(
                firestore,
                "withdrawRequests"
              ),

              (snapshot) => {
                const withdrawalList =
                  snapshot.docs.map(
                    (
                      withdrawalDocument
                    ) => {
                      const data =
                        withdrawalDocument.data();

                      return {
                        id:
                          withdrawalDocument.id,

                        amount:
                          toNumber(
                            data.amount
                          ),

                        status:
                          String(
                            data.status ??
                              "pending"
                          )
                            .trim()
                            .toLowerCase(),
                      } as WithdrawalRecord;
                    }
                  );

                setWithdrawals(
                  withdrawalList
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "withdrawals",
                  snapshotError
                );
              }
            );

          /* =================================================
             COURSE REQUESTS
          ================================================= */

          const unsubscribeCourseRequests =
            onSnapshot(
              collection(
                firestore,
                "courseRequests"
              ),

              (snapshot) => {
                const pendingCount =
                  snapshot.docs.filter(
                    (
                      requestDocument
                    ) =>
                      String(
                        requestDocument.data()
                          .status ??
                          "pending"
                      )
                        .trim()
                        .toLowerCase() ===
                      "pending"
                  ).length;

                setPendingCourseRequestCount(
                  pendingCount
                );
              },

              (
                snapshotError
              ) => {
                handleLoadingError(
                  "course requests",
                  snapshotError
                );
              }
            );

          /* =================================================
             SAVE UNSUBSCRIBERS
          ================================================= */

          unsubscribers.push(
            unsubscribeUsers,
            unsubscribeProposals,
            unsubscribeJobProposals,
            unsubscribeChats,
            unsubscribePayments,
            unsubscribeWithdrawals,
            unsubscribeCourseRequests
          );
        }
      );

    /* =======================================================
       ERROR HANDLER
    ======================================================= */

    function handleLoadingError(
      section: string,
      snapshotError: unknown
    ) {
      console.error(
        `Admin ${section} loading error:`,
        snapshotError
      );

      setError(
        "Some dashboard information could not be loaded."
      );

      setLoadingData(
        false
      );
    }

    /* =======================================================
       CLEANUP
    ======================================================= */

    return () => {
      unsubscribeAuth();

      unsubscribers.forEach(
        (
          unsubscribe
        ) => {
          unsubscribe();
        }
      );
    };
  }, [router]);

  /* =========================================================
     STUDENTS
  ========================================================= */

  const studentCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.roles.includes(
              "student"
            )
        ).length,

      [users]
    );

  /* =========================================================
     TUTORS
  ========================================================= */

  const tutorCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.roles.includes(
              "tutor"
            )
        ).length,

      [users]
    );

  /* =========================================================
     PENDING TUTOR APPLICATIONS
  ========================================================= */

  const pendingTutorCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.tutorStatus ===
            "pending"
        ).length,

      [users]
    );

  /* =========================================================
     PENDING PAYMENTS
  ========================================================= */

  const pendingPayments =
    useMemo(
      () =>
        payments.filter(
          (payment) => {
            const status =
              payment.status;

            return (
              status ===
                "pending_admin_approval" ||
              status ===
                "pending" ||
              status ===
                "submitted"
            );
          }
        ),

      [payments]
    );

  /* =========================================================
     SUCCESSFUL PAYMENTS
  ========================================================= */

  const successfulPayments =
    useMemo(
      () =>
        payments.filter(
          (payment) => {
            const status =
              payment.status;

            return (
              status ===
                "successful" ||
              status ===
                "approved" ||
              status ===
                "completed"
            );
          }
        ),

      [payments]
    );

  /* =========================================================
     SUCCESSFUL PAYMENT VALUE
  ========================================================= */

  const totalPaymentAmount =
    useMemo(
      () =>
        successfulPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.amount,

          0
        ),

      [successfulPayments]
    );

  /* =========================================================
     PLATFORM EARNINGS
  ========================================================= */

  const totalPlatformFees =
    useMemo(
      () =>
        successfulPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.platformFee,

          0
        ),

      [successfulPayments]
    );

  /* =========================================================
     PENDING WITHDRAWALS
  ========================================================= */

  const pendingWithdrawals =
    useMemo(
      () =>
        withdrawals.filter(
          (withdrawal) =>
            withdrawal.status ===
            "pending"
        ),

      [withdrawals]
    );

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await signOut(
        auth
      );

      router.replace(
        "/admin/login"
      );
    } catch (
      logoutError
    ) {
      console.error(
        "Admin logout error:",
        logoutError
      );

      setError(
        "Unable to log out. Please try again."
      );
    }
  }

  /* =========================================================
     CHECKING ADMIN
  ========================================================= */

  if (
    checkingAdmin
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft">

        <p className="text-unitor-gray-dark">
          Checking administrator
          access...
        </p>

      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-unitor-gray-soft">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-unitor-black bg-unitor-black text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>

            <Link
              href="/admin/dashboard"
              className="text-2xl font-bold text-unitor-primary"
            >
                <UnitorBrand label="Unitor Admin" />
            </Link>

            <p className="mt-1 text-xs text-unitor-gray-dark/70">
              Platform management
            </p>

          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="rounded-lg border border-unitor-gray-dark px-4 py-2 text-sm font-medium text-white transition hover:bg-unitor-black"
          >
            Log out
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* TITLE */}

        <div>

          <p className="font-medium text-unitor-primary">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Dashboard
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Monitor and manage the
            Unitor platform.
          </p>

        </div>

        {/* ERROR */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>

        )}

        {/* ===================================================
            LOADING
        =================================================== */}

        {loadingData ? (

          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-unitor-gray-dark">
              Loading dashboard
              information...
            </p>

          </section>

        ) : (

          <>

            {/* =================================================
                MAIN CARDS
            ================================================= */}

            <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              <DashboardCard
                title="Students"
                value={
                  studentCount
                }
                description="Registered student accounts"
                icon="🎓"
                href="/admin/students"
              />

              <DashboardCard
                title="Tutors"
                value={
                  tutorCount
                }
                description="Registered tutor accounts"
                icon="📚"
                href="/admin/tutors"
              />

              <DashboardCard
                title="Tutor applications"
                value={
                  pendingTutorCount
                }
                description="Applications awaiting review"
                icon="📋"
                href="/admin/tutor-applications"
                attention={
                  pendingTutorCount >
                  0
                }
              />

              <DashboardCard
                title="Proposals"
                value={
                  proposalCount
                }
                description="Student tutoring proposals"
                icon="📝"
                href="/admin/proposals"
              />

              <DashboardCard
                title="Tutor applications sent"
                value={
                  jobProposalCount
                }
                description="Applications made by tutors"
                icon="📨"
                href="/admin/job-proposals"
              />

              <DashboardCard
                title="Pending payments"
                value={
                  pendingPayments.length
                }
                description="Payments awaiting approval"
                icon="💳"
                href="/admin/payments"
                attention={
                  pendingPayments.length >
                  0
                }
              />

              {/* =============================================
                  FIXED WITHDRAWAL CARD
              ============================================= */}

              <DashboardCard
                title="Pending withdrawals"
                value={
                  pendingWithdrawals.length
                }
                description="Tutor withdrawal requests"
                icon="🏦"
                href="/admin/withdrawals"
                attention={
                  pendingWithdrawals.length >
                  0
                }
              />

              <DashboardCard
                title="Course requests"
                value={
                  pendingCourseRequestCount
                }
                description="Tutor course requests awaiting review"
                icon="📖"
                href="/admin/course-requests"
                attention={
                  pendingCourseRequestCount >
                  0
                }
              />

              <DashboardCard
                title="Conversations"
                value={
                  chatCount
                }
                description="Tutoring chat sessions"
                icon="💬"
                href="/admin/chats"
              />

            </section>

            {/* =================================================
                MONEY / USERS
            ================================================= */}

            <section className="mt-8 grid gap-6 lg:grid-cols-3">

              {/* SUCCESSFUL PAYMENTS */}

              <article className="rounded-2xl bg-unitor-black p-7 text-white shadow-sm">

                <p className="text-sm font-medium text-unitor-gray-light">
                  Successful payment
                  volume
                </p>

                <p className="mt-4 text-3xl font-bold text-unitor-primary">
                  {formatMoney(
                    totalPaymentAmount
                  )}
                </p>

                <p className="mt-2 text-sm text-unitor-gray-dark/70">

                  {
                    successfulPayments.length
                  }{" "}
                  approved{" "}

                  {successfulPayments.length ===
                  1
                    ? "payment"
                    : "payments"}

                </p>

              </article>

              {/* PLATFORM EARNINGS */}

              <article className="rounded-2xl bg-white p-7 shadow-sm">

                <p className="text-sm font-medium text-unitor-gray-dark">
                  Platform earnings
                </p>

                <p className="mt-4 text-3xl font-bold text-unitor-primary">
                  {formatMoney(
                    totalPlatformFees
                  )}
                </p>

                <p className="mt-2 text-sm text-unitor-gray-dark">
                  Commission collected
                  by Unitor
                </p>

              </article>

              {/* TOTAL USERS */}

              <article className="rounded-2xl bg-white p-7 shadow-sm">

                <p className="text-sm font-medium text-unitor-gray-dark">
                  Total users
                </p>

                <p className="mt-4 text-3xl font-bold text-unitor-primary">
                  {users.length}
                </p>

                <p className="mt-2 text-sm text-unitor-gray-dark">
                  All registered user
                  documents
                </p>

              </article>

            </section>

            {/* =================================================
                REQUIRED ACTIONS
            ================================================= */}

            <section className="mt-8 rounded-2xl bg-white p-7 shadow-sm">

              <h2 className="text-xl font-bold text-unitor-black">
                Required actions
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-3">

                <ActionItem
                  title="Tutor applications"
                  count={
                    pendingTutorCount
                  }
                  href="/admin/tutor-applications"
                />

                <ActionItem
                  title="Payment verifications"
                  count={
                    pendingPayments.length
                  }
                  href="/admin/payments"
                />

                {/* ===========================================
                    FIXED WITHDRAWAL ACTION
                =========================================== */}

                <ActionItem
                  title="Withdrawal requests"
                  count={
                    pendingWithdrawals.length
                  }
                  href="/admin/withdrawals"
                />

                <ActionItem
                  title="Course requests"
                  count={
                    pendingCourseRequestCount
                  }
                  href="/admin/course-requests"
                />

              </div>

            </section>

          </>

        )}

      </div>

    </main>
  );
}

/* =========================================================
   DASHBOARD CARD
========================================================= */

function DashboardCard({
  title,
  value,
  description,
  icon,
  href,
  attention = false,
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
  href: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        attention
          ? "border-amber-300"
          : "border-transparent"
      }`}
    >

      <div className="flex items-start justify-between">

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
            attention
              ? "bg-amber-100"
              : "bg-unitor-gray-soft"
          }`}
        >
          {icon}
        </div>

        {attention && (

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            Action needed
          </span>

        )}

      </div>

      <p className="mt-5 text-3xl font-bold text-unitor-black">
        {value}
      </p>

      <h2 className="mt-2 font-bold text-unitor-black">
        {title}
      </h2>

      <p className="mt-1 text-sm text-unitor-gray-dark">
        {description}
      </p>

    </Link>
  );
}

/* =========================================================
   ACTION ITEM
========================================================= */

function ActionItem({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-unitor-gray-light p-4 transition hover:border-unitor-primary hover:bg-unitor-background"
    >

      <div>

        <p className="font-medium text-unitor-black">
          {title}
        </p>

        <p className="mt-1 text-sm text-unitor-gray-dark">

          {count === 0
            ? "No pending actions"
            : `${count} awaiting review`}

        </p>

      </div>

      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
          count > 0
            ? "bg-amber-100 text-amber-700"
            : "bg-unitor-blue-light text-unitor-primary-hover"
        }`}
      >
        {count}
      </span>

    </Link>
  );
}

/* =========================================================
   NUMBER HELPER
========================================================= */

function toNumber(
  value: unknown
) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
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
      style:
        "currency",

      currency:
        "BDT",

      maximumFractionDigits:
        2,
    }
  ).format(
    amount
  );
}
