"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

interface TutorProfile {
  fullName: string;
  universityEmail: string;
  profileImageUrl: string;
  tutorStatus: string;
  roles: string[];
}

interface WithdrawalRequest {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  amount: number;
  bkashNumber: string;
  status: string;
  walletCollection?: string;
  walletBalanceField?: string;
  createdAt?: Timestamp;
  reviewedAt?: Timestamp;
}

type WalletSource = "users" | "tutors";

interface WalletInfo {
  source: WalletSource;
  balanceField: string;
  balance: number;
  lifetimeEarnings: number;
  totalWithdrawn: number;
}

/* =========================================================
   PAGE
========================================================= */

export default function TutorCardPage() {
  const router = useRouter();

  /* =========================================================
     PROFILE
  ========================================================= */

  const [
    profile,
    setProfile,
  ] = useState<TutorProfile | null>(null);

  /* =========================================================
     WALLET
  ========================================================= */

  const [
    walletBalance,
    setWalletBalance,
  ] = useState(0);

  const [
    lifetimeEarnings,
    setLifetimeEarnings,
  ] = useState(0);

  const [
    totalWithdrawn,
    setTotalWithdrawn,
  ] = useState(0);

  const [
    walletSource,
    setWalletSource,
  ] = useState<WalletSource>("users");

  const [
    walletBalanceField,
    setWalletBalanceField,
  ] = useState("availableBalance");

  /* =========================================================
     WITHDRAW FORM
  ========================================================= */

  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState("");

  const [
    bkashNumber,
    setBkashNumber,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* =========================================================
     WITHDRAW HISTORY
  ========================================================= */

  const [
    withdrawalRequests,
    setWithdrawalRequests,
  ] = useState<WithdrawalRequest[]>([]);

  /* =========================================================
     UI
  ========================================================= */

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
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  /* =========================================================
     LOAD FIREBASE
  ========================================================= */

  useEffect(() => {
    let unsubscribeUser:
      | (() => void)
      | undefined;

    let unsubscribeTutorWallet:
      | (() => void)
      | undefined;

    let unsubscribeWithdrawals:
      | (() => void)
      | undefined;

    /*
     * We keep both documents in memory.
     *
     * Your app may have balance inside:
     *
     * users/{uid}
     *
     * OR older:
     *
     * tutors/{uid}
     */

    let userWalletData:
      | Record<string, unknown>
      | null = null;

    let tutorWalletData:
      | Record<string, unknown>
      | null = null;

    /* =======================================================
       UPDATE WALLET
    ======================================================= */

    function updateWalletFromDocuments() {
      const walletInfo =
        chooseWalletInfo(
          userWalletData,
          tutorWalletData
        );

      setWalletBalance(
        walletInfo.balance
      );

      setLifetimeEarnings(
        walletInfo.lifetimeEarnings
      );

      setTotalWithdrawn(
        walletInfo.totalWithdrawn
      );

      setWalletSource(
        walletInfo.source
      );

      setWalletBalanceField(
        walletInfo.balanceField
      );
    }

    /* =======================================================
       AUTH
    ======================================================= */

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.replace("/login");
            return;
          }

          /* =================================================
             USERS/{UID}
             PROFILE + POSSIBLE WALLET
          ================================================= */

          unsubscribeUser =
            onSnapshot(
              doc(
                firestore,
                "users",
                user.uid
              ),

              (snapshot) => {
                if (!snapshot.exists()) {
                  setError(
                    "Your user profile could not be found."
                  );

                  setLoading(false);

                  return;
                }

                const data =
                  snapshot.data();

                userWalletData =
                  data as Record<
                    string,
                    unknown
                  >;

                /* -----------------------------------------
                   ROLES
                ----------------------------------------- */

                const roles =
                  Array.isArray(data.roles)
                    ? data.roles.map(
                        (
                          role: unknown
                        ) =>
                          String(role)
                            .trim()
                            .toLowerCase()
                      )
                    : [];

                /* -----------------------------------------
                   TUTOR STATUS
                ----------------------------------------- */

                const tutorStatus =
                  String(
                    data.tutorStatus ??
                      ""
                  )
                    .trim()
                    .toLowerCase();

                /* -----------------------------------------
                   SECURITY
                ----------------------------------------- */

                if (
                  !roles.includes(
                    "tutor"
                  ) ||
                  tutorStatus !==
                    "approved"
                ) {
                  router.replace(
                    "/student/dashboard"
                  );

                  return;
                }

                /* -----------------------------------------
                   PROFILE
                ----------------------------------------- */

                setProfile({
                  fullName:
                    String(
                      data.fullName ??
                        "Tutor"
                    ),

                  universityEmail:
                    String(
                      data.universityEmail ??
                        user.email ??
                        ""
                    ),

                  profileImageUrl:
                    String(
                      data.profileImageUrl ??
                        ""
                    ),

                  tutorStatus,

                  roles,
                });

                /*
                 * First attempt using users document.
                 *
                 * When tutors document arrives,
                 * wallet will be checked again.
                 */

                updateWalletFromDocuments();

                setLoading(false);
              },

              (profileError) => {
                console.error(
                  "User profile error:",
                  profileError
                );

                setError(
                  "Unable to load your tutor profile."
                );

                setLoading(false);
              }
            );

          /* =================================================
             TUTORS/{UID}
             OLD / APP WALLET SUPPORT
          ================================================= */

          unsubscribeTutorWallet =
            onSnapshot(
              doc(
                firestore,
                "tutors",
                user.uid
              ),

              (snapshot) => {
                if (snapshot.exists()) {
                  tutorWalletData =
                    snapshot.data() as Record<
                      string,
                      unknown
                    >;
                } else {
                  tutorWalletData =
                    null;
                }

                /*
                 * Recheck because tutor balance
                 * might actually be stored here.
                 */

                updateWalletFromDocuments();
              },

              (tutorWalletError) => {
                /*
                 * Do not crash page.
                 *
                 * Some Unitor accounts may
                 * only use users/{uid}.
                 */

                console.log(
                  "Tutor wallet document not available:",
                  tutorWalletError
                );
              }
            );

          /* =================================================
             WITHDRAWAL HISTORY
          ================================================= */

          const withdrawalQuery =
            query(
              collection(
                firestore,
                "withdrawRequests"
              ),
              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribeWithdrawals =
            onSnapshot(
              withdrawalQuery,

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

                        status:
                          String(
                            data.status ??
                              "pending"
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
                      } as WithdrawalRequest;
                    }
                  );

                /* NEWEST FIRST */

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
              },

              (
                withdrawalError
              ) => {
                console.error(
                  "Withdrawal history error:",
                  withdrawalError
                );

                /*
                 * Do not replace wallet
                 * error just because history
                 * cannot load.
                 */
              }
            );
        }
      );

    /* =======================================================
       CLEANUP
    ======================================================= */

    return () => {
      unsubscribeAuth();

      unsubscribeUser?.();

      unsubscribeTutorWallet?.();

      unsubscribeWithdrawals?.();
    };
  }, [router]);

  /* =========================================================
     PENDING WITHDRAWAL
  ========================================================= */

  const pendingWithdrawalAmount =
    useMemo(() => {
      return withdrawalRequests
        .filter(
          (request) =>
            normalizeStatus(
              request.status
            ) === "pending"
        )
        .reduce(
          (
            total,
            request
          ) =>
            total +
            request.amount,
          0
        );
    }, [
      withdrawalRequests,
    ]);

  /* =========================================================
     PENDING REQUEST COUNT
  ========================================================= */

  const pendingRequestCount =
    useMemo(() => {
      return withdrawalRequests.filter(
        (request) =>
          normalizeStatus(
            request.status
          ) === "pending"
      ).length;
    }, [
      withdrawalRequests,
    ]);

  /* =========================================================
     WITHDRAW REQUEST
  ========================================================= */

  async function handleWithdrawRequest(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const user =
      auth.currentUser;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!profile) {
      setError(
        "Tutor profile is not available."
      );

      return;
    }

    /* =======================================================
       AMOUNT
    ======================================================= */

    const amount =
      Number(withdrawAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );

      return;
    }

    if (
      amount >
      walletBalance
    ) {
      setError(
        "You do not have enough available balance."
      );

      return;
    }

    /* =======================================================
       BKASH
    ======================================================= */

    const cleanBkashNumber =
      bkashNumber
        .trim()
        .replace(
          /\D/g,
          ""
        );

    const bkashPattern =
      /^01[3-9]\d{8}$/;

    if (
      !bkashPattern.test(
        cleanBkashNumber
      )
    ) {
      setError(
        "Please enter a valid 11-digit bKash number."
      );

      return;
    }

    setSubmitting(true);

    try {
      const usersRef =
        doc(
          firestore,
          "users",
          user.uid
        );

      const tutorsRef =
        doc(
          firestore,
          "tutors",
          user.uid
        );

      const requestRef =
        doc(
          collection(
            firestore,
            "withdrawRequests"
          )
        );

      await runTransaction(
        firestore,

        async (
          transaction
        ) => {
          /*
           * IMPORTANT:
           *
           * Read both documents before writing.
           */

          const userSnapshot =
            await transaction.get(
              usersRef
            );

          const tutorSnapshot =
            await transaction.get(
              tutorsRef
            );

          const userData =
            userSnapshot.exists()
              ? (userSnapshot.data() as Record<
                  string,
                  unknown
                >)
              : null;

          const tutorData =
            tutorSnapshot.exists()
              ? (tutorSnapshot.data() as Record<
                  string,
                  unknown
                >)
              : null;

          /*
           * Find exactly where the
           * real balance currently lives.
           */

          const currentWallet =
            chooseWalletInfo(
              userData,
              tutorData
            );

          const currentBalance =
            currentWallet.balance;

          if (
            amount >
            currentBalance
          ) {
            throw new Error(
              "Your wallet balance has changed. Please refresh and try again."
            );
          }

          const walletRef =
            currentWallet.source ===
            "tutors"
              ? tutorsRef
              : usersRef;

          const walletData =
            currentWallet.source ===
            "tutors"
              ? tutorData
              : userData;

          if (!walletData) {
            throw new Error(
              "Your wallet could not be found."
            );
          }

          const currentPending =
            toNumber(
              walletData[
                "pendingWithdrawalAmount"
              ]
            );

          /*
           * =====================================
           * RESERVE THE MONEY
           * =====================================
           */

          transaction.update(
            walletRef,
            {
              [currentWallet.balanceField]:
                currentBalance -
                amount,

              pendingWithdrawalAmount:
                currentPending +
                amount,

              walletUpdatedAt:
                serverTimestamp(),
            }
          );

          /*
           * =====================================
           * CREATE WITHDRAW REQUEST
           * =====================================
           *
           * We save where the balance
           * came from so admin can later
           * approve/reject the correct
           * wallet document.
           */

          transaction.set(
            requestRef,
            {
              tutorId:
                user.uid,

              tutorName:
                profile.fullName,

              tutorEmail:
                profile.universityEmail,

              amount,

              bkashNumber:
                cleanBkashNumber,

              method:
                "bkash",

              status:
                "pending",

              walletCollection:
                currentWallet.source,

              walletBalanceField:
                currentWallet.balanceField,

              createdAt:
                serverTimestamp(),

              reviewedAt:
                null,

              reviewedBy:
                null,

              adminNote:
                "",
            }
          );
        }
      );

      setWithdrawAmount("");

      setBkashNumber("");

      setSuccess(
        "Withdrawal request submitted successfully. The amount is waiting for admin approval."
      );
    } catch (
      submitError
    ) {
      console.error(
        "Withdrawal request error:",
        submitError
      );

      if (
        submitError instanceof
        Error
      ) {
        setError(
          submitError.message
        );
      } else {
        setError(
          "Unable to submit your withdrawal request."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await signOut(auth);

      router.replace(
        "/login"
      );
    } catch (
      logoutError
    ) {
      console.error(
        "Logout error:",
        logoutError
      );

      setError(
        "Unable to log out. Please try again."
      );
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading your wallet...
        </p>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO */}

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor Tutor
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav className="hidden items-center gap-8 md:flex">

            <Link
              href="/tutor/dashboard"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Dashboard
            </Link>

            <Link
              href="/tutor/proposals"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Available Proposals
            </Link>

            <Link
              href="/tutor/messages"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Messages
            </Link>

            <Link
              href="/tutor/card"
              className="font-semibold text-emerald-600"
            >
              My Card
            </Link>

          </nav>

          {/* =================================================
              DESKTOP RIGHT
          ================================================= */}

          <div className="hidden items-center gap-3 md:flex">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/role-selection"
                )
              }
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
            >
              Switch view
            </button>

            <Link
              href="/tutor/profile"
              aria-label="Tutor profile"
            >

              {profile?.profileImageUrl ? (

                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profile.profileImageUrl
                  }
                  alt={
                    profile.fullName
                  }
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />

              ) : (

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">

                  {profile?.fullName
                    ?.charAt(0)
                    .toUpperCase() ||
                    "T"}

                </div>

              )}

            </Link>

          </div>

          {/* =================================================
              MOBILE BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(
                (
                  current
                ) =>
                  !current
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

        </div>

        {/* ===================================================
            MOBILE MENU
        =================================================== */}

        {mobileMenuOpen && (

          <nav className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">

            <div className="flex flex-col gap-4">

              <Link
                href="/tutor/dashboard"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Dashboard
              </Link>

              <Link
                href="/tutor/proposals"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Available Proposals
              </Link>

              <Link
                href="/tutor/messages"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Messages
              </Link>

              <Link
                href="/tutor/card"
                className="font-semibold text-emerald-600"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                💳 My Card
              </Link>

              <Link
                href="/tutor/profile"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                Profile
              </Link>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/role-selection"
                  )
                }
                className="text-left font-medium text-emerald-600"
              >
                Switch to Student View
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="text-left font-medium text-red-600"
              >
                Log out
              </button>

            </div>

          </nav>

        )}

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* BACK */}

        <Link
          href="/tutor/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Dashboard
        </Link>

        {/* TITLE */}

        <div className="mt-5">

          <p className="font-semibold text-emerald-600">
            Tutor Wallet
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            My Card
          </h1>

          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            View your tutoring earnings,
            request a withdrawal, and
            track your previous withdrawal
            requests.
          </p>

        </div>

        {/* ERROR */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>

        )}

        {/* SUCCESS */}

        {success && (

          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            ✓ {success}
          </div>

        )}

        {/* ===================================================
            WALLET CARD
        =================================================== */}

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 p-7 text-white shadow-lg md:p-9">

          {/* BLUR */}

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative z-10">

            {/* TOP */}

            <div className="flex items-start justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl backdrop-blur-md">
                💳
              </div>

              <div className="text-right">

                <p className="text-xl font-bold">
                  Unitor
                </p>

                <p className="text-sm text-emerald-100">
                  Tutor Wallet
                </p>

              </div>

            </div>

            {/* =================================================
                AVAILABLE BALANCE
            ================================================= */}

            <div className="mt-9">

              <p className="text-sm font-medium text-emerald-100">
                Available Balance
              </p>

              <p className="mt-2 text-4xl font-bold md:text-5xl">
                ৳
                {formatMoney(
                  walletBalance
                )}
              </p>

              <p className="mt-2 text-sm text-emerald-100">
                Available to withdraw
              </p>

            </div>

            {/* =================================================
                DETAILS
            ================================================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">

              <WalletMiniCard
                label="Lifetime Earnings"
                value={
                  lifetimeEarnings
                }
              />

              <WalletMiniCard
                label="Pending"
                value={
                  pendingWithdrawalAmount
                }
              />

              <WalletMiniCard
                label="Withdrawn"
                value={
                  totalWithdrawn
                }
              />

            </div>

          </div>

        </section>

        {/* ===================================================
            90% INFORMATION
        =================================================== */}

        <section className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-700">
              ✓
            </div>

            <div>

              <p className="font-semibold text-slate-900">
                You receive 90% of the student payment
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Unitor keeps a 10% platform
                commission. Your 90% share is
                added to your tutor wallet after
                the student payment is approved.
              </p>

            </div>

          </div>

        </section>

        {/* ===================================================
            MAIN GRID
        =================================================== */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">

          {/* =================================================
              WITHDRAW
          ================================================= */}

          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl font-bold text-emerald-700">
                ৳
              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Withdraw Money
                </h2>

                <p className="text-sm text-slate-500">
                  Request payment through
                  bKash
                </p>

              </div>

            </div>

            <form
              onSubmit={
                handleWithdrawRequest
              }
              className="mt-7"
            >

              {/* AVAILABLE */}

              <div className="mb-6 rounded-xl bg-emerald-50 p-4">

                <p className="text-sm text-slate-500">
                  Available to withdraw
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  ৳
                  {formatMoney(
                    walletBalance
                  )}
                </p>

              </div>

              {/* AMOUNT */}

              <label
                htmlFor="withdrawAmount"
                className="block text-sm font-semibold text-slate-700"
              >
                Withdrawal Amount
              </label>

              <div className="relative mt-2">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  ৳
                </span>

                <input
                  id="withdrawAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={
                    withdrawAmount
                  }
                  onChange={(event) =>
                    setWithdrawAmount(
                      event.target.value
                    )
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* FULL BALANCE */}

              <button
                type="button"
                onClick={() =>
                  setWithdrawAmount(
                    walletBalance >
                    0
                      ? String(
                          walletBalance
                        )
                      : ""
                  )
                }
                disabled={
                  walletBalance <=
                  0
                }
                className="mt-2 text-sm font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Withdraw full balance
              </button>

              {/* BKASH */}

              <label
                htmlFor="bkashNumber"
                className="mt-6 block text-sm font-semibold text-slate-700"
              >
                bKash Number
              </label>

              <input
                id="bkashNumber"
                type="tel"
                maxLength={11}
                value={
                  bkashNumber
                }
                onChange={(event) =>
                  setBkashNumber(
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        11
                      )
                  )
                }
                placeholder="01XXXXXXXXX"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Enter the bKash number
                where you want to receive
                your payment.
              </p>

              {/* HOW IT WORKS */}

              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">

                <p className="text-sm font-semibold text-amber-800">
                  How withdrawal works
                </p>

                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Your requested amount
                  will be reserved while
                  the admin reviews your
                  request. If rejected,
                  the amount will be
                  returned to your
                  available balance.
                </p>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  submitting ||
                  walletBalance <=
                    0
                }
                className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >

                {submitting
                  ? "Sending Request..."
                  : walletBalance <=
                      0
                    ? "No Balance Available"
                    : "Request Withdrawal"}

              </button>

            </form>

          </section>

          {/* =================================================
              HISTORY
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Withdrawal History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Track all of your
                  withdrawal requests.
                </p>

              </div>

              {pendingRequestCount >
                0 && (

                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  {
                    pendingRequestCount
                  }{" "}
                  Pending
                </span>

              )}

            </div>

            {/* EMPTY */}

            {withdrawalRequests.length ===
            0 ? (

              <div className="py-16 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
                  💳
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  No withdrawals yet
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  When you request a
                  withdrawal, its status
                  will appear here.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {withdrawalRequests.map(
                  (
                    request
                  ) => (

                    <WithdrawalItem
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                    />

                  )
                )}

              </div>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   WALLET MINI CARD
========================================================= */

function WalletMiniCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">

      <p className="text-xs text-emerald-100">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold">
        ৳
        {formatMoney(
          value
        )}
      </p>

    </div>
  );
}

/* =========================================================
   WITHDRAWAL ITEM
========================================================= */

function WithdrawalItem({
  request,
}: {
  request:
    WithdrawalRequest;
}) {
  const status =
    normalizeStatus(
      request.status
    );

  return (
    <div className="py-5">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div className="flex items-start gap-4">

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
              status ===
                "approved" ||
              status ===
                "paid"
                ? "bg-emerald-100 text-emerald-700"
                : status ===
                    "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >

            {status ===
              "approved" ||
            status ===
              "paid"
              ? "✓"
              : status ===
                  "rejected"
                ? "×"
                : "↗"}

          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <p className="font-bold text-slate-900">
                Withdrawal Request
              </p>

              <StatusBadge
                status={
                  status
                }
              />

            </div>

            <p className="mt-1 text-sm text-slate-500">
              bKash:{" "}
              {maskPhoneNumber(
                request.bkashNumber
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Requested{" "}
              {formatDate(
                request.createdAt
              )}
            </p>

            {request.reviewedAt && (

              <p className="mt-1 text-xs text-slate-400">
                Reviewed{" "}
                {formatDate(
                  request.reviewedAt
                )}
              </p>

            )}

          </div>

        </div>

        <div className="sm:text-right">

          <p className="text-xl font-bold text-slate-900">
            ৳
            {formatMoney(
              request.amount
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            bKash withdrawal
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   STATUS
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
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        Approved
      </span>
    );
  }

  if (
    status ===
    "rejected"
  ) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
      Pending
    </span>
  );
}

/* =========================================================
   CHOOSE REAL WALLET
========================================================= */

function chooseWalletInfo(
  userData:
    | Record<
        string,
        unknown
      >
    | null,

  tutorData:
    | Record<
        string,
        unknown
      >
    | null
): WalletInfo {
  const userWallet =
    readWalletInfo(
      "users",
      userData
    );

  const tutorWallet =
    readWalletInfo(
      "tutors",
      tutorData
    );

  /*
   * IMPORTANT:
   *
   * If users has real money,
   * use users.
   */

  if (
    userWallet.balance >
    0
  ) {
    return userWallet;
  }

  /*
   * If users says 0 but tutors
   * contains the balance your
   * mobile app is showing,
   * use tutors.
   */

  if (
    tutorWallet.balance >
    0
  ) {
    return tutorWallet;
  }

  /*
   * If both are 0, prefer the
   * document which actually
   * contains wallet fields.
   */

  if (
    hasWalletFields(
      userData
    )
  ) {
    return userWallet;
  }

  if (
    hasWalletFields(
      tutorData
    )
  ) {
    return tutorWallet;
  }

  return userWallet;
}

/* =========================================================
   READ WALLET
========================================================= */

function readWalletInfo(
  source:
    WalletSource,

  data:
    | Record<
        string,
        unknown
      >
    | null
): WalletInfo {
  if (!data) {
    return {
      source,

      balanceField:
        "availableBalance",

      balance:
        0,

      lifetimeEarnings:
        0,

      totalWithdrawn:
        0,
    };
  }

  /*
   * IMPORTANT:
   *
   * Check all wallet field
   * versions used by Unitor.
   */

  const balanceFields = [
    "availableBalance",
    "totalBalance",
    "balance",
    "money",
    "walletBalance",
  ];

  let balanceField =
    "availableBalance";

  let balance =
    0;

  /*
   * First try to find a
   * positive balance.
   */

  for (
    const field of
    balanceFields
  ) {
    const value =
      toNumber(
        data[field]
      );

    if (value > 0) {
      balanceField =
        field;

      balance =
        value;

      break;
    }
  }

  /*
   * If balance is really 0,
   * find whichever field exists.
   */

  if (balance === 0) {
    for (
      const field of
      balanceFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        balanceField =
          field;

        balance =
          toNumber(
            data[field]
          );

        break;
      }
    }
  }

  const lifetimeEarnings =
    toNumber(
      data[
        "lifetimeEarnings"
      ] ??
        data[
          "totalEarned"
        ] ??
        0
    );

  const totalWithdrawn =
    toNumber(
      data[
        "totalWithdrawn"
      ] ??
        data[
          "withdrawn"
        ] ??
        0
    );

  return {
    source,

    balanceField,

    balance,

    lifetimeEarnings,

    totalWithdrawn,
  };
}

/* =========================================================
   CHECK WALLET FIELDS
========================================================= */

function hasWalletFields(
  data:
    | Record<
        string,
        unknown
      >
    | null
) {
  if (!data) {
    return false;
  }

  return [
    "availableBalance",
    "totalBalance",
    "balance",
    "money",
    "walletBalance",
  ].some(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
  );
}

/* =========================================================
   NUMBER
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
   STATUS
========================================================= */

function normalizeStatus(
  status: string
) {
  return status
    .trim()
    .toLowerCase();
}

/* =========================================================
   MONEY
========================================================= */

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

/* =========================================================
   DATE
========================================================= */

function formatDate(
  timestamp?: Timestamp
) {
  if (!timestamp) {
    return "Just now";
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

/* =========================================================
   MASK PHONE
========================================================= */

function maskPhoneNumber(
  phone: string
) {
  if (
    phone.length <
    7
  ) {
    return phone;
  }

  return `${phone.slice(
    0,
    3
  )}****${phone.slice(
    -4
  )}`;
}