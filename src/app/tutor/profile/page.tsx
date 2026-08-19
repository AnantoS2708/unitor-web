"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { UnitorBrand } from "@/components/UnitorBrand";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  auth,
  firestore,
  storage,
} from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

interface TutorProfile {
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
  tutorStatus: string;
  cgpa: string;

  /*
   * IMPORTANT:
   *
   * Use ONLY approved courses.
   */
  courseCodesToTeach: string[];
}

/* =========================================================
   PAGE
========================================================= */

export default function TutorProfilePage() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  /* =========================================================
     PROFILE
  ========================================================= */

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    profile,
    setProfile,
  ] =
    useState<TutorProfile | null>(
      null
    );

  /* =========================================================
     EDIT FORM
  ========================================================= */

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState("");

  const [
    country,
    setCountry,
  ] = useState("");

  const [
    bio,
    setBio,
  ] = useState("");

  const [
    cgpa,
    setCgpa,
  ] = useState("");

  /* =========================================================
     UI
  ========================================================= */

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {
    let unsubscribeProfile:
      | (() => void)
      | undefined;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.replace(
              "/login"
            );

            return;
          }

          setUserId(
            user.uid
          );

          unsubscribeProfile =
            onSnapshot(
              doc(
                firestore,
                "users",
                user.uid
              ),

              (snapshot) => {
                if (
                  !snapshot.exists()
                ) {
                  setError(
                    "Your profile could not be found."
                  );

                  setLoading(
                    false
                  );

                  return;
                }

                const data =
                  snapshot.data();

                /* =========================================
                   APPROVED COURSES

                   IMPORTANT:
                   USE ONLY courseCodesToTeach
                ========================================= */

                let approvedCourses:
                  string[] = [];

                if (
                  Array.isArray(
                    data.courseCodesToTeach
                  )
                ) {
                  approvedCourses =
                    data.courseCodesToTeach
                      .map(
                        (
                          course: unknown
                        ) =>
                          normalizeCourseCode(
                            String(
                              course
                            )
                          )
                      )
                      .filter(
                        Boolean
                      );
                } else if (
                  typeof data.courseCodesToTeach ===
                  "string"
                ) {
                  approvedCourses =
                    data.courseCodesToTeach
                      .split(",")
                      .map(
                        (
                          course: string
                        ) =>
                          normalizeCourseCode(
                            course
                          )
                      )
                      .filter(
                        Boolean
                      );
                }

                /*
                 * Remove duplicates.
                 *
                 * Example:
                 *
                 * ["CSE115", "CSE373", "CSE115"]
                 *
                 * becomes:
                 *
                 * ["CSE115", "CSE373"]
                 */

                approvedCourses =
                  Array.from(
                    new Set(
                      approvedCourses
                    )
                  );

                /* =========================================
                   PROFILE
                ========================================= */

                const loadedProfile:
                  TutorProfile = {
                  fullName:
                    String(
                      data.fullName ??
                        "Tutor"
                    ),

                  universityEmail:
                    String(
                      data.universityEmail ??
                        user.email ??
                        ""
                    ),

                  universityId:
                    String(
                      data.universityId ??
                        ""
                    ),

                  universityName:
                    String(
                      data.universityName ??
                        ""
                    ),

                  major:
                    String(
                      data.major ??
                        ""
                    ),

                  currentSemester:
                    String(
                      data.currentSemester ??
                        ""
                    ),

                  phoneNumber:
                    String(
                      data.phoneNumber ??
                        ""
                    ),

                  country:
                    String(
                      data.country ??
                        ""
                    ),

                  bio:
                    String(
                      data.bio ??
                        ""
                    ),

                  profileImageUrl:
                    String(
                      data.profileImageUrl ??
                        ""
                    ),

                  tutorStatus:
                    String(
                      data.tutorStatus ??
                        "pending"
                    ),

                  cgpa:
                    String(
                      data.cgpa ??
                        ""
                    ),

                  courseCodesToTeach:
                    approvedCourses,
                };

                setProfile(
                  loadedProfile
                );

                /* =========================================
                   EDIT VALUES
                ========================================= */

                setFullName(
                  loadedProfile.fullName
                );

                setPhoneNumber(
                  loadedProfile.phoneNumber
                );

                setCountry(
                  loadedProfile.country
                );

                setBio(
                  loadedProfile.bio
                );

                setCgpa(
                  loadedProfile.cgpa
                );

                setLoading(
                  false
                );
              },

              (
                profileError
              ) => {
                console.error(
                  "Tutor profile error:",
                  profileError
                );

                setError(
                  "Unable to load your profile."
                );

                setLoading(
                  false
                );
              }
            );
        }
      );

    return () => {
      unsubscribeAuth();

      unsubscribeProfile?.();
    };
  }, [router]);

  /* =========================================================
     PROFILE PHOTO
  ========================================================= */

  async function handlePhotoChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (
      !file ||
      !userId
    ) {
      return;
    }

    setError("");
    setSuccess("");

    /* -----------------------------------------
       IMAGE TYPE
    ----------------------------------------- */

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );

      return;
    }

    /* -----------------------------------------
       MAXIMUM 5MB
    ----------------------------------------- */

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "The image must be smaller than 5 MB."
      );

      return;
    }

    setUploadingPhoto(
      true
    );

    try {
      const imageReference =
        ref(
          storage,
          `profile_images/${userId}.jpg`
        );

      await uploadBytes(
        imageReference,
        file,
        {
          contentType:
            file.type,
        }
      );

      const imageUrl =
        await getDownloadURL(
          imageReference
        );

      await updateDoc(
        doc(
          firestore,
          "users",
          userId
        ),
        {
          profileImageUrl:
            imageUrl,
        }
      );

      setSuccess(
        "Profile photo updated successfully."
      );
    } catch (
      uploadError
    ) {
      console.error(
        "Photo upload error:",
        uploadError
      );

      setError(
        "Unable to upload your profile photo."
      );
    } finally {
      setUploadingPhoto(
        false
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  async function handleSave() {
    if (!userId) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !fullName.trim()
    ) {
      setError(
        "Full name is required."
      );

      return;
    }

    setSaving(
      true
    );

    try {
      await updateDoc(
        doc(
          firestore,
          "users",
          userId
        ),
        {
          fullName:
            fullName.trim(),

          phoneNumber:
            phoneNumber.trim(),

          country:
            country.trim(),

          bio:
            bio.trim(),

          cgpa:
            cgpa.trim(),
        }
      );

      setEditing(
        false
      );

      setSuccess(
        "Profile information updated successfully."
      );
    } catch (
      saveError
    ) {
      console.error(
        "Profile update error:",
        saveError
      );

      setError(
        "Unable to update your profile."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =========================================================
     CANCEL EDITING
  ========================================================= */

  function cancelEditing() {
    if (!profile) {
      return;
    }

    setFullName(
      profile.fullName
    );

    setPhoneNumber(
      profile.phoneNumber
    );

    setCountry(
      profile.country
    );

    setBio(
      profile.bio
    );

    setCgpa(
      profile.cgpa
    );

    setEditing(
      false
    );

    setError("");
    setSuccess("");
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">

        <p className="text-unitor-gray-dark">
          Loading tutor profile...
        </p>

      </main>
    );
  }

  /* =========================================================
     PROFILE NOT FOUND
  ========================================================= */

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">

        <div className="rounded-2xl border border-unitor-gray-light bg-white p-8 text-center shadow-sm">

          <p className="text-red-600">
            {error ||
              "Tutor profile not found."}
          </p>

          <Link
            href="/tutor/dashboard"
            className="mt-5 inline-block font-medium text-unitor-primary"
          >
            Return to dashboard
          </Link>

        </div>

      </main>
    );
  }

  /* =========================================================
     VALUES
  ========================================================= */

  const tutorStatus =
    profile.tutorStatus
      ?.trim()
      .toLowerCase() ||
    "pending";

  /*
   * IMPORTANT:
   *
   * The profile now uses ONLY
   * courseCodesToTeach.
   */

  const courses =
    profile.courseCodesToTeach;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-unitor-background">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-unitor-gray-light bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark transition hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* ===================================================
            PROFILE HEADER
        =================================================== */}

        <section className="rounded-2xl border border-unitor-gray-light bg-white p-8 shadow-sm">

          <div className="flex flex-col items-center gap-6 sm:flex-row">

            {/* PROFILE IMAGE */}

            <div className="relative">

              {profile.profileImageUrl ? (

                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profile.profileImageUrl
                  }
                  alt={
                    profile.fullName
                  }
                  className="h-32 w-32 rounded-full border-4 border-unitor-blue-light object-cover"
                />

              ) : (

                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-unitor-blue-light text-4xl font-bold text-unitor-primary-hover">

                  {profile.fullName
                    ?.charAt(0)
                    .toUpperCase() ||
                    "T"}

                </div>

              )}

              {uploadingPhoto && (

                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-center text-xs font-medium text-white">
                  Uploading...
                </div>

              )}

            </div>

            {/* PROFILE INFO */}

            <div className="flex-1 text-center sm:text-left">

              <h1 className="text-3xl font-bold text-unitor-black">
                {profile.fullName}
              </h1>

              <p className="mt-2 text-unitor-gray-dark">

                {profile.universityName ||
                  "University not provided"}

              </p>

              {/* STATUS */}

              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  tutorStatus ===
                  "approved"
                    ? "bg-green-100 text-green-700"
                    : tutorStatus ===
                        "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                Tutor status:{" "}
                {tutorStatus}
              </span>

              {/* BUTTONS */}

              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    uploadingPhoto
                  }
                  className="rounded-lg border border-unitor-primary bg-white px-5 py-2.5 font-medium text-unitor-primary-hover transition hover:bg-unitor-background disabled:opacity-60"
                >
                  {uploadingPhoto
                    ? "Uploading..."
                    : "Change photo"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(
                      true
                    );

                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-lg bg-unitor-primary px-5 py-2.5 font-medium text-white transition hover:bg-unitor-primary-hover"
                >
                  Edit profile
                </button>

              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*"
                onChange={
                  handlePhotoChange
                }
                className="hidden"
              />

            </div>

          </div>

        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
            {error}
          </div>

        )}

        {/* ===================================================
            SUCCESS
        =================================================== */}

        {success && (

          <div className="mt-6 rounded-xl border border-unitor-blue-light bg-unitor-background p-4 text-unitor-primary-hover">
            ✓ {success}
          </div>

        )}

        {/* ===================================================
            EDIT MODE
        =================================================== */}

        {editing ? (

          <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold text-unitor-black">
              Edit profile
            </h2>

            <p className="mt-2 text-sm text-unitor-gray-dark">
              Update your personal
              tutor information.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <ProfileInput
                label="Full name"
                value={
                  fullName
                }
                onChange={
                  setFullName
                }
              />

              <ProfileInput
                label="Phone number"
                value={
                  phoneNumber
                }
                onChange={
                  setPhoneNumber
                }
              />

              <ProfileInput
                label="Country"
                value={
                  country
                }
                onChange={
                  setCountry
                }
              />

              <ProfileInput
                label="CGPA"
                value={
                  cgpa
                }
                onChange={
                  setCgpa
                }
              />

              {/* BIO */}

              <div className="md:col-span-2">

                <label
                  htmlFor="bio"
                  className="mb-2 block font-medium text-unitor-gray-dark"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  rows={5}
                  value={
                    bio
                  }
                  onChange={(
                    event
                  ) =>
                    setBio(
                      event.target.value
                    )
                  }
                  placeholder="Tell students about your experience"
                  className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark/70 focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
                />

              </div>

            </div>

            {/* EDIT BUTTONS */}

            <div className="mt-6 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={
                  handleSave
                }
                disabled={
                  saving
                }
                className="rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white transition hover:bg-unitor-primary-hover disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>

              <button
                type="button"
                onClick={
                  cancelEditing
                }
                disabled={
                  saving
                }
                className="rounded-lg border border-unitor-gray-light px-6 py-3 font-medium text-unitor-gray-dark transition hover:bg-unitor-background"
              >
                Cancel
              </button>

            </div>

          </section>

        ) : (

          <>

            {/* =================================================
                TUTOR INFORMATION
            ================================================= */}

            <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-unitor-black">
                Tutor information
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">

                <InformationItem
                  label="Email"
                  value={
                    profile.universityEmail
                      ?.toLowerCase()
                  }
                />

                <InformationItem
                  label="University ID"
                  value={
                    profile.universityId
                  }
                />

                <InformationItem
                  label="University"
                  value={
                    profile.universityName
                  }
                />

                <InformationItem
                  label="Major"
                  value={
                    profile.major
                  }
                />

                <InformationItem
                  label="Current semester"
                  value={
                    profile.currentSemester
                  }
                />

                <InformationItem
                  label="CGPA"
                  value={
                    profile.cgpa
                  }
                />

                <InformationItem
                  label="Phone number"
                  value={
                    profile.phoneNumber
                  }
                />

                <InformationItem
                  label="Country"
                  value={
                    profile.country
                  }
                />

              </div>

            </section>

            {/* =================================================
                ABOUT ME
            ================================================= */}

            <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-unitor-black">
                About me
              </h2>

              <p className="mt-4 leading-7 text-unitor-gray-dark">

                {profile.bio ||
                  "No bio has been added yet."}

              </p>

            </section>

            {/* =================================================
                APPROVED COURSES
            ================================================= */}

            <section className="mt-8 rounded-2xl border border-unitor-gray-light bg-white p-8 shadow-sm">

              <div>

                <p className="text-sm font-medium text-unitor-primary">
                  Approved teaching courses
                </p>

                <h2 className="mt-1 text-2xl font-bold text-unitor-black">
                  Courses You Can Teach
                </h2>

              </div>

              {courses.length >
              0 ? (

                <div className="mt-5 flex flex-wrap gap-3">

                  {courses.map(
                    (
                      course
                    ) => (

                      <span
                        key={
                          course
                        }
                        className="rounded-full border border-unitor-blue-light bg-unitor-background px-4 py-2 font-medium text-unitor-primary-hover"
                      >
                        {course}
                      </span>

                    )
                  )}

                </div>

              ) : (

                <p className="mt-4 text-unitor-gray-dark">
                  No courses have
                  been approved yet.
                </p>

              )}

            </section>

          </>

        )}

      </div>

    </main>
  );
}

/* =========================================================
   PROFILE INPUT
========================================================= */

function ProfileInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange:
    (value: string) =>
      void;
}) {
  const inputId =
    label
      .toLowerCase()
      .replaceAll(
        " ",
        "-"
      );

  return (
    <div>

      <label
        htmlFor={
          inputId
        }
        className="mb-2 block font-medium text-unitor-gray-dark"
      >
        {label}
      </label>

      <input
        id={
          inputId
        }
        type="text"
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-unitor-gray-light px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark/70 focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
      />

    </div>
  );
}

/* =========================================================
   INFORMATION ITEM
========================================================= */

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

/* =========================================================
   NORMALIZE COURSE CODE
========================================================= */

function normalizeCourseCode(
  courseCode: string
) {
  return courseCode
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();
}
