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

interface TutorChat {
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  isActive: boolean;
  proposalId: string;
  expiresAt?: Timestamp;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  sentAt?: Timestamp;
}

export default function TutorChatPage() {
  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const [currentTutorId, setCurrentTutorId] =
    useState("");

  const [chat, setChat] =
    useState<TutorChat | null>(null);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [messageText, setMessageText] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeMessages:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setCurrentTutorId(user.uid);

        const chatRef = doc(
          firestore,
          "chats",
          chatId
        );

        unsubscribeChat = onSnapshot(
          chatRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError(
                "This conversation could not be found."
              );
              setLoading(false);
              return;
            }

            const data = snapshot.data();

            if (data.tutorId !== user.uid) {
              setError(
                "You cannot access this tutor conversation."
              );
              setLoading(false);
              return;
            }

            setChat({
              studentId: data.studentId ?? "",
              studentName:
                data.studentName ?? "Student",
              tutorId: data.tutorId ?? "",
              tutorName:
                data.tutorName ?? "Tutor",
              isActive: data.isActive ?? false,
              proposalId: data.proposalId ?? "",
              expiresAt: data.expiresAt,
            });

            setError("");
            setLoading(false);
          },
          (error) => {
            console.error(
              "Tutor chat loading error:",
              error
            );

            setError(
              "Unable to load this conversation."
            );

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
              (messageDocument) => {
                const data =
                  messageDocument.data();

                return {
                  id: messageDocument.id,
                  senderId:
                    data.senderId ?? "",
                  text: data.text ?? "",
                  sentAt: data.sentAt,
                } as ChatMessage;
              }
            );

            setMessages(messageList);
          },
          (error) => {
            console.error(
              "Tutor message loading error:",
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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    function updateCurrentTime() {
      setCurrentTime(Date.now());
    }

    updateCurrentTime();

    const timer = window.setInterval(
      updateCurrentTime,
      30000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const sessionExpired = Boolean(
    chat?.expiresAt &&
      currentTime > 0 &&
      chat.expiresAt.toDate().getTime() <= currentTime
  );

  const canSend =
    Boolean(chat?.isActive) && !sessionExpired;

  async function handleSendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanMessage = messageText.trim();

    if (
      !cleanMessage ||
      !currentTutorId ||
      !chat ||
      !canSend
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const chatRef = doc(
        firestore,
        "chats",
        chatId
      );

      const messageRef = doc(
        collection(
          firestore,
          "chats",
          chatId,
          "messages"
        )
      );

      const batch = writeBatch(firestore);

      batch.set(messageRef, {
        senderId: currentTutorId,
        text: cleanMessage,
        sentAt: serverTimestamp(),
      });

      batch.update(chatRef, {
        lastMessage: cleanMessage,
        lastMessageAt: serverTimestamp(),
      });

      await batch.commit();
      setMessageText("");
    } catch (error) {
      console.error(
        "Tutor message sending error:",
        error
      );

      setError("Unable to send the message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background">
        <p className="text-unitor-gray-dark">
          Loading conversation...
        </p>
      </main>
    );
  }

  if (error && !chat) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unitor-background px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">
            Chat unavailable
          </h1>

          <p className="mt-3 text-unitor-gray-dark">
            {error}
          </p>

          <Link
            href="/tutor/messages"
            className="mt-6 inline-block rounded-lg bg-unitor-primary px-6 py-3 font-medium text-white"
          >
            Return to messages
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-unitor-gray-soft">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 py-4">
          <Link
            href="/tutor/messages"
            className="text-2xl text-unitor-gray-dark hover:text-unitor-primary"
          >
            ←
          </Link>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary">
            {chat?.studentName
              .charAt(0)
              .toUpperCase() || "S"}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-unitor-black">
              {chat?.studentName}
            </h1>

            <p
              className={`text-sm ${
                canSend
                  ? "text-unitor-primary"
                  : "text-unitor-gray-dark"
              }`}
            >
              {canSend
                ? "Active tutoring session"
                : sessionExpired
                  ? "Session expired"
                  : "Session ended"}
            </p>
          </div>

          {chat?.proposalId && (
            <Link
              href={`/tutor/proposals/${chat.proposalId}`}
              className="hidden rounded-lg border border-unitor-primary px-4 py-2 text-sm font-medium text-unitor-primary hover:bg-unitor-background sm:block"
            >
              Proposal
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-6">
        {error && (
          <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-600">
            {error}
          </p>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <div className="text-5xl">💬</div>

              <h2 className="mt-4 text-xl font-bold text-unitor-black">
                Start the conversation
              </h2>

              <p className="mt-2 text-unitor-gray-dark">
                Send a message to the student.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                sentByCurrentUser={
                  message.senderId ===
                  currentTutorId
                }
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <MessageComposer
        canSend={canSend}
        sessionExpired={sessionExpired}
        messageText={messageText}
        sending={sending}
        onMessageChange={setMessageText}
        onSubmit={handleSendMessage}
      />
    </main>
  );
}

function MessageBubble({
  message,
  sentByCurrentUser,
}: {
  message: ChatMessage;
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
            ? "rounded-br-md bg-unitor-primary text-white"
            : "rounded-bl-md bg-white text-unitor-black"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.text}
        </p>

        <p
          className={`mt-1 text-right text-xs ${
            sentByCurrentUser
              ? "text-unitor-blue-light"
              : "text-unitor-gray-dark/70"
          }`}
        >
          {formatMessageTime(message.sentAt)}
        </p>
      </div>
    </div>
  );
}

function MessageComposer({
  canSend,
  sessionExpired,
  messageText,
  sending,
  onMessageChange,
  onSubmit,
}: {
  canSend: boolean;
  sessionExpired: boolean;
  messageText: string;
  sending: boolean;
  onMessageChange: (value: string) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
}) {
  return (
    <footer className="sticky bottom-0 border-t border-unitor-gray-light bg-white">
      <div className="mx-auto max-w-4xl px-5 py-4">
        {canSend ? (
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-3"
          >
            <textarea
              value={messageText}
              onChange={(event) =>
                onMessageChange(event.target.value)
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
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black outline-none placeholder:text-unitor-gray-dark focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light"
            />

            <button
              type="submit"
              disabled={
                sending || !messageText.trim()
              }
              className="h-12 rounded-xl bg-unitor-primary px-5 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        ) : (
          <div className="rounded-lg bg-unitor-gray-soft p-4 text-center text-sm font-medium text-unitor-gray-dark">
            {sessionExpired
              ? "This session has expired. New messages are disabled."
              : "This session has ended. New messages are disabled."}
          </div>
        )}
      </div>
    </footer>
  );
}

function formatMessageTime(timestamp?: Timestamp) {
  if (!timestamp) return "Sending...";

  return timestamp.toDate().toLocaleTimeString(
    "en-BD",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}