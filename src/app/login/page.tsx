"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UnitorBrand } from "@/components/UnitorBrand";
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
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );

            await userCredential.user.reload();

            const currentUser = auth.currentUser;

            if (!currentUser) {
                setError("Unable to load your account. Please try again.");
                return;
            }

            if (!currentUser.emailVerified) {
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

            router.push("/role-selection");
        } catch (error: unknown) {
            console.error("Login error:", error);
            setError("Email or password is incorrect.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                <Link
                    href="/"
                    className="text-2xl font-bold text-unitor-primary"
                >
                    <UnitorBrand label="Unitor" />
                </Link>

                <h1 className="mt-8 text-3xl font-bold text-unitor-black">
                    Welcome back
                </h1>

                <p className="mt-2 text-unitor-gray-dark">
                    Log in using your existing Unitor account.
                </p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                            className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black placeholder:text-unitor-gray-dark outline-none focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
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
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                                className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 pr-20 text-unitor-black placeholder:text-unitor-gray-dark outline-none focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-unitor-primary"
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
                        className="w-full rounded-lg bg-unitor-primary px-4 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/forgot-password"
                        className="font-medium text-unitor-primary hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                <p className="mt-6 text-center text-unitor-gray-dark">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-medium text-unitor-primary hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </main>
    );
}