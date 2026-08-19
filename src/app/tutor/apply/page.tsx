"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
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
    auth,
    firestore,
} from "@/lib/firebase";

interface TutorApplicationForm {
    fullName: string;
    universityEmail: string;
    universityName: string;
    country: string;
    universityId: string;
    major: string;
    cgpa: string;
    currentSemester: string;
    courseCodes: string;
    phoneNumber: string;
}

const initialForm: TutorApplicationForm = {
    fullName: "",
    universityEmail: "",
    universityName: "",
    country: "",
    universityId: "",
    major: "",
    cgpa: "",
    currentSemester: "",
    courseCodes: "",
    phoneNumber: "",
};

export default function TutorApplyPage() {
    const router = useRouter();

    const [userId, setUserId] = useState("");

    const [form, setForm] =
        useState<TutorApplicationForm>(initialForm);

    const [tutorStatus, setTutorStatus] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (user) => {
                    if (!user) {
                        router.replace("/login");
                        return;
                    }

                    setUserId(user.uid);

                    try {
                        const userReference =
                            doc(
                                firestore,
                                "users",
                                user.uid
                            );

                        const snapshot =
                            await getDoc(
                                userReference
                            );

                        if (!snapshot.exists()) {
                            setError(
                                "Your student profile could not be found."
                            );

                            setLoading(false);
                            return;
                        }

                        const data =
                            snapshot.data();

                        const roles =
                            Array.isArray(
                                data.roles
                            )
                                ? data.roles
                                : [];

                        const status =
                            data.tutorStatus ??
                            "";

                        setTutorStatus(
                            status
                        );

                        if (
                            roles.includes(
                                "tutor"
                            ) &&
                            status ===
                                "approved"
                        ) {
                            router.replace(
                                "/tutor/dashboard"
                            );

                            return;
                        }

                        let requestedCourses = "";

                        if (
                            Array.isArray(
                                data.requestedCourseCodes
                            )
                        ) {
                            requestedCourses =
                                data.requestedCourseCodes.join(
                                    ", "
                                );
                        } else if (
                            typeof data.requestedCourseCodes ===
                            "string"
                        ) {
                            requestedCourses =
                                data.requestedCourseCodes;
                        }

                        /*
                         * Backward compatibility:
                         * If an older pending application used
                         * courseCodesToTeach, show those values
                         * in the form.
                         */
                        if (
                            !requestedCourses &&
                            status !== "approved"
                        ) {
                            if (
                                Array.isArray(
                                    data.courseCodesToTeach
                                )
                            ) {
                                requestedCourses =
                                    data.courseCodesToTeach.join(
                                        ", "
                                    );
                            } else if (
                                typeof data.courseCodesToTeach ===
                                "string"
                            ) {
                                requestedCourses =
                                    data.courseCodesToTeach;
                            }
                        }

                        setForm({
                            fullName:
                                data.fullName ??
                                "",

                            universityEmail:
                                data.universityEmail ??
                                user.email ??
                                "",

                            universityName:
                                data.universityName ??
                                "",

                            country:
                                data.country ??
                                "",

                            universityId:
                                data.universityId ??
                                "",

                            major:
                                data.major ??
                                "",

                            cgpa:
                                data.cgpa !==
                                undefined
                                    ? String(
                                          data.cgpa
                                      )
                                    : "",

                            currentSemester:
                                data.currentSemester ??
                                "",

                            courseCodes:
                                requestedCourses,

                            phoneNumber:
                                data.phoneNumber ??
                                "",
                        });
                    } catch (
                        loadError
                    ) {
                        console.error(
                            "Tutor application loading error:",
                            loadError
                        );

                        setError(
                            "Unable to load your information."
                        );
                    } finally {
                        setLoading(false);
                    }
                }
            );

        return unsubscribe;
    }, [router]);

    function updateField(
        field: keyof TutorApplicationForm,
        value: string
    ) {
        setForm(
            (currentForm) => ({
                ...currentForm,
                [field]: value,
            })
        );
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!userId) {
            return;
        }

        setError("");
        setSuccess("");

        const cgpaNumber =
            Number(
                form.cgpa.trim()
            );

        if (
            !form.cgpa.trim() ||
            Number.isNaN(
                cgpaNumber
            )
        ) {
            setError(
                "Please enter a valid CGPA."
            );
            return;
        }

        if (
            cgpaNumber < 0 ||
            cgpaNumber > 4
        ) {
            setError(
                "CGPA must be between 0.00 and 4.00."
            );
            return;
        }

        const requestedCourseCodes =
            Array.from(
                new Set(
                    form.courseCodes
                        .split(",")
                        .map((course) =>
                            normalizeCourseCode(
                                course
                            )
                        )
                        .filter(Boolean)
                )
            );

        if (
            requestedCourseCodes.length ===
            0
        ) {
            setError(
                "Please enter at least one course code you want to teach."
            );
            return;
        }

        if (
            !form.currentSemester.trim()
        ) {
            setError(
                "Please enter your current semester number."
            );
            return;
        }

        if (
            !form.phoneNumber.trim()
        ) {
            setError(
                "Please enter your phone number."
            );
            return;
        }

        setSubmitting(true);

        try {
            await updateDoc(
                doc(
                    firestore,
                    "users",
                    userId
                ),
                {
                    fullName:
                        form.fullName.trim(),

                    universityEmail:
                        form.universityEmail.trim(),

                    universityName:
                        form.universityName.trim(),

                    country:
                        form.country.trim(),

                    universityId:
                        form.universityId.trim(),

                    major:
                        form.major.trim(),

                    cgpa:
                        cgpaNumber,

                    currentSemester:
                        form.currentSemester.trim(),

                    phoneNumber:
                        form.phoneNumber.trim(),

                    /*
                     * IMPORTANT:
                     * These are only REQUESTED courses.
                     *
                     * Admin will later choose the approved
                     * courses and save those into:
                     * courseCodesToTeach
                     */
                    requestedCourseCodes,

                    tutorStatus:
                        "pending",

                    tutorAppliedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),
                }
            );

            setTutorStatus(
                "pending"
            );

            setSuccess(
                "Your tutor application has been submitted successfully."
            );
        } catch (
            submitError
        ) {
            console.error(
                "Tutor application submission error:",
                submitError
            );

            setError(
                "Unable to submit your tutor application. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-unitor-background">
                <p className="text-unitor-gray-dark">
                    Loading application...
                </p>
            </main>
        );
    }

    if (
        tutorStatus
            .toLowerCase() ===
        "pending"
    ) {
        return (
            <main className="min-h-screen bg-unitor-background">

                <header className="border-b border-unitor-gray-light bg-white">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

                        <Link
                            href="/student/dashboard"
                            className="text-2xl font-bold text-unitor-primary"
                        >
                            <UnitorBrand label="Unitor" />
                        </Link>

                        <Link
                            href="/student/profile"
                            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            Back to profile
                        </Link>

                    </div>
                </header>

                <div className="mx-auto max-w-4xl px-6 py-12">

                    <section className="rounded-2xl bg-white p-10 text-center shadow-sm">

                        <div className="text-5xl">
                            ⏳
                        </div>

                        <h1 className="mt-5 text-3xl font-bold text-unitor-black">
                            Application pending
                        </h1>

                        <p className="mx-auto mt-4 max-w-xl leading-7 text-unitor-gray-dark">
                            Your tutor application has already been submitted.
                            An admin will review your information and select the
                            courses you are approved to teach.
                        </p>

                        <Link
                            href="/student/profile"
                            className="mt-8 inline-flex rounded-xl bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
                        >
                            Back to profile
                        </Link>

                    </section>

                </div>

            </main>
        );
    }

    return (
        <main className="min-h-screen bg-unitor-background">

            <header className="border-b border-unitor-gray-light bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

                    <Link
                        href="/student/dashboard"
                        className="text-2xl font-bold text-unitor-primary"
                    >
                        <UnitorBrand label="Unitor" />
                    </Link>

                    <Link
                        href="/student/profile"
                        className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
                    >
                        Back to profile
                    </Link>

                </div>
            </header>

            <div className="mx-auto max-w-4xl px-6 py-10">

                <div className="text-center">

                    <p className="font-medium text-unitor-primary">
                        Tutor application
                    </p>

                    <h1 className="mt-2 text-4xl font-bold text-unitor-black">
                        Apply as Tutor
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-unitor-gray-dark">
                        Submit your academic information for admin verification
                        before becoming a tutor.
                    </p>

                </div>

                {error && (
                    <p className="mt-7 rounded-xl bg-red-50 p-4 text-red-600">
                        {error}
                    </p>
                )}

                {success && (
                    <div className="mt-7 rounded-xl bg-unitor-background p-5 text-unitor-primary-hover">

                        <p className="font-medium">
                            {success}
                        </p>

                        <p className="mt-2 text-sm">
                            Your application is waiting for admin approval.
                        </p>

                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 rounded-2xl bg-white p-8 shadow-sm"
                >

                    <div className="grid gap-6 md:grid-cols-2">

                        <ApplicationInput
                            label="Full Name"
                            value={
                                form.fullName
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "fullName",
                                    value
                                )
                            }
                            required
                        />

                        <ApplicationInput
                            label="University Email"
                            value={
                                form.universityEmail
                            }
                            onChange={() =>
                                {}
                            }
                            disabled
                        />

                        <ApplicationInput
                            label="University Name"
                            value={
                                form.universityName
                            }
                            onChange={() =>
                                {}
                            }
                            disabled
                        />

                        <ApplicationInput
                            label="Country"
                            value={
                                form.country
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "country",
                                    value
                                )
                            }
                            required
                        />

                        <ApplicationInput
                            label="University ID"
                            value={
                                form.universityId
                            }
                            onChange={() =>
                                {}
                            }
                            disabled
                        />

                        <ApplicationInput
                            label="Major"
                            value={
                                form.major
                            }
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "major",
                                    value
                                )
                            }
                            required
                        />

                        <ApplicationInput
                            label="CGPA"
                            value={
                                form.cgpa
                            }
                            placeholder="e.g. 3.75"
                            inputMode="decimal"
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "cgpa",
                                    value
                                )
                            }
                            required
                        />

                        <ApplicationInput
                            label="Current Semester Number"
                            value={
                                form.currentSemester
                            }
                            placeholder="e.g. 11"
                            inputMode="numeric"
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "currentSemester",
                                    value
                                )
                            }
                            required
                        />

                    </div>

                    <div className="mt-6">

                        <label
                            htmlFor="courseCodes"
                            className="mb-2 block font-medium text-unitor-gray-dark"
                        >
                            Course codes you want to teach
                        </label>

                        <input
                            id="courseCodes"
                            type="text"
                            value={
                                form.courseCodes
                            }
                            onChange={(
                                event
                            ) =>
                                updateField(
                                    "courseCodes",
                                    event.target.value
                                )
                            }
                            placeholder="CSE115, ECO101, MAT116"
                            required
                            className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark/70 focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                        />

                        <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                            <span className="font-bold text-red-500">
                                N.B.:
                            </span>{" "}
                            Add only courses where you received{" "}
                            <span className="font-bold text-unitor-primary">
                                A, A-, or B+
                            </span>
                            . Admin will verify these courses before approval.
                        </p>

                    </div>

                    <div className="mt-6">

                        <ApplicationInput
                            label="Phone Number"
                            value={
                                form.phoneNumber
                            }
                            placeholder="01XXXXXXXXX"
                            inputMode="tel"
                            onChange={(
                                value
                            ) =>
                                updateField(
                                    "phoneNumber",
                                    value
                                )
                            }
                            required
                        />

                    </div>

                    <div className="mt-8 flex justify-end">

                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                            className="rounded-lg bg-unitor-primary px-8 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting
                                ? "Submitting..."
                                : "Apply as Tutor"}
                        </button>

                    </div>

                </form>

            </div>

        </main>
    );
}

function ApplicationInput({
    label,
    value,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    inputMode,
}: {
    label: string;
    value: string;
    onChange: (
        value: string
    ) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    inputMode?:
        | "text"
        | "numeric"
        | "decimal"
        | "tel"
        | "email";
}) {
    return (
        <div>

            <label className="mb-2 block font-medium text-unitor-gray-dark">
                {label}
            </label>

            <input
                type="text"
                value={value}
                disabled={disabled}
                required={required}
                inputMode={inputMode}
                placeholder={placeholder}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
                className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark/70 focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light disabled:bg-unitor-gray-soft disabled:text-unitor-gray-dark"
            />

        </div>
    );
}

function normalizeCourseCode(
    courseCode: string
) {
    return courseCode
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();
}