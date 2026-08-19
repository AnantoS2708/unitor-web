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
      <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft">
        <p className="text-unitor-gray-dark">
          Checking administrator account...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-unitor-gray-soft px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <Link
            href="/"
            className="text-3xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-unitor-black text-3xl text-white">
            🛡️
          </div>

          <h1 className="mt-5 text-3xl font-bold text-unitor-black">
            Admin login
          </h1>

          <p className="mt-2 text-unitor-gray-dark">
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
              className="mb-2 block font-medium text-unitor-gray-dark"
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
              className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-unitor-gray-dark"
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
                className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 pr-20 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-unitor-primary"
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
            className="w-full rounded-lg bg-unitor-black px-5 py-3 font-medium text-white hover:bg-unitor-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign in as administrator"}
          </button>
        </form>

        <div className="mt-6 border-t border-unitor-gray-light pt-6 text-center">
          <Link
            href="/login"
            className="font-medium text-unitor-primary hover:underline"
          >
            Return to student or tutor login
          </Link>
        </div>
      </div>
    </main>
  );
}