"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";
const CHAT_DURATION_DAYS = 3;

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
}

type PaymentFilter =
  | "pending"
  | "successful"
  | "rejected"
  | "all";

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] =
    useState<PaymentFilter>("pending");
  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribePayments: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        unsubscribePayments = onSnapshot(
          collection(firestore, "payments"),
          (snapshot) => {
            const paymentList = snapshot.docs.map(
              (paymentDocument) => {
                const data = paymentDocument.data();
                const amount = Number(data.amount ?? 0);
                const platformFee = Number(
                  data.platformFee ?? amount * 0.1
                );

                return {
                  id: paymentDocument.id,
                  paymentId:
                    data.paymentId ?? paymentDocument.id,
                  amount,
                  platformFee,
                  tutorEarning: Number(
                    data.tutorEarning ??
                      amount - platformFee
                  ),
                  currency: data.currency ?? "BDT",
                  gateway:
                    data.gateway ?? "bkash_send_money",
                  bkashNumber: data.bkashNumber ?? "",
                  transactionId:
                    data.transactionId ?? "",
                  status: data.status ?? "pending",
                  studentId: data.studentId ?? "",
                  studentName:
                    data.studentName ?? "Student",
                  tutorId: data.tutorId ?? "",
                  tutorName:
                    data.tutorName ?? "Tutor",
                  proposalId: data.proposalId ?? "",
                  jobProposalId:
                    data.jobProposalId ?? "",
                  tutorBalanceCredited:
                    data.tutorBalanceCredited ?? false,
                  createdAt: data.createdAt,
                  submittedAt: data.submittedAt,
                  approvedAt: data.approvedAt,
                } as Payment;
              }
            );

            paymentList.sort((first, second) => {
              const firstTime =
                first.submittedAt?.toMillis?.() ??
                first.createdAt?.toMillis?.() ??
                0;

              const secondTime =
                second.submittedAt?.toMillis?.() ??
                second.createdAt?.toMillis?.() ??
                0;

              return secondTime - firstTime;
            });

            setPayments(paymentList);

            setSelectedPayment((currentPayment) => {
              if (!currentPayment) {
                return null;
              }

              return (
                paymentList.find(
                  (payment) =>
                    payment.id === currentPayment.id
                ) ?? null
              );
            });

            setError("");
            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin payment loading error:",
              loadError
            );

            setError("Unable to load payments.");
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

  const successfulPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status.toLowerCase() ===
          "successful"
      ),
    [payments]
  );

  const rejectedPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status.toLowerCase() === "rejected"
      ),
    [payments]
  );

  const filteredPayments = useMemo(() => {
    if (filter === "all") {
      return payments;
    }

    if (filter === "pending") {
      return pendingPayments;
    }

    return payments.filter(
      (payment) =>
        payment.status.toLowerCase() === filter
    );
  }, [filter, payments, pendingPayments]);

  async function approvePayment(payment: Payment) {
    const confirmed = window.confirm(
      `Approve payment ${payment.transactionId} from ${payment.studentName}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(payment.id);
    setError("");
    setSuccess("");

    try {
      const existingChatQuery = query(
        collection(firestore, "chats"),
        where("paymentId", "==", payment.id)
      );

      const existingChats = await getDocs(
        existingChatQuery
      );

      const batch = writeBatch(firestore);

      const paymentReference = doc(
        firestore,
        "payments",
        payment.id
      );

      batch.update(paymentReference, {
        paymentId: payment.id,
        status: "successful",
        approvedAt: serverTimestamp(),
        approvedBy: "admin",
        tutorBalanceCredited: true,
        updatedAt: serverTimestamp(),
      });

      if (payment.proposalId) {
        batch.update(
          doc(
            firestore,
            "proposals",
            payment.proposalId
          ),
          {
            paymentId: payment.id,
            paymentStatus: "successful",
            updatedAt: serverTimestamp(),
          }
        );
      }

      if (payment.jobProposalId) {
        batch.update(
          doc(
            firestore,
            "jobProposals",
            payment.jobProposalId
          ),
          {
            paymentId: payment.id,
            paymentStatus: "successful",
            updatedAt: serverTimestamp(),
          }
        );
      }

      if (existingChats.empty) {
        const chatReference = doc(
          collection(firestore, "chats")
        );

        const expirationDate = new Date();
        expirationDate.setDate(
          expirationDate.getDate() +
            CHAT_DURATION_DAYS
        );

        batch.set(chatReference, {
          createdAt: serverTimestamp(),
          expiresAt:
            Timestamp.fromDate(expirationDate),
          isActive: true,
          jobProposalId: payment.jobProposalId,
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          paymentId: payment.id,
          proposalId: payment.proposalId,
          studentId: payment.studentId,
          studentName: payment.studentName,
          tutorId: payment.tutorId,
          tutorName: payment.tutorName,
        });
      } else {
        existingChats.docs.forEach((chatDocument) => {
          batch.update(chatDocument.ref, {
            isActive: true,
            updatedAt: serverTimestamp(),
          });
        });
      }

      if (payment.studentId) {
        const studentNotification = doc(
          collection(firestore, "notifications")
        );

        batch.set(studentNotification, {
          createdAt: serverTimestamp(),
          isRead: false,
          jobProposalId: payment.jobProposalId,
          message:
            "Your payment was approved. Your tutoring chat is now active.",
          proposalId: payment.proposalId,
          route: "/student/messages",
          title: "Payment approved",
          type: "payment",
          userId: payment.studentId,
        });
      }

      if (payment.tutorId) {
        const tutorNotification = doc(
          collection(firestore, "notifications")
        );

        batch.set(tutorNotification, {
          createdAt: serverTimestamp(),
          isRead: false,
          jobProposalId: payment.jobProposalId,
          message: `${payment.studentName}'s payment was approved. The tutoring chat is now active.`,
          proposalId: payment.proposalId,
          route: "/tutor/messages",
          title: "New tutoring session",
          type: "payment",
          userId: payment.tutorId,
        });
      }

      await batch.commit();

      setSuccess(
        "Payment approved and the chat session was opened."
      );
    } catch (approvalError) {
      console.error(
        "Payment approval error:",
        approvalError
      );

      setError(
        "Unable to approve the payment. Check your Firebase rules and document IDs."
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function rejectPayment(payment: Payment) {
    const confirmed = window.confirm(
      `Reject payment ${payment.transactionId} from ${payment.studentName}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(payment.id);
    setError("");
    setSuccess("");

    try {
      const batch = writeBatch(firestore);

      batch.update(
        doc(firestore, "payments", payment.id),
        {
          status: "rejected",
          approvedBy: "admin",
          tutorBalanceCredited: false,
          updatedAt: serverTimestamp(),
        }
      );

      if (payment.proposalId) {
        batch.update(
          doc(
            firestore,
            "proposals",
            payment.proposalId
          ),
          {
            paymentStatus: "rejected",
            updatedAt: serverTimestamp(),
          }
        );
      }

      if (payment.jobProposalId) {
        batch.update(
          doc(
            firestore,
            "jobProposals",
            payment.jobProposalId
          ),
          {
            paymentStatus: "rejected",
            updatedAt: serverTimestamp(),
          }
        );
      }

      if (payment.studentId) {
        const notificationReference = doc(
          collection(firestore, "notifications")
        );

        batch.set(notificationReference, {
          createdAt: serverTimestamp(),
          isRead: false,
          jobProposalId: payment.jobProposalId,
          message:
            "Your payment could not be verified. Please check the transaction ID and submit again.",
          proposalId: payment.proposalId,
          route: "/student/payments",
          title: "Payment rejected",
          type: "payment",
          userId: payment.studentId,
        });
      }

      await batch.commit();

      setSuccess("Payment rejected successfully.");
    } catch (rejectionError) {
      console.error(
        "Payment rejection error:",
        rejectionError
      );

      setError("Unable to reject the payment.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-emerald-400"
          >
            Unitor Admin
          </Link>

          <Link
            href="/admin/dashboard"
            className="font-medium text-slate-300 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-semibold text-emerald-600">
          Financial management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Payment verification
        </h1>

        <p className="mt-3 text-slate-600">
          Verify student bKash transactions before opening
          tutoring sessions.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatusCard
            title="Pending"
            count={pendingPayments.length}
            color="amber"
          />

          <StatusCard
            title="Successful"
            count={successfulPayments.length}
            color="emerald"
          />

          <StatusCard
            title="Rejected"
            count={rejectedPayments.length}
            color="red"
          />
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            {success}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {(
            [
              "pending",
              "successful",
              "rejected",
              "all",
            ] as PaymentFilter[]
          ).map((filterValue) => (
            <button
              key={filterValue}
              type="button"
              onClick={() => setFilter(filterValue)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                filter === filterValue
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filterValue}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading payments...
            </p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">💳</div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              No {filter === "all" ? "" : filter} payments
            </h2>
          </div>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => (
                <article
                  key={payment.id}
                  className="p-5"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-bold text-slate-900">
                          {payment.studentName}
                        </h2>

                        <PaymentStatus
                          status={payment.status}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Tutor: {payment.tutorName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Transaction ID:{" "}
                        {payment.transactionId ||
                          "Not provided"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(
                          payment.submittedAt ??
                            payment.createdAt
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-xl font-bold text-slate-900">
                        {formatMoney(payment.amount)}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPayment(payment)
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        View
                      </button>

                      {isPending(payment.status) && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              approvePayment(payment)
                            }
                            disabled={
                              updatingId === payment.id
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rejectPayment(payment)
                            }
                            disabled={
                              updatingId === payment.id
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Payment details
              </h2>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-3xl text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Detail
                label="Student"
                value={selectedPayment.studentName}
              />

              <Detail
                label="Tutor"
                value={selectedPayment.tutorName}
              />

              <Detail
                label="Amount"
                value={formatMoney(
                  selectedPayment.amount
                )}
              />

              <Detail
                label="bKash number"
                value={selectedPayment.bkashNumber}
              />

              <Detail
                label="Transaction ID"
                value={selectedPayment.transactionId}
              />

              <Detail
                label="Platform fee"
                value={formatMoney(
                  selectedPayment.platformFee
                )}
              />

              <Detail
                label="Tutor earning"
                value={formatMoney(
                  selectedPayment.tutorEarning
                )}
              />

              <Detail
                label="Status"
                value={selectedPayment.status}
              />
            </div>

            {isPending(selectedPayment.status) && (
              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    approvePayment(selectedPayment)
                  }
                  disabled={
                    updatingId === selectedPayment.id
                  }
                  className="flex-1 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() =>
                    rejectPayment(selectedPayment)
                  }
                  disabled={
                    updatingId === selectedPayment.id
                  }
                  className="flex-1 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function isPending(status: string) {
  const cleanStatus = status.toLowerCase();

  return (
    cleanStatus === "pending" ||
    cleanStatus === "submitted"
  );
}

function PaymentStatus({ status }: { status: string }) {
  const cleanStatus = status.toLowerCase();

  const style =
    cleanStatus === "successful"
      ? "bg-emerald-100 text-emerald-700"
      : cleanStatus === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {cleanStatus}
    </span>
  );
}

function StatusCard({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: "amber" | "emerald" | "red";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-semibold ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {count}
      </p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex justify-between gap-6 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>

      <span className="break-all text-right font-semibold text-slate-900">
        {value || "Not provided"}
      </span>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(timestamp?: Timestamp) {
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