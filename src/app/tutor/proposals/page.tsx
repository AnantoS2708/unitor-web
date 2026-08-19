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
  Timestamp,
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

interface Proposal {
  id: string;
  title: string;
  courseCode: string;
  facultyInitial: string;
  problemTopics: string;
  description: string;
  budget: number;
  estimatedHours: number;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  university: string;
  universityName: string;
  studentId: string;
  studentName: string;
  status: string;
  paymentStatus: string;
  selectedTutorId: string;
  willingToTeach: number;
  tags: string[];
  createdAt?: Timestamp;
}

interface TutorProfile {
  fullName: string;
  tutorStatus: string;
  roles: string[];
  courseCodesToTeach: string[];
}

export default function TutorProposalsPage() {
  const router = useRouter();

  const [tutor, setTutor] =
    useState<TutorProfile | null>(null);

  const [proposals, setProposals] = useState<
    Proposal[]
  >([]);

  const [selectedProposal, setSelectedProposal] =
    useState<Proposal | null>(null);

  const [searchText, setSearchText] = useState("");

  const [loadingTutor, setLoadingTutor] =
    useState(true);

  const [loadingProposals, setLoadingProposals] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeTutor:
      | (() => void)
      | undefined;

    let unsubscribeProposals:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        /*
         * ---------------------------------------------------
         * REAL-TIME TUTOR PROFILE
         *
         * IMPORTANT:
         * We use ONLY courseCodesToTeach.
         * We do NOT use old "courses" or
         * requestedCourseCodes.
         * ---------------------------------------------------
         */
        unsubscribeTutor = onSnapshot(
          doc(
            firestore,
            "users",
            user.uid
          ),
          (userSnapshot) => {
            if (!userSnapshot.exists()) {
              setError(
                "Your account could not be found."
              );
              setLoadingTutor(false);
              return;
            }

            const userData =
              userSnapshot.data();

            const roles = Array.isArray(
              userData.roles
            )
              ? userData.roles.map(
                  (role: unknown) =>
                    String(role)
                )
              : [];

            const tutorStatus =
              String(
                userData.tutorStatus ?? ""
              )
                .trim()
                .toLowerCase();

            /*
             * Only approved tutors can access
             * tutor proposals.
             */
            if (
              !roles.includes("tutor") ||
              tutorStatus !== "approved"
            ) {
              router.replace(
                "/student/profile"
              );
              return;
            }

            /*
             * STRICT APPROVED COURSE LIST.
             *
             * Do not read:
             * - requestedCourseCodes
             * - courses
             *
             * Only admin-approved:
             * courseCodesToTeach
             */
            let approvedCourses: string[] = [];

            if (
              Array.isArray(
                userData.courseCodesToTeach
              )
            ) {
              approvedCourses =
                userData.courseCodesToTeach
                  .map(
                    (course: unknown) =>
                      normalizeCourseCode(
                        String(course)
                      )
                  )
                  .filter(Boolean);
            } else if (
              typeof userData.courseCodesToTeach ===
              "string"
            ) {
              approvedCourses =
                userData.courseCodesToTeach
                  .split(",")
                  .map((course: string) =>
                    normalizeCourseCode(
                      course
                    )
                  )
                  .filter(Boolean);
            }

            /*
             * Remove duplicate courses.
             */
            approvedCourses =
              Array.from(
                new Set(
                  approvedCourses
                )
              );

            setTutor({
              fullName:
                userData.fullName ??
                "Tutor",

              tutorStatus,

              roles,

              courseCodesToTeach:
                approvedCourses,
            });

            setLoadingTutor(false);
          },
          (profileError) => {
            console.error(
              "Tutor profile loading error:",
              profileError
            );

            setError(
              "Unable to load your approved tutor courses."
            );

            setLoadingTutor(false);
          }
        );

        /*
         * ---------------------------------------------------
         * REAL-TIME PROPOSALS
         * ---------------------------------------------------
         */
        unsubscribeProposals =
          onSnapshot(
            collection(
              firestore,
              "proposals"
            ),
            (snapshot) => {
              const proposalList =
                snapshot.docs.map(
                  (
                    proposalDocument
                  ) => {
                    const data =
                      proposalDocument.data();

                    return {
                      id:
                        proposalDocument.id,

                      title:
                        data.title ??
                        "Tutoring request",

                      courseCode:
                        String(
                          data.courseCode ??
                            ""
                        ),

                      facultyInitial:
                        data.facultyInitial ??
                        "",

                      problemTopics:
                        data.problemTopics ??
                        "",

                      description:
                        data.description ??
                        "",

                      budget:
                        Number(
                          data.budget ?? 0
                        ),

                      estimatedHours:
                        Number(
                          data.estimatedHours ??
                            0
                        ),

                      dateFrom:
                        data.dateFrom ??
                        "",

                      dateTo:
                        data.dateTo ??
                        "",

                      timeFrom:
                        data.timeFrom ??
                        "",

                      timeTo:
                        data.timeTo ??
                        "",

                      university:
                        data.university ??
                        "",

                      universityName:
                        data.universityName ??
                        "",

                      studentId:
                        data.studentId ??
                        "",

                      studentName:
                        data.studentName ??
                        "Student",

                      status:
                        data.status ??
                        "open",

                      paymentStatus:
                        data.paymentStatus ??
                        "",

                      selectedTutorId:
                        data.selectedTutorId ??
                        "",

                      willingToTeach:
                        Number(
                          data.willingToTeach ??
                            0
                        ),

                      tags:
                        Array.isArray(
                          data.tags
                        )
                          ? data.tags
                          : [],

                      createdAt:
                        data.createdAt,
                    } as Proposal;
                  }
                );

              proposalList.sort(
                (
                  first,
                  second
                ) => {
                  const firstTime =
                    first.createdAt
                      ?.toMillis?.() ??
                    0;

                  const secondTime =
                    second.createdAt
                      ?.toMillis?.() ??
                    0;

                  return (
                    secondTime -
                    firstTime
                  );
                }
              );

              setProposals(
                proposalList
              );

              setLoadingProposals(
                false
              );

              setError("");
            },
            (proposalError) => {
              console.error(
                "Tutor proposals loading error:",
                proposalError
              );

              setError(
                "Unable to load tutoring proposals."
              );

              setLoadingProposals(
                false
              );
            }
          );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeTutor?.();
      unsubscribeProposals?.();
    };
  }, [router]);

  /*
   * ---------------------------------------------------------
   * STRICT COURSE FILTER
   * ---------------------------------------------------------
   *
   * Example:
   *
   * courseCodesToTeach:
   * ["CSE115", "CSE215"]
   *
   * Proposal CSE115 -> SHOW
   * Proposal CSE215 -> SHOW
   * Proposal CSE225 -> HIDE
   * Proposal ENG111 -> HIDE
   */
  const matchingProposals =
    useMemo(() => {
      if (!tutor) {
        return [];
      }

      const approvedCourseSet =
        new Set(
          tutor.courseCodesToTeach.map(
            (course) =>
              normalizeCourseCode(
                course
              )
          )
        );

      /*
       * No approved courses means
       * absolutely no proposals.
       */
      if (
        approvedCourseSet.size === 0
      ) {
        return [];
      }

      return proposals.filter(
        (proposal) => {
          const proposalCourse =
            normalizeCourseCode(
              proposal.courseCode
            );

          /*
           * EXACT MATCH ONLY
           */
          if (
            !approvedCourseSet.has(
              proposalCourse
            )
          ) {
            return false;
          }

          const status =
            proposal.status
              .trim()
              .toLowerCase();

          /*
           * Only proposals currently
           * available to tutors.
           */
          const isAvailable =
            status === "open" ||
            status === "available" ||
            status === "active";

          return isAvailable;
        }
      );
    }, [
      proposals,
      tutor,
    ]);

  /*
   * ---------------------------------------------------------
   * SEARCH
   *
   * Search happens AFTER approved-course filtering.
   * Therefore search can never reveal another subject.
   * ---------------------------------------------------------
   */
  const filteredProposals =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return matchingProposals;
      }

      return matchingProposals.filter(
        (proposal) =>
          proposal.courseCode
            .toLowerCase()
            .includes(search) ||
          proposal.title
            .toLowerCase()
            .includes(search) ||
          proposal.problemTopics
            .toLowerCase()
            .includes(search) ||
          proposal.description
            .toLowerCase()
            .includes(search)
      );
    }, [
      matchingProposals,
      searchText,
    ]);

  if (
    loadingTutor ||
    loadingProposals
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">

        <p className="text-unitor-gray-dark">
          Loading tutoring proposals...
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-unitor-background">

      {/* HEADER */}

      <header className="border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            Tutor Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="font-medium text-unitor-primary">
              Tutor opportunities
            </p>

            <h1 className="mt-2 text-3xl font-bold text-unitor-black">
              Available Proposals
            </h1>

            <p className="mt-3 max-w-2xl text-unitor-gray-dark">
              Only proposals for courses approved by the
              administrator are shown here.
            </p>

          </div>

          {/* APPROVED COURSES */}

          <div className="rounded-xl bg-unitor-background px-5 py-3">

            <p className="text-xs font-medium uppercase tracking-wide text-unitor-primary">
              Your approved courses
            </p>

            <p className="mt-1 font-bold text-unitor-black">
              {tutor?.courseCodesToTeach
                .join(", ") ||
                "No courses assigned"}
            </p>

          </div>

        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {/* NO APPROVED COURSES */}

        {tutor &&
        tutor.courseCodesToTeach
          .length === 0 ? (

          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              📚
            </div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No courses assigned
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-unitor-gray-dark">
              You currently have no administrator-approved
              courses to teach.
            </p>

          </section>

        ) : (
          <>

            {/* SEARCH */}

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">

              <label
                htmlFor="proposalSearch"
                className="mb-2 block text-sm font-medium text-unitor-gray-dark"
              >
                Search proposals
              </label>

              <input
                id="proposalSearch"
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Search by course, topic or title"
                className="w-full rounded-lg border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark/70 focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
              />

            </section>

            {/* NUMBER OF RESULTS */}

            <div className="mt-6">

              <p className="text-sm text-unitor-gray-dark">
                {filteredProposals.length}{" "}
                matching{" "}
                {filteredProposals.length === 1
                  ? "proposal"
                  : "proposals"}
              </p>

            </div>

            {filteredProposals.length ===
            0 ? (

              <section className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">

                <div className="text-5xl">
                  📝
                </div>

                <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                  No matching proposals
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-unitor-gray-dark">
                  There are currently no available proposals
                  for your approved courses.
                </p>

              </section>

            ) : (

              <section className="mt-6 grid gap-5 md:grid-cols-2">

                {filteredProposals.map(
                  (proposal) => (

                    <article
                      key={proposal.id}
                      className="rounded-2xl border border-unitor-gray-light bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <span className="inline-flex rounded-full bg-unitor-background px-3 py-1 text-sm font-bold text-unitor-primary-hover">
                            {proposal.courseCode}
                          </span>

                          <h2 className="mt-4 text-xl font-bold text-unitor-black">
                            {proposal.title}
                          </h2>

                        </div>

                        <span className="rounded-full bg-unitor-background px-3 py-1 text-xs font-medium capitalize text-unitor-primary-hover">
                          {proposal.status}
                        </span>

                      </div>

                      {proposal.problemTopics && (
                        <p className="mt-4 text-sm font-medium text-unitor-gray-dark">
                          Topic:{" "}
                          {proposal.problemTopics}
                        </p>
                      )}

                      <p className="mt-3 line-clamp-3 leading-6 text-unitor-gray-dark">
                        {proposal.description ||
                          "No description provided."}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-unitor-gray-soft pt-5">

                        <InfoBox
                          label="Budget"
                          value={formatMoney(
                            proposal.budget
                          )}
                        />

                        <InfoBox
                          label="Hours"
                          value={String(
                            proposal.estimatedHours ||
                              0
                          )}
                        />

                        <InfoBox
                          label="Date"
                          value={
                            proposal.dateFrom ||
                            "Not provided"
                          }
                        />

                        <InfoBox
                          label="Time"
                          value={
                            proposal.timeFrom ||
                            "Not provided"
                          }
                        />

                      </div>

                      <div className="mt-6 flex items-center justify-between">

                        <div>

                          <p className="text-xs text-unitor-gray-dark/70">
                            Student
                          </p>

                          <p className="mt-1 text-sm font-medium text-unitor-gray-dark">
                            {proposal.studentName}
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProposal(
                              proposal
                            )
                          }
                          className="rounded-lg bg-unitor-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-unitor-primary-hover"
                        >
                          View details
                        </button>

                      </div>

                    </article>

                  )
                )}

              </section>
            )}

          </>
        )}

      </div>

      {selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          onClose={() =>
            setSelectedProposal(null)
          }
        />
      )}

    </main>
  );
}

function ProposalDetailsModal({
  proposal,
  onClose,
}: {
  proposal: Proposal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10">

      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="sticky top-0 flex items-center justify-between border-b border-unitor-gray-light bg-white p-6">

          <div>

            <span className="inline-flex rounded-full bg-unitor-background px-3 py-1 text-sm font-bold text-unitor-primary-hover">
              {proposal.courseCode}
            </span>

            <h2 className="mt-3 text-2xl font-bold text-unitor-black">
              {proposal.title}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-gray-soft text-2xl text-unitor-gray-dark hover:bg-unitor-gray-light"
          >
            ×
          </button>

        </div>

        <div className="p-6">

          <div className="grid gap-5 sm:grid-cols-2">

            <InformationItem
              label="Student"
              value={proposal.studentName}
            />

            <InformationItem
              label="Faculty initial"
              value={proposal.facultyInitial}
            />

            <InformationItem
              label="Problem topics"
              value={proposal.problemTopics}
            />

            <InformationItem
              label="Budget"
              value={formatMoney(
                proposal.budget
              )}
            />

            <InformationItem
              label="Estimated hours"
              value={String(
                proposal.estimatedHours ||
                  0
              )}
            />

            <InformationItem
              label="Starting date"
              value={proposal.dateFrom}
            />

            <InformationItem
              label="Ending date"
              value={proposal.dateTo}
            />

            <InformationItem
              label="Starting time"
              value={proposal.timeFrom}
            />

            <InformationItem
              label="Ending time"
              value={proposal.timeTo}
            />

            <InformationItem
              label="Interested tutors"
              value={String(
                proposal.willingToTeach ||
                  0
              )}
            />

          </div>

          <div className="mt-8">

            <h3 className="font-bold text-unitor-black">
              Description
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-unitor-gray-dark">
              {proposal.description ||
                "No description provided."}
            </p>

          </div>

          {proposal.tags.length > 0 && (

            <div className="mt-8">

              <h3 className="font-bold text-unitor-black">
                Tags
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">

                {proposal.tags.map(
                  (tag, index) => (

                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full bg-unitor-gray-soft px-4 py-2 text-sm font-medium text-unitor-gray-dark"
                    >
                      {tag}
                    </span>

                  )
                )}

              </div>

            </div>

          )}

          <div className="mt-8 border-t border-unitor-gray-light pt-6">

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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-medium text-unitor-gray-dark/70">
        {label}
      </p>

      <p className="mt-1 font-medium text-unitor-black">
        {value}
      </p>

    </div>
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
        {value ||
          "Not provided"}
      </p>

    </div>
  );
}

/*
 * Normalization:
 *
 * "CSE 115" -> "CSE115"
 * "cse115"  -> "CSE115"
 * " CSE115 " -> "CSE115"
 */
function normalizeCourseCode(
  courseCode: string
) {
  return courseCode
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    }
  ).format(amount);
}