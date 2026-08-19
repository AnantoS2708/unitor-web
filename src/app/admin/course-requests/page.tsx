"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

type RequestStatus = "pending" | "approved" | "rejected";
type Filter = RequestStatus | "all";

interface CourseRequest {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  courseCode: string;
  reason: string;
  status: RequestStatus;
  createdAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy: string;
}

function normalizeStatus(value: unknown): RequestStatus {
  const status = String(value ?? "pending").trim().toLowerCase();
  return status === "approved" || status === "rejected" ? status : "pending";
}

function normalizeCourseCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function formatDate(value?: Timestamp) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value.toDate());
}

export default function AdminCourseRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribeRequests: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const email = user?.email?.trim().toLowerCase() ?? "";

      if (!user || email !== ADMIN_EMAIL) {
        router.replace("/admin/login");
        return;
      }

      setCheckingAdmin(false);
      unsubscribeRequests = onSnapshot(
        collection(firestore, "courseRequests"),
        (snapshot) => {
          const nextRequests = snapshot.docs.map((requestDocument) => {
            const data = requestDocument.data();
            return {
              id: requestDocument.id,
              tutorId: String(data.tutorId ?? ""),
              tutorName: String(data.tutorName ?? "Tutor"),
              tutorEmail: String(data.tutorEmail ?? ""),
              courseCode: normalizeCourseCode(data.courseCode),
              reason: String(data.reason ?? ""),
              status: normalizeStatus(data.status),
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
              reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt : undefined,
              reviewedBy: String(data.reviewedBy ?? ""),
            } satisfies CourseRequest;
          });

          nextRequests.sort(
            (first, second) =>
              (second.createdAt?.toMillis() ?? 0) -
              (first.createdAt?.toMillis() ?? 0),
          );
          setRequests(nextRequests);
          setLoading(false);
        },
        (snapshotError) => {
          console.error("Course request loading error:", snapshotError);
          setError("Unable to load course requests.");
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRequests?.();
    };
  }, [router]);

  const counts = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === "pending").length,
      approved: requests.filter((request) => request.status === "approved").length,
      rejected: requests.filter((request) => request.status === "rejected").length,
    }),
    [requests],
  );

  const displayedRequests = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((request) => request.status === filter),
    [filter, requests],
  );

  async function approveRequest(request: CourseRequest) {
    const admin = auth.currentUser;
    if (!admin || admin.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
      router.replace("/admin/login");
      return;
    }

    setError("");
    setSuccess("");
    setProcessingId(request.id);

    try {
      const requestRef = doc(firestore, "courseRequests", request.id);
      const tutorRef = doc(firestore, "users", request.tutorId);

      await runTransaction(firestore, async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);
        const tutorSnapshot = await transaction.get(tutorRef);

        if (!requestSnapshot.exists()) throw new Error("Course request was not found.");
        if (!tutorSnapshot.exists()) throw new Error("Tutor profile was not found.");

        const requestData = requestSnapshot.data();
        if (normalizeStatus(requestData.status) !== "pending") {
          throw new Error("This request has already been reviewed.");
        }

        const courseCode = normalizeCourseCode(requestData.courseCode);
        if (!courseCode) throw new Error("The request has no valid course code.");

        const currentValue = tutorSnapshot.data().courseCodesToTeach;
        const currentCourses = Array.isArray(currentValue)
          ? currentValue.map(normalizeCourseCode).filter(Boolean)
          : typeof currentValue === "string"
            ? currentValue.split(",").map(normalizeCourseCode).filter(Boolean)
            : [];
        const courseCodesToTeach = Array.from(new Set([...currentCourses, courseCode]));

        transaction.update(tutorRef, { courseCodesToTeach });
        transaction.update(requestRef, {
          status: "approved",
          reviewedAt: serverTimestamp(),
          reviewedBy: admin.email ?? ADMIN_EMAIL,
        });
      });

      setSuccess(`${request.courseCode} was approved for ${request.tutorName}.`);
    } catch (approvalError) {
      console.error("Course request approval error:", approvalError);
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Unable to approve this course request.",
      );
    } finally {
      setProcessingId("");
    }
  }

  async function rejectRequest(request: CourseRequest) {
    const admin = auth.currentUser;
    if (!admin || admin.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
      router.replace("/admin/login");
      return;
    }

    setError("");
    setSuccess("");
    setProcessingId(request.id);

    try {
      const requestRef = doc(firestore, "courseRequests", request.id);
      await runTransaction(firestore, async (transaction) => {
        const snapshot = await transaction.get(requestRef);
        if (!snapshot.exists()) throw new Error("Course request was not found.");
        if (normalizeStatus(snapshot.data().status) !== "pending") {
          throw new Error("This request has already been reviewed.");
        }
        transaction.update(requestRef, {
          status: "rejected",
          reviewedAt: serverTimestamp(),
          reviewedBy: admin.email ?? ADMIN_EMAIL,
        });
      });
      setSuccess(`${request.courseCode} was rejected.`);
    } catch (rejectionError) {
      console.error("Course request rejection error:", rejectionError);
      setError(
        rejectionError instanceof Error
          ? rejectionError.message
          : "Unable to reject this course request.",
      );
    } finally {
      setProcessingId("");
    }
  }

  if (checkingAdmin) {
    return <main className="min-h-screen bg-unitor-gray-soft p-8 text-unitor-gray-dark">Checking admin access…</main>;
  }

  return (
    <main className="min-h-screen bg-unitor-gray-soft">
      <header className="bg-unitor-black text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-unitor-primary">Unitor Admin</p>
            <h1 className="mt-1 text-xl font-bold">Course Requests</h1>
          </div>
          <Link href="/admin/dashboard" className="text-sm font-medium text-unitor-gray-light transition hover:text-white">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {(["pending", "approved", "rejected"] as RequestStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                filter === status ? "border-unitor-primary ring-2 ring-unitor-blue-light" : "border-unitor-gray-light hover:border-unitor-blue-light"
              }`}
            >
              <p className="text-sm font-medium capitalize text-unitor-gray-dark">{status}</p>
              <p className="mt-2 text-3xl font-bold text-unitor-black">{counts[status]}</p>
            </button>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-unitor-gray-light bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-unitor-gray-light p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-unitor-black">Tutor course requests</h2>
              <p className="mt-1 text-sm text-unitor-gray-dark">Approve a request to add its course to the tutor’s teaching list.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "all"] as Filter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
                    filter === value ? "bg-unitor-primary text-white" : "bg-unitor-gray-soft text-unitor-gray-dark hover:bg-unitor-gray-light"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {(error || success) && (
            <div className={`mx-5 mt-5 rounded-xl px-4 py-3 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {error || success}
            </div>
          )}

          <div className="space-y-4 p-5">
            {loading ? (
              <p className="py-10 text-center text-unitor-gray-dark">Loading course requests…</p>
            ) : displayedRequests.length === 0 ? (
              <p className="py-10 text-center text-unitor-gray-dark">No {filter === "all" ? "course" : filter} requests found.</p>
            ) : (
              displayedRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-unitor-gray-light p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-unitor-black">{request.courseCode || "Unknown course"}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          request.status === "pending" ? "bg-amber-100 text-amber-700" : request.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-unitor-gray-dark">{request.tutorName}</p>
                      <p className="text-sm text-unitor-gray-dark">{request.tutorEmail}</p>
                      {request.reason && <p className="mt-3 max-w-2xl rounded-xl bg-unitor-background p-3 text-sm text-unitor-gray-dark">{request.reason}</p>}
                      <p className="mt-3 text-xs text-unitor-gray-dark/70">Requested {formatDate(request.createdAt)}</p>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={Boolean(processingId)}
                          onClick={() => rejectRequest(request)}
                          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === request.id ? "Working…" : "Reject"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(processingId)}
                          onClick={() => approveRequest(request)}
                          className="rounded-xl bg-unitor-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === request.id ? "Working…" : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
