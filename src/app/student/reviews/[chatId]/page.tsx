"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Chat {
  id: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  proposalId: string;
  jobProposalId: string;
  isActive: boolean;
}

export default function StudentReviewPage() {
  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;

  const [chat, setChat] = useState<Chat | null>(null);
  const [userId, setUserId] = useState("");

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.uid);

        try {
          const chatSnapshot = await getDoc(
            doc(firestore, "chats", chatId)
          );

          if (!chatSnapshot.exists()) {
            setError("This tutoring session could not be found.");
            setLoading(false);
            return;
          }

          const chatData = chatSnapshot.data();

          if (chatData.studentId !== user.uid) {
            setError(
              "You do not have permission to review this session."
            );
            setLoading(false);
            return;
          }

          const loadedChat = {
            id: chatSnapshot.id,
            studentId: chatData.studentId ?? "",
            studentName: chatData.studentName ?? "Student",
            tutorId: chatData.tutorId ?? "",
            tutorName: chatData.tutorName ?? "Tutor",
            proposalId: chatData.proposalId ?? "",
            jobProposalId: chatData.jobProposalId ?? "",
            isActive: chatData.isActive ?? false,
          } as Chat;

          setChat(loadedChat);

          if (loadedChat.jobProposalId) {
            const reviewSnapshot = await getDoc(
              doc(
                firestore,
                "reviews",
                loadedChat.jobProposalId
              )
            );

            if (reviewSnapshot.exists()) {
              const reviewData = reviewSnapshot.data();

              setAlreadyReviewed(true);
              setRating(Number(reviewData.rating ?? 0));
              setFeedback(reviewData.feedback ?? "");
            }
          }
        } catch (loadingError) {
          console.error("Review page loading error:", loadingError);
          setError("Unable to load the review page.");
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribeAuth;
  }, [chatId, router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!chat || !userId) {
      setError("The tutoring session could not be identified.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    if (feedback.trim().length < 2) {
      setError("Please write a short review.");
      return;
    }

    if (!chat.jobProposalId) {
      setError(
        "This session does not have a job proposal ID."
      );
      return;
    }

    setSubmitting(true);

    try {
      await setDoc(
        doc(firestore, "reviews", chat.jobProposalId),
        {
          createdAt: serverTimestamp(),
          feedback: feedback.trim(),
          jobProposalId: chat.jobProposalId,
          proposalId: chat.proposalId,
          rating,
          studentId: userId,
          studentName: chat.studentName,
          tutorId: chat.tutorId,
          tutorName: chat.tutorName,
        }
      );

      setAlreadyReviewed(true);
      setSuccess("Your rating and review were submitted.");
    } catch (submitError) {
      console.error("Review submission error:", submitError);

      setError(
        "Unable to submit your review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading tutoring session...
        </p>
      </main>
    );
  }

  if (!chat) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">⚠️</div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Session unavailable
          </h1>

          <p className="mt-3 text-red-600">
            {error || "This session could not be found."}
          </p>

          <Link
            href="/student/messages"
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Return to messages
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor
          </Link>

          <Link
            href={`/student/messages/${chatId}`}
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Conversation
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
              {chat.tutorName.charAt(0).toUpperCase() || "T"}
            </div>

            <p className="mt-6 font-semibold text-emerald-600">
              Session feedback
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Rate {chat.tutorName}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Your feedback helps other students choose the
              right tutor.
            </p>
          </div>

          {alreadyReviewed ? (
            <div className="mt-8">
              <div className="rounded-xl bg-emerald-50 p-6 text-center">
                <div className="text-4xl">✅</div>

                <h2 className="mt-3 text-xl font-bold text-emerald-800">
                  Review submitted
                </h2>

                <div className="mt-3 flex justify-center gap-1 text-3xl">
                  <RatingStars
                    selectedRating={rating}
                    interactive={false}
                    onSelect={() => undefined}
                  />
                </div>

                <p className="mt-4 leading-7 text-slate-700">
                  “{feedback}”
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/student/messages"
                  className="flex-1 rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View messages
                </Link>

                <Link
                  href="/student/dashboard"
                  className="flex-1 rounded-lg bg-emerald-600 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-700"
                >
                  Return to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8"
            >
              <div className="text-center">
                <p className="font-semibold text-slate-700">
                  Select your rating
                </p>

                <div
                  className="mt-4 flex justify-center gap-2 text-5xl"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() =>
                        setHoveredRating(star)
                      }
                      className={`transition hover:scale-110 ${
                        star <= (hoveredRating || rating)
                          ? "text-amber-400"
                          : "text-slate-200"
                      }`}
                      aria-label={`${star} star rating`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-sm font-medium text-slate-500">
                  {getRatingMessage(rating)}
                </p>
              </div>

              <div className="mt-8">
                <label
                  htmlFor="feedback"
                  className="mb-2 block font-medium text-slate-700"
                >
                  Your review
                </label>

                <textarea
                  id="feedback"
                  rows={5}
                  value={feedback}
                  onChange={(event) =>
                    setFeedback(event.target.value)
                  }
                  placeholder="Tell us about your tutoring experience"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

                <p className="mt-2 text-right text-sm text-slate-400">
                  {feedback.length} characters
                </p>
              </div>

              {error && (
                <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </p>
              )}

              {success && (
                <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="mt-6 w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting review..."
                  : "Submit review"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function RatingStars({
  selectedRating,
  interactive,
  onSelect,
}: {
  selectedRating: number;
  interactive: boolean;
  onSelect: (rating: number) => void;
}) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onSelect(star)}
            className={
              star <= selectedRating
                ? "text-amber-400"
                : "text-slate-200"
            }
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            className={
              star <= selectedRating
                ? "text-amber-400"
                : "text-slate-200"
            }
          >
            ★
          </span>
        )
      )}
    </>
  );
}

function getRatingMessage(rating: number) {
  switch (rating) {
    case 1:
      return "Poor";

    case 2:
      return "Fair";

    case 3:
      return "Good";

    case 4:
      return "Very good";

    case 5:
      return "Excellent";

    default:
      return "Choose between 1 and 5 stars";
  }
}