"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import {
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";

import {
    auth,
    firestore,
    storage,
} from "@/lib/firebase";

interface ProfileForm {
    fullName: string;
    universityEmail: string;
    universityId: string;
    universityName: string;
    major: string;
    currentSemester: string;
    phoneNumber: string;
    country: string;
    bio: string;
    profileImageUrl: string;
    roles: string[];
    tutorStatus: string;
}

const initialProfile: ProfileForm = {
    fullName: "",
    universityEmail: "",
    universityId: "",
    universityName: "",
    major: "",
    currentSemester: "",
    phoneNumber: "",
    country: "",
    bio: "",
    profileImageUrl: "",
    roles: [],
    tutorStatus: "",
};

export default function StudentProfilePage() {
    const router = useRouter();

    const [userId, setUserId] = useState("");

    const [profile, setProfile] =
        useState<ProfileForm>(initialProfile);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] =
        useState(false);

    const [editing, setEditing] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            async (user) => {
                if (!user) {
                    router.replace("/login");
                    return;
                }

                setUserId(user.uid);

                try {
                    const snapshot =
                        await getDoc(
                            doc(
                                firestore,
                                "users",
                                user.uid
                            )
                        );

                    if (!snapshot.exists()) {
                        setError(
                            "Your profile could not be found."
                        );
                        return;
                    }

                    const data =
                        snapshot.data();

                    setProfile({
                        fullName:
                            data.fullName ?? "",

                        universityEmail:
                            data.universityEmail ??
                            user.email ??
                            "",

                        universityId:
                            data.universityId ?? "",

                        universityName:
                            data.universityName ?? "",

                        major:
                            data.major ?? "",

                        currentSemester:
                            data.currentSemester ?? "",

                        phoneNumber:
                            data.phoneNumber ?? "",

                        country:
                            data.country ?? "",

                        bio:
                            data.bio ?? "",

                        profileImageUrl:
                            data.profileImageUrl ?? "",

                        roles:
                            Array.isArray(data.roles)
                                ? data.roles
                                : [],

                        tutorStatus:
                            data.tutorStatus ?? "",
                    });
                } catch (error) {
                    console.error(
                        "Profile loading error:",
                        error
                    );

                    setError(
                        "Unable to load your profile."
                    );
                } finally {
                    setLoading(false);
                }
            }
        );

        return unsubscribe;
    }, [router]);

    function updateField(
        field: keyof ProfileForm,
        value: string
    ) {
        setProfile(
            (currentProfile) => ({
                ...currentProfile,
                [field]: value,
            })
        );
    }

    async function handleImageUpload(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        if (!file || !userId) {
            return;
        }

        setMessage("");
        setError("");

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {
            setError(
                "Please select a valid image file."
            );

            event.target.value = "";
            return;
        }

        if (
            file.size >
            5 * 1024 * 1024
        ) {
            setError(
                "The image must be smaller than 5 MB."
            );

            event.target.value = "";
            return;
        }

        setUploadingImage(true);

        try {
            const imageReference =
                ref(
                    storage,
                    `profile_images/${userId}.jpg`
                );

            await uploadBytes(
                imageReference,
                file,
                {
                    contentType:
                        file.type,
                }
            );

            const imageUrl =
                await getDownloadURL(
                    imageReference
                );

            await updateDoc(
                doc(
                    firestore,
                    "users",
                    userId
                ),
                {
                    profileImageUrl:
                        imageUrl,

                    updatedAt:
                        serverTimestamp(),
                }
            );

            setProfile(
                (
                    currentProfile
                ) => ({
                    ...currentProfile,

                    profileImageUrl:
                        imageUrl,
                })
            );

            setMessage(
                "Profile image updated successfully."
            );
        } catch (error) {
            console.error(
                "Profile image upload error:",
                error
            );

            setError(
                "Unable to upload the profile image. Check Firebase Storage permissions."
            );
        } finally {
            setUploadingImage(false);

            event.target.value = "";
        }
    }

    async function handleSave(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!userId) {
            return;
        }

        setSaving(true);
        setMessage("");
        setError("");

        try {
            await updateDoc(
                doc(
                    firestore,
                    "users",
                    userId
                ),
                {
                    fullName:
                        profile.fullName.trim(),

                    major:
                        profile.major.trim(),

                    currentSemester:
                        profile.currentSemester.trim(),

                    phoneNumber:
                        profile.phoneNumber.trim(),

                    country:
                        profile.country.trim(),

                    bio:
                        profile.bio.trim(),

                    updatedAt:
                        serverTimestamp(),
                }
            );

            setProfile(
                (
                    currentProfile
                ) => ({
                    ...currentProfile,

                    fullName:
                        currentProfile.fullName.trim(),

                    major:
                        currentProfile.major.trim(),

                    currentSemester:
                        currentProfile.currentSemester.trim(),

                    phoneNumber:
                        currentProfile.phoneNumber.trim(),

                    country:
                        currentProfile.country.trim(),

                    bio:
                        currentProfile.bio.trim(),
                })
            );

            setMessage(
                "Profile updated successfully."
            );

            setEditing(false);
        } catch (error) {
            console.error(
                "Profile update error:",
                error
            );

            setError(
                "Unable to update your profile."
            );
        } finally {
            setSaving(false);
        }
    }

    const isTutor =
        profile.roles.includes(
            "tutor"
        );

    const tutorStatus =
        profile.tutorStatus
            .trim()
            .toLowerCase();

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">

                <p className="text-slate-600">
                    Loading your profile...
                </p>

            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">

            {/* HEADER */}

            <header className="border-b border-slate-200 bg-white">

                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

                    <Link
                        href="/student/dashboard"
                        className="text-2xl font-bold text-emerald-600"
                    >
                        Unitor
                    </Link>

                    <Link
                        href="/student/dashboard"
                        className="font-medium text-slate-600 hover:text-emerald-600"
                    >
                        ← Back to dashboard
                    </Link>

                </div>

            </header>

            <div className="mx-auto max-w-5xl px-6 py-10">

                {/* PROFILE HEADER */}

                <section className="rounded-2xl bg-white p-8 shadow-sm">

                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                            {/* IMAGE */}

                            <div className="flex flex-col items-center gap-3">

                                {profile.profileImageUrl ? (

                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={
                                            profile.profileImageUrl
                                        }
                                        alt={
                                            profile.fullName
                                        }
                                        className="h-24 w-24 rounded-full object-cover shadow"
                                    />

                                ) : (

                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">

                                        {profile.fullName
                                            .charAt(0)
                                            .toUpperCase() ||
                                            "U"}

                                    </div>

                                )}

                                <label
                                    className={`text-sm font-semibold text-emerald-600 hover:underline ${
                                        uploadingImage
                                            ? "cursor-not-allowed opacity-60"
                                            : "cursor-pointer"
                                    }`}
                                >
                                    {uploadingImage
                                        ? "Uploading..."
                                        : "Change photo"}

                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={
                                            handleImageUpload
                                        }
                                        disabled={
                                            uploadingImage
                                        }
                                        className="hidden"
                                    />

                                </label>

                            </div>

                            {/* NAME */}

                            <div>

                                <h1 className="text-3xl font-bold text-slate-900">
                                    {
                                        profile.fullName
                                    }
                                </h1>

                                <p className="mt-2 text-slate-600">
                                    {
                                        profile.universityEmail
                                    }
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">

                                    {profile.roles.map(
                                        (role) => (
                                            <span
                                                key={
                                                    role
                                                }
                                                className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium capitalize text-emerald-700"
                                            >
                                                {
                                                    role
                                                }
                                            </span>
                                        )
                                    )}

                                    {tutorStatus ===
                                        "pending" && (
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                                            Tutor application pending
                                        </span>
                                    )}

                                </div>

                            </div>

                        </div>

                        {/* EDIT */}

                        <button
                            type="button"
                            onClick={() => {
                                setEditing(
                                    !editing
                                );

                                setMessage("");
                                setError("");
                            }}
                            disabled={
                                uploadingImage ||
                                saving
                            }
                            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {editing
                                ? "Cancel editing"
                                : "Edit profile"}
                        </button>

                    </div>

                </section>

                {/* SUCCESS */}

                {message && (
                    <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
                        {message}
                    </p>
                )}

                {/* ERROR */}

                {error && (
                    <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </p>
                )}

                {/* BECOME TUTOR */}

                <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                        <div className="max-w-2xl">

                            <p className="text-sm font-semibold text-emerald-600">
                                Tutor program
                            </p>

                            {isTutor ? (
                                <>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                                        You are an approved tutor
                                    </h2>

                                    <p className="mt-3 leading-7 text-slate-600">
                                        Your tutor account is active. You can access your tutor dashboard and view tutoring requests for the courses you are approved to teach.
                                    </p>
                                </>
                            ) : tutorStatus ===
                              "pending" ? (
                                <>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                                        Tutor application pending
                                    </h2>

                                    <p className="mt-3 leading-7 text-slate-600">
                                        Your application has been submitted. An admin must verify and approve your tutor application before tutor features become available.
                                    </p>
                                </>
                            ) : tutorStatus ===
                              "rejected" ? (
                                <>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                                        Tutor application was not approved
                                    </h2>

                                    <p className="mt-3 leading-7 text-slate-600">
                                        You may review your information and submit a new tutor application.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                                        Want to be a tutor?
                                    </h2>

                                    <p className="mt-3 leading-7 text-slate-600">
                                        Apply to become a peer tutor. Choose the courses you are qualified to teach and submit your application for admin verification.
                                    </p>
                                </>
                            )}

                        </div>

                        <div className="shrink-0">

                            {isTutor ? (

                                <Link
                                    href="/tutor/dashboard"
                                    className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                                >
                                    Go to tutor dashboard
                                </Link>

                            ) : tutorStatus ===
                              "pending" ? (

                                <span className="inline-flex rounded-xl bg-amber-100 px-6 py-3 font-semibold text-amber-700">
                                    Waiting for approval
                                </span>

                            ) : (

                                <Link
                                    href="/tutor/apply"
                                    className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                                >
                                    {tutorStatus ===
                                    "rejected"
                                        ? "Apply again"
                                        : "Apply as tutor"}
                                </Link>

                            )}

                        </div>

                    </div>

                </section>

                {/* PERSONAL INFORMATION */}

                <form
                    onSubmit={
                        handleSave
                    }
                    className="mt-8 rounded-2xl bg-white p-8 shadow-sm"
                >

                    <h2 className="text-2xl font-bold text-slate-900">
                        Personal information
                    </h2>

                    <div className="mt-7 grid gap-6 md:grid-cols-2">

                        <ProfileInput
                            label="Full name"
                            value={
                                profile.fullName
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "fullName",
                                    value
                                )
                            }
                        />

                        <ProfileInput
                            label="Phone number"
                            value={
                                profile.phoneNumber
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "phoneNumber",
                                    value
                                )
                            }
                        />

                        <ProfileInput
                            label="University email"
                            value={
                                profile.universityEmail
                            }
                            disabled
                            onChange={() => {}}
                        />

                        <ProfileInput
                            label="University ID"
                            value={
                                profile.universityId
                            }
                            disabled
                            onChange={() => {}}
                        />

                        <ProfileInput
                            label="University"
                            value={
                                profile.universityName
                            }
                            disabled
                            onChange={() => {}}
                        />

                        <ProfileInput
                            label="Major"
                            value={
                                profile.major
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "major",
                                    value
                                )
                            }
                        />

                        <ProfileInput
                            label="Current semester"
                            value={
                                profile.currentSemester
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "currentSemester",
                                    value
                                )
                            }
                        />

                        <ProfileInput
                            label="Country"
                            value={
                                profile.country
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "country",
                                    value
                                )
                            }
                        />

                    </div>

                    {/* BIO */}

                    <div className="mt-6">

                        <label
                            htmlFor="bio"
                            className="mb-2 block font-medium text-slate-700"
                        >
                            Bio
                        </label>

                        <textarea
                            id="bio"
                            value={
                                profile.bio
                            }
                            disabled={
                                !editing
                            }
                            onChange={(
                                event
                            ) =>
                                updateField(
                                    "bio",
                                    event.target.value
                                )
                            }
                            rows={4}
                            placeholder="Tell other students a little about yourself"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 enabled:focus:border-emerald-600 enabled:focus:ring-2 enabled:focus:ring-emerald-100"
                        />

                    </div>

                    {editing && (

                        <div className="mt-8 flex justify-end">

                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    uploadingImage
                                }
                                className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving
                                    ? "Saving..."
                                    : "Save changes"}
                            </button>

                        </div>

                    )}

                </form>

            </div>

        </main>
    );
}

function ProfileInput({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    disabled: boolean;
    onChange: (
        value: string
    ) => void;
}) {
    return (
        <div>

            <label className="mb-2 block font-medium text-slate-700">
                {label}
            </label>

            <input
                type="text"
                value={value}
                disabled={disabled}
                onChange={(
                    event
                ) =>
                    onChange(
                        event.target.value
                    )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-600 enabled:focus:border-emerald-600 enabled:focus:ring-2 enabled:focus:ring-emerald-100"
            />

        </div>
    );
}