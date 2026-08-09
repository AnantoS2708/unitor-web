"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  platformFee: number;
  tutorEarning: number;
  currency: string;
  status: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  proposalId: string;
  jobProposalId: string;
  transactionId: string;
  tutorBalanceCredited: boolean;
  createdAt?: Timestamp;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function TutorEarningsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribePayments: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const paymentsQuery = query(
        collection(firestore, "payments"),
        where("tutorId", "==", user.uid)
      );

      unsubscribePayments = onSnapshot(
        paymentsQuery,
        (snapshot) => {
          const paymentList = snapshot.docs.map((paymentDocument) => {
            const data = paymentDocument.data();

            const amount = Number(data.amount ?? 0);
            const platformFee = Number(data.platformFee ?? amount * 0.1);
            const tutorEarning = Number(
              data.tutorEarning ?? amount - platformFee
            );

            return {
              id: paymentDocument.id,
              paymentId: data.paymentId ?? paymentDocument.id,
              amount,
              platformFee,
              tutorEarning,
              currency: data.currency ?? "BDT",
              status: data.status ?? "pending",
              studentId: data.studentId ?? "",
              studentName: data.studentName ?? "Student",
              tutorId: data.tutorId ?? "",
              tutorName: data.tutorName ?? "",
              proposalId: data.proposalId ?? "",
              jobProposalId: data.jobProposalId ?? "",
              transactionId: data.transactionId ?? "",
              tutorBalanceCredited:
                data.tutorBalanceCredited ?? false,
              createdAt: data.createdAt,
              submittedAt: data.submittedAt,
              approvedAt: data.approvedAt,
              updatedAt: data.updatedAt,
            } as Payment;
          });

          paymentList.sort((first, second) => {
            const firstTime =
              first.approvedAt?.toMillis?.() ??
              first.updatedAt?.toMillis?.() ??
              first.createdAt?.toMillis?.() ??
              0;

            const secondTime =
              second.approvedAt?.toMillis?.() ??
              second.updatedAt?.toMillis?.() ??
              second.createdAt?.toMillis?.() ??
              0;

            return secondTime - firstTime;
          });

          setPayments(paymentList);
          setError("");
          setLoading(false);
        },
        (paymentError) => {
          console.error(
            "Tutor payment loading error:",
            paymentError
          );

          setError("Unable to load your earnings.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribePayments?.();
    };
  }, [router]);

  const successfulPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status.toLowerCase() === "successful"
      ),
    [payments]
  );

  const pendingPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const status = payment.status.toLowerCase();

        return (
          status === "pending" ||
          status === "submitted"
        );
      }),
    [payments]
  );

  const totalEarnings = useMemo(
    () =>
      successfulPayments.reduce(
        (total, payment) => total + payment.tutorEarning,
        0
      ),
    [successfulPayments]
  );

  const totalPlatformFees = useMemo(
    () =>
      successfulPayments.reduce(
        (total, payment) => total + payment.platformFee,
        0
      ),
    [successfulPayments]
  );

  const pendingAmount = useMemo(
    () =>
      pendingPayments.reduce(
        (total, payment) => total + payment.tutorEarning,
        0
      ),
    [pendingPayments]
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="font-semibold text-emerald-600">
            Tutor account
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Earnings
          </h1>

          <p className="mt-3 text-slate-600">
            View your tutoring income and payment history.
          </p>
        </div>

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total earnings"
            value={formatMoney(totalEarnings)}
            description="After platform fees"
            color="emerald"
          />

          <SummaryCard
            title="Successful payments"
            value={String(successfulPayments.length)}
            description="Approved transactions"
            color="blue"
          />

          <SummaryCard
            title="Pending earnings"
            value={formatMoney(pendingAmount)}
            description={`${pendingPayments.length} pending payment${
              pendingPayments.length === 1 ? "" : "s"
            }`}
            color="amber"
          />

          <SummaryCard
            title="Platform fees"
            value={formatMoney(totalPlatformFees)}
            description="10% Unitor commission"
            color="purple"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Payment history
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Payments received from students.
            </p>
          </div>

          {loading && (
            <div className="p-10 text-center">
              <p className="text-slate-600">
                Loading payment history...
              </p>
            </div>
          )}

          {!loading && !error && payments.length === 0 && (
            <div className="p-10 text-center">
              <div className="text-5xl">💰</div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                No earnings yet
              </h3>

              <p className="mt-2 text-slate-600">
                Successful tutoring payments will appear here.
              </p>

              <Link
                href="/tutor/proposals"
                className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Browse proposals
              </Link>
            </div>
          )}

          {!loading && payments.length > 0 && (
            <div className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string;
  description: string;
  color: "emerald" | "blue" | "amber" | "purple";
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <div
        className={`inline-flex rounded-lg px-3 py-1 text-sm font-semibold ${colorClasses[color]}`}
      >
        {title}
      </div>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </article>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const status = payment.status.toLowerCase();

  const statusClasses =
    status === "successful"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected" || status === "failed"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5 transition hover:bg-slate-50">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-900">
              {payment.studentName}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses}`}
            >
              {status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Payment ID: {payment.paymentId}
          </p>

          {payment.transactionId && (
            <p className="mt-1 text-sm text-slate-500">
              Transaction ID: {payment.transactionId}
            </p>
          )}

          <p className="mt-1 text-sm text-slate-400">
            {formatPaymentDate(
              payment.approvedAt ??
                payment.updatedAt ??
                payment.createdAt
            )}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xl font-bold text-emerald-600">
            +{formatMoney(payment.tutorEarning)}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Payment: {formatMoney(payment.amount)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fee: {formatMoney(payment.platformFee)}
          </p>
        </div>
      </div>
    </article>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentDate(timestamp?: Timestamp) {
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