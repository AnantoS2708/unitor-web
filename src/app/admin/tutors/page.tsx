"use client";

import { useEffect, useMemo, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

interface Tutor {
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
  approvedBy: string;
}

interface Review {
  tutorId: string;
  rating: number;
}

interface Payment {
  tutorId: string;
  tutorEarning: number;
  status: string;
}

type TutorFilter =
  | "approved"
  | "pending"
  | "rejected"
  | "all";

export default function AdminTutorsPage() {
  const router = useRouter();

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [selectedTutor, setSelectedTutor] =
    useState<Tutor | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] =
    useState<TutorFilter>("approved");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeFunctions: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        const unsubscribeUsers = onSnapshot(
          collection(firestore, "users"),
          (snapshot) => {
            const tutorList = snapshot.docs
              .map((userDocument) => {
                const data = userDocument.data();

                const roles = Array.isArray(data.roles)
                  ? data.roles
                  : [];

                return {
                  id: userDocument.id,
                  uid: data.uid ?? userDocument.id,
                  fullName:
                    data.fullName ?? "Unknown tutor",
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
                  country: data.country ?? "",
                  bio: data.bio ?? "",
                  cgpa: data.cgpa ?? "",
                  tutorStatus:
                    data.tutorStatus ?? "pending",
                  profileImageUrl:
                    data.profileImageUrl ?? "",
                  courseCodesToTeach:
                    data.courseCodesToTeach ?? "",
                  courses: Array.isArray(data.courses)
                    ? data.courses
                    : [],
                  roles,
                  createdAt: data.createdAt,
                  approvedAt: data.approvedAt,
                  approvedBy:
                    data.approvedBy ?? "",
                } as Tutor;
              })
              .filter((userRecord) =>
                userRecord.roles.includes("tutor")
              );

            tutorList.sort((first, second) =>
              first.fullName.localeCompare(
                second.fullName
              )
            );

            setTutors(tutorList);

            setSelectedTutor((currentTutor) => {
              if (!currentTutor) {
                return null;
              }

              return (
                tutorList.find(
                  (tutor) =>
                    tutor.id === currentTutor.id
                ) ?? null
              );
            });

            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin tutors loading error:",
              loadError
            );

            setError("Unable to load tutors.");
            setLoading(false);
          }
        );

        const unsubscribeReviews = onSnapshot(
          collection(firestore, "reviews"),
          (snapshot) => {
            setReviews(
              snapshot.docs.map((reviewDocument) => {
                const data = reviewDocument.data();

                return {
                  tutorId: data.tutorId ?? "",
                  rating: Number(data.rating ?? 0),
                } as Review;
              })
            );
          },
          (loadError) => {
            console.error(
              "Admin review loading error:",
              loadError
            );
          }
        );

        const unsubscribePayments = onSnapshot(
          collection(firestore, "payments"),
          (snapshot) => {
            setPayments(
              snapshot.docs.map(
                (paymentDocument) => {
                  const data =
                    paymentDocument.data();

                  return {
                    tutorId: data.tutorId ?? "",
                    tutorEarning: Number(
                      data.tutorEarning ?? 0
                    ),
                    status:
                      data.status ?? "pending",
                  } as Payment;
                }
              )
            );
          },
          (loadError) => {
            console.error(
              "Admin tutor payment loading error:",
              loadError
            );
          }
        );

        unsubscribeFunctions.push(
          unsubscribeUsers,
          unsubscribeReviews,
          unsubscribePayments
        );
      }
    );

    return () => {
      unsubscribeAuth();

      unsubscribeFunctions.forEach(
        (unsubscribe) => unsubscribe()
      );
    };
  }, [router]);

  const filteredTutors = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return tutors.filter((tutor) => {
      const matchesStatus =
        filter === "all" ||
        tutor.tutorStatus.toLowerCase() === filter;

      const matchesSearch =
        !search ||
        tutor.fullName.toLowerCase().includes(search) ||
        tutor.universityEmail
          .toLowerCase()
          .includes(search) ||
        tutor.major.toLowerCase().includes(search) ||
        tutor.universityName
          .toLowerCase()
          .includes(search) ||
        tutor.courseCodesToTeach
          .toLowerCase()
          .includes(search) ||
        tutor.courses.some((course) =>
          course.toLowerCase().includes(search)
        );

      return matchesStatus && matchesSearch;
    });
  }, [filter, searchText, tutors]);

  const statusCounts = useMemo(() => {
    return {
      approved: tutors.filter(
        (tutor) =>
          tutor.tutorStatus.toLowerCase() ===
          "approved"
      ).length,
      pending: tutors.filter(
        (tutor) =>
          tutor.tutorStatus.toLowerCase() ===
          "pending"
      ).length,
      rejected: tutors.filter(
        (tutor) =>
          tutor.tutorStatus.toLowerCase() ===
          "rejected"
      ).length,
    };
  }, [tutors]);

  function getTutorRating(tutorId: string) {
    const tutorReviews = reviews.filter(
      (review) => review.tutorId === tutorId
    );

    if (tutorReviews.length === 0) {
      return {
        average: 0,
        count: 0,
      };
    }

    const total = tutorReviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    return {
      average: total / tutorReviews.length,
      count: tutorReviews.length,
    };
  }

  function getTutorEarnings(tutorId: string) {
    return payments
      .filter(
        (payment) =>
          payment.tutorId === tutorId &&
          payment.status.toLowerCase() ===
            "successful"
      )
      .reduce(
        (total, payment) =>
          total + payment.tutorEarning,
        0
      );
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
        <p className="font-medium text-unitor-primary">
          User management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-unitor-black">
          Tutors
        </h1>

        <p className="mt-3 text-unitor-gray-dark">
          View tutor accounts, ratings and earnings.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Approved"
            value={statusCounts.approved}
            color="emerald"
          />

          <SummaryCard
            title="Pending"
            value={statusCounts.pending}
            color="amber"
          />

          <SummaryCard
            title="Rejected"
            value={statusCounts.rejected}
            color="red"
          />
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <label
            htmlFor="tutorSearch"
            className="mb-2 block text-sm font-medium text-unitor-gray-dark"
          >
            Search tutors
          </label>

          <input
            id="tutorSearch"
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search by name, email, major or course"
            className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            {(
              [
                "approved",
                "pending",
                "rejected",
                "all",
              ] as TutorFilter[]
            ).map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                onClick={() =>
                  setFilter(filterValue)
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                  filter === filterValue
                    ? "bg-unitor-primary text-white"
                    : "border border-unitor-gray-light text-unitor-gray-dark"
                }`}
              >
                {filterValue}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading tutors...
            </p>
          </section>
        ) : filteredTutors.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📚</div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No tutors found
            </h2>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="bg-unitor-background text-left">
                  <tr>
                    <TableHeading>Tutor</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Courses</TableHeading>
                    <TableHeading>Rating</TableHeading>
                    <TableHeading>Earnings</TableHeading>
                    <TableHeading>Action</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-unitor-gray-soft">
                  {filteredTutors.map((tutor) => {
                    const rating =
                      getTutorRating(tutor.id);

                    const courses =
                      tutor.courses.length > 0
                        ? tutor.courses
                        : tutor.courseCodesToTeach
                            .split(",")
                            .map((course) =>
                              course.trim()
                            )
                            .filter(Boolean);

                    return (
                      <tr
                        key={tutor.id}
                        className="hover:bg-unitor-background"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {tutor.profileImageUrl ? (
                              <img
                                src={
                                  tutor.profileImageUrl
                                }
                                alt={tutor.fullName}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700">
                                {tutor.fullName
                                  .charAt(0)
                                  .toUpperCase() || "T"}
                              </div>
                            )}

                            <div>
                              <p className="font-medium text-unitor-black">
                                {tutor.fullName}
                              </p>

                              <p className="mt-1 text-sm text-unitor-gray-dark">
                                {tutor.universityEmail.toLowerCase()}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <TutorStatus
                            status={tutor.tutorStatus}
                          />
                        </td>

                        <td className="p-4 text-sm text-unitor-gray-dark">
                          {courses.length > 0
                            ? courses
                                .slice(0, 3)
                                .join(", ")
                            : "Not provided"}
                        </td>

                        <td className="p-4">
                          <p className="font-medium text-amber-500">
                            ★{" "}
                            {rating.count > 0
                              ? rating.average.toFixed(1)
                              : "0.0"}
                          </p>

                          <p className="text-xs text-unitor-gray-dark/70">
                            {rating.count} reviews
                          </p>
                        </td>

                        <td className="p-4 font-medium text-unitor-primary">
                          {formatMoney(
                            getTutorEarnings(tutor.id)
                          )}
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTutor(tutor)
                            }
                            className="rounded-lg border border-unitor-gray-light px-4 py-2 text-sm font-medium text-unitor-gray-dark hover:border-unitor-primary hover:text-unitor-primary"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {selectedTutor && (
        <TutorDetailsModal
          tutor={selectedTutor}
          rating={getTutorRating(selectedTutor.id)}
          earnings={getTutorEarnings(
            selectedTutor.id
          )}
          onClose={() => setSelectedTutor(null)}
        />
      )}
    </main>
  );
}

function TutorDetailsModal({
  tutor,
  rating,
  earnings,
  onClose,
}: {
  tutor: Tutor;
  rating: {
    average: number;
    count: number;
  };
  earnings: number;
  onClose: () => void;
}) {
  const courses =
    tutor.courses.length > 0
      ? tutor.courses
      : tutor.courseCodesToTeach
          .split(",")
          .map((course) => course.trim())
          .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-unitor-gray-light bg-white p-6">
          <h2 className="text-2xl font-bold text-unitor-black">
            Tutor details
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-3xl text-unitor-gray-dark"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4">
            {tutor.profileImageUrl ? (
              <img
                src={tutor.profileImageUrl}
                alt={tutor.fullName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 text-3xl font-bold text-purple-700">
                {tutor.fullName
                  .charAt(0)
                  .toUpperCase() || "T"}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-unitor-black">
                {tutor.fullName}
              </h3>

              <p className="mt-1 text-unitor-gray-dark">
                {tutor.universityEmail.toLowerCase()}
              </p>

              <div className="mt-2">
                <TutorStatus
                  status={tutor.tutorStatus}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InformationItem
              label="University ID"
              value={tutor.universityId}
            />

            <InformationItem
              label="University"
              value={tutor.universityName}
            />

            <InformationItem
              label="Major"
              value={tutor.major}
            />

            <InformationItem
              label="Semester"
              value={tutor.currentSemester}
            />

            <InformationItem
              label="CGPA"
              value={tutor.cgpa}
            />

            <InformationItem
              label="Phone"
              value={tutor.phoneNumber}
            />

            <InformationItem
              label="Rating"
              value={`${rating.average.toFixed(
                1
              )} from ${rating.count} reviews`}
            />

            <InformationItem
              label="Total earnings"
              value={formatMoney(earnings)}
            />
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-unitor-black">
              Courses
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <span
                    key={course}
                    className="rounded-full bg-unitor-background px-4 py-2 text-sm font-medium text-unitor-primary-hover"
                  >
                    {course}
                  </span>
                ))
              ) : (
                <p className="text-unitor-gray-dark">
                  No courses provided.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-unitor-black">
              Bio
            </h3>

            <p className="mt-3 leading-7 text-unitor-gray-dark">
              {tutor.bio || "No bio provided."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 rounded-lg bg-unitor-black px-6 py-3 font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorStatus({ status }: { status: string }) {
  const cleanStatus = status.toLowerCase();

  const style =
    cleanStatus === "approved"
      ? "bg-green-100 text-green-700"
      : cleanStatus === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${style}`}
    >
      {cleanStatus}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "emerald" | "amber" | "red";
}) {
  const styles = {
    emerald: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-medium ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-unitor-black">
        {value}
      </p>
    </article>
  );
}

function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="p-4 text-sm font-medium text-unitor-gray-dark">
      {children}
    </th>
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
      <p className="text-sm text-unitor-gray-dark">
        {label}
      </p>

      <p className="mt-1 font-medium text-unitor-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);
}
