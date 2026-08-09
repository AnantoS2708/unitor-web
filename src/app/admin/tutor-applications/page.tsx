"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

interface TutorApplication {
  id: string;
  uid: string;
  fullName: string;
  universityEmail: string;
  universityId: string;
  universityName: string;
  major: string;
  currentSemester: string;
  phoneNumber: string;
  country: string;
  bio: string;
  cgpa: string;
  tutorStatus: string;
  profileImageUrl: string;
  courseCodesToTeach: string;
  courses: string[];
  roles: string[];
  createdAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

type StatusFilter =
  | "pending"
  | "approved"
  | "rejected"
  | "all";

export default function AdminTutorApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<
    TutorApplication[]
  >([]);
  const [selectedApplication, setSelectedApplication] =
    useState<TutorApplication | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("pending");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        unsubscribeUsers = onSnapshot(
          collection(firestore, "users"),
          (snapshot) => {
            const tutorList = snapshot.docs
              .map((userDocument) => {
                const data = userDocument.data();

                const roles = Array.isArray(data.roles)
                  ? data.roles
                  : [];

                const courses = Array.isArray(data.courses)
                  ? data.courses
                  : [];

                return {
                  id: userDocument.id,
                  uid: data.uid ?? userDocument.id,
                  fullName: data.fullName ?? "Unknown tutor",
                  universityEmail:
                    data.universityEmail ?? "",
                  universityId: data.universityId ?? "",
                  universityName:
                    data.universityName ?? "",
                  major: data.major ?? "",
                  currentSemester:
                    data.currentSemester ?? "",
                  phoneNumber: data.phoneNumber ?? "",
                  country: data.country ?? "",
                  bio: data.bio ?? "",
                  cgpa: data.cgpa ?? "",
                  tutorStatus:
                    data.tutorStatus ?? "pending",
                  profileImageUrl:
                    data.profileImageUrl ?? "",
                  courseCodesToTeach:
                    data.courseCodesToTeach ?? "",
                  courses,
                  roles,
                  createdAt: data.createdAt,
                  approvedAt: data.approvedAt,
                  approvedBy: data.approvedBy ?? "",
                } as TutorApplication;
              })
              .filter((userRecord) =>
                userRecord.roles.includes("tutor")
              );

            tutorList.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis?.() ?? 0;

              const secondTime =
                second.createdAt?.toMillis?.() ?? 0;

              return secondTime - firstTime;
            });

            setApplications(tutorList);

            setSelectedApplication(
              (currentApplication) => {
                if (!currentApplication) {
                  return null;
                }

                return (
                  tutorList.find(
                    (application) =>
                      application.id ===
                      currentApplication.id
                  ) ?? null
                );
              }
            );

            setError("");
            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Tutor application loading error:",
              loadError
            );

            setError(
              "Unable to load tutor applications."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeUsers?.();
    };
  }, [router]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") {
      return applications;
    }

    return applications.filter(
      (application) =>
        application.tutorStatus.toLowerCase() ===
        statusFilter
    );
  }, [applications, statusFilter]);

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus.toLowerCase() ===
          "pending"
      ).length,
    [applications]
  );

  const approvedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus.toLowerCase() ===
          "approved"
      ).length,
    [applications]
  );

  const rejectedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus.toLowerCase() ===
          "rejected"
      ).length,
    [applications]
  );

  async function updateTutorStatus(
    application: TutorApplication,
    newStatus: "approved" | "rejected"
  ) {
    const action =
      newStatus === "approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${application.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(application.id);
    setError("");
    setSuccess("");

    try {
      const updateData =
        newStatus === "approved"
          ? {
              tutorStatus: "approved",
              approvedAt: serverTimestamp(),
              approvedBy: "admin",
            }
          : {
              tutorStatus: "rejected",
              approvedAt: null,
              approvedBy: "admin",
            };

      await updateDoc(
        doc(firestore, "users", application.id),
        updateData
      );

      setSuccess(
        `${application.fullName} was ${newStatus}.`
      );
    } catch (updateError) {
      console.error(
        "Tutor status update error:",
        updateError
      );

      setError(
        `Unable to ${action} this tutor application.`
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-emerald-400"
          >
            Unitor Admin
          </Link>

          <Link
            href="/admin/dashboard"
            className="font-medium text-slate-300 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="font-semibold text-emerald-600">
            Account management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Tutor applications
          </h1>

          <p className="mt-3 text-slate-600">
            Review tutor information before approving their
            account.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatusCard
            title="Pending"
            count={pendingCount}
            color="amber"
          />

          <StatusCard
            title="Approved"
            count={approvedCount}
            color="emerald"
          />

          <StatusCard
            title="Rejected"
            count={rejectedCount}
            color="red"
          />
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            {success}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <FilterButton
            label={`Pending (${pendingCount})`}
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />

          <FilterButton
            label={`Approved (${approvedCount})`}
            active={statusFilter === "approved"}
            onClick={() => setStatusFilter("approved")}
          />

          <FilterButton
            label={`Rejected (${rejectedCount})`}
            active={statusFilter === "rejected"}
            onClick={() => setStatusFilter("rejected")}
          />

          <FilterButton
            label={`All (${applications.length})`}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
        </div>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading tutor applications...
            </p>
          </section>
        ) : filteredApplications.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📋</div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              No {statusFilter === "all" ? "" : statusFilter}{" "}
              applications
            </h2>

            <p className="mt-3 text-slate-600">
              Tutor applications will appear here.
            </p>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {filteredApplications.map((application) => (
                <TutorApplicationRow
                  key={application.id}
                  application={application}
                  updating={
                    updatingId === application.id
                  }
                  onView={() =>
                    setSelectedApplication(application)
                  }
                  onApprove={() =>
                    updateTutorStatus(
                      application,
                      "approved"
                    )
                  }
                  onReject={() =>
                    updateTutorStatus(
                      application,
                      "rejected"
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          updating={
            updatingId === selectedApplication.id
          }
          onClose={() =>
            setSelectedApplication(null)
          }
          onApprove={() =>
            updateTutorStatus(
              selectedApplication,
              "approved"
            )
          }
          onReject={() =>
            updateTutorStatus(
              selectedApplication,
              "rejected"
            )
          }
        />
      )}
    </main>
  );
}

function TutorApplicationRow({
  application,
  updating,
  onView,
  onApprove,
  onReject,
}: {
  application: TutorApplication;
  updating: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status =
    application.tutorStatus.toLowerCase();

  const statusStyle =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          {application.profileImageUrl ? (
            <img
              src={application.profileImageUrl}
              alt={application.fullName}
              className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {application.fullName
                .charAt(0)
                .toUpperCase() || "T"}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="truncate font-bold text-slate-900">
                {application.fullName}
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}
              >
                {status}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-slate-600">
              {application.universityEmail.toLowerCase()}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {application.major || "Major not provided"} ·{" "}
              {application.universityName ||
                "University not provided"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View details
          </button>

          {status !== "approved" && (
            <button
              type="button"
              onClick={onApprove}
              disabled={updating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {updating ? "Updating..." : "Approve"}
            </button>
          )}

          {status !== "rejected" && (
            <button
              type="button"
              onClick={onReject}
              disabled={updating}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ApplicationDetailsModal({
  application,
  updating,
  onClose,
  onApprove,
  onReject,
}: {
  application: TutorApplication;
  updating: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const courses =
    application.courses.length > 0
      ? application.courses
      : application.courseCodesToTeach
          .split(",")
          .map((course) => course.trim())
          .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Tutor application
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the applicant’s information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4">
            {application.profileImageUrl ? (
              <img
                src={application.profileImageUrl}
                alt={application.fullName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                {application.fullName
                  .charAt(0)
                  .toUpperCase() || "T"}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {application.fullName}
              </h3>

              <p className="mt-1 text-slate-600">
                {application.universityEmail.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InformationItem
              label="University ID"
              value={application.universityId}
            />

            <InformationItem
              label="University"
              value={application.universityName}
            />

            <InformationItem
              label="Major"
              value={application.major}
            />

            <InformationItem
              label="Current semester"
              value={application.currentSemester}
            />

            <InformationItem
              label="CGPA"
              value={application.cgpa}
            />

            <InformationItem
              label="Phone number"
              value={application.phoneNumber}
            />

            <InformationItem
              label="Country"
              value={application.country}
            />

            <InformationItem
              label="Application date"
              value={formatDate(application.createdAt)}
            />
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-slate-900">
              Courses to teach
            </h3>

            {courses.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {courses.map((course) => (
                  <span
                    key={course}
                    className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                  >
                    {course}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-500">
                No courses provided.
              </p>
            )}
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-slate-900">
              Tutor bio
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
              {application.bio || "No bio provided."}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            {application.tutorStatus.toLowerCase() !==
              "approved" && (
              <button
                type="button"
                onClick={onApprove}
                disabled={updating}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {updating
                  ? "Updating..."
                  : "Approve tutor"}
              </button>
            )}

            {application.tutorStatus.toLowerCase() !==
              "rejected" && (
              <button
                type="button"
                onClick={onReject}
                disabled={updating}
                className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject application
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: "amber" | "emerald" | "red";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-semibold ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {count}
      </p>
    </article>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-medium text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}