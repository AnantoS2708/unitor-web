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
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";

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

interface WithdrawalRequest {
  id: string;

  tutorId: string;
  tutorName: string;

  amount: number;

  paymentMethod: string;
  accountNumber: string;

  status: string;

  requestedAt?: Timestamp;
  paidAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function TutorEarningsPage() {
  const router = useRouter();

  const [
    payments,
    setPayments,
  ] = useState<Payment[]>([]);

  const [
    withdrawals,
    setWithdrawals,
  ] = useState<
    WithdrawalRequest[]
  >([]);

  const [
    tutorId,
    setTutorId,
  ] = useState("");

  const [
    tutorName,
    setTutorName,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showWithdrawalForm,
    setShowWithdrawalForm,
  ] = useState(false);

  const [
    withdrawalAmount,
    setWithdrawalAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("bKash");

  const [
    accountNumber,
    setAccountNumber,
  ] = useState("");

  const [
    requestingWithdrawal,
    setRequestingWithdrawal,
  ] = useState(false);

  /*
   * ==========================================
   * AUTH + LOAD PAYMENTS + WITHDRAWALS
   * ==========================================
   */
  useEffect(() => {
    let unsubscribePayments:
      | (() => void)
      | undefined;

    let unsubscribeWithdrawals:
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

          setTutorId(
            user.uid
          );

          setTutorName(
            user.displayName ??
              user.email ??
              "Tutor"
          );

          /*
           * -------------------------------
           * PAYMENTS
           * -------------------------------
           */
          const paymentsQuery =
            query(
              collection(
                firestore,
                "payments"
              ),
              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribePayments =
            onSnapshot(
              paymentsQuery,
              (snapshot) => {
                const paymentList =
                  snapshot.docs.map(
                    (
                      paymentDocument
                    ) => {
                      const data =
                        paymentDocument.data();

                      const amount =
                        Number(
                          data.amount ??
                            0
                        );

                      /*
                       * Always calculate fallback
                       * using Unitor's 10% fee.
                       */
                      const platformFee =
                        Number(
                          data.platformFee ??
                            amount *
                              0.1
                        );

                      const tutorEarning =
                        Number(
                          data.tutorEarning ??
                            amount -
                              platformFee
                        );

                      return {
                        id:
                          paymentDocument.id,

                        paymentId:
                          data.paymentId ??
                          paymentDocument.id,

                        amount,

                        platformFee,

                        tutorEarning,

                        currency:
                          data.currency ??
                          "BDT",

                        status:
                          data.status ??
                          "pending",

                        studentId:
                          data.studentId ??
                          "",

                        studentName:
                          data.studentName ??
                          "Student",

                        tutorId:
                          data.tutorId ??
                          "",

                        tutorName:
                          data.tutorName ??
                          "",

                        proposalId:
                          data.proposalId ??
                          "",

                        jobProposalId:
                          data.jobProposalId ??
                          "",

                        transactionId:
                          data.transactionId ??
                          "",

                        tutorBalanceCredited:
                          data.tutorBalanceCredited ??
                          false,

                        createdAt:
                          data.createdAt,

                        submittedAt:
                          data.submittedAt,

                        approvedAt:
                          data.approvedAt,

                        updatedAt:
                          data.updatedAt,
                      } as Payment;
                    }
                  );

                paymentList.sort(
                  (
                    first,
                    second
                  ) => {
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

                    return (
                      secondTime -
                      firstTime
                    );
                  }
                );

                setPayments(
                  paymentList
                );

                setLoading(
                  false
                );
              },
              (
                paymentError
              ) => {
                console.error(
                  "Tutor payment loading error:",
                  paymentError
                );

                setError(
                  "Unable to load your earnings."
                );

                setLoading(
                  false
                );
              }
            );

          /*
           * -------------------------------
           * WITHDRAWALS
           * -------------------------------
           */
          const withdrawalsQuery =
            query(
              collection(
                firestore,
                "withdrawalRequests"
              ),
              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribeWithdrawals =
            onSnapshot(
              withdrawalsQuery,
              (
                snapshot
              ) => {
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

                        tutorId:
                          data.tutorId ??
                          "",

                        tutorName:
                          data.tutorName ??
                          "Tutor",

                        amount:
                          Number(
                            data.amount ??
                              0
                          ),

                        paymentMethod:
                          data.paymentMethod ??
                          "",

                        accountNumber:
                          data.accountNumber ??
                          "",

                        status:
                          data.status ??
                          "pending",

                        requestedAt:
                          data.requestedAt,

                        paidAt:
                          data.paidAt,

                        updatedAt:
                          data.updatedAt,
                      } as WithdrawalRequest;
                    }
                  );

                withdrawalList.sort(
                  (
                    first,
                    second
                  ) => {
                    const firstTime =
                      first.requestedAt?.toMillis?.() ??
                      0;

                    const secondTime =
                      second.requestedAt?.toMillis?.() ??
                      0;

                    return (
                      secondTime -
                      firstTime
                    );
                  }
                );

                setWithdrawals(
                  withdrawalList
                );
              },
              (
                withdrawalError
              ) => {
                console.error(
                  "Withdrawal loading error:",
                  withdrawalError
                );

                setError(
                  "Unable to load withdrawal information."
                );
              }
            );
        }
      );

    return () => {
      unsubscribeAuth();

      unsubscribePayments?.();

      unsubscribeWithdrawals?.();
    };
  }, [router]);

  /*
   * ==========================================
   * SUCCESSFUL PAYMENTS
   * ==========================================
   */
  const successfulPayments =
    useMemo(
      () =>
        payments.filter(
          (
            payment
          ) =>
            payment.status
              .trim()
              .toLowerCase() ===
            "successful"
        ),
      [payments]
    );

  /*
   * ==========================================
   * PENDING PAYMENTS
   * ==========================================
   */
  const pendingPayments =
    useMemo(
      () =>
        payments.filter(
          (
            payment
          ) => {
            const status =
              payment.status
                .trim()
                .toLowerCase();

            return (
              status ===
                "pending" ||
              status ===
                "submitted" ||
              status ===
                "pending_admin_approval"
            );
          }
        ),
      [payments]
    );

  /*
   * ==========================================
   * TOTAL EARNINGS
   *
   * Already after 10% commission.
   * ==========================================
   */
  const totalEarnings =
    useMemo(
      () =>
        successfulPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.tutorEarning,
          0
        ),
      [
        successfulPayments,
      ]
    );

  /*
   * ==========================================
   * PLATFORM FEES
   * ==========================================
   */
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
      [
        successfulPayments,
      ]
    );

  /*
   * ==========================================
   * PENDING PAYMENT EARNINGS
   * ==========================================
   */
  const pendingAmount =
    useMemo(
      () =>
        pendingPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.tutorEarning,
          0
        ),
      [
        pendingPayments,
      ]
    );

  /*
   * ==========================================
   * PAID WITHDRAWALS
   * ==========================================
   */
  const paidWithdrawals =
    useMemo(
      () =>
        withdrawals.filter(
          (
            withdrawal
          ) =>
            withdrawal.status
              .trim()
              .toLowerCase() ===
            "paid"
        ),
      [withdrawals]
    );

  const totalWithdrawn =
    useMemo(
      () =>
        paidWithdrawals.reduce(
          (
            total,
            withdrawal
          ) =>
            total +
            withdrawal.amount,
          0
        ),
      [
        paidWithdrawals,
      ]
    );

  /*
   * ==========================================
   * PENDING WITHDRAWALS
   * ==========================================
   */
  const pendingWithdrawals =
    useMemo(
      () =>
        withdrawals.filter(
          (
            withdrawal
          ) => {
            const status =
              withdrawal.status
                .trim()
                .toLowerCase();

            return (
              status ===
                "pending" ||
              status ===
                "submitted"
            );
          }
        ),
      [withdrawals]
    );

  const pendingWithdrawalAmount =
    useMemo(
      () =>
        pendingWithdrawals.reduce(
          (
            total,
            withdrawal
          ) =>
            total +
            withdrawal.amount,
          0
        ),
      [
        pendingWithdrawals,
      ]
    );

  /*
   * ==========================================
   * AVAILABLE BALANCE
   *
   * Successful tutor earnings
   * - already paid withdrawals
   * - pending withdrawals
   * ==========================================
   */
  const availableBalance =
    Math.max(
      0,
      totalEarnings -
        totalWithdrawn -
        pendingWithdrawalAmount
    );

  /*
   * Only one pending request at a time.
   */
  const hasPendingWithdrawal =
    pendingWithdrawals.length >
    0;

  const currentPendingWithdrawal =
    pendingWithdrawals[0] ??
    null;

  /*
   * ==========================================
   * REQUEST WITHDRAWAL
   * ==========================================
   */
  async function handleWithdrawalRequest(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !tutorId ||
      requestingWithdrawal ||
      hasPendingWithdrawal
    ) {
      return;
    }

    const amount =
      Number(
        withdrawalAmount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );

      return;
    }

    if (
      amount >
      availableBalance
    ) {
      setError(
        `You can withdraw a maximum of ${formatMoney(
          availableBalance
        )}.`
      );

      return;
    }

    if (
      !paymentMethod.trim()
    ) {
      setError(
        "Please select a payment method."
      );

      return;
    }

    if (
      !accountNumber.trim()
    ) {
      setError(
        "Please enter your withdrawal account number."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Request withdrawal of ${formatMoney(
          amount
        )} to ${paymentMethod} account ${accountNumber.trim()}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRequestingWithdrawal(
        true
      );

      setError("");

      setSuccess("");

      await addDoc(
        collection(
          firestore,
          "withdrawalRequests"
        ),
        {
          tutorId,

          tutorName,

          amount,

          currency:
            "BDT",

          paymentMethod:
            paymentMethod.trim(),

          accountNumber:
            accountNumber.trim(),

          status:
            "pending",

          requestedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          paidAt:
            null,

          paidBy:
            "",

          adminNote:
            "",
        }
      );

      setSuccess(
        "Your withdrawal request has been submitted. Please wait for admin approval and payment."
      );

      setWithdrawalAmount(
        ""
      );

      setAccountNumber(
        ""
      );

      setShowWithdrawalForm(
        false
      );
    } catch (
      requestError
    ) {
      console.error(
        "Withdrawal request error:",
        requestError
      );

      setError(
        "Unable to submit your withdrawal request. Please try again."
      );
    } finally {
      setRequestingWithdrawal(
        false
      );
    }
  }

  return (
    <main className="min-h-screen bg-unitor-background">

      {/* HEADER */}

      <header className="border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* TITLE */}

        <div>

          <p className="font-medium text-unitor-primary">
            Tutor account
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Earnings & Withdrawals
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            View your tutoring income, available balance and withdrawal history.
            Unitor&apos;s 10% platform fee is deducted before your earnings are
            added.
          </p>

        </div>

        {/* SUCCESS */}

        {success && (

          <div className="mt-8 rounded-xl border border-unitor-blue-light bg-unitor-background p-4 text-unitor-primary-hover">
            {success}
          </div>

        )}

        {/* ERROR */}

        {error && (

          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>

        )}

        {/* SUMMARY */}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Total earnings"
            value={formatMoney(
              totalEarnings
            )}
            description="After 10% platform fee"
            color="emerald"
          />

          <SummaryCard
            title="Available balance"
            value={formatMoney(
              availableBalance
            )}
            description="Available to withdraw"
            color="blue"
          />

          <SummaryCard
            title="Withdrawn"
            value={formatMoney(
              totalWithdrawn
            )}
            description="Already paid by admin"
            color="purple"
          />

          <SummaryCard
            title="Pending withdrawal"
            value={formatMoney(
              pendingWithdrawalAmount
            )}
            description={
              hasPendingWithdrawal
                ? "Waiting for admin"
                : "No pending request"
            }
            color="amber"
          />

        </section>

        {/* WITHDRAWAL SECTION */}

        <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-medium text-unitor-primary">
                Tutor wallet
              </p>

              <h2 className="mt-1 text-2xl font-bold text-unitor-black">
                Withdraw earnings
              </h2>

              <p className="mt-2 text-sm text-unitor-gray-dark">
                Available balance:
                {" "}
                <span className="font-bold text-unitor-primary-hover">
                  {formatMoney(
                    availableBalance
                  )}
                </span>
              </p>

            </div>

            {!hasPendingWithdrawal &&
              availableBalance >
                0 && (

                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawalForm(
                      (
                        previous
                      ) =>
                        !previous
                    );

                    setWithdrawalAmount(
                      availableBalance.toFixed(
                        2
                      )
                    );

                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-xl bg-unitor-primary px-5 py-3 font-medium text-white hover:bg-unitor-primary-hover"
                >
                  Request Withdrawal
                </button>

              )}

          </div>

          {/* NO MONEY */}

          {!hasPendingWithdrawal &&
            availableBalance <=
              0 && (

              <div className="mt-6 rounded-xl border border-unitor-gray-light bg-unitor-background p-4">

                <p className="font-medium text-unitor-gray-dark">
                  No balance available for withdrawal
                </p>

                <p className="mt-1 text-sm text-unitor-gray-dark">
                  Your successful tutoring earnings will become available here.
                </p>

              </div>

            )}

          {/* PENDING REQUEST */}

          {hasPendingWithdrawal &&
            currentPendingWithdrawal && (

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="font-bold text-amber-900">
                      Withdrawal pending
                    </p>

                    <p className="mt-2 text-2xl font-bold text-unitor-black">
                      {formatMoney(
                        currentPendingWithdrawal.amount
                      )}
                    </p>

                    <p className="mt-2 text-sm text-amber-800">
                      Waiting for admin to send your payment.
                    </p>

                    <p className="mt-2 text-sm text-unitor-gray-dark">
                      {
                        currentPendingWithdrawal.paymentMethod
                      }{" "}
                      •{" "}
                      {
                        currentPendingWithdrawal.accountNumber
                      }
                    </p>

                  </div>

                  <span className="inline-flex w-fit rounded-full bg-amber-200 px-4 py-2 text-sm font-medium text-amber-900">
                    Pending
                  </span>

                </div>

              </div>

            )}

          {/* REQUEST FORM */}

          {showWithdrawalForm &&
            !hasPendingWithdrawal && (

              <form
                onSubmit={
                  handleWithdrawalRequest
                }
                className="mt-6 rounded-xl border border-unitor-gray-light bg-unitor-background p-5"
              >

                <h3 className="text-lg font-bold text-unitor-black">
                  Withdrawal request
                </h3>

                <p className="mt-1 text-sm text-unitor-gray-dark">
                  Enter where you want the admin to send your money.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">

                  {/* AMOUNT */}

                  <div>

                    <label
                      htmlFor="withdrawalAmount"
                      className="block text-sm font-medium text-unitor-gray-dark"
                    >
                      Amount
                    </label>

                    <input
                      id="withdrawalAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      max={
                        availableBalance
                      }
                      value={
                        withdrawalAmount
                      }
                      onChange={(
                        event
                      ) =>
                        setWithdrawalAmount(
                          event.target.value
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                    />

                    <p className="mt-1 text-xs text-unitor-gray-dark">
                      Maximum:{" "}
                      {formatMoney(
                        availableBalance
                      )}
                    </p>

                  </div>

                  {/* METHOD */}

                  <div>

                    <label
                      htmlFor="paymentMethod"
                      className="block text-sm font-medium text-unitor-gray-dark"
                    >
                      Payment method
                    </label>

                    <select
                      id="paymentMethod"
                      value={
                        paymentMethod
                      }
                      onChange={(
                        event
                      ) =>
                        setPaymentMethod(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none focus:border-unitor-primary"
                    >
                      <option value="bKash">
                        bKash
                      </option>

                      <option value="Nagad">
                        Nagad
                      </option>

                      <option value="Rocket">
                        Rocket
                      </option>

                      <option value="Bank Transfer">
                        Bank Transfer
                      </option>
                    </select>

                  </div>

                </div>

                {/* ACCOUNT */}

                <div className="mt-5">

                  <label
                    htmlFor="accountNumber"
                    className="block text-sm font-medium text-unitor-gray-dark"
                  >
                    Account number
                  </label>

                  <input
                    id="accountNumber"
                    type="text"
                    value={
                      accountNumber
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountNumber(
                        event.target.value
                      )
                    }
                    placeholder={
                      paymentMethod ===
                      "Bank Transfer"
                        ? "Enter bank account number"
                        : `Enter ${paymentMethod} number`
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                  />

                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      setShowWithdrawalForm(
                        false
                      )
                    }
                    disabled={
                      requestingWithdrawal
                    }
                    className="rounded-xl border border-unitor-gray-light bg-white px-5 py-3 font-medium text-unitor-gray-dark hover:bg-unitor-gray-soft"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      requestingWithdrawal
                    }
                    className="rounded-xl bg-unitor-primary px-5 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestingWithdrawal
                      ? "Submitting..."
                      : "Submit Withdrawal Request"}
                  </button>

                </div>

              </form>

            )}

        </section>

        {/* WITHDRAWAL HISTORY */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-unitor-gray-light bg-white shadow-sm">

          <div className="border-b border-unitor-gray-light p-6">

            <h2 className="text-xl font-bold text-unitor-black">
              Withdrawal history
            </h2>

            <p className="mt-1 text-sm text-unitor-gray-dark">
              Track your previous withdrawal requests.
            </p>

          </div>

          {withdrawals.length ===
          0 ? (

            <div className="p-8 text-center text-sm text-unitor-gray-dark">
              No withdrawal requests yet.
            </div>

          ) : (

            <div className="divide-y divide-unitor-gray-soft">

              {withdrawals.map(
                (
                  withdrawal
                ) => (

                  <WithdrawalRow
                    key={
                      withdrawal.id
                    }
                    withdrawal={
                      withdrawal
                    }
                  />

                )
              )}

            </div>

          )}

        </section>

        {/* PAYMENT SUMMARY */}

        <section className="mt-8 grid gap-5 sm:grid-cols-3">

          <SummaryCard
            title="Successful payments"
            value={String(
              successfulPayments.length
            )}
            description="Approved student payments"
            color="emerald"
          />

          <SummaryCard
            title="Pending earnings"
            value={formatMoney(
              pendingAmount
            )}
            description={`${pendingPayments.length} payment${
              pendingPayments.length ===
              1
                ? ""
                : "s"
            } awaiting approval`}
            color="amber"
          />

          <SummaryCard
            title="Platform fees"
            value={formatMoney(
              totalPlatformFees
            )}
            description="10% Unitor commission"
            color="purple"
          />

        </section>

        {/* PAYMENT HISTORY */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-unitor-gray-light bg-white shadow-sm">

          <div className="border-b border-unitor-gray-light p-6">

            <h2 className="text-xl font-bold text-unitor-black">
              Payment history
            </h2>

            <p className="mt-1 text-sm text-unitor-gray-dark">
              Payments received from students.
            </p>

          </div>

          {loading && (

            <div className="p-10 text-center">

              <p className="text-unitor-gray-dark">
                Loading payment history...
              </p>

            </div>

          )}

          {!loading &&
            !error &&
            payments.length ===
              0 && (

              <div className="p-10 text-center">

                <div className="text-5xl">
                  💰
                </div>

                <h3 className="mt-5 text-xl font-bold text-unitor-black">
                  No earnings yet
                </h3>

                <p className="mt-2 text-unitor-gray-dark">
                  Successful tutoring payments will appear here.
                </p>

                <Link
                  href="/tutor/proposals"
                  className="mt-6 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
                >
                  Browse proposals
                </Link>

              </div>

            )}

          {!loading &&
            payments.length >
              0 && (

              <div className="divide-y divide-unitor-gray-soft">

                {payments.map(
                  (
                    payment
                  ) => (

                    <PaymentRow
                      key={
                        payment.id
                      }
                      payment={
                        payment
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

/*
 * ==========================================
 * SUMMARY CARD
 * ==========================================
 */
function SummaryCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string;
  description: string;
  color:
    | "emerald"
    | "blue"
    | "amber"
    | "purple";
}) {
  const colorClasses = {
    emerald:
      "bg-green-50 text-green-700",

    blue:
      "bg-unitor-background text-unitor-primary-hover",

    amber:
      "bg-amber-50 text-amber-700",

    purple:
      "bg-purple-50 text-purple-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">

      <div
        className={`inline-flex rounded-lg px-3 py-1 text-sm font-medium ${colorClasses[color]}`}
      >
        {title}
      </div>

      <p className="mt-5 text-3xl font-bold text-unitor-black">
        {value}
      </p>

      <p className="mt-2 text-sm text-unitor-gray-dark">
        {description}
      </p>

    </article>
  );
}

/*
 * ==========================================
 * PAYMENT ROW
 * ==========================================
 */
function PaymentRow({
  payment,
}: {
  payment: Payment;
}) {
  const status =
    payment.status
      .trim()
      .toLowerCase();

  const statusClasses =
    status ===
    "successful"
      ? "bg-green-100 text-green-700"
      : status ===
            "rejected" ||
          status ===
            "failed"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5 transition hover:bg-unitor-background">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-3">

            <h3 className="font-bold text-unitor-black">
              {payment.studentName}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses}`}
            >
              {formatStatus(
                status
              )}
            </span>

          </div>

          <p className="mt-2 text-sm text-unitor-gray-dark">
            Payment ID:{" "}
            {payment.paymentId}
          </p>

          {payment.transactionId && (

            <p className="mt-1 text-sm text-unitor-gray-dark">
              Transaction ID:{" "}
              {payment.transactionId}
            </p>

          )}

          <p className="mt-1 text-sm text-unitor-gray-dark/70">

            {formatPaymentDate(
              payment.approvedAt ??
                payment.updatedAt ??
                payment.createdAt
            )}

          </p>

        </div>

        <div className="text-left sm:text-right">

          <p className="text-xl font-bold text-unitor-primary">
            +
            {formatMoney(
              payment.tutorEarning
            )}
          </p>

          <p className="mt-1 text-sm text-unitor-gray-dark">
            Student payment:{" "}
            {formatMoney(
              payment.amount
            )}
          </p>

          <p className="mt-1 text-xs text-unitor-gray-dark/70">
            Unitor fee:{" "}
            {formatMoney(
              payment.platformFee
            )}
          </p>

        </div>

      </div>

    </article>
  );
}

/*
 * ==========================================
 * WITHDRAWAL ROW
 * ==========================================
 */
function WithdrawalRow({
  withdrawal,
}: {
  withdrawal: WithdrawalRequest;
}) {
  const status =
    withdrawal.status
      .trim()
      .toLowerCase();

  const statusClass =
    status === "paid"
      ? "bg-green-100 text-green-700"
      : status ===
            "rejected" ||
          status ===
            "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <p className="text-xl font-bold text-unitor-black">
              {formatMoney(
                withdrawal.amount
              )}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass}`}
            >
              {status}
            </span>

          </div>

          <p className="mt-2 text-sm text-unitor-gray-dark">
            {
              withdrawal.paymentMethod
            }{" "}
            •{" "}
            {
              withdrawal.accountNumber
            }
          </p>

        </div>

        <div className="text-sm text-unitor-gray-dark sm:text-right">

          <p>
            Requested:{" "}
            {formatPaymentDate(
              withdrawal.requestedAt
            )}
          </p>

          {status ===
            "paid" && (

            <p className="mt-1 text-unitor-primary">
              Paid:{" "}
              {formatPaymentDate(
                withdrawal.paidAt
              )}
            </p>

          )}

        </div>

      </div>

    </article>
  );
}

/*
 * ==========================================
 * MONEY FORMAT
 * ==========================================
 */
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
    Number.isFinite(
      amount
    )
      ? amount
      : 0
  );
}

/*
 * ==========================================
 * DATE FORMAT
 * ==========================================
 */
function formatPaymentDate(
  timestamp?: Timestamp
) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return timestamp
    .toDate()
    .toLocaleString(
      "en-BD",
      {
        day:
          "numeric",

        month:
          "short",

        year:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit",
      }
    );
}

/*
 * ==========================================
 * STATUS FORMAT
 * ==========================================
 */
function formatStatus(
  status: string
) {
  return status
    .replaceAll(
      "_",
      " "
    );
}
