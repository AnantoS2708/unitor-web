"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface PaymentDetails {
  proposalId: string;
  proposalTitle: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  tutorProfileImageUrl: string;
  amount: number;
  estimatedHours: number;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
}

const BKASH_NUMBER = "01737852266";

export default function NewPaymentPage() {
  const router = useRouter();

  const params = useParams<{
    jobProposalId: string;
  }>();

  const jobProposalId = params.jobProposalId;

  const [details, setDetails] =
    useState<PaymentDetails | null>(null);

  const [transactionId, setTransactionId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        try {
          const applicationSnapshot = await getDoc(
            doc(
              firestore,
              "jobProposals",
              jobProposalId
            )
          );

          if (!applicationSnapshot.exists()) {
            setError(
              "This tutor application could not be found."
            );
            setLoading(false);
            return;
          }

          const application =
            applicationSnapshot.data();

          const proposalSnapshot = await getDoc(
            doc(
              firestore,
              "proposals",
              application.proposalId
            )
          );

          if (!proposalSnapshot.exists()) {
            setError(
              "The related proposal could not be found."
            );
            setLoading(false);
            return;
          }

          const proposal = proposalSnapshot.data();

          if (proposal.studentId !== user.uid) {
            setError(
              "You do not have permission to make this payment."
            );
            setLoading(false);
            return;
          }

          const tutorSnapshot = await getDoc(
            doc(
              firestore,
              "users",
              application.tutorId
            )
          );

          const studentSnapshot = await getDoc(
            doc(firestore, "users", user.uid)
          );

          const tutor = tutorSnapshot.exists()
            ? tutorSnapshot.data()
            : {};

          const student = studentSnapshot.exists()
            ? studentSnapshot.data()
            : {};

          setDetails({
            proposalId: application.proposalId,
            proposalTitle:
              proposal.title ?? "Unitor Proposal",
            courseCode:
              application.courseCode ??
              proposal.courseCode ??
              "",
            studentId: user.uid,
            studentName:
              student.fullName ??
              proposal.studentName ??
              "",
            tutorId: application.tutorId ?? "",
            tutorName:
              tutor.fullName ?? "Tutor",
            tutorProfileImageUrl:
              tutor.profileImageUrl ?? "",
            amount:
              Number(application.payment) || 0,
            estimatedHours:
              Number(application.estimatedHours) ||
              0,
            dateFrom:
              application.dateFrom ?? "",
            dateTo: application.dateTo ?? "",
            timeFrom:
              application.timeFrom ?? "",
            timeTo: application.timeTo ?? "",
          });

          setLoading(false);
        } catch (error) {
          console.error(
            "Payment information error:",
            error
          );

          setError(
            "Unable to prepare the payment."
          );

          setLoading(false);
        }
      }
    );

    return unsubscribeAuth;
  }, [jobProposalId, router]);

  async function handleCopyNumber() {
    try {
      await navigator.clipboard.writeText(
        BKASH_NUMBER
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!details) return;

    const cleanTransactionId = transactionId
      .trim()
      .toUpperCase();

    if (cleanTransactionId.length < 6) {
      setError(
        "Please enter a valid bKash transaction ID."
      );
      return;
    }

    if (!/^[A-Z0-9]+$/.test(cleanTransactionId)) {
      setError(
        "The transaction ID should contain only letters and numbers."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const paymentReference = doc(
        collection(firestore, "payments")
      );

      const proposalReference = doc(
        firestore,
        "proposals",
        details.proposalId
      );

      const applicationReference = doc(
        firestore,
        "jobProposals",
        jobProposalId
      );

      const platformFee =
        Math.round(details.amount * 0.1 * 100) /
        100;

      const tutorEarning =
        Math.round(
          (details.amount - platformFee) * 100
        ) / 100;

      const batch = writeBatch(firestore);

      batch.set(paymentReference, {
        paymentId: paymentReference.id,

        amount: details.amount,
        platformFee,
        tutorEarning,
        currency: "BDT",

        gateway: "bkash_send_money",
        bkashNumber: BKASH_NUMBER,
        transactionId: cleanTransactionId,

        status: "pending",

        studentId: details.studentId,
        studentName: details.studentName,

        tutorId: details.tutorId,
        tutorName: details.tutorName,

        proposalId: details.proposalId,
        jobProposalId,

        tutorBalanceCredited: false,

        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.update(applicationReference, {
        paymentId: paymentReference.id,
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });

      batch.update(proposalReference, {
        selectedTutorId: details.tutorId,
        selectedJobProposalId: jobProposalId,
        paymentId: paymentReference.id,
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      router.push("/student/payments");
    } catch (error) {
      console.error(
        "Payment submission error:",
        error
      );

      setError(
        "Unable to submit the payment. Check your connection and Firebase permissions."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">
        <p className="text-unitor-gray-dark">
          Preparing payment...
        </p>
      </main>
    );
  }

  if (error && !details) {
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
            href="/student/proposals"
            className="mt-6 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white"
          >
            Return to proposals
          </Link>
        </div>
      </main>
    );
  }

  if (!details) return null;

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <Link
            href={`/student/proposals/${details.proposalId}/applications`}
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Tutor applications
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div>
          <p className="font-medium text-unitor-primary">
            Manual payment verification
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Complete bKash Payment
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Send the exact amount using bKash Send Money,
            then submit the transaction ID.
          </p>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-7 shadow-sm">
          <div className="flex items-center gap-4">
            {details.tutorProfileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={details.tutorProfileImageUrl}
                alt={details.tutorName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-unitor-blue-light text-2xl font-bold text-unitor-primary">
                {details.tutorName
                  .charAt(0)
                  .toUpperCase() || "T"}
              </div>
            )}

            <div>
              <p className="text-sm text-unitor-gray-dark">
                Selected tutor
              </p>

              <h2 className="text-xl font-bold text-unitor-black">
                {details.tutorName}
              </h2>

              <p className="mt-1 text-unitor-gray-dark">
                {details.courseCode}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 border-t border-unitor-gray-soft pt-6 sm:grid-cols-2">
            <InformationItem
              label="Proposal"
              value={details.proposalTitle}
            />

            <InformationItem
              label="Estimated time"
              value={`${details.estimatedHours} hour${
                details.estimatedHours === 1
                  ? ""
                  : "s"
              }`}
            />

            <InformationItem
              label="Date"
              value={
                details.dateFrom === details.dateTo
                  ? details.dateFrom
                  : `${details.dateFrom} – ${details.dateTo}`
              }
            />

            <InformationItem
              label="Time"
              value={`${details.timeFrom} – ${details.timeTo}`}
            />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-[#E2136E] p-7 text-white shadow-sm">
          <p className="font-medium text-pink-100">
            Amount to send
          </p>

          <p className="mt-2 text-4xl font-bold">
            ৳{details.amount}
          </p>

          <div className="mt-6 rounded-xl bg-white/10 p-5">
            <p className="text-sm text-pink-100">
              bKash Send Money number
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <p className="text-2xl font-bold tracking-wider">
                {BKASH_NUMBER}
              </p>

              <button
                type="button"
                onClick={handleCopyNumber}
                className="rounded-lg bg-white px-4 py-2 font-medium text-[#E2136E]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-unitor-black">
            Instructions
          </h2>

          <ol className="mt-5 space-y-4 text-unitor-gray-dark">
            <li>
              <strong className="text-unitor-black">
                1.
              </strong>{" "}
              Open the bKash application.
            </li>

            <li>
              <strong className="text-unitor-black">
                2.
              </strong>{" "}
              Select <strong>Send Money</strong>.
            </li>

            <li>
              <strong className="text-unitor-black">
                3.
              </strong>{" "}
              Send exactly{" "}
              <strong>৳{details.amount}</strong> to{" "}
              <strong>{BKASH_NUMBER}</strong>.
            </li>

            <li>
              <strong className="text-unitor-black">
                4.
              </strong>{" "}
              Copy the transaction ID from the confirmation
              message.
            </li>
          </ol>

          {error && (
            <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <label
              htmlFor="transactionId"
              className="mb-2 block font-medium text-unitor-gray-dark"
            >
              bKash Transaction ID
            </label>

            <input
              id="transactionId"
              type="text"
              value={transactionId}
              onChange={(event) =>
                setTransactionId(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Example: CGP7XYZ123"
              required
              maxLength={30}
              className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 font-sans uppercase text-unitor-black outline-none placeholder:font-sans placeholder:normal-case placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting payment..."
                : "Submit for verification"}
            </button>
          </form>
        </section>
      </div>
    </main>
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

      <p className="mt-1 font-medium text-unitor-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}
