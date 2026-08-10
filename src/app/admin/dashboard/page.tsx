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
  onSnapshot,
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

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

export default function AdminDashboardPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [proposalCount, setProposalCount] = useState(0);
  const [jobProposalCount, setJobProposalCount] =
    useState(0);
  const [chatCount, setChatCount] = useState(0);

  const [payments, setPayments] = useState<
    PaymentRecord[]
  >([]);

  const [withdrawals, setWithdrawals] = useState<
    WithdrawalRecord[]
  >([]);

  const [checkingAdmin, setCheckingAdmin] =
    useState(true);

  const [loadingData, setLoadingData] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        setCheckingAdmin(false);

        /*
         * USERS
         */
        const unsubscribeUsers = onSnapshot(
          collection(firestore, "users"),
          (snapshot) => {
            const userList = snapshot.docs.map(
              (userDocument) => {
                const data = userDocument.data();

                return {
                  id: userDocument.id,

                  roles: Array.isArray(data.roles)
                    ? data.roles
                    : [],

                  tutorStatus:
                    data.tutorStatus ?? "",
                } as UserRecord;
              }
            );

            setUsers(userList);
            setLoadingData(false);
          },
          (snapshotError) => {
            handleLoadingError(
              "users",
              snapshotError
            );
          }
        );

        /*
         * STUDENT PROPOSALS
         */
        const unsubscribeProposals = onSnapshot(
          collection(firestore, "proposals"),
          (snapshot) => {
            setProposalCount(snapshot.size);
          },
          (snapshotError) => {
            handleLoadingError(
              "proposals",
              snapshotError
            );
          }
        );

        /*
         * TUTOR JOB APPLICATIONS
         */
        const unsubscribeJobProposals = onSnapshot(
          collection(firestore, "jobProposals"),
          (snapshot) => {
            setJobProposalCount(snapshot.size);
          },
          (snapshotError) => {
            handleLoadingError(
              "job proposals",
              snapshotError
            );
          }
        );

        /*
         * CHATS
         */
        const unsubscribeChats = onSnapshot(
          collection(firestore, "chats"),
          (snapshot) => {
            setChatCount(snapshot.size);
          },
          (snapshotError) => {
            handleLoadingError(
              "chats",
              snapshotError
            );
          }
        );

        /*
         * PAYMENTS
         */
        const unsubscribePayments = onSnapshot(
          collection(firestore, "payments"),
          (snapshot) => {
            const paymentList =
              snapshot.docs.map(
                (paymentDocument) => {
                  const data =
                    paymentDocument.data();

                  return {
                    id: paymentDocument.id,

                    amount: Number(
                      data.amount ?? 0
                    ),

                    platformFee: Number(
                      data.platformFee ?? 0
                    ),

                    status:
                      data.status ??
                      "pending_admin_approval",
                  } as PaymentRecord;
                }
              );

            setPayments(paymentList);
          },
          (snapshotError) => {
            handleLoadingError(
              "payments",
              snapshotError
            );
          }
        );

        /*
         * WITHDRAWALS
         */
        const unsubscribeWithdrawals = onSnapshot(
          collection(
            firestore,
            "withdrawalRequests"
          ),
          (snapshot) => {
            const withdrawalList =
              snapshot.docs.map(
                (withdrawalDocument) => {
                  const data =
                    withdrawalDocument.data();

                  return {
                    id:
                      withdrawalDocument.id,

                    amount: Number(
                      data.amount ?? 0
                    ),

                    status:
                      data.status ?? "pending",
                  } as WithdrawalRecord;
                }
              );

            setWithdrawals(
              withdrawalList
            );
          },
          (snapshotError) => {
            handleLoadingError(
              "withdrawals",
              snapshotError
            );
          }
        );

        unsubscribers.push(
          unsubscribeUsers,
          unsubscribeProposals,
          unsubscribeJobProposals,
          unsubscribeChats,
          unsubscribePayments,
          unsubscribeWithdrawals
        );
      }
    );

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

      setLoadingData(false);
    }

    return () => {
      unsubscribeAuth();

      unsubscribers.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [router]);

  /*
   * STUDENT COUNT
   */
  const studentCount = useMemo(
    () =>
      users.filter(
        (user) =>
          user.roles.includes(
            "student"
          )
      ).length,
    [users]
  );

  /*
   * APPROVED TUTOR COUNT
   *
   * A tutor is counted here if the account
   * currently has the tutor role.
   */
  const tutorCount = useMemo(
    () =>
      users.filter(
        (user) =>
          user.roles.includes(
            "tutor"
          )
      ).length,
    [users]
  );

  /*
   * PENDING TUTOR APPLICATIONS
   *
   * IMPORTANT:
   * Do NOT require roles.includes("tutor").
   *
   * A student receives the tutor role only AFTER
   * admin approval.
   */
  const pendingTutorCount = useMemo(
    () =>
      users.filter(
        (user) =>
          user.tutorStatus
            .trim()
            .toLowerCase() ===
          "pending"
      ).length,
    [users]
  );

  /*
   * PENDING PAYMENTS
   *
   * Supports old website statuses and the
   * Flutter-compatible status.
   */
  const pendingPayments = useMemo(
    () =>
      payments.filter(
        (payment) => {
          const status =
            payment.status
              .trim()
              .toLowerCase();

          return (
            status ===
              "pending_admin_approval" ||
            status === "pending" ||
            status === "submitted"
          );
        }
      ),
    [payments]
  );

  /*
   * SUCCESSFUL PAYMENTS
   */
  const successfulPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status
            .trim()
            .toLowerCase() ===
          "successful"
      ),
    [payments]
  );

  /*
   * TOTAL SUCCESSFUL PAYMENT VALUE
   */
  const totalPaymentAmount = useMemo(
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

  /*
   * PLATFORM FEES
   */
  const totalPlatformFees = useMemo(
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

  /*
   * PENDING WITHDRAWALS
   */
  const pendingWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status
            .trim()
            .toLowerCase() ===
          "pending"
      ),
    [withdrawals]
  );

  async function handleLogout() {
    await signOut(auth);

    router.replace(
      "/admin/login"
    );
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Checking administrator access...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}

      <header className="border-b border-slate-800 bg-slate-900 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>

            <Link
              href="/admin/dashboard"
              className="text-2xl font-bold text-emerald-400"
            >
              Unitor Admin
            </Link>

            <p className="mt-1 text-xs text-slate-400">
              Platform management
            </p>

          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Log out
          </button>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        <div>

          <p className="font-semibold text-emerald-600">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-3 text-slate-600">
            Monitor and manage the Unitor platform.
          </p>

        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {loadingData ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-slate-600">
              Loading dashboard information...
            </p>

          </section>
        ) : (
          <>

            {/* MAIN CARDS */}

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
                title="Conversations"
                value={
                  chatCount
                }
                description="Tutoring chat sessions"
                icon="💬"
                href="/admin/chats"
              />

            </section>

            {/* MONEY / USERS */}

            <section className="mt-8 grid gap-6 lg:grid-cols-3">

              <article className="rounded-2xl bg-slate-900 p-7 text-white shadow-sm">

                <p className="text-sm font-semibold text-slate-300">
                  Successful payment volume
                </p>

                <p className="mt-4 text-3xl font-bold text-emerald-400">
                  {formatMoney(
                    totalPaymentAmount
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-400">

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

              <article className="rounded-2xl bg-white p-7 shadow-sm">

                <p className="text-sm font-semibold text-slate-500">
                  Platform earnings
                </p>

                <p className="mt-4 text-3xl font-bold text-emerald-600">
                  {formatMoney(
                    totalPlatformFees
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Commission collected by Unitor
                </p>

              </article>

              <article className="rounded-2xl bg-white p-7 shadow-sm">

                <p className="text-sm font-semibold text-slate-500">
                  Total users
                </p>

                <p className="mt-4 text-3xl font-bold text-blue-600">
                  {users.length}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  All registered user documents
                </p>

              </article>

            </section>

            {/* REQUIRED ACTIONS */}

            <section className="mt-8 rounded-2xl bg-white p-7 shadow-sm">

              <h2 className="text-xl font-bold text-slate-900">
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

                <ActionItem
                  title="Withdrawal requests"
                  count={
                    pendingWithdrawals.length
                  }
                  href="/admin/withdrawals"
                />

              </div>

            </section>

          </>
        )}

      </div>

    </main>
  );
}

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
              : "bg-slate-100"
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

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <h2 className="mt-2 font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

    </Link>
  );
}

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
      className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-emerald-500 hover:bg-emerald-50"
    >

      <div>

        <p className="font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {count === 0
            ? "No pending actions"
            : `${count} awaiting review`}
        </p>

      </div>

      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
          count > 0
            ? "bg-amber-100 text-amber-700"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {count}
      </span>

    </Link>
  );
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    }
  ).format(amount);
}