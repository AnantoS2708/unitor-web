"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [checkingAccount, setCheckingAccount] =
    useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        const signedInEmail =
          user?.email?.toLowerCase() ?? "";

        if (user && signedInEmail === ADMIN_EMAIL) {
          router.replace("/admin/dashboard");
          return;
        }

        setCheckingAccount(false);
      }
    );

    return unsubscribe;
  }, [router]);

  async function handleAdminLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const signedInEmail =
        result.user.email?.toLowerCase() ?? "";

      if (signedInEmail !== ADMIN_EMAIL) {
        await signOut(auth);

        setError(
          "This account does not have administrator access."
        );

        return;
      }

      router.replace("/admin/dashboard");
    } catch (loginError) {
      console.error("Admin login error:", loginError);

      setError(
        "The admin email or password is incorrect."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingAccount) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Checking administrator account...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <Link
            href="/"
            className="text-3xl font-bold text-emerald-600"
          >
            Unitor
          </Link>

          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl text-white">
            🛡️
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Admin login
          </h1>

          <p className="mt-2 text-slate-600">
            Sign in to manage the Unitor platform.
          </p>
        </div>

        <form
          onSubmit={handleAdminLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-slate-700"
            >
              Admin email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword ? "text" : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign in as administrator"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:underline"
          >
            Return to student or tutor login
          </Link>
        </div>
      </div>
    </main>
  );
}