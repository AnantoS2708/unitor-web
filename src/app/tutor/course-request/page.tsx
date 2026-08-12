"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";

interface TutorProfile {
  fullName: string;
  universityEmail: string;
  tutorStatus: string;
  roles: string[];
  courseCodesToTeach: string[];
}

interface CourseRequest {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  courseCode: string;
  reason: string;
  status: string;
  createdAt?: Timestamp;
  reviewedAt?: Timestamp;
}

function normalizeCourseCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeStatus(value: string) {
  return value
    .trim()
    .toLowerCase();
}

function readCourseCodes(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((course) =>
            normalizeCourseCode(
              String(course)
            )
          )
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map(normalizeCourseCode)
          .filter(Boolean)
      )
    );
  }

  return [];
}

function formatDate(value?: Timestamp) {
  if (!value) {
    return "Just now";
  }

  return value.toDate().toLocaleString(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export default function TutorCourseRequestPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<TutorProfile | null>(null);

  const [requests, setRequests] =
    useState<CourseRequest[]>([]);

  const [courseCode, setCourseCode] =
    useState("");

  const [reason, setReason] =
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
    let unsubscribeProfile:
      | (() => void)
      | undefined;

    let unsubscribeRequests:
      | (() => void)
      | undefined;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.replace("/login");
            return;
          }

          unsubscribeProfile =
            onSnapshot(
              doc(
                firestore,
                "users",
                user.uid
              ),
              (snapshot) => {
                if (!snapshot.exists()) {
                  setError(
                    "Tutor profile was not found."
                  );
                  setLoading(false);
                  return;
                }

                const data =
                  snapshot.data();

                const roles =
                  Array.isArray(data.roles)
                    ? data.roles.map(
                        (role: unknown) =>
                          String(role)
                            .trim()
                            .toLowerCase()
                      )
                    : [];

                const tutorStatus =
                  normalizeStatus(
                    String(
                      data.tutorStatus ?? ""
                    )
                  );

                if (
                  !roles.includes("tutor") ||
                  tutorStatus !== "approved"
                ) {
                  router.replace(
                    "/student/dashboard"
                  );
                  return;
                }

                setProfile({
                  fullName: String(
                    data.fullName ?? "Tutor"
                  ),
                  universityEmail: String(
                    data.universityEmail ??
                      user.email ??
                      ""
                  ),
                  tutorStatus,
                  roles,
                  courseCodesToTeach:
                    readCourseCodes(
                      data.courseCodesToTeach
                    ),
                });

                setLoading(false);
              },
              (profileError) => {
                console.error(
                  "Tutor profile error:",
                  profileError
                );

                setError(
                  "Unable to load your tutor profile."
                );
                setLoading(false);
              }
            );

          const requestsQuery =
            query(
              collection(
                firestore,
                "courseRequests"
              ),
              where(
                "tutorId",
                "==",
                user.uid
              )
            );

          unsubscribeRequests =
            onSnapshot(
              requestsQuery,
              (snapshot) => {
                const nextRequests =
                  snapshot.docs.map(
                    (requestDocument) => {
                      const data =
                        requestDocument.data();

                      return {
                        id:
                          requestDocument.id,
                        tutorId: String(
                          data.tutorId ?? ""
                        ),
                        tutorName: String(
                          data.tutorName ??
                            "Tutor"
                        ),
                        tutorEmail: String(
                          data.tutorEmail ?? ""
                        ),
                        courseCode:
                          normalizeCourseCode(
                            String(
                              data.courseCode ??
                                ""
                            )
                          ),
                        reason: String(
                          data.reason ?? ""
                        ),
                        status:
                          normalizeStatus(
                            String(
                              data.status ??
                                "pending"
                            )
                          ),
                        createdAt:
                          data.createdAt instanceof
                          Timestamp
                            ? data.createdAt
                            : undefined,
                        reviewedAt:
                          data.reviewedAt instanceof
                          Timestamp
                            ? data.reviewedAt
                            : undefined,
                      } as CourseRequest;
                    }
                  );

                nextRequests.sort(
                  (first, second) =>
                    (second.createdAt
                      ?.toMillis() ?? 0) -
                    (first.createdAt
                      ?.toMillis() ?? 0)
                );

                setRequests(nextRequests);
              },
              (requestError) => {
                console.error(
                  "Course request error:",
                  requestError
                );

                setError(
                  "Unable to load your course requests."
                );
              }
            );
        }
      );

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
      unsubscribeRequests?.();
    };
  }, [router]);

  const pendingCourseCodes =
    useMemo(
      () =>
        new Set(
          requests
            .filter(
              (request) =>
                request.status ===
                "pending"
            )
            .map((request) =>
              normalizeCourseCode(
                request.courseCode
              )
            )
        ),
      [requests]
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const user = auth.currentUser;
    const requestedCourse =
      normalizeCourseCode(courseCode);

    if (!user || !profile) {
      setError(
        "Tutor account is not available."
      );
      return;
    }

    if (
      !/^[A-Z]{2,5}\d{2,4}$/.test(
        requestedCourse
      )
    ) {
      setError(
        "Enter a valid course code, for example CSE215."
      );
      return;
    }

    if (
      profile.courseCodesToTeach.includes(
        requestedCourse
      )
    ) {
      setError(
        `${requestedCourse} is already one of your approved courses.`
      );
      return;
    }

    if (
      pendingCourseCodes.has(
        requestedCourse
      )
    ) {
      setError(
        `You already have a pending request for ${requestedCourse}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(
        collection(
          firestore,
          "courseRequests"
        ),
        {
          tutorId: user.uid,
          tutorName: profile.fullName,
          tutorEmail:
            profile.universityEmail ||
            user.email ||
            "",
          courseCode: requestedCourse,
          reason: reason.trim(),
          status: "pending",
          createdAt: serverTimestamp(),
          reviewedAt: null,
          reviewedBy: "",
        }
      );

      setCourseCode("");
      setReason("");

      setSuccess(
        `${requestedCourse} was submitted for admin approval.`
      );
    } catch (submitError) {
      console.error(
        "Course request submission error:",
        submitError
      );

      setError(
        "Unable to submit the course request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <p className="text-sm font-medium text-slate-500">
            Loading course requests...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xl font-black text-emerald-600">
              Unitor
            </p>

            <p className="text-sm text-slate-500">
              Tutor course requests
            </p>
          </div>

          <Link
            href="/tutor/dashboard"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
              Request another course
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Add a teaching course
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              The course will only be added
              after an admin approves your
              request.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="courseCode"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Course code
                </label>

                <input
                  id="courseCode"
                  value={courseCode}
                  onChange={(event) =>
                    setCourseCode(
                      event.target.value
                        .toUpperCase()
                    )
                  }
                  placeholder="CSE215"
                  maxLength={9}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Reason{" "}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Tell the admin why you want to teach this course."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Course Request"}
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm font-bold text-emerald-800">
                Approved courses
              </p>

              {profile &&
              profile.courseCodesToTeach
                .length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.courseCodesToTeach.map(
                    (course) => (
                      <span
                        key={course}
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700"
                      >
                        {course}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  No approved courses yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                Request history
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Your requests
              </h2>
            </div>

            {requests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
                <p className="font-semibold text-slate-700">
                  No course requests yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Your submitted requests will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {requests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">
                          {request.courseCode}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            request.createdAt
                          )}
                        </p>
                      </div>

                      <span
                        className={
                          request.status ===
                          "approved"
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                            : request.status ===
                                "rejected"
                              ? "rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                              : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
                        }
                      >
                        {request.status}
                      </span>
                    </div>

                    {request.reason && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {request.reason}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}