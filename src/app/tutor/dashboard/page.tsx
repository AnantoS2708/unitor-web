"use client";

import { useRouter } from "next/navigation";

export default function TutorDashboardPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <h1 className="text-2xl font-bold text-emerald-600">
                        Unitor Tutor
                    </h1>

                    <button
                        onClick={() => router.push("/role-selection")}
                        className="rounded-lg border border-emerald-600 px-4 py-2 font-medium text-emerald-600"
                    >
                        Switch view
                    </button>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-10">
                <h2 className="text-3xl font-bold text-slate-900">
                    Tutor Dashboard
                </h2>

                <p className="mt-3 text-slate-600">
                    Available proposals, applications and tutoring sessions will
                    appear here.
                </p>
            </section>
        </main>
    );
}