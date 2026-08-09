"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, firestore, storage } from "@/lib/firebase";

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
  cgpa?: string;
  courseCodesToTeach?: string;
  courses?: string[];
}

export default function TutorProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<TutorProfile | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [cgpa, setCgpa] = useState("");

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.uid);

      unsubscribeProfile = onSnapshot(
        doc(firestore, "users", user.uid),
        (snapshot) => {
          if (!snapshot.exists()) {
            setError("Your profile could not be found.");
            setLoading(false);
            return;
          }

          const data = snapshot.data() as TutorProfile;

          setProfile(data);
          setFullName(data.fullName ?? "");
          setPhoneNumber(data.phoneNumber ?? "");
          setCountry(data.country ?? "");
          setBio(data.bio ?? "");
          setCgpa(data.cgpa ?? "");
          setLoading(false);
        },
        (profileError) => {
          console.error("Tutor profile error:", profileError);
          setError("Unable to load your profile.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, [router]);

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !userId) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be smaller than 5 MB.");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const imageReference = ref(
        storage,
        `profile_images/${userId}.jpg`
      );

      await uploadBytes(imageReference, file, {
        contentType: file.type,
      });

      const imageUrl = await getDownloadURL(imageReference);

      await updateDoc(doc(firestore, "users", userId), {
        profileImageUrl: imageUrl,
      });

      setSuccess("Profile photo updated successfully.");
    } catch (uploadError) {
      console.error("Photo upload error:", uploadError);
      setError("Unable to upload your profile photo.");
    } finally {
      setUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSave() {
    if (!userId) {
      return;
    }

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateDoc(doc(firestore, "users", userId), {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        country: country.trim(),
        bio: bio.trim(),
        cgpa: cgpa.trim(),
      });

      setEditing(false);
      setSuccess("Profile information updated successfully.");
    } catch (saveError) {
      console.error("Profile update error:", saveError);
      setError("Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (!profile) {
      return;
    }

    setFullName(profile.fullName ?? "");
    setPhoneNumber(profile.phoneNumber ?? "");
    setCountry(profile.country ?? "");
    setBio(profile.bio ?? "");
    setCgpa(profile.cgpa ?? "");
    setEditing(false);
    setError("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading tutor profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">
            {error || "Tutor profile not found."}
          </p>

          <Link
            href="/tutor/dashboard"
            className="mt-5 inline-block font-semibold text-emerald-600"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const tutorStatus = profile.tutorStatus?.toLowerCase() || "pending";

  const courses =
    profile.courses?.length
      ? profile.courses
      : profile.courseCodesToTeach
          ?.split(",")
          .map((course) => course.trim())
          .filter(Boolean) ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.fullName}
                  className="h-32 w-32 rounded-full border-4 border-emerald-100 object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-100 text-4xl font-bold text-emerald-700">
                  {profile.fullName?.charAt(0).toUpperCase() || "T"}
                </div>
              )}

              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-center text-xs font-semibold text-white">
                  Uploading...
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-slate-900">
                {profile.fullName}
              </h1>

              <p className="mt-2 text-slate-600">
                {profile.universityName || "University not provided"}
              </p>

              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                  tutorStatus === "approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : tutorStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                Tutor status: {tutorStatus}
              </span>

              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploadingPhoto ? "Uploading..." : "Change photo"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700"
                >
                  Edit profile
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>
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

        {editing ? (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Edit profile
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <ProfileInput
                label="Full name"
                value={fullName}
                onChange={setFullName}
              />

              <ProfileInput
                label="Phone number"
                value={phoneNumber}
                onChange={setPhoneNumber}
              />

              <ProfileInput
                label="Country"
                value={country}
                onChange={setCountry}
              />

              <ProfileInput
                label="CGPA"
                value={cgpa}
                onChange={setCgpa}
              />

              <div className="md:col-span-2">
                <label
                  htmlFor="bio"
                  className="mb-2 block font-medium text-slate-700"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  rows={5}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell students about your experience"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Tutor information
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <InformationItem
                  label="Email"
                  value={profile.universityEmail?.toLowerCase()}
                />

                <InformationItem
                  label="University ID"
                  value={profile.universityId}
                />

                <InformationItem
                  label="University"
                  value={profile.universityName}
                />

                <InformationItem
                  label="Major"
                  value={profile.major}
                />

                <InformationItem
                  label="Current semester"
                  value={profile.currentSemester}
                />

                <InformationItem
                  label="CGPA"
                  value={profile.cgpa}
                />

                <InformationItem
                  label="Phone number"
                  value={profile.phoneNumber}
                />

                <InformationItem
                  label="Country"
                  value={profile.country}
                />
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                About me
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                {profile.bio || "No bio has been added yet."}
              </p>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Courses to teach
              </h2>

              {courses.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {courses.map((course) => (
                    <span
                      key={course}
                      className="rounded-full bg-blue-50 px-4 py-2 font-semibold text-blue-700"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-slate-600">
                  No courses have been added.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
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
    <div className="border-b border-slate-100 pb-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-1 font-medium text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}