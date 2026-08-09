"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Payment {
  id: string;
  tutorEarning: number;
  status: string;
  tutorBalanceCredited: boolean;
}

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

export default function TutorWithdrawalsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<
    WithdrawalRequest[]
  >([]);

  const [amount, setAmount] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");

  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] =
    useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribePayments: (() => void) | undefined;
    let unsubscribeWithdrawals: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.uid);
      setTutorEmail(user.email?.toLowerCase() ?? "");

      unsubscribeUser = onSnapshot(
        doc(firestore, "users", user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();

            setTutorName(data.fullName ?? "Tutor");
            setTutorEmail(
              (
                data.universityEmail ??
                user.email ??
                ""
              ).toLowerCase()
            );
          }
        },
        (userError) => {
          console.error("Tutor profile error:", userError);
        }
      );

      const paymentsQuery = query(
        collection(firestore, "payments"),
        where("tutorId", "==", user.uid)
      );

      unsubscribePayments = onSnapshot(
        paymentsQuery,
        (snapshot) => {
          const paymentList = snapshot.docs.map(
            (paymentDocument) => {
              const data = paymentDocument.data();

              return {
                id: paymentDocument.id,
                tutorEarning: Number(data.tutorEarning ?? 0),
                status: data.status ?? "",
                tutorBalanceCredited:
                  data.tutorBalanceCredited ?? false,
              } as Payment;
            }
          );

          setPayments(paymentList);
          setLoadingPayments(false);
        },
        (paymentError) => {
          console.error(
            "Withdrawal payment loading error:",
            paymentError
          );

          setError("Unable to calculate your available balance.");
          setLoadingPayments(false);
        }
      );

      const withdrawalsQuery = query(
        collection(firestore, "withdrawalRequests"),
        where("tutorId", "==", user.uid)
      );

      unsubscribeWithdrawals = onSnapshot(
        withdrawalsQuery,
        (snapshot) => {
          const withdrawalList = snapshot.docs.map(
            (withdrawalDocument) => {
              const data = withdrawalDocument.data();

              return {
                id: withdrawalDocument.id,
                requestId:
                  data.requestId ?? withdrawalDocument.id,
                amount: Number(data.amount ?? 0),
                bkashNumber: data.bkashNumber ?? "",
                status: data.status ?? "pending",
                tutorId: data.tutorId ?? "",
                tutorName: data.tutorName ?? "",
                tutorEmail: data.tutorEmail ?? "",
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
          setLoadingWithdrawals(false);
        },
        (withdrawalError) => {
          console.error(
            "Withdrawal history error:",
            withdrawalError
          );

          setError("Unable to load your withdrawal history.");
          setLoadingWithdrawals(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser?.();
      unsubscribePayments?.();
      unsubscribeWithdrawals?.();
    };
  }, [router]);

  const totalEarnings = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          payment.status.toLowerCase() === "successful" &&
          payment.tutorBalanceCredited
      )
      .reduce(
        (total, payment) => total + payment.tutorEarning,
        0
      );
  }, [payments]);

  const unavailableWithdrawalAmount = useMemo(() => {
    return withdrawals
      .filter((withdrawal) => {
        const status = withdrawal.status.toLowerCase();

        return status === "pending" || status === "paid";
      })
      .reduce(
        (total, withdrawal) => total + withdrawal.amount,
        0
      );
  }, [withdrawals]);

  const totalPaid = useMemo(() => {
    return withdrawals
      .filter(
        (withdrawal) =>
          withdrawal.status.toLowerCase() === "paid"
      )
      .reduce(
        (total, withdrawal) => total + withdrawal.amount,
        0
      );
  }, [withdrawals]);

  const pendingAmount = useMemo(() => {
    return withdrawals
      .filter(
        (withdrawal) =>
          withdrawal.status.toLowerCase() === "pending"
      )
      .reduce(
        (total, withdrawal) => total + withdrawal.amount,
        0
      );
  }, [withdrawals]);

  const availableBalance = Math.max(
    0,
    totalEarnings - unavailableWithdrawalAmount
  );

  async function handleWithdrawal(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const withdrawalAmount = Number(amount);
    const cleanBkashNumber = bkashNumber.trim();

    if (!userId) {
      setError("Your account could not be identified.");
      return;
    }

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError("Please enter a valid withdrawal amount.");
      return;
    }

    if (withdrawalAmount > availableBalance) {
      setError(
        `Your available balance is ${formatMoney(
          availableBalance
        )}.`
      );
      return;
    }

    if (!/^01\d{9}$/.test(cleanBkashNumber)) {
      setError(
        "Enter a valid 11-digit Bangladesh bKash number."
      );
      return;
    }

    setSubmitting(true);

    try {
      const withdrawalDocument = await addDoc(
        collection(firestore, "withdrawalRequests"),
        {
          amount: withdrawalAmount,
          bkashNumber: cleanBkashNumber,
          createdAt: serverTimestamp(),
          paidAt: null,
          paidBy: "",
          requestId: "",
          status: "pending",
          tutorEmail,
          tutorId: userId,
          tutorName: tutorName || "Tutor",
          tutorTransactionId: "",
          updatedAt: serverTimestamp(),
        }
      );

      await updateDoc(withdrawalDocument, {
        requestId: withdrawalDocument.id,
      });

      setAmount("");
      setBkashNumber("");
      setSuccess(
        "Your withdrawal request was submitted successfully."
      );
    } catch (submitError) {
      console.error(
        "Withdrawal request error:",
        submitError
      );

      setError(
        "Unable to submit your withdrawal request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const loading = loadingPayments || loadingWithdrawals;

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
            Withdraw earnings
          </h1>

          <p className="mt-3 text-slate-600">
            Request payment to your personal bKash account.
          </p>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading your balance...
            </p>
          </div>
        )}

        {!loading && (
          <>
            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              <BalanceCard
                title="Available balance"
                value={formatMoney(availableBalance)}
                color="emerald"
              />

              <BalanceCard
                title="Pending withdrawal"
                value={formatMoney(pendingAmount)}
                color="amber"
              />

              <BalanceCard
                title="Total withdrawn"
                value={formatMoney(totalPaid)}
                color="blue"
              />
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-5">
              <section className="rounded-2xl bg-white p-8 shadow-sm lg:col-span-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  New request
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  The admin will verify and process your request.
                </p>

                {error && (
                  <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                    {success}
                  </p>
                )}

                <form
                  onSubmit={handleWithdrawal}
                  className="mt-6 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="amount"
                      className="mb-2 block font-medium text-slate-700"
                    >
                      Amount (BDT)
                    </label>

                    <input
                      id="amount"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="Enter withdrawal amount"
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setAmount(String(availableBalance))
                      }
                      disabled={availableBalance <= 0}
                      className="mt-2 text-sm font-semibold text-emerald-600 disabled:text-slate-400"
                    >
                      Use full available balance
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="bkashNumber"
                      className="mb-2 block font-medium text-slate-700"
                    >
                      bKash number
                    </label>

                    <input
                      id="bkashNumber"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      value={bkashNumber}
                      onChange={(event) =>
                        setBkashNumber(
                          event.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="01XXXXXXXXX"
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      submitting || availableBalance <= 0
                    }
                    className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit withdrawal request"}
                  </button>

                  {availableBalance <= 0 && (
                    <p className="text-center text-sm text-slate-500">
                      You do not currently have an available
                      balance.
                    </p>
                  )}
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Withdrawal history
                  </h2>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-5xl">🏦</div>

                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      No withdrawal requests
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Your requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {withdrawals.map((withdrawal) => (
                      <WithdrawalRow
                        key={withdrawal.id}
                        withdrawal={withdrawal}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function BalanceCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "emerald" | "amber" | "blue";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`inline-block rounded-lg px-3 py-1 text-sm font-semibold ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </article>
  );
}

function WithdrawalRow({
  withdrawal,
}: {
  withdrawal: WithdrawalRequest;
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-900">
              {formatMoney(withdrawal.amount)}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}
            >
              {status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            bKash: {withdrawal.bkashNumber}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Request ID: {withdrawal.requestId}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDate(withdrawal.createdAt)}
          </p>

          {withdrawal.tutorTransactionId && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              Transaction ID:{" "}
              {withdrawal.tutorTransactionId}
            </p>
          )}
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

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Processing date...";
  }

  return timestamp.toDate().toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}