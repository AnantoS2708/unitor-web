"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  User,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleCheckVerification = async () => {
    if (!user) return;

    try {
      setChecking(true);
      setError("");
      setMessage("");

      // Get the newest verification status from Firebase Authentication
      await reload(user);

      const refreshedUser = auth.currentUser;

      if (!refreshedUser) {
        setError("Unable to find your account.");
        return;
      }

      if (!refreshedUser.emailVerified) {
        setError(
          "Your email is not verified yet. Please open the verification email and click the verification link first."
        );
        return;
      }

      // Copy Firebase Authentication verification status to Firestore
      await updateDoc(doc(firestore, "users", refreshedUser.uid), {
        emailVerified: true,
        updatedAt: new Date(),
      });

      setMessage("Email verified successfully!");

      // Continue to role selection
      setTimeout(() => {
        router.push("/role-selection");
      }, 1000);
    } catch (err) {
      console.error("Verification check error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to check email verification."
      );
    } finally {
      setChecking(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;

    try {
      setResending(true);
      setError("");
      setMessage("");

      await sendEmailVerification(user);

      setMessage(
        "A new verification email has been sent. Please check your inbox and spam folder."
      );
    } catch (err) {
      console.error("Resend verification error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend verification email."
      );
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft px-4">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-sm text-unitor-gray-dark">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm">
        {/* Logo / Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-unitor-primary text-2xl font-bold text-white">
            U
          </div>

          <h1 className="text-2xl font-bold text-unitor-black">
            Verify your email
          </h1>

          <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
            We sent a verification link to your email address.
          </p>
        </div>

        {/* Email */}
        <div className="mb-5 rounded-xl bg-unitor-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark">
            Verification email sent to
          </p>

          <p className="mt-1 break-words font-medium text-unitor-black">
            {user?.email}
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-5 rounded-xl border border-unitor-blue-light bg-unitor-background p-4">
          <p className="font-medium text-unitor-black">What to do</p>

          <ol className="mt-2 space-y-2 text-sm text-unitor-black">
            <li>1. Open your email inbox.</li>
            <li>2. Find the Firebase verification email.</li>
            <li>3. Click the verification link.</li>
            <li>4. Return to this page.</li>
            <li>5. Click &quot;I verified my email&quot;.</li>
          </ol>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="mb-4 rounded-xl border border-unitor-blue-light bg-unitor-background p-3 text-sm text-unitor-primary-hover">
            {message}
          </div>
        )}

        {/* Check button */}
        <button
          type="button"
          onClick={handleCheckVerification}
          disabled={checking}
          className="w-full rounded-xl bg-unitor-primary px-4 py-3 font-medium text-white transition hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? "Checking..." : "I verified my email"}
        </button>

        {/* Resend button */}
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resending}
          className="mt-3 w-full rounded-xl border border-unitor-gray-light bg-white px-4 py-3 font-medium text-unitor-gray-dark transition hover:bg-unitor-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-unitor-gray-dark">
          If you cannot find the email, check your spam or junk folder.
        </p>
      </div>
    </main>
  );
}