"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface StudentProfile {
    fullName: string;
    universityEmail: string;
    universityName?: string;
    major?: string;
    currentSemester?: string;
    profileImageUrl?: string;
    roles: string[];
    tutorStatus?: string;
}

export default function StudentDashboardPage() {
    const router = useRouter();

    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/login");
                return;
            }

            try {
                const snapshot = await getDoc(
                    doc(firestore, "users", user.uid)
                );

                if (!snapshot.exists()) {
                    router.replace("/login");
                    return;
                }

                setProfile(snapshot.data() as StudentProfile);
            } catch (error) {
                console.error("Student profile error:", error);
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, [router]);

    async function handleLogout() {
        await signOut(auth);
        router.replace("/login");
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-unitor-background">
                <p className="text-unitor-gray-dark">Loading student dashboard...</p>
            </main>
        );
    }

    const tutorApproved =
        profile?.roles?.includes("tutor") &&
        profile?.tutorStatus?.toLowerCase() === "approved";

    const firstName = profile?.fullName?.split(" ")[0] || "Student";

    return (
        <main className="min-h-screen bg-unitor-background">
            {/* Top navigation */}
            <header className="sticky top-0 z-30 border-b border-unitor-gray-light bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link
                        href="/student/dashboard"
                        className="text-2xl font-bold text-unitor-primary"
                    >
                        Unitor
                    </Link>

                    <nav className="hidden items-center gap-7 md:flex">
                        <Link
                            href="/student/dashboard"
                            className="font-medium text-unitor-primary"
                        >
                            Dashboard
                        </Link>

                        <Link
                            href="/student/proposals"
                            className="text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            Proposals
                        </Link>

                        <Link
                            href="/student/messages"
                            className="text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            Messages
                        </Link>

                        <Link
                            href="/student/notifications"
                            className="text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            Notifications
                        </Link>

                        <Link 
                            href="/student/payments"
                            className="text-unitor-gray-dark hover:text-unitor-primary">
                        Payments
                        </Link>

                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                        {tutorApproved && (
                            <button
                                onClick={() => router.push("/role-selection")}
                                className="rounded-lg border border-unitor-primary px-4 py-2 text-sm font-medium text-unitor-primary hover:bg-unitor-background"
                            >
                                Switch view
                            </button>
                        )}

                        <Link href="/student/profile">
                            {profile?.profileImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={profile.profileImageUrl}
                                    alt={profile.fullName}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary">
                                    {profile?.fullName?.charAt(0).toUpperCase() || "U"}
                                </div>
                            )}
                        </Link>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="rounded-lg border border-unitor-gray-light px-3 py-2 md:hidden"
                        aria-label="Open navigation"
                    >
                        ☰
                    </button>
                </div>

                {mobileMenuOpen && (
                    <nav className="border-t border-unitor-gray-light bg-white px-6 py-4 md:hidden">
                        <div className="flex flex-col gap-4">
                            <Link href="/student/dashboard">Dashboard</Link>
                            <Link href="/student/proposals">Proposals</Link>
                            <Link href="/student/messages">Messages</Link>
                            <Link href="/student/notifications">Notifications</Link>
                            <Link href="/student/profile">Profile</Link>

                            {tutorApproved && (
                                <button
                                    onClick={() => router.push("/role-selection")}
                                    className="text-left font-medium text-unitor-primary"
                                >
                                    Switch view
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="text-left font-medium text-red-600"
                            >
                                Log out
                            </button>
                        </div>
                    </nav>
                )}
            </header>

            <div className="mx-auto max-w-7xl px-6 py-10">
                {/* Welcome section */}
                <section className="rounded-3xl bg-gradient-to-r from-unitor-primary to-unitor-primary p-8 text-white shadow-sm md:p-10">
                    <p className="font-medium text-unitor-blue-light">
                        Student Dashboard
                    </p>

                    <h1 className="mt-2 text-3xl font-bold md:text-4xl">
                        Welcome back, {firstName}
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-unitor-background">
                        Create a proposal, connect with peer tutors and continue
                        your academic learning journey.
                    </p>

                    <Link
                        href="/student/proposals/create"
                        className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-medium text-unitor-primary hover:bg-unitor-background"
                    >
                        Create a proposal
                    </Link>
                </section>

                {/* Quick actions */}
                <section className="mt-10">
                    <h2 className="text-2xl font-bold text-unitor-black">
                        Quick actions
                    </h2>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <DashboardCard
                            icon="📝"
                            title="My Proposals"
                            description="View and manage your academic proposals."
                            href="/student/proposals"
                        />

                        <DashboardCard
                            icon="💬"
                            title="Messages"
                            description="Continue conversations with your tutors."
                            href="/student/messages"
                        />

                        <DashboardCard
                            icon="🔔"
                            title="Notifications"
                            description="View payment, proposal and session updates."
                            href="/student/notifications"
                        />

                        <DashboardCard
                            icon="👤"
                            title="My Profile"
                            description="View and update your account information."
                            href="/student/profile"
                        />
                    </div>
                </section>

                {/* Account overview */}
                <section className="mt-10 grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold text-unitor-black">
                            Academic profile
                        </h2>

                        <div className="mt-5 space-y-4">
                            <InformationRow
                                label="University"
                                value={profile?.universityName}
                            />

                            <InformationRow label="Major" value={profile?.major} />

                            <InformationRow
                                label="Current semester"
                                value={profile?.currentSemester}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold text-unitor-black">
                            Account information
                        </h2>

                        <div className="mt-5 space-y-4">
                            <InformationRow
                                label="Email"
                                value={profile?.universityEmail}
                            />

                            <InformationRow
                                label="Roles"
                                value={profile?.roles?.join(", ")}
                            />

                            <InformationRow
                                label="Tutor status"
                                value={profile?.tutorStatus || "Not applied"}
                            />
                        </div>
                    </div>
                </section>

                <div className="mt-10 text-center">
                    <button
                        onClick={handleLogout}
                        className="font-medium text-red-600 hover:underline"
                    >
                        Log out of Unitor
                    </button>
                </div>
            </div>
        </main>
    );
}

function DashboardCard({
    icon,
    title,
    description,
    href,
}: {
    icon: string;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-unitor-primary hover:shadow-md"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-unitor-background text-2xl">
                {icon}
            </div>

            <h3 className="mt-5 text-lg font-bold text-unitor-black">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                {description}
            </p>
        </Link>
    );
}

function InformationRow({
    label,
    value,
}: {
    label: string;
    value?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-5 border-b border-unitor-gray-soft pb-3">
            <span className="text-unitor-gray-dark">{label}</span>

            <span className="text-right font-medium text-unitor-black">
                {value || "Not provided"}
            </span>
        </div>
    );
}