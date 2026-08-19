"use client";

import { useEffect, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Payment {
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
  approvedBy: string;
  tutorBalanceCredited: boolean;
  createdAt?: Timestamp;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function PaymentStatusPage() {
  const router = useRouter();

  const params = useParams<{
    paymentId: string;
  }>();

  const paymentId = params.paymentId;

  const [payment, setPayment] =
    useState<Payment | null>(null);

  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribePayment: (() => void) | undefined;
    let unsubscribeChat: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const paymentReference = doc(
          firestore,
          "payments",
          paymentId
        );

        unsubscribePayment = onSnapshot(
          paymentReference,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError(
                "This payment could not be found."
              );

              setLoading(false);
              return;
            }

            const data = snapshot.data();

            if (data.studentId !== user.uid) {
              setError(
                "You do not have permission to view this payment."
              );

              setLoading(false);
              return;
            }

            setPayment({
              paymentId:
                data.paymentId ?? snapshot.id,
              amount: data.amount ?? 0,
              platformFee: data.platformFee ?? 0,
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
              approvedBy:
                data.approvedBy ?? "",
              tutorBalanceCredited:
                data.tutorBalanceCredited ??
                false,
              createdAt: data.createdAt,
              submittedAt: data.submittedAt,
              approvedAt: data.approvedAt,
              updatedAt: data.updatedAt,
            });

            setError("");
            setLoading(false);
          },
          (error) => {
            console.error(
              "Payment loading error:",
              error
            );

            setError(
              "Unable to load the payment."
            );

            setLoading(false);
          }
        );

        const chatsQuery = query(
          collection(firestore, "chats"),
          where("paymentId", "==", paymentId)
        );

        unsubscribeChat = onSnapshot(
          chatsQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              setChatId(snapshot.docs[0].id);
            } else {
              setChatId("");
            }
          },
          (error) => {
            console.error(
              "Payment chat loading error:",
              error
            );
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribePayment?.();
      unsubscribeChat?.();
    };
  }, [paymentId, router]);

  const paymentSuccessful =
    payment?.status.toLowerCase() ===
      "successful" ||
    payment?.status.toLowerCase() === "approved";

  useEffect(() => {
    if (!paymentSuccessful || !chatId) return;

    const redirectTimer = window.setTimeout(() => {
      router.replace(
        `/student/messages/${chatId}`
      );
    }, 2500);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [paymentSuccessful, chatId, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">
        <p className="text-unitor-gray-dark">
          Loading payment status...
        </p>
      </main>
    );
  }

  if (error || !payment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">
            Payment unavailable
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            {error}
          </p>

          <Link
            href="/student/payments"
            className="mt-6 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white"
          >
            Return to payments
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/student/payments"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Payment history
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <PaymentResult
          payment={payment}
          chatId={chatId}
        />

        <section className="mt-6 rounded-2xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-unitor-black">
            Payment Information
          </h2>

          <div className="mt-6 space-y-4">
            <InformationRow
              label="Payment ID"
              value={payment.paymentId}
              mono
            />

            <InformationRow
              label="Transaction ID"
              value={payment.transactionId}
              mono
            />

            <InformationRow
              label="Amount"
              value={`৳${payment.amount}`}
            />

            <InformationRow
              label="Tutor"
              value={payment.tutorName}
            />

            <InformationRow
              label="Gateway"
              value={
                payment.gateway ===
                "bkash_send_money"
                  ? "bKash Send Money"
                  : payment.gateway
              }
            />

            <InformationRow
              label="Submitted"
              value={formatTimestamp(
                payment.submittedAt ??
                  payment.createdAt
              )}
            />

            {payment.approvedAt && (
              <InformationRow
                label="Approved"
                value={formatTimestamp(
                  payment.approvedAt
                )}
              />
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-unitor-black">
            Payment Breakdown
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <AmountItem
              label="Total"
              value={payment.amount}
            />

            <AmountItem
              label="Platform fee"
              value={payment.platformFee}
            />

            <AmountItem
              label="Tutor earning"
              value={payment.tutorEarning}
            />
          </div>
        </section>

        {payment.proposalId && (
          <Link
            href={`/student/proposals/${payment.proposalId}`}
            className="mt-6 block w-full rounded-lg border border-unitor-primary px-6 py-3 text-center font-medium text-unitor-primary hover:bg-unitor-background"
          >
            View Related Proposal
          </Link>
        )}
      </div>
    </main>
  );
}

function PaymentResult({
  payment,
  chatId,
}: {
  payment: Payment;
  chatId: string;
}) {
  const normalizedStatus =
    payment.status.toLowerCase();

  if (
    normalizedStatus === "successful" ||
    normalizedStatus === "approved"
  ) {
    return (
      <section className="rounded-2xl bg-unitor-primary p-8 text-center text-white shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-unitor-primary">
          ✓
        </div>

        <h1 className="mt-5 text-3xl font-bold">
          Payment Approved
        </h1>

        <p className="mt-3 text-unitor-background">
          Your payment was verified successfully.
        </p>

        {chatId ? (
          <>
            <p className="mt-2 text-sm text-unitor-blue-light">
              Opening your tutor conversation...
            </p>

            <Link
              href={`/student/messages/${chatId}`}
              className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-unitor-primary"
            >
              Open Chat Now
            </Link>
          </>
        ) : (
          <p className="mt-5 rounded-lg bg-white/10 p-4 text-sm">
            Payment is approved. Your chat is being
            prepared.
          </p>
        )}
      </section>
    );
  }

  if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "failed"
  ) {
    return (
      <section className="rounded-2xl bg-red-600 p-8 text-center text-white shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-red-600">
          ×
        </div>

        <h1 className="mt-5 text-3xl font-bold">
          Payment Rejected
        </h1>

        <p className="mt-3 text-red-50">
          The transaction could not be verified. Contact
          support or submit the correct transaction
          information.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-amber-500 p-8 text-center text-white shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-amber-500">
        …
      </div>

      <h1 className="mt-5 text-3xl font-bold">
        Verification Pending
      </h1>

      <p className="mt-3 text-amber-50">
        Your bKash transaction was submitted. An admin
        will verify it before chat opens.
      </p>
    </section>
  );
}

function InformationRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 border-b border-unitor-gray-soft pb-4 sm:flex-row sm:items-center">
      <span className="text-unitor-gray-dark">
        {label}
      </span>

      <span
        className={`break-all font-medium text-unitor-black ${
          mono ? "font-sans text-sm" : ""
        }`}
      >
        {value || "Not available"}
      </span>
    </div>
  );
}

function AmountItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-unitor-background p-5 text-center">
      <p className="text-sm text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-unitor-black">
        ৳{value}
      </p>
    </div>
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
