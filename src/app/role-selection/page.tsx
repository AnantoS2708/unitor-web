"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";

interface UserProfile {
    fullName: string;
    profileImageUrl?: string;
    roles: string[];
    tutorStatus?: string;
}

export default function RoleSelectionPage() {
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                    setError("Your Unitor profile could not be found.");
                    setLoading(false);
                    return;
                }

                const userProfile = snapshot.data() as UserProfile;
                const roles = userProfile.roles ?? [];

                // Student-only users go directly to the student dashboard.
                if (!roles.includes("tutor")) {
                    router.replace("/student/dashboard");
                    return;
                }

                setProfile(userProfile);
            } catch (error) {
                console.error("Role loading error:", error);
                setError("Unable to load your account information.");
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, [router]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-unitor-background">
                <p className="text-unitor-gray-dark">Checking your account...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-red-600">
                        Account error
                    </h1>

                    <p className="mt-3 text-unitor-gray-dark">{error}</p>

                    <button
                        onClick={() => router.replace("/login")}
                        className="mt-6 rounded-lg bg-unitor-primary px-5 py-2.5 font-medium text-white"
                    >
                        Return to login
                    </button>
                </div>
            </main>
        );
    }

    const tutorStatus = profile?.tutorStatus?.toLowerCase() ?? "";
    const tutorApproved = tutorStatus === "approved";

    return (
        <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6 py-12">
            <div className="w-full max-w-3xl">
                <div className="text-center">
                    {profile?.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.profileImageUrl}
                            alt={profile.fullName}
                            className="mx-auto mb-5 h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
                        />
                    ) : (
                        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-unitor-blue-light text-3xl font-bold text-unitor-primary shadow-sm">
                            {profile?.fullName?.charAt(0).toUpperCase() || "U"}
                        </div>
                    )}

                    <h1 className="text-3xl font-bold text-unitor-primary">
                        Unitor
                    </h1>

                    <h2 className="mt-6 text-3xl font-bold text-unitor-black">
                        Welcome, {profile?.fullName}
                    </h2>

                    <p className="mt-3 text-unitor-gray-dark">
                        Select how you want to use Unitor.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <button
                        onClick={() => router.push("/student/dashboard")}
                        className="rounded-2xl border-2 border-transparent bg-white p-8 text-left shadow-sm transition hover:border-unitor-primary hover:shadow-md"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-unitor-blue-light text-2xl">
                            🎓
                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-unitor-black">
                            Continue as Student
                        </h3>

                        <p className="mt-3 leading-7 text-unitor-gray-dark">
                            Create proposals, find tutors, make payments and get
                            academic support.
                        </p>
                    </button>

                    <button
                        onClick={() => {
                            if (tutorApproved) {
                                router.push("/tutor/dashboard");
                            }
                        }}
                        disabled={!tutorApproved}
                        className="rounded-2xl border-2 border-transparent bg-white p-8 text-left shadow-sm transition enabled:hover:border-unitor-primary enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-unitor-blue-light text-2xl">
                            📚
                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-unitor-black">
                            Continue as Tutor
                        </h3>

                        <p className="mt-3 leading-7 text-unitor-gray-dark">
                            Browse proposals, apply for jobs and manage tutoring
                            sessions.
                        </p>

                        {!tutorApproved && (
                            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-700">
                                Tutor application status:{" "}
                                {tutorStatus || "not applied"}
                            </p>
                        )}
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="font-medium text-unitor-primary hover:underline"
                    >
                        View account profile
                    </button>
                </div>
            </div>
        </main>
    );
}