"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

type ChatData = {
    id: string;
    studentId: string;
    studentName: string;
    tutorId: string;
    tutorName: string;
    proposalId: string;
    jobProposalId: string;
    paymentId: string;
    lastMessage: string;
    isActive: boolean;
    createdAt: Timestamp | null;
    lastMessageAt: Timestamp | null;
    expiresAt: Timestamp | null;
};

type MessageData = {
    id: string;
    senderId: string;
    text: string;
    sentAt: Timestamp | null;
};

const ADMIN_EMAIL = "unitor.4dmin@gmail.com";

export default function AdminChatDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const chatId = params.chatId as string;

    const [chat, setChat] = useState<ChatData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);

    const [authLoading, setAuthLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(true);

    const [error, setError] = useState("");

    const [currentTime, setCurrentTime] = useState(Date.now());

    /*
     * ---------------------------------------------------------
     * ADMIN AUTHENTICATION CHECK
     * ---------------------------------------------------------
     */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace("/admin/login");
                return;
            }

            if (
                currentUser.email?.toLowerCase() !==
                ADMIN_EMAIL.toLowerCase()
            ) {
                router.replace("/login");
                return;
            }

            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    /*
     * ---------------------------------------------------------
     * UPDATE CURRENT TIME
     * Used for checking whether chat has expired
     * ---------------------------------------------------------
     */
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    /*
     * ---------------------------------------------------------
     * LOAD CHAT DOCUMENT
     * ---------------------------------------------------------
     */
    useEffect(() => {
        if (authLoading || !chatId) {
            return;
        }

        const chatReference = doc(
            firestore,
            "chats",
            chatId
        );

        const unsubscribe = onSnapshot(
            chatReference,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setError("Chat not found.");
                    setChat(null);
                    setChatLoading(false);
                    return;
                }

                const data = snapshot.data();

                setChat({
                    id: snapshot.id,

                    studentId:
                        data.studentId ?? "",

                    studentName:
                        data.studentName ??
                        "Unknown student",

                    tutorId:
                        data.tutorId ?? "",

                    tutorName:
                        data.tutorName ??
                        "Unknown tutor",

                    proposalId:
                        data.proposalId ?? "",

                    jobProposalId:
                        data.jobProposalId ?? "",

                    paymentId:
                        data.paymentId ?? "",

                    lastMessage:
                        data.lastMessage ?? "",

                    isActive:
                        data.isActive ?? false,

                    createdAt:
                        data.createdAt ?? null,

                    lastMessageAt:
                        data.lastMessageAt ?? null,

                    expiresAt:
                        data.expiresAt ?? null,
                });

                setChatLoading(false);
            },
            (snapshotError) => {
                console.error(
                    "Error loading chat:",
                    snapshotError
                );

                setError(
                    "Unable to load this chat."
                );

                setChatLoading(false);
            }
        );

        return () => unsubscribe();
    }, [authLoading, chatId]);

    /*
     * ---------------------------------------------------------
     * LOAD CHAT MESSAGES
     *
     * Firestore:
     * chats/{chatId}/messages/{messageId}
     * ---------------------------------------------------------
     */
    useEffect(() => {
        if (authLoading || !chatId) {
            return;
        }

        const messagesQuery = query(
            collection(
                firestore,
                "chats",
                chatId,
                "messages"
            ),
            orderBy("sentAt", "asc")
        );

        const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
                const loadedMessages: MessageData[] =
                    snapshot.docs.map(
                        (messageDocument) => {
                            const data =
                                messageDocument.data();

                            return {
                                id:
                                    messageDocument.id,

                                senderId:
                                    data.senderId ?? "",

                                text:
                                    data.text ?? "",

                                sentAt:
                                    data.sentAt ?? null,
                            };
                        }
                    );

                setMessages(loadedMessages);
                setMessagesLoading(false);
            },
            (snapshotError) => {
                console.error(
                    "Error loading messages:",
                    snapshotError
                );

                setError(
                    "Unable to load chat messages."
                );

                setMessagesLoading(false);
            }
        );

        return () => unsubscribe();
    }, [authLoading, chatId]);

    /*
     * ---------------------------------------------------------
     * DATE FORMATTER
     * ---------------------------------------------------------
     */
    function formatDate(
        timestamp: Timestamp | null
    ) {
        if (!timestamp) {
            return "—";
        }

        return timestamp
            .toDate()
            .toLocaleString();
    }

    /*
     * ---------------------------------------------------------
     * CHAT EXPIRY
     * ---------------------------------------------------------
     */
    function isChatExpired() {
        if (!chat?.expiresAt) {
            return false;
        }

        return (
            chat.expiresAt
                .toDate()
                .getTime() <= currentTime
        );
    }

    /*
     * ---------------------------------------------------------
     * CHAT STATUS
     * ---------------------------------------------------------
     */
    function getChatStatus() {
        if (!chat) {
            return {
                label: "Unknown",
                className:
                    "bg-unitor-gray-soft text-unitor-gray-dark",
            };
        }

        if (isChatExpired()) {
            return {
                label: "Expired",
                className:
                    "bg-amber-100 text-amber-700",
            };
        }

        if (chat.isActive) {
            return {
                label: "Active",
                className:
                    "bg-unitor-blue-light text-unitor-primary-hover",
            };
        }

        return {
            label: "Inactive",
            className:
                "bg-unitor-gray-light text-unitor-gray-dark",
        };
    }

    /*
     * ---------------------------------------------------------
     * SENDER NAME
     * ---------------------------------------------------------
     */
    function getSenderName(
        senderId: string
    ) {
        if (!chat) {
            return "Unknown";
        }

        if (senderId === chat.studentId) {
            return chat.studentName;
        }

        if (senderId === chat.tutorId) {
            return chat.tutorName;
        }

        return "Unknown user";
    }

    /*
     * ---------------------------------------------------------
     * SENDER TYPE
     * ---------------------------------------------------------
     */
    function getSenderRole(
        senderId: string
    ) {
        if (!chat) {
            return "";
        }

        if (senderId === chat.studentId) {
            return "Student";
        }

        if (senderId === chat.tutorId) {
            return "Tutor";
        }

        return "Unknown";
    }

    /*
     * ---------------------------------------------------------
     * LOADING
     * ---------------------------------------------------------
     */
    if (
        authLoading ||
        chatLoading
    ) {
        return (
            <main className="min-h-screen bg-unitor-background px-6 py-8">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-unitor-gray-dark">
                            Loading chat...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------------------
     * CHAT NOT FOUND
     * ---------------------------------------------------------
     */
    if (!chat) {
        return (
            <main className="min-h-screen bg-unitor-background px-6 py-8">
                <div className="mx-auto max-w-5xl">

                    <Link
                        href="/admin/chats"
                        className="text-sm font-medium text-unitor-primary hover:underline"
                    >
                        ← Back to chats
                    </Link>

                    <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">

                        <h1 className="text-xl font-bold text-unitor-black">
                            Chat not found
                        </h1>

                        <p className="mt-2 text-unitor-gray-dark">
                            This chat does not exist or
                            cannot be accessed.
                        </p>

                    </div>

                </div>
            </main>
        );
    }

    const status =
        getChatStatus();

    return (
        <main className="min-h-screen bg-unitor-background px-4 py-8 sm:px-6">

            <div className="mx-auto max-w-5xl">

                {/* Top navigation */}

                <div className="mb-6">

                    <Link
                        href="/admin/chats"
                        className="text-sm font-medium text-unitor-primary hover:underline"
                    >
                        ← Back to chats
                    </Link>

                </div>

                {/* Page heading */}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <p className="text-sm font-medium text-unitor-primary">
                            Admin
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-unitor-black">
                            Chat details
                        </h1>

                        <p className="mt-2 text-unitor-gray-dark">
                            Monitor the conversation
                            between the student and tutor.
                        </p>

                    </div>

                    <span
                        className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${status.className}`}
                    >
                        {status.label}
                    </span>

                </div>

                {/* Error */}

                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Student and tutor */}

                <div className="mb-6 grid gap-4 md:grid-cols-2">

                    {/* Student */}

                    <div className="rounded-2xl bg-white p-6 shadow-sm">

                        <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                            Student
                        </p>

                        <h2 className="mt-2 text-xl font-bold text-unitor-black">
                            {chat.studentName}
                        </h2>

                        <p className="mt-1 break-all text-sm text-unitor-gray-dark">
                            {chat.studentId}
                        </p>

                    </div>

                    {/* Tutor */}

                    <div className="rounded-2xl bg-white p-6 shadow-sm">

                        <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                            Tutor
                        </p>

                        <h2 className="mt-2 text-xl font-bold text-unitor-black">
                            {chat.tutorName}
                        </h2>

                        <p className="mt-1 break-all text-sm text-unitor-gray-dark">
                            {chat.tutorId}
                        </p>

                    </div>

                </div>

                {/* Session information */}

                <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-bold text-unitor-black">
                        Session information
                    </h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Chat ID
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-unitor-gray-dark">
                                {chat.id}
                            </p>

                        </div>

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Proposal ID
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-unitor-gray-dark">
                                {chat.proposalId || "—"}
                            </p>

                        </div>

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Job proposal ID
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-unitor-gray-dark">
                                {chat.jobProposalId || "—"}
                            </p>

                        </div>

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Payment ID
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-unitor-gray-dark">
                                {chat.paymentId || "—"}
                            </p>

                        </div>

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Created
                            </p>

                            <p className="mt-1 text-sm font-medium text-unitor-gray-dark">
                                {formatDate(
                                    chat.createdAt
                                )}
                            </p>

                        </div>

                        <div>

                            <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                Expires
                            </p>

                            <p className="mt-1 text-sm font-medium text-unitor-gray-dark">
                                {formatDate(
                                    chat.expiresAt
                                )}
                            </p>

                        </div>

                    </div>

                </div>

                {/* Messages */}

                <div className="rounded-2xl bg-white shadow-sm">

                    {/* Header */}

                    <div className="border-b border-unitor-gray-light px-6 py-5">

                        <div className="flex items-center justify-between">

                            <div>

                                <h2 className="text-lg font-bold text-unitor-black">
                                    Messages
                                </h2>

                                <p className="mt-1 text-sm text-unitor-gray-dark">
                                    {messages.length} message
                                    {messages.length !== 1
                                        ? "s"
                                        : ""}
                                </p>

                            </div>

                            <span className="rounded-full bg-unitor-gray-soft px-3 py-1 text-xs font-medium text-unitor-gray-dark">
                                Read only
                            </span>

                        </div>

                    </div>

                    {/* Message list */}

                    <div className="max-h-[650px] overflow-y-auto p-4 sm:p-6">

                        {messagesLoading ? (

                            <p className="py-10 text-center text-sm text-unitor-gray-dark">
                                Loading messages...
                            </p>

                        ) : messages.length === 0 ? (

                            <div className="py-12 text-center">

                                <p className="font-medium text-unitor-black">
                                    No messages yet
                                </p>

                                <p className="mt-2 text-sm text-unitor-gray-dark">
                                    The student and tutor
                                    have not sent any
                                    messages in this chat.
                                </p>

                            </div>

                        ) : (

                            <div className="space-y-4">

                                {messages.map(
                                    (message) => {

                                        const senderRole =
                                            getSenderRole(
                                                message.senderId
                                            );

                                        const isStudent =
                                            senderRole ===
                                            "Student";

                                        return (
                                            <div
                                                key={
                                                    message.id
                                                }
                                                className={`flex ${
                                                    isStudent
                                                        ? "justify-start"
                                                        : "justify-end"
                                                }`}
                                            >

                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                                                        isStudent
                                                            ? "bg-unitor-gray-soft text-unitor-black"
                                                            : "bg-unitor-background text-unitor-black"
                                                    }`}
                                                >

                                                    <div className="mb-2 flex flex-wrap items-center gap-2">

                                                        <p className="text-xs font-bold text-unitor-gray-dark">
                                                            {getSenderName(
                                                                message.senderId
                                                            )}
                                                        </p>

                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                                isStudent
                                                                    ? "bg-unitor-blue-light text-unitor-primary-hover"
                                                                    : "bg-unitor-blue-light text-unitor-primary-hover"
                                                            }`}
                                                        >
                                                            {
                                                                senderRole
                                                            }
                                                        </span>

                                                    </div>

                                                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                                        {message.text}
                                                    </p>

                                                    <p className="mt-2 text-[11px] text-unitor-gray-dark/70">
                                                        {formatDate(
                                                            message.sentAt
                                                        )}
                                                    </p>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        )}

                    </div>

                </div>

                {/* Admin notice */}

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

                    <p className="text-sm font-medium text-amber-800">
                        Admin monitoring
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                        This page is read-only. Admins
                        can monitor tutoring sessions
                        but cannot send messages as the
                        student or tutor.
                    </p>

                </div>

            </div>

        </main>
    );
}