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
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface StudentProfile {
    fullName: string;
    universityName: string;
    major: string;
}

interface ProposalForm {
    title: string;
    courseCode: string;
    facultyInitial: string;
    problemTopics: string;
    description: string;
    budget: string;
    estimatedHours: string;
    dateFrom: string;
    dateTo: string;
    timeFrom: string;
    timeTo: string;
}

const initialForm: ProposalForm = {
    title: "",
    courseCode: "",
    facultyInitial: "",
    problemTopics: "",
    description: "",
    budget: "",
    estimatedHours: "1",
    dateFrom: "",
    dateTo: "",
    timeFrom: "",
    timeTo: "",
};

export default function CreateProposalPage() {
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [profile, setProfile] =
        useState<StudentProfile | null>(null);

    const [form, setForm] =
        useState<ProposalForm>(initialForm);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/login");
                return;
            }

            setUserId(user.uid);

            try {
                const snapshot = await getDoc(
                    doc(firestore, "users", user.uid)
                );

                if (!snapshot.exists()) {
                    setError("Your student profile could not be found.");
                    return;
                }

                const data = snapshot.data();

                setProfile({
                    fullName: data.fullName ?? "",
                    universityName: data.universityName ?? "NSU",
                    major: data.major ?? "",
                });
            } catch (error) {
                console.error("Profile loading error:", error);
                setError("Unable to load your student profile.");
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, [router]);

    function updateField(
        field: keyof ProposalForm,
        value: string
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!userId || !profile) return;

        setError("");

        const budget = Number(form.budget);
        const estimatedHours = Number(form.estimatedHours);

        if (budget <= 0) {
            setError("Budget must be greater than zero.");
            return;
        }

        if (estimatedHours <= 0) {
            setError("Estimated hours must be greater than zero.");
            return;
        }

        if (form.dateTo < form.dateFrom) {
            setError("The ending date cannot be before the starting date.");
            return;
        }

        setSubmitting(true);

        try {
            const courseCode = form.courseCode
                .trim()
                .toUpperCase();

            const department =
                courseCode.match(/[A-Za-z]+/)?.[0]?.toUpperCase() ??
                profile.major.toUpperCase();

            const shortUniversityName =
                profile.universityName.trim().toLowerCase();

            const fullUniversityName =
                shortUniversityName === "nsu"
                    ? "North South University"
                    : profile.universityName;

            const tags = Array.from(
                new Set(
                    [
                        shortUniversityName,
                        courseCode,
                        department,
                    ].filter(Boolean)
                )
            );

            await addDoc(collection(firestore, "proposals"), {
                studentId: userId,
                studentName: profile.fullName,

                title: form.title.trim(),
                courseCode,
                facultyInitial: form.facultyInitial
                    .trim()
                    .toUpperCase(),
                problemTopics: form.problemTopics.trim(),
                description: form.description.trim(),

                budget,
                estimatedHours,

                dateFrom: formatDate(form.dateFrom),
                dateTo: formatDate(form.dateTo),
                timeFrom: formatTime(form.timeFrom),
                timeTo: formatTime(form.timeTo),

                university: fullUniversityName,
                universityName: shortUniversityName,
                tags,

                status: "open",
                paymentStatus: "pending",
                paymentId: "",
                selectedJobProposalId: "",
                selectedTutorId: "",
                willingToTeach: 0,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            router.push("/student/proposals");
        } catch (error) {
            console.error("Proposal creation error:", error);

            setError(
                "Unable to create your proposal. Please check your connection and permissions."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-unitor-background">
                <p className="text-unitor-gray-dark">
                    Preparing proposal form...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-unitor-background">
            <header className="border-b border-unitor-gray-light bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <Link
                        href="/student/dashboard"
                        className="text-2xl font-bold text-unitor-primary"
                    >
                        <UnitorBrand label="Unitor" />
                    </Link>

                    <Link
                        href="/student/dashboard"
                        className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
                    >
                        ← Back to dashboard
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-6 py-10">
                <div>
                    <p className="font-medium text-unitor-primary">
                        Student request
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-unitor-black">
                        Create a Proposal
                    </h1>

                    <p className="mt-3 text-unitor-gray-dark">
                        Describe the academic support you need so suitable tutors
                        can apply.
                    </p>
                </div>

                {error && (
                    <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </p>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-2xl bg-white p-8 shadow-sm"
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormInput
                            label="Proposal title"
                            placeholder="Example: Need help with graph algorithms"
                            value={form.title}
                            onChange={(value) =>
                                updateField("title", value)
                            }
                            required
                        />

                        <FormInput
                            label="Course code"
                            placeholder="Example: CSE373"
                            value={form.courseCode}
                            onChange={(value) =>
                                updateField("courseCode", value)
                            }
                            required
                        />

                        <FormInput
                            label="Faculty initial"
                            placeholder="Example: SMA"
                            value={form.facultyInitial}
                            onChange={(value) =>
                                updateField("facultyInitial", value)
                            }
                            required
                        />

                        <FormInput
                            label="Problem topics"
                            placeholder="Example: Graph, BFS and DFS"
                            value={form.problemTopics}
                            onChange={(value) =>
                                updateField("problemTopics", value)
                            }
                            required
                        />

                        <FormInput
                            label="Total budget (BDT)"
                            type="number"
                            min="1"
                            placeholder="Example: 500"
                            value={form.budget}
                            onChange={(value) =>
                                updateField("budget", value)
                            }
                            required
                        />

                        <FormInput
                            label="Estimated hours"
                            type="number"
                            min="1"
                            placeholder="Example: 2"
                            value={form.estimatedHours}
                            onChange={(value) =>
                                updateField("estimatedHours", value)
                            }
                            required
                        />

                        <FormInput
                            label="Starting date"
                            type="date"
                            value={form.dateFrom}
                            onChange={(value) =>
                                updateField("dateFrom", value)
                            }
                            required
                        />

                        <FormInput
                            label="Ending date"
                            type="date"
                            value={form.dateTo}
                            onChange={(value) =>
                                updateField("dateTo", value)
                            }
                            required
                        />

                        <FormInput
                            label="Starting time"
                            type="time"
                            value={form.timeFrom}
                            onChange={(value) =>
                                updateField("timeFrom", value)
                            }
                            required
                        />

                        <FormInput
                            label="Ending time"
                            type="time"
                            value={form.timeTo}
                            onChange={(value) =>
                                updateField("timeTo", value)
                            }
                            required
                        />
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="description"
                            className="mb-2 block font-medium text-unitor-gray-dark"
                        >
                            Description
                        </label>

                        <textarea
                            id="description"
                            value={form.description}
                            onChange={(event) =>
                                updateField(
                                    "description",
                                    event.target.value
                                )
                            }
                            rows={6}
                            required
                            placeholder="Explain the topics and type of academic guidance you need."
                            className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                        />
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Link
                            href="/student/dashboard"
                            className="rounded-lg border border-unitor-gray-light px-6 py-3 text-center font-medium text-unitor-gray-dark hover:bg-unitor-background"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting
                                ? "Creating proposal..."
                                : "Create proposal"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function FormInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    min,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    min?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="mb-2 block font-medium text-unitor-gray-dark">
                {label}
            </label>

            <input
                type={type}
                value={value}
                min={min}
                required={required}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
            />
        </div>
    );
}

function formatDate(dateValue: string) {
    if (!dateValue) return "";

    const [year, month, day] = dateValue.split("-");

    return `${day}/${month}/${year.slice(-2)}`;
}

function formatTime(timeValue: string) {
    if (!timeValue) return "";

    const [hourValue, minute] = timeValue.split(":");
    const hour = Number(hourValue);

    const period = hour >= 12 ? "PM" : "AM";
    const twelveHour = hour % 12 || 12;

    return `${twelveHour}:${minute} ${period}`;
}