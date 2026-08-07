"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace("/login");
                return;
            }

            setUser(currentUser);
            setCheckingAuth(false);
        });

        return unsubscribe;
    }, [router]);

    async function handleLogout() {
        await signOut(auth);
        router.replace("/login");
    }

    if (checkingAuth) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p>Checking your account...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-sm text-slate-500">
                            Logged in successfully
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-slate-900">
                            Welcome to Unitor
                        </h1>

                        <p className="mt-2 text-slate-600">{user?.email}</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100"
                    >
                        Log out
                    </button>
                </header>

                <section className="mt-8 rounded-xl bg-white p-8 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Firebase login is working
                    </h2>

                    <p className="mt-3 text-slate-600">
                        The student and tutor dashboard features will be added after
                        checking your existing Firestore user structure.
                    </p>
                </section>
            </div>
        </main>
    );
}