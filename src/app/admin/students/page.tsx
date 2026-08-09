"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Student {
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
  profileImageUrl: string;
  emailVerified: boolean;
  roles: string[];
  createdAt?: Timestamp;
}

export default function AdminStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeStudents: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        const email =
          user?.email?.toLowerCase() ?? "";

        if (!user || email !== ADMIN_EMAIL) {
          router.replace("/admin/login");
          return;
        }

        unsubscribeStudents = onSnapshot(
          collection(firestore, "users"),
          (snapshot) => {
            const studentList = snapshot.docs
              .map((userDocument) => {
                const data = userDocument.data();

                const roles = Array.isArray(data.roles)
                  ? data.roles
                  : [];

                return {
                  id: userDocument.id,
                  uid: data.uid ?? userDocument.id,
                  fullName:
                    data.fullName ?? "Unknown student",
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
                  profileImageUrl:
                    data.profileImageUrl ?? "",
                  emailVerified:
                    data.emailVerified ?? false,
                  roles,
                  createdAt: data.createdAt,
                } as Student;
              })
              .filter((userRecord) =>
                userRecord.roles.includes("student")
              );

            studentList.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis?.() ?? 0;

              const secondTime =
                second.createdAt?.toMillis?.() ?? 0;

              return secondTime - firstTime;
            });

            setStudents(studentList);

            setSelectedStudent((currentStudent) => {
              if (!currentStudent) {
                return null;
              }

              return (
                studentList.find(
                  (student) =>
                    student.id === currentStudent.id
                ) ?? null
              );
            });

            setError("");
            setLoading(false);
          },
          (loadError) => {
            console.error(
              "Admin student loading error:",
              loadError
            );

            setError("Unable to load students.");
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeStudents?.();
    };
  }, [router]);

  const filteredStudents = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return students;
    }

    return students.filter((student) => {
      return (
        student.fullName.toLowerCase().includes(search) ||
        student.universityEmail
          .toLowerCase()
          .includes(search) ||
        student.universityId
          .toLowerCase()
          .includes(search) ||
        student.major.toLowerCase().includes(search) ||
        student.universityName
          .toLowerCase()
          .includes(search)
      );
    });
  }, [searchText, students]);

  const verifiedCount = useMemo(
    () =>
      students.filter(
        (student) => student.emailVerified
      ).length,
    [students]
  );

  const tutorStudentCount = useMemo(
    () =>
      students.filter((student) =>
        student.roles.includes("tutor")
      ).length,
    [students]
  );

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
        <p className="font-semibold text-emerald-600">
          User management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Students
        </h1>

        <p className="mt-3 text-slate-600">
          View registered students and their account
          information.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total students"
            value={students.length}
            color="blue"
          />

          <SummaryCard
            title="Verified emails"
            value={verifiedCount}
            color="emerald"
          />

          <SummaryCard
            title="Also registered as tutors"
            value={tutorStudentCount}
            color="purple"
          />
        </section>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <label
            htmlFor="studentSearch"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Search students
          </label>

          <input
            id="studentSearch"
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search by name, email, university ID or major"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </section>

        {loading ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading students...
            </p>
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🎓</div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              No students found
            </h2>

            <p className="mt-3 text-slate-600">
              Try another search term.
            </p>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <TableHeading>Student</TableHeading>
                    <TableHeading>University ID</TableHeading>
                    <TableHeading>Major</TableHeading>
                    <TableHeading>Semester</TableHeading>
                    <TableHeading>Account</TableHeading>
                    <TableHeading>Action</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {student.profileImageUrl ? (
                            <img
                              src={student.profileImageUrl}
                              alt={student.fullName}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                              {student.fullName
                                .charAt(0)
                                .toUpperCase() || "S"}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-900">
                              {student.fullName}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {student.universityEmail.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      <TableData>
                        {student.universityId ||
                          "Not provided"}
                      </TableData>

                      <TableData>
                        {student.major || "Not provided"}
                      </TableData>

                      <TableData>
                        {student.currentSemester ||
                          "Not provided"}
                      </TableData>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              student.emailVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {student.emailVerified
                              ? "Verified"
                              : "Not verified"}
                          </span>

                          {student.roles.includes(
                            "tutor"
                          ) && (
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                              Tutor
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudent(student)
                          }
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-600"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && filteredStudents.length > 0 && (
          <p className="mt-4 text-sm text-slate-500">
            Showing {filteredStudents.length} of{" "}
            {students.length} students
          </p>
        )}
      </div>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </main>
  );
}

function StudentDetailsModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Student details
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4">
            {student.profileImageUrl ? (
              <img
                src={student.profileImageUrl}
                alt={student.fullName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                {student.fullName
                  .charAt(0)
                  .toUpperCase() || "S"}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {student.fullName}
              </h3>

              <p className="mt-1 text-slate-600">
                {student.universityEmail.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <InformationItem
              label="University ID"
              value={student.universityId}
            />

            <InformationItem
              label="University"
              value={student.universityName}
            />

            <InformationItem
              label="Major"
              value={student.major}
            />

            <InformationItem
              label="Current semester"
              value={student.currentSemester}
            />

            <InformationItem
              label="Phone number"
              value={student.phoneNumber}
            />

            <InformationItem
              label="Country"
              value={student.country}
            />

            <InformationItem
              label="Email status"
              value={
                student.emailVerified
                  ? "Verified"
                  : "Not verified"
              }
            />

            <InformationItem
              label="Joined"
              value={formatDate(student.createdAt)}
            />
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-slate-900">
              Bio
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
              {student.bio || "No bio provided."}
            </p>
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-slate-900">
              Account roles
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {student.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold capitalize text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "blue" | "emerald" | "purple";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <span
        className={`rounded-lg px-3 py-1 text-sm font-semibold ${styles[color]}`}
      >
        {title}
      </span>

      <p className="mt-5 text-3xl font-bold text-slate-900">
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
    <th className="p-4 text-sm font-semibold text-slate-600">
      {children}
    </th>
  );
}

function TableData({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="p-4 text-sm text-slate-700">
      {children}
    </td>
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