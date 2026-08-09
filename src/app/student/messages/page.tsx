"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Chat {
  id: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  proposalId: string;
  jobProposalId: string;
  paymentId: string;
  lastMessage: string;
  isActive: boolean;
  createdAt?: Timestamp;
  lastMessageAt?: Timestamp;
  expiresAt?: Timestamp;
}

export default function StudentMessagesPage() {
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeChats: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const chatsQuery = query(
          collection(firestore, "chats"),
          where("studentId", "==", user.uid)
        );

        unsubscribeChats = onSnapshot(
          chatsQuery,
          (snapshot) => {
            const chatList = snapshot.docs.map(
              (document) => {
                const data = document.data();

                return {
                  id: document.id,
                  tutorId: data.tutorId ?? "",
                  tutorName: data.tutorName ?? "Tutor",
                  studentId: data.studentId ?? "",
                  studentName: data.studentName ?? "",
                  proposalId: data.proposalId ?? "",
                  jobProposalId:
                    data.jobProposalId ?? "",
                  paymentId: data.paymentId ?? "",
                  lastMessage: data.lastMessage ?? "",
                  isActive: data.isActive ?? false,
                  createdAt: data.createdAt,
                  lastMessageAt: data.lastMessageAt,
                  expiresAt: data.expiresAt,
                } as Chat;
              }
            );

            chatList.sort((first, second) => {
              const firstTime =
                first.lastMessageAt?.toMillis?.() ??
                first.createdAt?.toMillis?.() ??
                0;

              const secondTime =
                second.lastMessageAt?.toMillis?.() ??
                second.createdAt?.toMillis?.() ??
                0;

              return secondTime - firstTime;
            });

            setChats(chatList);
            setError("");
            setLoading(false);
          },
          (error) => {
            console.error(
              "Chat loading error:",
              error
            );

            setError(
              "Unable to load your conversations."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeChats?.();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-emerald-600"
          >
            Unitor
          </Link>

          <Link
            href="/student/dashboard"
            className="font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div>
          <p className="font-semibold text-emerald-600">
            Conversations
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Messages
          </h1>

          <p className="mt-3 text-slate-600">
            Continue your active tutoring conversations.
          </p>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading conversations...
            </p>
          </div>
        )}

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          chats.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">💬</div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                No conversations yet
              </h2>

              <p className="mx-auto mt-3 max-w-md text-slate-600">
                Your conversations will appear after a
                tutor is selected and payment is approved.
              </p>

              <Link
                href="/student/proposals"
                className="mt-7 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                View proposals
              </Link>
            </section>
          )}

        {!loading && chats.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {chats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function ChatRow({ chat }: { chat: Chat }) {
  const firstLetter =
    chat.tutorName.charAt(0).toUpperCase() || "T";

  return (
    <Link
      href={`/student/messages/${chat.id}`}
      className="flex items-center gap-4 border-b border-slate-100 p-5 transition last:border-b-0 hover:bg-slate-50"
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
          {firstLetter}
        </div>

        <span
          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
            chat.isActive
              ? "bg-emerald-500"
              : "bg-slate-400"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4">
          <h2 className="truncate font-bold text-slate-900">
            {chat.tutorName}
          </h2>

          <span className="flex-shrink-0 text-xs text-slate-400">
            {formatMessageTime(chat.lastMessageAt)}
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-slate-600">
          {chat.lastMessage || "No messages yet"}
        </p>

        <p
          className={`mt-2 text-xs font-semibold ${
            chat.isActive
              ? "text-emerald-600"
              : "text-slate-500"
          }`}
        >
          {chat.isActive
            ? "Active session"
            : "Session ended"}
        </p>
      </div>

      <span className="text-xl text-slate-400">
        ›
      </span>
    </Link>
  );
}

function formatMessageTime(timestamp?: Timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString("en-BD", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
  });
}