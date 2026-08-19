"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
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

interface WithdrawalRequest {
  id: string;

  tutorId: string;
  tutorName: string;
  tutorEmail: string;

  amount: number;

  bkashNumber: string;
  method: string;

  status: string;

  walletCollection: string;
  walletBalanceField: string;

  createdAt?: Timestamp;
  reviewedAt?: Timestamp;

  reviewedBy?: string;
  adminNote?: string;
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminWithdrawalsPage() {
  const router = useRouter();

  const [
    withdrawalRequests,
    setWithdrawalRequests,
  ] =
    useState<WithdrawalRequest[]>([]);

  const [
    checkingAdmin,
    setCheckingAdmin,
  ] = useState(true);

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
    processingId,
    setProcessingId,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<
    | "pending"
    | "approved"
    | "rejected"
    | "all"
  >("pending");

  /* =========================================================
     AUTH + WITHDRAWALS
  ========================================================= */

  useEffect(() => {
    let unsubscribeWithdrawals:
      | (() => void)
      | undefined;

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
             ADMIN CHECK
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
             WITHDRAW REQUESTS
          ================================================= */

          unsubscribeWithdrawals =
            onSnapshot(
              collection(
                firestore,
                "withdrawRequests"
              ),

              (snapshot) => {
                const requests =
                  snapshot.docs.map(
                    (
                      requestDocument
                    ) => {
                      const data =
                        requestDocument.data();

                      return {
                        id:
                          requestDocument.id,

                        tutorId:
                          String(
                            data.tutorId ??
                              ""
                          ),

                        tutorName:
                          String(
                            data.tutorName ??
                              "Tutor"
                          ),

                        tutorEmail:
                          String(
                            data.tutorEmail ??
                              ""
                          ),

                        amount:
                          toNumber(
                            data.amount
                          ),

                        bkashNumber:
                          String(
                            data.bkashNumber ??
                              ""
                          ),

                        method:
                          String(
                            data.method ??
                              "bkash"
                          ),

                        status:
                          normalizeStatus(
                            String(
                              data.status ??
                                "pending"
                            )
                          ),

                        walletCollection:
                          String(
                            data.walletCollection ??
                              ""
                          ),

                        walletBalanceField:
                          String(
                            data.walletBalanceField ??
                              ""
                          ),

                        createdAt:
                          data.createdAt instanceof
                          Timestamp
                            ? data.createdAt
                            : undefined,

                        reviewedAt:
                          data.reviewedAt instanceof
                          Timestamp
                            ? data.reviewedAt
                            : undefined,

                        reviewedBy:
                          String(
                            data.reviewedBy ??
                              ""
                          ),

                        adminNote:
                          String(
                            data.adminNote ??
                              ""
                          ),
                      } as WithdrawalRequest;
                    }
                  );

                /* -----------------------------------------
                   NEWEST FIRST
                ----------------------------------------- */

                requests.sort(
                  (
                    first,
                    second
                  ) => {
                    const firstTime =
                      first.createdAt
                        ?.toMillis() ??
                      0;

                    const secondTime =
                      second.createdAt
                        ?.toMillis() ??
                      0;

                    return (
                      secondTime -
                      firstTime
                    );
                  }
                );

                setWithdrawalRequests(
                  requests
                );

                setLoading(false);
              },

              (
                withdrawalError
              ) => {
                console.error(
                  "Withdrawal loading error:",
                  withdrawalError
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

  /* =========================================================
     FILTERS
  ========================================================= */

  const pendingRequests =
    useMemo(
      () =>
        withdrawalRequests.filter(
          (request) =>
            normalizeStatus(
              request.status
            ) === "pending"
        ),
      [withdrawalRequests]
    );

  const approvedRequests =
    useMemo(
      () =>
        withdrawalRequests.filter(
          (request) => {
            const status =
              normalizeStatus(
                request.status
              );

            return (
              status ===
                "approved" ||
              status ===
                "paid"
            );
          }
        ),
      [withdrawalRequests]
    );

  const rejectedRequests =
    useMemo(
      () =>
        withdrawalRequests.filter(
          (request) =>
            normalizeStatus(
              request.status
            ) === "rejected"
        ),
      [withdrawalRequests]
    );

  const displayedRequests =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return withdrawalRequests;
      }

      if (
        filter ===
        "approved"
      ) {
        return approvedRequests;
      }

      if (
        filter ===
        "rejected"
      ) {
        return rejectedRequests;
      }

      return pendingRequests;
    }, [
      filter,
      withdrawalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
    ]);

  /* =========================================================
     APPROVE
  ========================================================= */

  async function handleApprove(
    request:
      WithdrawalRequest
  ) {
    setError("");
    setSuccess("");

    const admin =
      auth.currentUser;

    if (!admin) {
      router.replace(
        "/admin/login"
      );

      return;
    }

    if (
      normalizeStatus(
        request.status
      ) !== "pending"
    ) {
      setError(
        "This withdrawal request has already been reviewed."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Have you already sent ৳${formatMoney(
          request.amount
        )} to ${request.bkashNumber}?\n\nOnly click OK after sending the bKash payment.`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      request.id
    );

    try {
      const requestRef =
        doc(
          firestore,
          "withdrawRequests",
          request.id
        );

      const userWalletRef =
        doc(
          firestore,
          "users",
          request.tutorId
        );

      const oldTutorWalletRef =
        doc(
          firestore,
          "tutors",
          request.tutorId
        );

      await runTransaction(
        firestore,
        async (
          transaction
        ) => {
          /* -----------------------------------
             ALL READS FIRST
          ----------------------------------- */

          const requestSnapshot =
            await transaction.get(
              requestRef
            );

          const userSnapshot =
            await transaction.get(
              userWalletRef
            );

          const tutorSnapshot =
            await transaction.get(
              oldTutorWalletRef
            );

          /* -----------------------------------
             REQUEST CHECK
          ----------------------------------- */

          if (
            !requestSnapshot.exists()
          ) {
            throw new Error(
              "Withdrawal request was not found."
            );
          }

          const requestData =
            requestSnapshot.data();

          const currentStatus =
            normalizeStatus(
              String(
                requestData.status ??
                  ""
              )
            );

          if (
            currentStatus !==
            "pending"
          ) {
            throw new Error(
              "This withdrawal request has already been reviewed."
            );
          }

          const amount =
            toNumber(
              requestData.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              "Invalid withdrawal amount."
            );
          }

          /* -----------------------------------
             FIND CORRECT WALLET
          ----------------------------------- */

          const wallet =
            resolveWalletForRequest({
              requestData:
                requestData as Record<
                  string,
                  unknown
                >,

              userData:
                userSnapshot.exists()
                  ? (userSnapshot.data() as Record<
                      string,
                      unknown
                    >)
                  : null,

              tutorData:
                tutorSnapshot.exists()
                  ? (tutorSnapshot.data() as Record<
                      string,
                      unknown
                    >)
                  : null,

              userRef:
                userWalletRef,

              tutorRef:
                oldTutorWalletRef,
            });

          if (
            !wallet.data
          ) {
            throw new Error(
              "Tutor wallet could not be found."
            );
          }

          const currentPending =
            toNumber(
              wallet.data[
                "pendingWithdrawalAmount"
              ]
            );

          const currentWithdrawn =
            toNumber(
              wallet.data[
                "totalWithdrawn"
              ]
            );

          /* -----------------------------------
             UPDATE WALLET
          ----------------------------------- */

          transaction.update(
            wallet.ref,
            {
              pendingWithdrawalAmount:
                Math.max(
                  0,
                  currentPending -
                    amount
                ),

              totalWithdrawn:
                currentWithdrawn +
                amount,

              walletUpdatedAt:
                serverTimestamp(),
            }
          );

          /* -----------------------------------
             APPROVE REQUEST
          ----------------------------------- */

          transaction.update(
            requestRef,
            {
              status:
                "approved",

              reviewedAt:
                serverTimestamp(),

              reviewedBy:
                admin.uid,

              adminNote:
                "bKash payment sent and withdrawal approved.",
            }
          );
        }
      );

      setSuccess(
        `৳${formatMoney(
          request.amount
        )} withdrawal for ${request.tutorName} was approved successfully.`
      );
    } catch (
      approveError
    ) {
      console.error(
        "Approve withdrawal error:",
        approveError
      );

      if (
        approveError instanceof
        Error
      ) {
        setError(
          approveError.message
        );
      } else {
        setError(
          "Unable to approve the withdrawal request."
        );
      }
    } finally {
      setProcessingId("");
    }
  }

  /* =========================================================
     REJECT
  ========================================================= */

  async function handleReject(
    request:
      WithdrawalRequest
  ) {
    setError("");
    setSuccess("");

    const admin =
      auth.currentUser;

    if (!admin) {
      router.replace(
        "/admin/login"
      );

      return;
    }

    if (
      normalizeStatus(
        request.status
      ) !== "pending"
    ) {
      setError(
        "This withdrawal request has already been reviewed."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Reject ${request.tutorName}'s withdrawal request of ৳${formatMoney(
          request.amount
        )}?\n\nThe reserved money will be returned to the tutor's available balance.`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      request.id
    );

    try {
      const requestRef =
        doc(
          firestore,
          "withdrawRequests",
          request.id
        );

      const userWalletRef =
        doc(
          firestore,
          "users",
          request.tutorId
        );

      const oldTutorWalletRef =
        doc(
          firestore,
          "tutors",
          request.tutorId
        );

      await runTransaction(
        firestore,
        async (
          transaction
        ) => {
          /* -----------------------------------
             ALL READS FIRST
          ----------------------------------- */

          const requestSnapshot =
            await transaction.get(
              requestRef
            );

          const userSnapshot =
            await transaction.get(
              userWalletRef
            );

          const tutorSnapshot =
            await transaction.get(
              oldTutorWalletRef
            );

          /* -----------------------------------
             REQUEST CHECK
          ----------------------------------- */

          if (
            !requestSnapshot.exists()
          ) {
            throw new Error(
              "Withdrawal request was not found."
            );
          }

          const requestData =
            requestSnapshot.data();

          const currentStatus =
            normalizeStatus(
              String(
                requestData.status ??
                  ""
              )
            );

          if (
            currentStatus !==
            "pending"
          ) {
            throw new Error(
              "This withdrawal request has already been reviewed."
            );
          }

          const amount =
            toNumber(
              requestData.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              "Invalid withdrawal amount."
            );
          }

          /* -----------------------------------
             FIND CORRECT WALLET
          ----------------------------------- */

          const wallet =
            resolveWalletForRequest({
              requestData:
                requestData as Record<
                  string,
                  unknown
                >,

              userData:
                userSnapshot.exists()
                  ? (userSnapshot.data() as Record<
                      string,
                      unknown
                    >)
                  : null,

              tutorData:
                tutorSnapshot.exists()
                  ? (tutorSnapshot.data() as Record<
                      string,
                      unknown
                    >)
                  : null,

              userRef:
                userWalletRef,

              tutorRef:
                oldTutorWalletRef,
            });

          if (
            !wallet.data
          ) {
            throw new Error(
              "Tutor wallet could not be found."
            );
          }

          const currentBalance =
            toNumber(
              wallet.data[
                wallet.balanceField
              ]
            );

          const currentPending =
            toNumber(
              wallet.data[
                "pendingWithdrawalAmount"
              ]
            );

          /* -----------------------------------
             RETURN RESERVED MONEY
          ----------------------------------- */

          transaction.update(
            wallet.ref,
            {
              [wallet.balanceField]:
                currentBalance +
                amount,

              pendingWithdrawalAmount:
                Math.max(
                  0,
                  currentPending -
                    amount
                ),

              walletUpdatedAt:
                serverTimestamp(),
            }
          );

          /* -----------------------------------
             REJECT REQUEST
          ----------------------------------- */

          transaction.update(
            requestRef,
            {
              status:
                "rejected",

              reviewedAt:
                serverTimestamp(),

              reviewedBy:
                admin.uid,

              adminNote:
                "Withdrawal rejected. Reserved amount returned to tutor wallet.",
            }
          );
        }
      );

      setSuccess(
        `Withdrawal request rejected. ৳${formatMoney(
          request.amount
        )} was returned to ${request.tutorName}'s wallet.`
      );
    } catch (
      rejectError
    ) {
      console.error(
        "Reject withdrawal error:",
        rejectError
      );

      if (
        rejectError instanceof
        Error
      ) {
        setError(
          rejectError.message
        );
      } else {
        setError(
          "Unable to reject the withdrawal request."
        );
      }
    } finally {
      setProcessingId("");
    }
  }

  /* =========================================================
     ADMIN CHECK
  ========================================================= */

  if (
    checkingAdmin
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft">

        <p className="text-unitor-gray-dark">
          Checking administrator access...
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

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor Admin
          </Link>

          {/* ONLY DASHBOARD BUTTON */}

          <Link
            href="/admin/dashboard"
            className="text-sm font-medium text-unitor-gray-light transition hover:text-white"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ===================================================
            TITLE
        =================================================== */}

        <div>

          <p className="font-medium text-unitor-primary">
            Payment management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Withdrawal Requests
          </h1>

          <p className="mt-3 max-w-3xl text-unitor-gray-dark">
            Review tutor withdrawal
            requests and send the payment
            manually to the tutor&apos;s
            bKash number before approving
            the request.
          </p>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>

        )}

        {/* ===================================================
            SUCCESS
        =================================================== */}

        {success && (

          <div className="mt-6 rounded-xl border border-unitor-blue-light bg-unitor-background p-4 text-sm font-medium text-unitor-primary-hover">
            ✓ {success}
          </div>

        )}

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <SummaryCard
            label="Pending"
            value={
              pendingRequests.length
            }
            status="pending"
          />

          <SummaryCard
            label="Approved"
            value={
              approvedRequests.length
            }
            status="approved"
          />

          <SummaryCard
            label="Rejected"
            value={
              rejectedRequests.length
            }
            status="rejected"
          />

        </section>

        {/* ===================================================
            FILTER BUTTONS
        =================================================== */}

        <div className="mt-7 flex flex-wrap gap-3">

          <FilterButton
            label={`Pending (${pendingRequests.length})`}
            active={
              filter ===
              "pending"
            }
            onClick={() =>
              setFilter(
                "pending"
              )
            }
          />

          <FilterButton
            label={`Approved (${approvedRequests.length})`}
            active={
              filter ===
              "approved"
            }
            onClick={() =>
              setFilter(
                "approved"
              )
            }
          />

          <FilterButton
            label={`Rejected (${rejectedRequests.length})`}
            active={
              filter ===
              "rejected"
            }
            onClick={() =>
              setFilter(
                "rejected"
              )
            }
          />

          <FilterButton
            label={`All (${withdrawalRequests.length})`}
            active={
              filter ===
              "all"
            }
            onClick={() =>
              setFilter(
                "all"
              )
            }
          />

        </div>

        {/* ===================================================
            REQUEST CONTENT
        =================================================== */}

        <section className="mt-7">

          {loading ? (

            <div className="rounded-2xl border border-unitor-gray-light bg-white p-16 text-center shadow-sm">

              <p className="text-unitor-gray-dark">
                Loading withdrawal
                requests...
              </p>

            </div>

          ) : displayedRequests.length ===
            0 ? (

            <div className="rounded-2xl border border-unitor-gray-light bg-white px-6 py-16 text-center shadow-sm">

              <div className="text-4xl">
                💳
              </div>

              <h2 className="mt-5 text-xl font-bold text-unitor-black">

                {filter ===
                  "pending" &&
                  "No pending withdrawal requests"}

                {filter ===
                  "approved" &&
                  "No approved withdrawal requests"}

                {filter ===
                  "rejected" &&
                  "No rejected withdrawal requests"}

                {filter ===
                  "all" &&
                  "No withdrawal requests"}

              </h2>

            </div>

          ) : (

            <div className="space-y-5">

              {displayedRequests.map(
                (request) => (

                  <WithdrawalCard
                    key={
                      request.id
                    }
                    request={
                      request
                    }
                    processing={
                      processingId ===
                      request.id
                    }
                    onApprove={() =>
                      handleApprove(
                        request
                      )
                    }
                    onReject={() =>
                      handleReject(
                        request
                      )
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
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status:
    | "pending"
    | "approved"
    | "rejected";
}) {
  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">

      <span
        className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold ${
          status ===
          "pending"
            ? "bg-amber-50 text-amber-700"
            : status ===
                "approved"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
        }`}
      >
        {label}
      </span>

      <p className="mt-6 text-3xl font-bold text-unitor-black">
        {value}
      </p>

    </article>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-unitor-black bg-unitor-black text-white"
          : "border-unitor-gray-light bg-white text-unitor-gray-dark hover:border-unitor-gray-dark/70 hover:bg-unitor-background"
      }`}
    >
      {label}
    </button>
  );
}

/* =========================================================
   WITHDRAWAL CARD
========================================================= */

function WithdrawalCard({
  request,
  processing,
  onApprove,
  onReject,
}: {
  request:
    WithdrawalRequest;

  processing:
    boolean;

  onApprove:
    () => void;

  onReject:
    () => void;
}) {
  const status =
    normalizeStatus(
      request.status
    );

  const approved =
    status ===
      "approved" ||
    status ===
      "paid";

  return (
    <article className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm">

      {/* TOP */}

      <div className="flex flex-col justify-between gap-5 border-b border-unitor-gray-soft pb-5 sm:flex-row sm:items-start">

        <div className="flex items-start gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">

            {request.tutorName
              .charAt(0)
              .toUpperCase() ||
              "T"}

          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-lg font-bold text-unitor-black">
                {request.tutorName}
              </h2>

              <StatusBadge
                status={
                  status
                }
              />

            </div>

            <p className="mt-1 text-sm text-unitor-gray-dark">
              {request.tutorEmail ||
                "No email provided"}
            </p>

            <p className="mt-1 text-xs text-unitor-gray-dark/70">
              Requested{" "}
              {formatDate(
                request.createdAt
              )}
            </p>

          </div>

        </div>

        <div className="sm:text-right">

          <p className="text-xs text-unitor-gray-dark">
            Withdrawal Amount
          </p>

          <p className="mt-1 text-3xl font-bold text-unitor-black">
            ৳
            {formatMoney(
              request.amount
            )}
          </p>

        </div>

      </div>

      {/* DETAILS */}

      <div className="mt-5 grid gap-4 md:grid-cols-3">

        <InfoBox
          label="Payment Method"
          value="bKash"
        />

        <InfoBox
          label="bKash Number"
          value={
            request.bkashNumber ||
            "Not provided"
          }
          highlight
        />

        <InfoBox
          label="Request ID"
          value={
            request.id
          }
        />

      </div>

      {/* REVIEWED */}

      {status !==
        "pending" && (

        <div className="mt-5 rounded-xl bg-unitor-background p-4">

          <p className="text-sm text-unitor-gray-dark">

            <span className="font-medium text-unitor-black">
              Status:
            </span>{" "}

            {approved
              ? "Approved"
              : "Rejected"}

          </p>

          {request.reviewedAt && (

            <p className="mt-1 text-sm text-unitor-gray-dark">

              <span className="font-medium text-unitor-black">
                Reviewed:
              </span>{" "}

              {formatDate(
                request.reviewedAt
              )}

            </p>

          )}

          {request.adminNote && (

            <p className="mt-1 text-sm text-unitor-gray-dark">

              <span className="font-medium text-unitor-black">
                Note:
              </span>{" "}

              {
                request.adminNote
              }

            </p>

          )}

        </div>

      )}

      {/* ACTIONS */}

      {status ===
        "pending" && (

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={
              onReject
            }
            disabled={
              processing
            }
            className="rounded-xl border border-red-300 bg-white px-6 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? "Processing..."
              : "Reject"}
          </button>

          <button
            type="button"
            onClick={
              onApprove
            }
            disabled={
              processing
            }
            className="rounded-xl bg-unitor-primary px-6 py-3 font-medium text-white transition hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:bg-unitor-gray-light"
          >
            {processing
              ? "Processing..."
              : "Payment Sent • Approve"}
          </button>

        </div>

      )}

    </article>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-unitor-blue-light bg-unitor-background"
          : "border-unitor-gray-soft bg-unitor-background"
      }`}
    >

      <p className="text-xs text-unitor-gray-dark">
        {label}
      </p>

      <p
        className={`mt-2 break-all font-medium ${
          highlight
            ? "text-unitor-primary-hover"
            : "text-unitor-black"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (
    status ===
      "approved" ||
    status ===
      "paid"
  ) {
    return (
      <span className="rounded-lg bg-unitor-background px-3 py-1 text-xs font-bold text-unitor-primary-hover">
        Approved
      </span>
    );
  }

  if (
    status ===
    "rejected"
  ) {
    return (
      <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      Pending
    </span>
  );
}

/* =========================================================
   RESOLVE WALLET
========================================================= */

function resolveWalletForRequest({
  requestData,
  userData,
  tutorData,
  userRef,
  tutorRef,
}: {
  requestData:
    Record<
      string,
      unknown
    >;

  userData:
    | Record<
        string,
        unknown
      >
    | null;

  tutorData:
    | Record<
        string,
        unknown
      >
    | null;

  userRef: ReturnType<
    typeof doc
  >;

  tutorRef: ReturnType<
    typeof doc
  >;
}) {
  const savedCollection =
    String(
      requestData[
        "walletCollection"
      ] ?? ""
    )
      .trim()
      .toLowerCase();

  const savedField =
    String(
      requestData[
        "walletBalanceField"
      ] ?? ""
    ).trim();

  /* NEW REQUEST -> SAVED LOCATION */

  if (
    savedCollection ===
      "tutors" &&
    tutorData
  ) {
    return {
      ref:
        tutorRef,

      data:
        tutorData,

      balanceField:
        savedField ||
        detectBalanceField(
          tutorData
        ),
    };
  }

  if (
    savedCollection ===
      "users" &&
    userData
  ) {
    return {
      ref:
        userRef,

      data:
        userData,

      balanceField:
        savedField ||
        detectBalanceField(
          userData
        ),
    };
  }

  /* OLD REQUEST */

  const userPending =
    toNumber(
      userData?.[
        "pendingWithdrawalAmount"
      ]
    );

  const tutorPending =
    toNumber(
      tutorData?.[
        "pendingWithdrawalAmount"
      ]
    );

  if (
    tutorData &&
    tutorPending >
      userPending
  ) {
    return {
      ref:
        tutorRef,

      data:
        tutorData,

      balanceField:
        detectBalanceField(
          tutorData
        ),
    };
  }

  if (userData) {
    return {
      ref:
        userRef,

      data:
        userData,

      balanceField:
        detectBalanceField(
          userData
        ),
    };
  }

  if (tutorData) {
    return {
      ref:
        tutorRef,

      data:
        tutorData,

      balanceField:
        detectBalanceField(
          tutorData
        ),
    };
  }

  return {
    ref:
      userRef,

    data:
      null,

    balanceField:
      "availableBalance",
  };
}

/* =========================================================
   DETECT BALANCE FIELD
========================================================= */

function detectBalanceField(
  data:
    Record<
      string,
      unknown
    >
) {
  const fields = [
    "availableBalance",
    "totalBalance",
    "balance",
    "money",
    "walletBalance",
  ];

  for (
    const field of
    fields
  ) {
    if (
      toNumber(
        data[field]
      ) > 0
    ) {
      return field;
    }
  }

  for (
    const field of
    fields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      return field;
    }
  }

  return "availableBalance";
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(
  status: string
) {
  return status
    .trim()
    .toLowerCase();
}

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

function formatDate(
  timestamp?: Timestamp
) {
  if (!timestamp) {
    return "Recently";
  }

  return timestamp
    .toDate()
    .toLocaleString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
}
