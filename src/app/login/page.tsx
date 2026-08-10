"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth, firestore } from "@/lib/firebase";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );

            // Reload user so we get the latest email verification status
            await userCredential.user.reload();

            const currentUser = auth.currentUser;

            if (!currentUser) {
                setError("Unable to load your account. Please try again.");
                return;
            }

            // If the email is NOT verified
            if (!currentUser.emailVerified) {
                // Keep Firestore synchronized
                try {
                    await updateDoc(
                        doc(firestore, "users", currentUser.uid),
                        {
                            emailVerified: false,
                        }
                    );
                } catch (firestoreError) {
                    console.error(
                        "Could not update email verification status:",
                        firestoreError
                    );
                }

                router.push("/verify-email");
                return;
            }

            // If Firebase says the email IS verified,
            // automatically copy the status into Firestore
            try {
                await updateDoc(
                    doc(firestore, "users", currentUser.uid),
                    {
                        emailVerified: true,
                    }
                );
            } catch (firestoreError) {
                console.error(
                    "Could not synchronize email verification:",
                    firestoreError
                );
            }

            // Continue to normal role selection
            router.push("/role-selection");
        } catch (error: unknown) {
            console.error("Login error:", error);
            setError("Email or password is incorrect.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                <Link
                    href="/"
                    className="text-2xl font-bold text-emerald-600"
                >
                    Unitor
                </Link>

                <h1 className="mt-8 text-3xl font-bold text-slate-900">
                    Welcome back
                </h1>

                <p className="mt-2 text-slate-600">
                    Log in using your existing Unitor account.
                </p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block font-medium text-slate-700"
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
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-600"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/forgot-password"
                        className="font-medium text-emerald-600 hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                <p className="mt-6 text-center text-slate-600">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-semibold text-emerald-600 hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </main>
    );
}