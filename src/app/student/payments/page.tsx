"use client";

import { useEffect, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
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
  gateway: string;
  bkashNumber: string;
  transactionId: string;
  status: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  proposalId: string;
  jobProposalId: string;
  tutorBalanceCredited: boolean;
  createdAt?: Timestamp;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function StudentPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribePayments: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const paymentsQuery = query(
          collection(firestore, "payments"),
          where("studentId", "==", user.uid)
        );

        unsubscribePayments = onSnapshot(
          paymentsQuery,
          (snapshot) => {
            const paymentList = snapshot.docs.map(
              (paymentDocument) => {
                const data = paymentDocument.data();

                return {
                  id: paymentDocument.id,
                  paymentId:
                    data.paymentId ??
                    paymentDocument.id,
                  amount: data.amount ?? 0,
                  platformFee:
                    data.platformFee ?? 0,
                  tutorEarning:
                    data.tutorEarning ?? 0,
                  currency: data.currency ?? "BDT",
                  gateway:
                    data.gateway ??
                    "bkash_send_money",
                  bkashNumber:
                    data.bkashNumber ?? "",
                  transactionId:
                    data.transactionId ?? "",
                  status: data.status ?? "pending",
                  studentId: data.studentId ?? "",
                  studentName:
                    data.studentName ?? "",
                  tutorId: data.tutorId ?? "",
                  tutorName:
                    data.tutorName ?? "Tutor",
                  proposalId:
                    data.proposalId ?? "",
                  jobProposalId:
                    data.jobProposalId ?? "",
                  tutorBalanceCredited:
                    data.tutorBalanceCredited ??
                    false,
                  createdAt: data.createdAt,
                  submittedAt: data.submittedAt,
                  approvedAt: data.approvedAt,
                  updatedAt: data.updatedAt,
                } as Payment;
              }
            );

            paymentList.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis?.() ??
                first.submittedAt?.toMillis?.() ??
                0;

              const secondTime =
                second.createdAt?.toMillis?.() ??
                second.submittedAt?.toMillis?.() ??
                0;

              return secondTime - firstTime;
            });

            setPayments(paymentList);
            setError("");
            setLoading(false);
          },
          (error) => {
            console.error(
              "Payment loading error:",
              error
            );

            setError(
              "Unable to load your payment history."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribePayments?.();
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
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/student/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="font-medium text-unitor-primary">
            Transactions
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Payment History
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Track your submitted bKash transactions and
            admin-verification status.
          </p>
        </div>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading payment history...
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
          payments.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">💳</div>

              <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                No payments yet
              </h2>

              <p className="mt-3 text-unitor-gray-dark">
                Your payments will appear after selecting a
                tutor and submitting a bKash transaction ID.
              </p>

              <Link
                href="/student/proposals"
                className="mt-7 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
              >
                View proposals
              </Link>
            </section>
          )}

        {!loading && payments.length > 0 && (
          <div className="mt-8 space-y-6">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PaymentCard({
  payment,
}: {
  payment: Payment;
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm text-unitor-gray-dark">
            Payment ID
          </p>

          <p className="mt-1 break-all font-sans text-sm font-medium text-unitor-black">
            {payment.paymentId}
          </p>
        </div>

        <PaymentStatus status={payment.status} />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <InformationItem
          label="Amount"
          value={`৳${payment.amount}`}
        />

        <InformationItem
          label="Tutor"
          value={payment.tutorName}
        />

        <InformationItem
          label="Gateway"
          value={
            payment.gateway === "bkash_send_money"
              ? "bKash Send Money"
              : payment.gateway
          }
        />

        <InformationItem
          label="Transaction ID"
          value={
            payment.transactionId ||
            "Not submitted"
          }
        />
      </div>

      <div className="mt-6 rounded-xl bg-unitor-background p-5">
        <h2 className="font-bold text-unitor-black">
          Payment breakdown
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <InformationItem
            label="Total amount"
            value={`৳${payment.amount}`}
          />

          <InformationItem
            label="Platform fee"
            value={`৳${payment.platformFee}`}
          />

          <InformationItem
            label="Tutor earning"
            value={`৳${payment.tutorEarning}`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-unitor-gray-soft pt-5">
        <div>
          <p className="text-sm text-unitor-gray-dark">
            Submitted
          </p>

          <p className="mt-1 font-medium text-unitor-black">
            {formatTimestamp(
              payment.submittedAt ??
                payment.createdAt
            )}
          </p>
        </div>

        {payment.proposalId && (
          <Link
            href={`/student/proposals/${payment.proposalId}`}
            className="font-medium text-unitor-primary hover:underline"
          >
            View proposal →
          </Link>
        )}
      </div>
      <Link
        href={`/student/payments/${payment.id}`}
        className="mt-6 block w-full rounded-lg bg-unitor-primary px-5 py-3 text-center font-medium text-white hover:bg-unitor-primary-hover"
        >
        View Payment Status
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
      <p className="text-sm text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-unitor-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let classes = "bg-amber-50 text-amber-700";

  if (
    normalizedStatus === "successful" ||
    normalizedStatus === "approved"
  ) {
    classes = "bg-unitor-background text-unitor-primary-hover";
  } else if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "failed"
  ) {
    classes = "bg-red-50 text-red-700";
  } else if (
    normalizedStatus === "pending" ||
    normalizedStatus === "submitted"
  ) {
    classes = "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${classes}`}
    >
      {status || "pending"}
    </span>
  );
}

function formatTimestamp(timestamp?: Timestamp) {
  if (!timestamp) return "Not available";

  return timestamp.toDate().toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
