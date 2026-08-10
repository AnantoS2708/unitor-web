"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    Timestamp,
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

type ReviewContext = {
    chatId: string;
    jobProposalId: string;
    proposalId: string;
    studentId: string;
    studentName: string;
    tutorId: string;
    tutorName: string;
};

function toDate(value: unknown): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    if (value instanceof Timestamp) {
        return value.toDate();
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as { toDate?: unknown }).toDate === "function"
    ) {
        return (value as { toDate: () => Date }).toDate();
    }

    return null;
}

export default function StudentReviewPage() {
    const params = useParams();
    const router = useRouter();

    const rawChatId = params?.chatId;

    const chatId =
        typeof rawChatId === "string"
            ? rawChatId
            : Array.isArray(rawChatId)
              ? rawChatId[0]
              : "";

    const [user, setUser] = useState<User | null>(null);
    const [context, setContext] = useState<ReviewContext | null>(null);

    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [feedback, setFeedback] = useState("");

    const [authLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [alreadyReviewed, setAlreadyReviewed] = useState(false);
    const [success, setSuccess] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace("/login");
                return;
            }

            setUser(currentUser);
            setAuthLoading(false);
        });

        return unsubscribe;
    }, [router]);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user || !chatId) {
            return;
        }

        const currentUser = user;
        const currentChatId = chatId;

        async function loadReviewPage() {
            try {
                setLoading(true);
                setError("");

                const chatRef = doc(
                    firestore,
                    "chats",
                    currentChatId
                );

                const chatSnapshot = await getDoc(chatRef);

                if (!chatSnapshot.exists()) {
                    setContext(null);
                    setError(
                        "This tutoring session could not be found."
                    );
                    return;
                }

                const chat = chatSnapshot.data();

                if (chat.studentId !== currentUser.uid) {
                    setContext(null);
                    setError(
                        "You do not have permission to review this session."
                    );
                    return;
                }

                const jobProposalId =
                    typeof chat.jobProposalId === "string"
                        ? chat.jobProposalId
                        : "";

                if (!jobProposalId) {
                    setContext(null);
                    setError(
                        "Review is unavailable because this session does not have a job proposal ID."
                    );
                    return;
                }

                const expiresAt = toDate(
                    chat.expiresAt ?? null
                );

                const expired =
                    expiresAt !== null &&
                    expiresAt.getTime() <= Date.now();

                const sessionEnded =
                    chat.isActive !== true ||
                    expired;

                if (!sessionEnded) {
                    setContext(null);
                    setError(
                        "You can rate the tutor after the tutoring session ends."
                    );
                    return;
                }

                const reviewContext: ReviewContext = {
                    chatId: chatSnapshot.id,

                    jobProposalId,

                    proposalId:
                        typeof chat.proposalId === "string"
                            ? chat.proposalId
                            : "",

                    studentId:
                        typeof chat.studentId === "string"
                            ? chat.studentId
                            : currentUser.uid,

                    studentName:
                        typeof chat.studentName === "string" &&
                        chat.studentName.trim()
                            ? chat.studentName
                            : currentUser.displayName ?? "Student",

                    tutorId:
                        typeof chat.tutorId === "string"
                            ? chat.tutorId
                            : "",

                    tutorName:
                        typeof chat.tutorName === "string" &&
                        chat.tutorName.trim()
                            ? chat.tutorName
                            : "Tutor",
                };

                setContext(reviewContext);

                const reviewRef = doc(
                    firestore,
                    "reviews",
                    jobProposalId
                );

                const reviewSnapshot = await getDoc(
                    reviewRef
                );

                if (reviewSnapshot.exists()) {
                    const review = reviewSnapshot.data();

                    const savedRating = Number(
                        review.rating
                    );

                    setRating(
                        Number.isFinite(savedRating)
                            ? savedRating
                            : 0
                    );

                    setFeedback(
                        typeof review.feedback === "string"
                            ? review.feedback
                            : ""
                    );

                    setAlreadyReviewed(true);
                }
            } catch (loadError) {
                console.error(
                    "Review page load error:",
                    loadError
                );

                setContext(null);
                setError(
                    "Unable to load the review page. Please try again."
                );
            } finally {
                setLoading(false);
            }
        }

        void loadReviewPage();
    }, [
        authLoading,
        chatId,
        user,
    ]);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !user ||
            !context ||
            submitting ||
            alreadyReviewed
        ) {
            return;
        }

        if (
            rating < 1 ||
            rating > 5
        ) {
            setError(
                "Please choose a rating from 1 to 5 stars."
            );
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const reviewRef = doc(
                firestore,
                "reviews",
                context.jobProposalId
            );

            const existingReview =
                await getDoc(reviewRef);

            if (existingReview.exists()) {
                setAlreadyReviewed(true);
                setError(
                    "A review has already been submitted for this tutoring session."
                );
                return;
            }

            await setDoc(
                reviewRef,
                {
                    createdAt: serverTimestamp(),

                    feedback: feedback.trim(),

                    jobProposalId:
                        context.jobProposalId,

                    proposalId:
                        context.proposalId,

                    rating,

                    studentId:
                        context.studentId,

                    studentName:
                        context.studentName,

                    tutorId:
                        context.tutorId,

                    tutorName:
                        context.tutorName,
                }
            );

            setAlreadyReviewed(true);
            setSuccess(true);
        } catch (submitError) {
            console.error(
                "Review submit error:",
                submitError
            );

            setError(
                "Your review could not be submitted. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (
        authLoading ||
        loading
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <p className="text-slate-600">
                    Loading review...
                </p>
            </main>
        );
    }

    if (!context) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
                <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-sm">

                    <h1 className="text-2xl font-bold text-slate-900">
                        Review unavailable
                    </h1>

                    <p className="mt-3 text-red-700">
                        {error ||
                            "This review cannot be opened."}
                    </p>

                    <Link
                        href={`/student/messages/${chatId}`}
                        className="mt-6 inline-block font-semibold text-emerald-600 hover:underline"
                    >
                        ← Back to session
                    </Link>

                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

            <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-sm sm:p-8">

                <Link
                    href={`/student/messages/${chatId}`}
                    className="text-sm font-semibold text-emerald-600 hover:underline"
                >
                    ← Back to session
                </Link>

                {success ? (
                    <div className="py-8 text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
                            ✓
                        </div>

                        <h1 className="mt-5 text-2xl font-bold text-slate-900">
                            Thank you for your review
                        </h1>

                        <div className="mt-4 flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={`text-3xl ${
                                        star <= rating
                                            ? "text-amber-400"
                                            : "text-slate-300"
                                    }`}
                                >
                                    ★
                                </span>
                            ))}
                        </div>

                        <p className="mt-3 text-slate-600">
                            You rated{" "}
                            <span className="font-semibold">
                                {context.tutorName}
                            </span>{" "}
                            {rating} out of 5 stars.
                        </p>

                        <Link
                            href="/student/messages"
                            className="mt-7 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                            Return to messages
                        </Link>

                    </div>
                ) : (
                    <>
                        <p className="mt-7 text-sm font-semibold text-emerald-600">
                            Session ended
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-slate-900">
                            Rate your tutor
                        </h1>

                        <p className="mt-2 text-slate-600">
                            How was your tutoring session with{" "}
                            <span className="font-semibold text-slate-800">
                                {context.tutorName}
                            </span>
                            ?
                        </p>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-8 space-y-6"
                        >

                            <fieldset
                                disabled={
                                    alreadyReviewed ||
                                    submitting
                                }
                            >

                                <legend className="font-semibold text-slate-800">
                                    Your rating
                                </legend>

                                <div
                                    className="mt-3 flex gap-2"
                                    onMouseLeave={() =>
                                        setHoveredRating(0)
                                    }
                                >

                                    {[1, 2, 3, 4, 5].map(
                                        (star) => {
                                            const activeRating =
                                                hoveredRating ||
                                                rating;

                                            const filled =
                                                star <=
                                                activeRating;

                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() =>
                                                        setRating(
                                                            star
                                                        )
                                                    }
                                                    onMouseEnter={() =>
                                                        setHoveredRating(
                                                            star
                                                        )
                                                    }
                                                    aria-label={`${star} star${
                                                        star === 1
                                                            ? ""
                                                            : "s"
                                                    }`}
                                                    aria-pressed={
                                                        rating ===
                                                        star
                                                    }
                                                    className={`text-4xl leading-none transition ${
                                                        filled
                                                            ? "text-amber-400"
                                                            : "text-slate-300"
                                                    } hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                                                >
                                                    ★
                                                </button>
                                            );
                                        }
                                    )}

                                </div>

                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    {rating > 0
                                        ? `${rating} out of 5 stars`
                                        : "Choose 1 to 5 stars"}
                                </p>

                            </fieldset>

                            <div>

                                <label
                                    htmlFor="feedback"
                                    className="block font-semibold text-slate-800"
                                >
                                    Feedback{" "}
                                    <span className="font-normal text-slate-500">
                                        (optional)
                                    </span>
                                </label>

                                <textarea
                                    id="feedback"
                                    value={feedback}
                                    onChange={(event) =>
                                        setFeedback(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        alreadyReviewed ||
                                        submitting
                                    }
                                    maxLength={1000}
                                    rows={5}
                                    placeholder="Tell us what went well and what could be improved."
                                    className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />

                                <p className="mt-1 text-right text-xs text-slate-400">
                                    {feedback.length}/1000
                                </p>

                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {alreadyReviewed &&
                                !error && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                                        <p className="font-semibold text-emerald-800">
                                            Review already submitted
                                        </p>

                                        <div className="mt-2 flex gap-1">
                                            {[1, 2, 3, 4, 5].map(
                                                (star) => (
                                                    <span
                                                        key={star}
                                                        className={`text-2xl ${
                                                            star <= rating
                                                                ? "text-amber-400"
                                                                : "text-slate-300"
                                                        }`}
                                                    >
                                                        ★
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        <p className="mt-2 text-sm text-emerald-700">
                                            Your rating: {rating} out of 5 stars
                                        </p>

                                    </div>
                                )}

                            <button
                                type="submit"
                                disabled={
                                    submitting ||
                                    alreadyReviewed ||
                                    rating === 0
                                }
                                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting
                                    ? "Submitting..."
                                    : alreadyReviewed
                                      ? "Review submitted"
                                      : "Submit review"}
                            </button>

                        </form>
                    </>
                )}

            </div>

        </main>
    );
}