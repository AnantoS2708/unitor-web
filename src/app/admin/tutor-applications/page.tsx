"use client";

import { useEffect, useMemo, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
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
  requestedCourseCodes: string[];
  courseCodesToTeach: string[];
  roles: string[];
  createdAt?: Timestamp;
  tutorAppliedAt?: Timestamp;
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

  const [selectedApprovedCourses, setSelectedApprovedCourses] =
    useState<string[]>([]);

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
        const email = user?.email?.toLowerCase() ?? "";

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

                const requestedCourseCodes =
                  normalizeCourseArray(
                    data.requestedCourseCodes
                  );

                const courseCodesToTeach =
                  normalizeCourseArray(
                    data.courseCodesToTeach
                  );

                return {
                  id: userDocument.id,
                  uid: data.uid ?? userDocument.id,
                  fullName:
                    data.fullName ?? "Unknown applicant",
                  universityEmail:
                    data.universityEmail ?? "",
                  universityId:
                    data.universityId ?? "",
                  universityName:
                    data.universityName ?? "",
                  major: data.major ?? "",
                  currentSemester:
                    data.currentSemester ?? "",
                  phoneNumber:
                    data.phoneNumber ?? "",
                  country:
                    data.country ?? "",
                  bio:
                    data.bio ?? "",
                  cgpa:
                    data.cgpa !== undefined
                      ? String(data.cgpa)
                      : "",
                  tutorStatus:
                    data.tutorStatus ?? "",
                  profileImageUrl:
                    data.profileImageUrl ?? "",
                  requestedCourseCodes,
                  courseCodesToTeach,
                  roles,
                  createdAt:
                    data.createdAt,
                  tutorAppliedAt:
                    data.tutorAppliedAt,
                  approvedAt:
                    data.approvedAt,
                  approvedBy:
                    data.approvedBy ?? "",
                } as TutorApplication;
              })
              .filter((userRecord) => {
                const status =
                  userRecord.tutorStatus
                    .trim()
                    .toLowerCase();

                return (
                  status === "pending" ||
                  status === "approved" ||
                  status === "rejected"
                );
              });

            tutorList.sort((first, second) => {
              const firstTime =
                first.tutorAppliedAt?.toMillis?.() ??
                first.createdAt?.toMillis?.() ??
                0;

              const secondTime =
                second.tutorAppliedAt?.toMillis?.() ??
                second.createdAt?.toMillis?.() ??
                0;

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
        application.tutorStatus
          .trim()
          .toLowerCase() === statusFilter
    );
  }, [applications, statusFilter]);

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus
            .trim()
            .toLowerCase() === "pending"
      ).length,
    [applications]
  );

  const approvedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus
            .trim()
            .toLowerCase() === "approved"
      ).length,
    [applications]
  );

  const rejectedCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.tutorStatus
            .trim()
            .toLowerCase() === "rejected"
      ).length,
    [applications]
  );

  function openApplication(
    application: TutorApplication
  ) {
    setSelectedApplication(application);

    if (
      application.courseCodesToTeach.length > 0
    ) {
      setSelectedApprovedCourses(
        application.courseCodesToTeach
      );
    } else {
      setSelectedApprovedCourses(
        application.requestedCourseCodes
      );
    }
  }

  function toggleApprovedCourse(
    course: string
  ) {
    setSelectedApprovedCourses(
      (currentCourses) =>
        currentCourses.includes(course)
          ? currentCourses.filter(
              (currentCourse) =>
                currentCourse !== course
            )
          : [...currentCourses, course]
    );
  }

  async function updateTutorStatus(
    application: TutorApplication,
    newStatus: "approved" | "rejected"
  ) {
    const action =
      newStatus === "approved"
        ? "approve"
        : "reject";

    if (
      newStatus === "approved" &&
      selectedApplication?.id ===
        application.id &&
      selectedApprovedCourses.length === 0
    ) {
      setError(
        "Select at least one course before approving this tutor."
      );
      return;
    }

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
      const userReference = doc(
        firestore,
        "users",
        application.id
      );

      if (newStatus === "approved") {
        const updatedRoles =
          application.roles.includes("tutor")
            ? application.roles
            : [...application.roles, "tutor"];

        const approvedCourses =
          selectedApplication?.id ===
          application.id
            ? selectedApprovedCourses
            : application.requestedCourseCodes;

        if (approvedCourses.length === 0) {
          setError(
            "No approved courses were selected."
          );
          setUpdatingId("");
          return;
        }

        await updateDoc(userReference, {
          roles: updatedRoles,
          tutorStatus: "approved",
          courseCodesToTeach:
            approvedCourses,
          approvedAt:
            serverTimestamp(),
          approvedBy:
            "admin",
          updatedAt:
            serverTimestamp(),
        });

        setSuccess(
          `${application.fullName} was approved as a tutor.`
        );
      } else {
        const updatedRoles =
          application.roles.filter(
            (role) => role !== "tutor"
          );

        await updateDoc(userReference, {
          roles: updatedRoles,
          tutorStatus: "rejected",
          courseCodesToTeach: [],
          approvedAt: null,
          approvedBy: "admin",
          updatedAt:
            serverTimestamp(),
        });

        setSuccess(
          `${application.fullName}'s tutor application was rejected.`
        );
      }
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
    <main className="min-h-screen bg-unitor-gray-soft">

      <header className="border-b border-unitor-black bg-unitor-black text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link
            href="/admin/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor Admin" />
          </Link>

          <Link
            href="/admin/dashboard"
            className="font-medium text-unitor-gray-light hover:text-white"
          >
            ← Dashboard
          </Link>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        <div>
          <p className="font-medium text-unitor-primary">
            Account management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-unitor-black">
            Tutor applications
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            Review tutor applications and choose the exact
            courses each tutor is allowed to teach.
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
          <p className="mt-6 rounded-lg bg-unitor-background p-4 text-unitor-primary-hover">
            {success}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">

          <FilterButton
            label={`Pending (${pendingCount})`}
            active={statusFilter === "pending"}
            onClick={() =>
              setStatusFilter("pending")
            }
          />

          <FilterButton
            label={`Approved (${approvedCount})`}
            active={statusFilter === "approved"}
            onClick={() =>
              setStatusFilter("approved")
            }
          />

          <FilterButton
            label={`Rejected (${rejectedCount})`}
            active={statusFilter === "rejected"}
            onClick={() =>
              setStatusFilter("rejected")
            }
          />

          <FilterButton
            label={`All (${applications.length})`}
            active={statusFilter === "all"}
            onClick={() =>
              setStatusFilter("all")
            }
          />

        </div>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading tutor applications...
            </p>
          </section>
        ) : filteredApplications.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              📋
            </div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No{" "}
              {statusFilter === "all"
                ? ""
                : statusFilter}{" "}
              applications
            </h2>

          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl border border-unitor-gray-light bg-white shadow-sm">

            <div className="divide-y divide-unitor-gray-soft">

              {filteredApplications.map(
                (application) => (
                  <TutorApplicationRow
                    key={application.id}
                    application={application}
                    updating={
                      updatingId ===
                      application.id
                    }
                    onView={() =>
                      openApplication(
                        application
                      )
                    }
                    onReject={() =>
                      updateTutorStatus(
                        application,
                        "rejected"
                      )
                    }
                  />
                )
              )}

            </div>

          </section>
        )}

      </div>

      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          selectedApprovedCourses={
            selectedApprovedCourses
          }
          updating={
            updatingId ===
            selectedApplication.id
          }
          onToggleCourse={
            toggleApprovedCourse
          }
          onClose={() => {
            setSelectedApplication(null);
            setSelectedApprovedCourses([]);
          }}
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
  onReject,
}: {
  application: TutorApplication;
  updating: boolean;
  onView: () => void;
  onReject: () => void;
}) {
  const status =
    application.tutorStatus
      .trim()
      .toLowerCase();

  const statusStyle =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <article className="p-5">

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

        <div className="flex min-w-0 items-center gap-4">

          {application.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={application.profileImageUrl}
              alt={application.fullName}
              className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-unitor-blue-light text-xl font-bold text-unitor-primary-hover">
              {application.fullName
                .charAt(0)
                .toUpperCase() || "T"}
            </div>
          )}

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">

              <h2 className="truncate font-bold text-unitor-black">
                {application.fullName}
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle}`}
              >
                {status}
              </span>

            </div>

            <p className="mt-1 truncate text-sm text-unitor-gray-dark">
              {application.universityEmail.toLowerCase()}
            </p>

            {application.requestedCourseCodes.length >
              0 && (
              <p className="mt-2 text-sm text-unitor-gray-dark">
                Requested:{" "}
                {application.requestedCourseCodes.join(
                  ", "
                )}
              </p>
            )}

            {application.courseCodesToTeach.length >
              0 && (
              <p className="mt-1 text-sm font-medium text-unitor-primary-hover">
                Approved:{" "}
                {application.courseCodesToTeach.join(
                  ", "
                )}
              </p>
            )}

          </div>

        </div>

        <div className="flex flex-wrap gap-3">

          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-unitor-gray-light px-4 py-2 text-sm font-medium text-unitor-gray-dark hover:border-unitor-primary hover:text-unitor-primary"
          >
            View / Select courses
          </button>

          {status !== "rejected" && (
            <button
              type="button"
              onClick={onReject}
              disabled={updating}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
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
  selectedApprovedCourses,
  updating,
  onToggleCourse,
  onClose,
  onApprove,
  onReject,
}: {
  application: TutorApplication;
  selectedApprovedCourses: string[];
  updating: boolean;
  onToggleCourse: (course: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status =
    application.tutorStatus
      .trim()
      .toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">

      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="sticky top-0 flex items-center justify-between border-b border-unitor-gray-light bg-white p-6">

          <div>
            <h2 className="text-2xl font-bold text-unitor-black">
              Tutor application
            </h2>

            <p className="mt-1 text-sm text-unitor-gray-dark">
              Select the courses this tutor is allowed to teach.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-gray-soft text-xl text-unitor-gray-dark hover:bg-unitor-gray-light"
          >
            ×
          </button>

        </div>

        <div className="p-6">

          <div className="flex items-center gap-4">

            {application.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={application.profileImageUrl}
                alt={application.fullName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-unitor-blue-light text-3xl font-bold text-unitor-primary-hover">
                {application.fullName
                  .charAt(0)
                  .toUpperCase() || "T"}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-unitor-black">
                {application.fullName}
              </h3>

              <p className="mt-1 text-unitor-gray-dark">
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
              value={formatDate(
                application.tutorAppliedAt ??
                  application.createdAt
              )}
            />

          </div>

          <div className="mt-8">

            <h3 className="font-bold text-unitor-black">
              Requested courses
            </h3>

            <p className="mt-2 text-sm text-unitor-gray-dark">
              Check only the courses the tutor is approved to teach.
            </p>

            {application.requestedCourseCodes.length >
            0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                {application.requestedCourseCodes.map(
                  (course) => {
                    const checked =
                      selectedApprovedCourses.includes(
                        course
                      );

                    return (
                      <label
                        key={course}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                          checked
                            ? "border-unitor-primary bg-unitor-background"
                            : "border-unitor-gray-light bg-white"
                        }`}
                      >

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onToggleCourse(
                              course
                            )
                          }
                          className="h-5 w-5 accent-unitor-primary"
                        />

                        <span className="font-medium text-unitor-black">
                          {course}
                        </span>

                      </label>
                    );
                  }
                )}

              </div>
            ) : (
              <p className="mt-3 text-unitor-gray-dark">
                No requested courses found.
              </p>
            )}

          </div>

          {application.courseCodesToTeach.length >
            0 && (
            <div className="mt-8">

              <h3 className="font-bold text-unitor-black">
                Currently approved courses
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">

                {application.courseCodesToTeach.map(
                  (course) => (
                    <span
                      key={course}
                      className="rounded-full bg-unitor-blue-light px-4 py-2 text-sm font-medium text-unitor-primary-hover"
                    >
                      {course}
                    </span>
                  )
                )}

              </div>

            </div>
          )}

          <div className="mt-8">

            <h3 className="font-bold text-unitor-black">
              Bio
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
              {application.bio ||
                "No bio provided."}
            </p>

          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-unitor-gray-light pt-6">

            <button
              type="button"
              onClick={onApprove}
              disabled={
                updating ||
                selectedApprovedCourses.length === 0
              }
              className="rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating
                ? "Updating..."
                : status === "approved"
                  ? "Update approved courses"
                  : "Approve tutor"}
            </button>

            {status !== "rejected" && (
              <button
                type="button"
                onClick={onReject}
                disabled={updating}
                className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject application
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-unitor-gray-light px-6 py-3 font-medium text-unitor-gray-dark hover:bg-unitor-background"
            >
              Close
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

function normalizeCourseArray(
  value: unknown
): string[] {
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
          .map((course) =>
            normalizeCourseCode(
              course
            )
          )
          .filter(Boolean)
      )
    );
  }

  return [];
}

function normalizeCourseCode(
  courseCode: string
) {
  return courseCode
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
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
    amber:
      "bg-amber-50 text-amber-700",
    emerald:
      "bg-green-50 text-green-700",
    red:
      "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">

      <span
        className={`rounded-lg px-3 py-1 text-sm font-medium ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-unitor-black">
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
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active
          ? "bg-unitor-primary text-white"
          : "border border-unitor-gray-light bg-white text-unitor-gray-dark hover:bg-unitor-background"
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
    <div className="border-b border-unitor-gray-soft pb-4">

      <p className="text-sm font-medium text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-1 font-medium text-unitor-black">
        {value || "Not provided"}
      </p>

    </div>
  );
}

function formatDate(
  timestamp?: Timestamp
) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return timestamp
    .toDate()
    .toLocaleDateString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
}
