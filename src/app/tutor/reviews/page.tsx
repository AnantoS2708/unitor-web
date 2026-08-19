"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Review {
  id: string;
  feedback: string;
  rating: number;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  proposalId: string;
  jobProposalId: string;
  createdAt?: Timestamp;
}

export default function TutorReviewsPage() {
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeReviews: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const reviewsQuery = query(
        collection(firestore, "reviews"),
        where("tutorId", "==", user.uid)
      );

      unsubscribeReviews = onSnapshot(
        reviewsQuery,
        (snapshot) => {
          const reviewList = snapshot.docs.map((reviewDocument) => {
            const data = reviewDocument.data();

            return {
              id: reviewDocument.id,
              feedback: data.feedback ?? "",
              rating: Number(data.rating ?? 0),
              studentId: data.studentId ?? "",
              studentName: data.studentName ?? "Student",
              tutorId: data.tutorId ?? "",
              tutorName: data.tutorName ?? "",
              proposalId: data.proposalId ?? "",
              jobProposalId: data.jobProposalId ?? "",
              createdAt: data.createdAt,
            } as Review;
          });

          reviewList.sort((first, second) => {
            const firstTime = first.createdAt?.toMillis?.() ?? 0;
            const secondTime = second.createdAt?.toMillis?.() ?? 0;

            return secondTime - firstTime;
          });

          setReviews(reviewList);
          setError("");
          setLoading(false);
        },
        (reviewError) => {
          console.error("Tutor review loading error:", reviewError);
          setError("Unable to load your ratings and reviews.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReviews?.();
    };
  }, [router]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const ratingTotal = reviews.reduce(
      (total, review) => total + review.rating,
      0
    );

    return ratingTotal / reviews.length;
  }, [reviews]);

  const fiveStarReviews = useMemo(
    () =>
      reviews.filter((review) => Math.round(review.rating) === 5)
        .length,
    [reviews]
  );

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter(
        (review) => Math.round(review.rating) === rating
      ).length,
    }));
  }, [reviews]);

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div>
          <p className="font-medium text-unitor-primary">
            Tutor performance
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Ratings and reviews
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            See feedback submitted by your students.
          </p>
        </div>

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">Loading reviews...</p>
          </section>
        )}

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <article className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-unitor-gray-dark">
                  Average rating
                </p>

                <p className="mt-4 text-5xl font-bold text-unitor-black">
                  {averageRating > 0
                    ? averageRating.toFixed(1)
                    : "0.0"}
                </p>

                <div className="mt-3 flex justify-center gap-1 text-2xl">
                  <StarRating rating={averageRating} />
                </div>

                <p className="mt-3 text-sm text-unitor-gray-dark">
                  Based on {reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"}
                </p>
              </article>

              <article className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-unitor-gray-dark">
                  Five-star reviews
                </p>

                <p className="mt-4 text-5xl font-bold text-amber-500">
                  {fiveStarReviews}
                </p>

                <p className="mt-4 text-sm text-unitor-gray-dark">
                  Excellent student experiences
                </p>
              </article>

              <article className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-unitor-black">
                  Rating breakdown
                </h2>

                <div className="mt-5 space-y-3">
                  {ratingCounts.map((item) => {
                    const percentage =
                      reviews.length > 0
                        ? (item.count / reviews.length) * 100
                        : 0;

                    return (
                      <div
                        key={item.rating}
                        className="flex items-center gap-3"
                      >
                        <span className="w-8 text-sm font-medium text-unitor-gray-dark">
                          {item.rating}★
                        </span>

                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-unitor-gray-soft">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <span className="w-6 text-right text-sm text-unitor-gray-dark">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            {reviews.length === 0 ? (
              <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
                <div className="text-5xl">⭐</div>

                <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                  No reviews yet
                </h2>

                <p className="mx-auto mt-3 max-w-md text-unitor-gray-dark">
                  Reviews will appear after students complete and
                  rate their tutoring sessions.
                </p>

                <Link
                  href="/tutor/proposals"
                  className="mt-7 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
                >
                  Browse proposals
                </Link>
              </section>
            ) : (
              <section className="mt-8">
                <h2 className="text-2xl font-bold text-unitor-black">
                  Student feedback
                </h2>

                <div className="mt-5 space-y-5">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const firstLetter =
    review.studentName.charAt(0).toUpperCase() || "S";

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-unitor-blue-light text-lg font-bold text-unitor-primary-hover">
          {firstLetter}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-bold text-unitor-black">
                {review.studentName}
              </h3>

              <div className="mt-1 flex gap-0.5 text-lg">
                <StarRating rating={review.rating} />
              </div>
            </div>

            <p className="text-sm text-unitor-gray-dark/70">
              {formatReviewDate(review.createdAt)}
            </p>
          </div>

          <p className="mt-4 leading-7 text-unitor-gray-dark">
            {review.feedback || "The student did not leave a comment."}
          </p>

          {review.proposalId && (
            <p className="mt-4 text-xs text-unitor-gray-dark/70">
              Proposal ID: {review.proposalId}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function StarRating({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating);

  return (
    <>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= roundedRating
              ? "text-amber-400"
              : "text-unitor-gray-light"
          }
        >
          ★
        </span>
      ))}
    </>
  );
}

function formatReviewDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}