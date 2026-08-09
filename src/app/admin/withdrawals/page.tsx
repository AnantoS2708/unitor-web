"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

interface WithdrawalRequest {
  id: string;
  requestId: string;
  amount: number;
  bkashNumber: string;
  status: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  tutorTransactionId: string;
  paidBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  paidAt?: Timestamp;
}

type WithdrawalFilter =
  | "pending"
  | "paid"
  | "rejected"
  | "all";

export default function AdminWithdrawalsPage() {
  const router = useRouter();

  const [withdrawals, setWithdrawals] = useState<
    WithdrawalRequest[]
  >([]);

  const [filter, setFilter] =
    useState<WithdrawalFilter>("pending");

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalRequest | null>(null);

  const [transactionId, setTransactionId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribeWithdrawals: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        unsubscribeWithdrawals = onSnapshot(
          collection(
            firestore,
            "withdrawalRequests"
          ),
          (snapshot) => {
            const withdrawalList = snapshot.docs.map(
              (withdrawalDocument) => {
                const data = withdrawalDocument.data();

                return {
                  id: withdrawalDocument.id,
                  requestId:
                    data.requestId ??
                    withdrawalDocument.id,
                  amount: Number(data.amount ?? 0),
                  bkashNumber:
                    data.bkashNumber ?? "",
                  status: data.status ?? "pending",
                  tutorId: data.tutorId ?? "",
                  tutorName:
                    data.tutorName ?? "Tutor",
                  tutorEmail:
                    data.tutorEmail ?? "",
                  tutorTransactionId:
                    data.tutorTransactionId ?? "",
                  paidBy: data.paidBy ?? "",
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  paidAt: data.paidAt,
                } as WithdrawalRequest;
              }
            );

            withdrawalList.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis?.() ?? 0;

              const secondTime =
                second.createdAt?.toMillis?.() ?? 0;

              return secondTime - firstTime;
            });

            setWithdrawals(withdrawalList);

            setSelectedWithdrawal(
              (currentWithdrawal) => {
                if (!currentWithdrawal) {
                  return null;
                }

                return (
                  withdrawalList.find(
                    (withdrawal) =>
                      withdrawal.id ===
                      currentWithdrawal.id
                  ) ?? null
                );
              }
            );

            setError("");
            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin withdrawal loading error:",
              loadError
            );

            setError(
              "Unable to load withdrawal requests."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeWithdrawals?.();
    };
  }, [router]);

  const pendingWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status.toLowerCase() ===
          "pending"
      ),
    [withdrawals]
  );

  const paidWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status.toLowerCase() === "paid"
      ),
    [withdrawals]
  );

  const rejectedWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status.toLowerCase() ===
          "rejected"
      ),
    [withdrawals]
  );

  const filteredWithdrawals = useMemo(() => {
    if (filter === "all") {
      return withdrawals;
    }

    return withdrawals.filter(
      (withdrawal) =>
        withdrawal.status.toLowerCase() === filter
    );
  }, [filter, withdrawals]);

  const totalPendingAmount = useMemo(
    () =>
      pendingWithdrawals.reduce(
        (total, withdrawal) =>
          total + withdrawal.amount,
        0
      ),
    [pendingWithdrawals]
  );

  const totalPaidAmount = useMemo(
    () =>
      paidWithdrawals.reduce(
        (total, withdrawal) =>
          total + withdrawal.amount,
        0
      ),
    [paidWithdrawals]
  );

  function openPaymentModal(
    withdrawal: WithdrawalRequest
  ) {
    setSelectedWithdrawal(withdrawal);
    setTransactionId(
      withdrawal.tutorTransactionId ?? ""
    );
    setError("");
    setSuccess("");
  }

  function closePaymentModal() {
    setSelectedWithdrawal(null);
    setTransactionId("");
  }

  async function markAsPaid(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedWithdrawal) {
      return;
    }

    const cleanTransactionId =
      transactionId.trim();

    if (!cleanTransactionId) {
      setError(
        "Enter the bKash transaction ID before marking this request as paid."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm that ${formatMoney(
        selectedWithdrawal.amount
      )} was sent to ${
        selectedWithdrawal.bkashNumber
      }?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(selectedWithdrawal.id);
    setError("");
    setSuccess("");

    try {
      const batch = writeBatch(firestore);

      batch.update(
        doc(
          firestore,
          "withdrawalRequests",
          selectedWithdrawal.id
        ),
        {
          paidAt: serverTimestamp(),
          paidBy: "admin",
          status: "paid",
          tutorTransactionId:
            cleanTransactionId,
          updatedAt: serverTimestamp(),
        }
      );

      if (selectedWithdrawal.tutorId) {
        const notificationReference = doc(
          collection(firestore, "notifications")
        );

        batch.set(notificationReference, {
          createdAt: serverTimestamp(),
          isRead: false,
          jobProposalId: "",
          message: `Your withdrawal of ${formatMoney(
            selectedWithdrawal.amount
          )} was paid to ${selectedWithdrawal.bkashNumber}. Transaction ID: ${cleanTransactionId}`,
          proposalId: "",
          route: "/tutor/withdrawals",
          title: "Withdrawal paid",
          type: "payment",
          userId: selectedWithdrawal.tutorId,
        });
      }

      await batch.commit();

      setSuccess(
        `${selectedWithdrawal.tutorName}'s withdrawal was marked as paid.`
      );

      closePaymentModal();
    } catch (paymentError) {
      console.error(
        "Withdrawal payment error:",
        paymentError
      );

      setError(
        "Unable to update the withdrawal request."
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function rejectWithdrawal(
    withdrawal: WithdrawalRequest
  ) {
    const confirmed = window.confirm(
      `Reject ${withdrawal.tutorName}'s withdrawal request?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(withdrawal.id);
    setError("");
    setSuccess("");

    try {
      const batch = writeBatch(firestore);

      batch.update(
        doc(
          firestore,
          "withdrawalRequests",
          withdrawal.id
        ),
        {
          status: "rejected",
          paidAt: null,
          paidBy: "admin",
          tutorTransactionId: "",
          updatedAt: serverTimestamp(),
        }
      );

      if (withdrawal.tutorId) {
        const notificationReference = doc(
          collection(firestore, "notifications")
        );

        batch.set(notificationReference, {
          createdAt: serverTimestamp(),
          isRead: false,
          jobProposalId: "",
          message: `Your withdrawal request of ${formatMoney(
            withdrawal.amount
          )} was rejected. Please contact Unitor support if you need assistance.`,
          proposalId: "",
          route: "/tutor/withdrawals",
          title: "Withdrawal rejected",
          type: "admin",
          userId: withdrawal.tutorId,
        });
      }

      await batch.commit();

      setSuccess(
        `${withdrawal.tutorName}'s withdrawal was rejected.`
      );
    } catch (rejectionError) {
      console.error(
        "Withdrawal rejection error:",
        rejectionError
      );

      setError(
        "Unable to reject the withdrawal request."
      );
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
          Tutor withdrawals
        </h1>

        <p className="mt-3 text-slate-600">
          Process tutor withdrawal requests through bKash.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Pending requests"
            value={String(
              pendingWithdrawals.length
            )}
            description={formatMoney(
              totalPendingAmount
            )}
            color="amber"
          />

          <SummaryCard
            title="Paid requests"
            value={String(paidWithdrawals.length)}
            description={formatMoney(totalPaidAmount)}
            color="emerald"
          />

          <SummaryCard
            title="Rejected requests"
            value={String(
              rejectedWithdrawals.length
            )}
            description="Not processed"
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
              "paid",
              "rejected",
              "all",
            ] as WithdrawalFilter[]
          ).map((filterValue) => (
            <button
              key={filterValue}
              type="button"
              onClick={() =>
                setFilter(filterValue)
              }
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
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading withdrawal requests...
            </p>
          </section>
        ) : filteredWithdrawals.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🏦</div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              No {filter === "all" ? "" : filter}{" "}
              withdrawal requests
            </h2>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {filteredWithdrawals.map(
                (withdrawal) => (
                  <WithdrawalRow
                    key={withdrawal.id}
                    withdrawal={withdrawal}
                    updating={
                      updatingId === withdrawal.id
                    }
                    onPay={() =>
                      openPaymentModal(withdrawal)
                    }
                    onReject={() =>
                      rejectWithdrawal(withdrawal)
                    }
                  />
                )
              )}
            </div>
          </section>
        )}
      </div>

      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Complete withdrawal
              </h2>

              <button
                type="button"
                onClick={closePaymentModal}
                className="text-3xl text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-5">
              <Detail
                label="Tutor"
                value={
                  selectedWithdrawal.tutorName
                }
              />

              <Detail
                label="Amount"
                value={formatMoney(
                  selectedWithdrawal.amount
                )}
              />

              <Detail
                label="Send to bKash"
                value={
                  selectedWithdrawal.bkashNumber
                }
              />
            </div>

            <form
              onSubmit={markAsPaid}
              className="mt-6"
            >
              <label
                htmlFor="transactionId"
                className="mb-2 block font-medium text-slate-700"
              >
                bKash transaction ID
              </label>

              <input
                id="transactionId"
                type="text"
                value={transactionId}
                onChange={(event) =>
                  setTransactionId(
                    event.target.value
                  )
                }
                placeholder="Enter payment transaction ID"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="submit"
                disabled={
                  updatingId ===
                  selectedWithdrawal.id
                }
                className="mt-5 w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {updatingId ===
                selectedWithdrawal.id
                  ? "Updating..."
                  : "Confirm payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function WithdrawalRow({
  withdrawal,
  updating,
  onPay,
  onReject,
}: {
  withdrawal: WithdrawalRequest;
  updating: boolean;
  onPay: () => void;
  onReject: () => void;
}) {
  const status = withdrawal.status.toLowerCase();

  const statusStyle =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-slate-900">
              {withdrawal.tutorName}
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}
            >
              {status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            bKash: {withdrawal.bkashNumber}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Request ID: {withdrawal.requestId}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDate(withdrawal.createdAt)}
          </p>

          {withdrawal.tutorTransactionId && (
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              Transaction ID:{" "}
              {withdrawal.tutorTransactionId}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-3 text-xl font-bold text-slate-900">
            {formatMoney(withdrawal.amount)}
          </p>

          {status === "pending" && (
            <>
              <button
                type="button"
                onClick={onPay}
                disabled={updating}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Mark as paid
              </button>

              <button
                type="button"
                onClick={onReject}
                disabled={updating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </article>
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
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-200 py-3 last:border-0">
      <span className="text-slate-500">{label}</span>

      <span className="text-right font-semibold text-slate-900">
        {value}
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