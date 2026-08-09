"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Chat {
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  isActive: boolean;
  lastMessage: string;
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  sentAt?: Timestamp;
}

export default function StudentChatPage() {
  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;

  const messagesEndReference =
    useRef<HTMLDivElement | null>(null);

  const [currentUserId, setCurrentUserId] = useState("");
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeMessages: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setCurrentUserId(user.uid);

        const chatReference = doc(
          firestore,
          "chats",
          chatId
        );

        unsubscribeChat = onSnapshot(
          chatReference,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("This conversation could not be found.");
              setLoading(false);
              return;
            }

            const data = snapshot.data();

            const isParticipant =
              data.studentId === user.uid ||
              data.tutorId === user.uid;

            if (!isParticipant) {
              setError(
                "You do not have permission to view this conversation."
              );
              setLoading(false);
              return;
            }

            setChat({
              studentId: data.studentId ?? "",
              studentName: data.studentName ?? "Student",
              tutorId: data.tutorId ?? "",
              tutorName: data.tutorName ?? "Tutor",
              isActive: data.isActive ?? false,
              lastMessage: data.lastMessage ?? "",
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            });

            setError("");
            setLoading(false);
          },
          (error) => {
            console.error("Chat loading error:", error);
            setError("Unable to load this conversation.");
            setLoading(false);
          }
        );

        const messagesQuery = query(
          collection(
            firestore,
            "chats",
            chatId,
            "messages"
          ),
          orderBy("sentAt", "asc")
        );

        unsubscribeMessages = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const messageList = snapshot.docs.map(
              (document) => {
                const data = document.data();

                return {
                  id: document.id,
                  senderId: data.senderId ?? "",
                  text: data.text ?? "",
                  sentAt: data.sentAt,
                } as Message;
              }
            );

            setMessages(messageList);
          },
          (error) => {
            console.error(
              "Messages loading error:",
              error
            );

            setError("Unable to load messages.");
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeChat?.();
      unsubscribeMessages?.();
    };
  }, [chatId, router]);

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sessionExpired =
    chat?.expiresAt &&
    chat.expiresAt.toDate().getTime() <= Date.now();

  const canSend =
    Boolean(chat?.isActive) && !sessionExpired;

  async function handleSendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanMessage = messageText.trim();

    if (
      !cleanMessage ||
      !currentUserId ||
      !chat ||
      !canSend
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const chatReference = doc(
        firestore,
        "chats",
        chatId
      );

      const messageReference = doc(
        collection(
          firestore,
          "chats",
          chatId,
          "messages"
        )
      );

      const batch = writeBatch(firestore);

      /*
       * These exact fields match the Flutter message
       * document structure.
       */
      batch.set(messageReference, {
        senderId: currentUserId,
        text: cleanMessage,
        sentAt: serverTimestamp(),
      });

      batch.update(chatReference, {
        lastMessage: cleanMessage,
        lastMessageAt: serverTimestamp(),
      });

      await batch.commit();

      setMessageText("");
    } catch (error) {
      console.error("Message sending error:", error);

      setError(
        "Unable to send the message. Check your connection and permissions."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading conversation...
        </p>
      </main>
    );
  }

  if (error && !chat) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">
            Chat unavailable
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <Link
            href="/student/messages"
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white"
          >
            Return to messages
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      {/* Chat header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-4">
          <Link
            href="/student/messages"
            className="text-2xl text-slate-600 hover:text-emerald-600"
            aria-label="Return to messages"
          >
            ←
          </Link>

          <div className="relative flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-600">
              {chat?.tutorName
                .charAt(0)
                .toUpperCase() || "T"}
            </div>

            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                canSend
                  ? "bg-emerald-500"
                  : "bg-slate-400"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-slate-900">
              {chat?.tutorName}
            </h1>

            <p
              className={`text-sm ${
                canSend
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              {canSend
                ? "Active tutoring session"
                : sessionExpired
                  ? "Session expired"
                  : "Session ended"}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-6">
        {error && (
          <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <div className="text-5xl">💬</div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Start the conversation
              </h2>

              <p className="mt-2 text-slate-500">
                Send a message to your tutor.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const sentByCurrentUser =
                message.senderId === currentUserId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  sentByCurrentUser={
                    sentByCurrentUser
                  }
                />
              );
            })}

            <div ref={messagesEndReference} />
          </div>
        )}
      </section>

      {/* Message composer */}
      <footer className="sticky bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-4">
          {canSend ? (
            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-3"
            >
              <textarea
                value={messageText}
                onChange={(event) =>
                  setMessageText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Type a message..."
                className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="submit"
                disabled={
                  sending || !messageText.trim()
                }
                className="flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          ) : (
            <div className="rounded-lg bg-slate-100 p-4 text-center text-sm font-medium text-slate-600">
              {sessionExpired
                ? "This tutoring session has expired. New messages are disabled."
                : "This tutoring session has ended. New messages are disabled."}
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}

function MessageBubble({
  message,
  sentByCurrentUser,
}: {
  message: Message;
  sentByCurrentUser: boolean;
}) {
  return (
    <div
      className={`flex ${
        sentByCurrentUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[65%] ${
          sentByCurrentUser
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md bg-white text-slate-900"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.text}
        </p>

        <p
          className={`mt-1 text-right text-xs ${
            sentByCurrentUser
              ? "text-emerald-100"
              : "text-slate-400"
          }`}
        >
          {formatMessageTime(message.sentAt)}
        </p>
      </div>
    </div>
  );
}

function formatMessageTime(timestamp?: Timestamp) {
  if (!timestamp) return "Sending...";

  return timestamp.toDate().toLocaleTimeString("en-BD", {
    hour: "numeric",
    minute: "2-digit",
  });
}