"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSending(true);

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "Password reset instructions have been sent. Please check your email inbox and spam folder."
      );
    } catch (error) {
      console.error("Password reset error:", error);

      setError(
        "Unable to send the reset email. Check the email address and try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <Link
          href="/login"
          className="font-medium text-unitor-primary hover:underline"
        >
          ← Back to login
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-unitor-black">
          Reset your password
        </h1>

        <p className="mt-3 leading-7 text-unitor-gray-dark">
          Enter the email address connected to your Unitor account.
          Firebase will send you a secure password-reset link.
        </p>

        <form
          onSubmit={handleResetPassword}
          className="mt-8 space-y-6"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-unitor-gray-dark"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your university email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-unitor-background p-4 text-sm leading-6 text-unitor-primary-hover">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-unitor-primary px-5 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending
              ? "Sending reset email..."
              : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-unitor-gray-dark">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-unitor-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}