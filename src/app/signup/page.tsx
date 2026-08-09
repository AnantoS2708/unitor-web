"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface SignupForm {
  fullName: string;
  universityEmail: string;
  universityId: string;
  major: string;
  currentSemester: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const initialForm: SignupForm = {
  fullName: "",
  universityEmail: "",
  universityId: "",
  major: "",
  currentSemester: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<SignupForm>(initialForm);

  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof SignupForm,
    value: string
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const email = form.universityEmail
      .trim()
      .toLowerCase();

    if (form.fullName.trim().length < 2) {
      setError("Please enter your complete name.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setCreating(true);

    let createdUser = null;

    try {
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          form.password
        );

      createdUser = credential.user;

      await setDoc(
        doc(firestore, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          fullName: form.fullName.trim(),
          universityEmail: email,
          universityId: form.universityId.trim(),
          universityName: "NSU",
          major: form.major.trim().toUpperCase(),
          currentSemester: form.currentSemester.trim(),
          phoneNumber: form.phoneNumber.trim(),
          country: "BD",
          bio: "",
          profileImageUrl: "",
          roles: ["student"],
          tutorStatus: "",
          emailVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      try {
        await sendEmailVerification(credential.user);
      } catch (verificationError) {
        console.error(
          "Verification email error:",
          verificationError
        );
      }

      router.push("/role-selection");
    } catch (error: unknown) {
      console.error("Signup error:", error);

      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (rollbackError) {
          console.error(
            "Account rollback error:",
            rollbackError
          );
        }
      }

      const firebaseError = error as {
        code?: string;
      };

      if (
        firebaseError.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "An account already exists with this email address."
        );
      } else if (
        firebaseError.code === "auth/invalid-email"
      ) {
        setError("Please enter a valid email address.");
      } else if (
        firebaseError.code === "auth/weak-password"
      ) {
        setError("Please choose a stronger password.");
      } else {
        setError(
          "Unable to create your account. Please try again."
        );
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:underline"
          >
            ← Back to login
          </Link>

          <h1 className="mt-8 text-3xl font-bold text-slate-900">
            Create your Unitor account
          </h1>

          <p className="mt-3 text-slate-600">
            Register as a student. You can apply to become a tutor
            after completing your profile.
          </p>

          {error && (
            <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </p>
          )}

          <form
            onSubmit={handleSignup}
            className="mt-8"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <SignupInput
                label="Full name"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(value) =>
                  updateField("fullName", value)
                }
                required
              />

              <SignupInput
                label="University email"
                type="email"
                placeholder="name@northsouth.edu"
                value={form.universityEmail}
                onChange={(value) =>
                  updateField("universityEmail", value)
                }
                autoComplete="email"
                required
              />

              <SignupInput
                label="University ID"
                placeholder="Enter your NSU ID"
                value={form.universityId}
                onChange={(value) =>
                  updateField("universityId", value)
                }
                required
              />

              <SignupInput
                label="Major"
                placeholder="Example: CSE"
                value={form.major}
                onChange={(value) =>
                  updateField("major", value)
                }
                required
              />

              <SignupInput
                label="Current semester"
                placeholder="Example: 8"
                value={form.currentSemester}
                onChange={(value) =>
                  updateField("currentSemester", value)
                }
                required
              />

              <SignupInput
                label="Phone number"
                type="tel"
                placeholder="Example: 01XXXXXXXXX"
                value={form.phoneNumber}
                onChange={(value) =>
                  updateField("phoneNumber", value)
                }
                autoComplete="tel"
                required
              />

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-20 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <SignupInput
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter the password again"
                value={form.confirmPassword}
                onChange={(value) =>
                  updateField("confirmPassword", value)
                }
                autoComplete="new-password"
                required
              />
            </div>

            <p className="mt-6 text-sm leading-6 text-slate-500">
              By creating an account, you agree to use Unitor only
              for legitimate academic guidance and peer-learning
              support.
            </p>

            <button
              type="submit"
              disabled={creating}
              className="mt-8 w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating
                ? "Creating account..."
                : "Create student account"}
            </button>
          </form>

          <p className="mt-7 text-center text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function SignupInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}