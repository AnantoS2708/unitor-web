"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";

interface UserProfile {
    uid: string;
    fullName: string;
    universityEmail: string;
    universityId?: string;
    universityName?: string;
    major?: string;
    currentSemester?: string;
    country?: string;
    profileImageUrl?: string;
    roles: string[];
    tutorStatus?: string;
}

export default function DashboardPage() {
    const router = useRouter();

    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.replace("/login");
                return;
            }

            setFirebaseUser(currentUser);

            try {
                const profileReference = doc(
                    firestore,
                    "users",
                    currentUser.uid
                );

                const profileSnapshot = await getDoc(profileReference);

                if (!profileSnapshot.exists()) {
                    setError("Your Unitor profile could not be found.");
                    return;
                }

                setProfile(profileSnapshot.data() as UserProfile);
            } catch (error) {
                console.error("Profile loading error:", error);
                setError("Unable to load your profile from Firebase.");
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
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-600">Loading your profile...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
                    <h1 className="text-xl font-bold text-red-600">
                        Profile error
                    </h1>

                    <p className="mt-3 text-slate-600">{error}</p>

                    <button
                        onClick={handleLogout}
                        className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white"
                    >
                        Return to login
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <h1 className="text-2xl font-bold text-emerald-600">
                        Unitor
                    </h1>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100"
                    >
                        Log out
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-6 py-10">
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        {profile?.profileImageUrl ? (
                            <img
                                src={profile.profileImageUrl}
                                alt={profile.fullName}
                                className="h-24 w-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">
                                {profile?.fullName?.charAt(0).toUpperCase() || "U"}
                            </div>
                        )}

                        <div>
                            <p className="text-sm font-medium text-emerald-600">
                                Login successful
                            </p>

                            <h2 className="mt-1 text-3xl font-bold text-slate-900">
                                Welcome, {profile?.fullName}
                            </h2>

                            <p className="mt-2 text-slate-600">
                                {profile?.universityEmail || firebaseUser?.email}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {profile?.roles?.map((role) => (
                                    <span
                                        key={role}
                                        className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium capitalize text-emerald-700"
                                    >
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <section className="rounded-2xl bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900">
                            Academic information
                        </h3>

                        <dl className="mt-5 space-y-4">
                            <ProfileField
                                label="University"
                                value={profile?.universityName}
                            />

                            <ProfileField label="Major" value={profile?.major} />

                            <ProfileField
                                label="Current semester"
                                value={profile?.currentSemester}
                            />

                            <ProfileField
                                label="University ID"
                                value={profile?.universityId}
                            />
                        </dl>
                    </section>

                    <section className="rounded-2xl bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900">
                            Account status
                        </h3>

                        <dl className="mt-5 space-y-4">
                            <ProfileField
                                label="Account roles"
                                value={profile?.roles?.join(", ")}
                            />

                            <ProfileField
                                label="Tutor status"
                                value={profile?.tutorStatus || "Not applied"}
                            />

                            <ProfileField
                                label="Country"
                                value={profile?.country}
                            />
                        </dl>
                    </section>
                </div>
            </div>
        </main>
    );
}

function ProfileField({
    label,
    value,
}: {
    label: string;
    value?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium capitalize text-slate-900">
                {value || "Not provided"}
            </dd>
        </div>
    );
}