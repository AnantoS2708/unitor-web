"use client";

import {
    FormEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import Link from "next/link";
import {
    useParams,
    useRouter,
} from "next/navigation";

import {
    onAuthStateChanged,
    User,
} from "firebase/auth";

import {
    addDoc,
    collection,
    doc,
    DocumentData,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

import {
    auth,
    firestore,
} from "@/lib/firebase";

type Chat = {
    id: string;

    studentId: string;
    studentName: string;

    tutorId: string;
    tutorName: string;

    jobProposalId: string;
    proposalId: string;
    paymentId: string;

    isActive: boolean;

    expiresAt:
        | Timestamp
        | Date
        | null;
};

type Message = {
    id: string;
    senderId: string;
    text: string;

    sentAt:
        | Timestamp
        | Date
        | null;
};

/*
 * ==========================================
 * CONVERT FIRESTORE DATE
 * ==========================================
 */
function toDate(
    value: unknown
): Date | null {
    if (
        value instanceof Date
    ) {
        return value;
    }

    if (
        value instanceof Timestamp
    ) {
        return value.toDate();
    }

    if (
        value &&
        typeof value ===
            "object" &&
        "toDate" in value &&
        typeof (
            value as {
                toDate?: unknown;
            }
        ).toDate ===
            "function"
    ) {
        return (
            value as {
                toDate: () => Date;
            }
        ).toDate();
    }

    return null;
}

/*
 * ==========================================
 * MESSAGE TIME
 * ==========================================
 */
function formatTime(
    value:
        | Timestamp
        | Date
        | null
) {
    const date =
        toDate(value);

    if (!date) {
        return "Sending...";
    }

    return date.toLocaleString(
        [],
        {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }
    );
}

export default function StudentChatPage() {
    const params =
        useParams<{
            chatId: string;
        }>();

    const router =
        useRouter();

    const chatId =
        Array.isArray(
            params.chatId
        )
            ? params.chatId[0]
            : params.chatId;

    const messagesEndRef =
        useRef<HTMLDivElement | null>(
            null
        );

    const [
        user,
        setUser,
    ] =
        useState<User | null>(
            null
        );

    const [
        chat,
        setChat,
    ] =
        useState<Chat | null>(
            null
        );

    const [
        messages,
        setMessages,
    ] =
        useState<Message[]>(
            []
        );

    const [
        message,
        setMessage,
    ] =
        useState("");

    const [
        currentTime,
        setCurrentTime,
    ] =
        useState(
            () =>
                Date.now()
        );

    const [
        authLoading,
        setAuthLoading,
    ] =
        useState(true);

    const [
        chatLoading,
        setChatLoading,
    ] =
        useState(true);

    const [
        sending,
        setSending,
    ] =
        useState(false);

    const [
        endingSession,
        setEndingSession,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    /*
     * ==========================================
     * AUTHENTICATION
     * ==========================================
     */
    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                (
                    currentUser
                ) => {
                    if (
                        !currentUser
                    ) {
                        router.replace(
                            "/login"
                        );

                        return;
                    }

                    setUser(
                        currentUser
                    );

                    setAuthLoading(
                        false
                    );
                }
            );

        return unsubscribe;
    }, [router]);

    /*
     * ==========================================
     * CURRENT TIME
     *
     * Checks every 30 seconds whether
     * the session has expired.
     * ==========================================
     */
    useEffect(() => {
        const timer =
            window.setInterval(
                () => {
                    setCurrentTime(
                        Date.now()
                    );
                },
                30_000
            );

        return () => {
            window.clearInterval(
                timer
            );
        };
    }, []);

    /*
     * ==========================================
     * LOAD CHAT
     * ==========================================
     */
    useEffect(() => {
        if (
            !user ||
            !chatId
        ) {
            return;
        }

        const chatReference =
            doc(
                firestore,
                "chats",
                chatId
            );

        const unsubscribe =
            onSnapshot(
                chatReference,
                (
                    snapshot
                ) => {
                    if (
                        !snapshot.exists()
                    ) {
                        setError(
                            "This tutoring chat could not be found."
                        );

                        setChat(
                            null
                        );

                        setChatLoading(
                            false
                        );

                        return;
                    }

                    const data =
                        snapshot.data() as DocumentData;

                    /*
                     * Only the student belonging
                     * to this chat can open this
                     * student chat page.
                     */
                    if (
                        data.studentId !==
                        user.uid
                    ) {
                        setError(
                            "You do not have permission to open this chat."
                        );

                        setChat(
                            null
                        );

                        setChatLoading(
                            false
                        );

                        return;
                    }

                    setChat({
                        id:
                            snapshot.id,

                        studentId:
                            data.studentId ??
                            "",

                        studentName:
                            data.studentName ??
                            "Student",

                        tutorId:
                            data.tutorId ??
                            "",

                        tutorName:
                            data.tutorName ??
                            "Tutor",

                        jobProposalId:
                            data.jobProposalId ??
                            "",

                        proposalId:
                            data.proposalId ??
                            "",

                        paymentId:
                            data.paymentId ??
                            "",

                        isActive:
                            data.isActive ===
                            true,

                        expiresAt:
                            data.expiresAt ??
                            null,
                    });

                    setError(
                        ""
                    );

                    setChatLoading(
                        false
                    );
                },
                (
                    snapshotError
                ) => {
                    console.error(
                        "Chat load error:",
                        snapshotError
                    );

                    setError(
                        "Unable to load this chat."
                    );

                    setChatLoading(
                        false
                    );
                }
            );

        return unsubscribe;
    }, [
        chatId,
        user,
    ]);

    /*
     * ==========================================
     * LOAD MESSAGES
     * ==========================================
     */
    useEffect(() => {
        if (
            !user ||
            !chatId ||
            !chat
        ) {
            return;
        }

        const messagesQuery =
            query(
                collection(
                    firestore,
                    "chats",
                    chatId,
                    "messages"
                ),
                orderBy(
                    "sentAt",
                    "asc"
                )
            );

        const unsubscribe =
            onSnapshot(
                messagesQuery,
                (
                    snapshot
                ) => {
                    const loadedMessages: Message[] =
                        snapshot.docs.map(
                            (
                                messageDoc
                            ) => {
                                const data =
                                    messageDoc.data();

                                return {
                                    id:
                                        messageDoc.id,

                                    senderId:
                                        data.senderId ??
                                        "",

                                    text:
                                        data.text ??
                                        "",

                                    sentAt:
                                        data.sentAt ??
                                        null,
                                };
                            }
                        );

                    setMessages(
                        loadedMessages
                    );
                },
                (
                    snapshotError
                ) => {
                    console.error(
                        "Messages load error:",
                        snapshotError
                    );

                    setError(
                        "Unable to load the messages."
                    );
                }
            );

        return unsubscribe;
    }, [
        chat,
        chatId,
        user,
    ]);

    /*
     * ==========================================
     * AUTO SCROLL
     * ==========================================
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView(
            {
                behavior:
                    "smooth",
            }
        );
    }, [messages]);

    /*
     * ==========================================
     * SESSION STATUS
     * ==========================================
     */
    const expiresAt =
        useMemo(
            () =>
                toDate(
                    chat?.expiresAt ??
                        null
                ),
            [
                chat?.expiresAt,
            ]
        );

    const hasExpired =
        Boolean(
            expiresAt &&
                expiresAt.getTime() <=
                    currentTime
        );

    /*
     * Session is ended if:
     *
     * isActive = false
     *
     * OR
     *
     * expiresAt has passed.
     */
    const sessionEnded =
        Boolean(
            chat &&
                (
                    !chat.isActive ||
                    hasExpired
                )
        );

    /*
     * ==========================================
     * END SESSION
     * ==========================================
     */
    async function handleEndSession() {
        if (
            !user ||
            !chat ||
            sessionEnded ||
            endingSession
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Are you sure you want to end your tutoring session with ${chat.tutorName}?`
            );

        if (
            !confirmed
        ) {
            return;
        }

        setEndingSession(
            true
        );

        setError(
            ""
        );

        try {
            const batch =
                writeBatch(
                    firestore
                );

            /*
             * --------------------------------------
             * END CHAT
             * --------------------------------------
             */
            const chatReference =
                doc(
                    firestore,
                    "chats",
                    chat.id
                );

            batch.update(
                chatReference,
                {
                    isActive:
                        false,

                    endedAt:
                        serverTimestamp(),

                    endedBy:
                        user.uid,

                    updatedAt:
                        serverTimestamp(),
                }
            );

            /*
             * --------------------------------------
             * JOB PROPOSAL
             * --------------------------------------
             *
             * Mark tutoring job as completed.
             */
            if (
                chat.jobProposalId
            ) {
                const jobReference =
                    doc(
                        firestore,
                        "jobProposals",
                        chat.jobProposalId
                    );

                batch.update(
                    jobReference,
                    {
                        status:
                            "completed",

                        completedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            /*
             * --------------------------------------
             * ORIGINAL PROPOSAL
             * --------------------------------------
             */
            if (
                chat.proposalId
            ) {
                const proposalReference =
                    doc(
                        firestore,
                        "proposals",
                        chat.proposalId
                    );

                batch.update(
                    proposalReference,
                    {
                        status:
                            "completed",

                        completedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            await batch.commit();

        } catch (
            endError
        ) {
            console.error(
                "Session end error:",
                endError
            );

            setError(
                "Unable to end the session. Please try again."
            );
        } finally {
            setEndingSession(
                false
            );
        }
    }

    /*
     * ==========================================
     * SEND MESSAGE
     * ==========================================
     */
    async function handleSend(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const text =
            message.trim();

        if (
            !user ||
            !chat ||
            !text ||
            sending ||
            sessionEnded
        ) {
            return;
        }

        try {
            setSending(
                true
            );

            setError(
                ""
            );

            setMessage(
                ""
            );

            await addDoc(
                collection(
                    firestore,
                    "chats",
                    chat.id,
                    "messages"
                ),
                {
                    senderId:
                        user.uid,

                    text,

                    sentAt:
                        serverTimestamp(),
                }
            );

            await updateDoc(
                doc(
                    firestore,
                    "chats",
                    chat.id
                ),
                {
                    lastMessage:
                        text,

                    lastMessageAt:
                        serverTimestamp(),
                }
            );
        } catch (
            sendError
        ) {
            console.error(
                "Message send error:",
                sendError
            );

            setMessage(
                text
            );

            setError(
                "Your message could not be sent. Please try again."
            );
        } finally {
            setSending(
                false
            );
        }
    }

    /*
     * ==========================================
     * LOADING
     * ==========================================
     */
    if (
        authLoading ||
        chatLoading
    ) {
        return (
            <main className="min-h-screen bg-unitor-background px-6 py-8">

                <div className="mx-auto max-w-4xl text-unitor-gray-dark">
                    Loading chat...
                </div>

            </main>
        );
    }

    /*
     * ==========================================
     * CHAT NOT FOUND
     * ==========================================
     */
    if (!chat) {
        return (
            <main className="min-h-screen bg-unitor-background px-6 py-8">

                <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">

                    <p className="text-red-700">
                        {error ||
                            "Chat not found."}
                    </p>

                    <Link
                        href="/student/messages"
                        className="mt-5 inline-block font-medium text-unitor-primary hover:underline"
                    >
                        Back to messages
                    </Link>

                </div>

            </main>
        );
    }

    return (
        <main className="min-h-screen bg-unitor-background px-4 py-6 sm:px-6 sm:py-8">

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-sm">

                {/* =====================================
                    HEADER
                ====================================== */}

                <header className="border-b border-unitor-gray-light px-5 py-4 sm:px-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <Link
                                href="/student/messages"
                                className="text-sm font-medium text-unitor-primary hover:underline"
                            >
                                ← Back to messages
                            </Link>

                            <h1 className="mt-2 text-xl font-bold text-unitor-black">
                                {chat.tutorName}
                            </h1>

                            <p className="mt-1 text-sm text-unitor-gray-dark">

                                {sessionEnded
                                    ? "This tutoring session has ended."
                                    : expiresAt
                                      ? `Session available until ${expiresAt.toLocaleString()}`
                                      : "Tutoring session"}

                            </p>

                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                            {/* SESSION STATUS */}

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    sessionEnded
                                        ? "bg-unitor-gray-light text-unitor-gray-dark"
                                        : "bg-green-100 text-green-700"
                                }`}
                            >
                                {sessionEnded
                                    ? "Ended"
                                    : "Active"}
                            </span>

                            {/* END SESSION BUTTON */}

                            {!sessionEnded && (

                                <button
                                    type="button"
                                    onClick={
                                        handleEndSession
                                    }
                                    disabled={
                                        endingSession
                                    }
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {endingSession
                                        ? "Ending..."
                                        : "End Session"}
                                </button>

                            )}

                            {/* RATE TUTOR AFTER END */}

                            {sessionEnded &&
                                chat.jobProposalId && (

                                <Link
                                    href={`/student/reviews/${chat.jobProposalId}`}
                                    className="rounded-lg bg-unitor-primary px-4 py-2 text-sm font-medium text-white hover:bg-unitor-primary-hover"
                                >
                                    ★ Rate Tutor
                                </Link>

                            )}

                        </div>

                    </div>

                </header>

                {/* =====================================
                    SESSION ENDED
                ====================================== */}

                {sessionEnded && (

                    <section className="border-b border-amber-200 bg-amber-50 px-5 py-5 sm:px-6">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                                <div className="flex items-center gap-2">

                                    <span className="text-xl">
                                        ✓
                                    </span>

                                    <h2 className="text-lg font-bold text-unitor-black">
                                        Session ended
                                    </h2>

                                </div>

                                <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">

                                    Your tutoring session with{" "}

                                    <span className="font-medium text-unitor-black">
                                        {chat.tutorName}
                                    </span>{" "}

                                    has finished.

                                </p>

                                <p className="mt-1 text-sm text-unitor-gray-dark">
                                    Please rate your tutor from 1 to 5 stars.
                                </p>

                            </div>

                            {chat.jobProposalId ? (

                                <Link
                                    href={`/student/reviews/${chat.jobProposalId}`}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-unitor-primary px-5 py-3 font-medium text-white transition hover:bg-unitor-primary-hover"
                                >

                                    <span>
                                        ★
                                    </span>

                                    Rate tutor

                                </Link>

                            ) : (

                                <span className="text-sm font-medium text-amber-800">
                                    Review is unavailable for this session.
                                </span>

                            )}

                        </div>

                    </section>
                )}

                {/* =====================================
                    ERROR
                ====================================== */}

                {error && (

                    <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
                        {error}
                    </div>

                )}

                {/* =====================================
                    MESSAGES
                ====================================== */}

                <section className="flex-1 space-y-3 overflow-y-auto bg-unitor-background p-5 sm:p-6">

                    {messages.length ===
                    0 ? (

                        <div className="py-16 text-center text-sm text-unitor-gray-dark">
                            No messages yet.
                        </div>

                    ) : (

                        messages.map(
                            (
                                item
                            ) => {
                                const mine =
                                    item.senderId ===
                                    user?.uid;

                                return (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className={`flex ${
                                            mine
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >

                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                                mine
                                                    ? "rounded-br-md bg-unitor-primary text-white"
                                                    : "rounded-bl-md bg-white text-unitor-black shadow-sm"
                                            }`}
                                        >

                                            <p className="whitespace-pre-wrap break-words text-sm">
                                                {item.text}
                                            </p>

                                            <p
                                                className={`mt-1 text-right text-[11px] ${
                                                    mine
                                                        ? "text-unitor-blue-light"
                                                        : "text-unitor-gray-dark/70"
                                                }`}
                                            >
                                                {formatTime(
                                                    item.sentAt
                                                )}
                                            </p>

                                        </div>

                                    </div>
                                );
                            }
                        )

                    )}

                    <div
                        ref={
                            messagesEndRef
                        }
                    />

                </section>

                {/* =====================================
                    MESSAGE INPUT
                ====================================== */}

                <form
                    onSubmit={
                        handleSend
                    }
                    className="border-t border-unitor-gray-light bg-white p-4 sm:p-5"
                >

                    {sessionEnded && (

                        <p className="mb-3 text-center text-sm font-medium text-unitor-gray-dark">
                            Messaging is disabled because this session has ended.
                        </p>

                    )}

                    <div className="flex gap-3">

                        <input
                            type="text"
                            value={
                                message
                            }
                            onChange={(
                                event
                            ) =>
                                setMessage(
                                    event.target.value
                                )
                            }
                            disabled={
                                sessionEnded ||
                                sending
                            }
                            placeholder={
                                sessionEnded
                                    ? "This session has ended"
                                    : "Write a message..."
                            }
                            className="min-w-0 flex-1 rounded-xl border border-unitor-gray-light bg-white px-4 py-3 text-unitor-black placeholder:text-unitor-gray-dark/70 outline-none focus:border-unitor-primary focus:ring-2 focus:ring-unitor-blue-light disabled:cursor-not-allowed disabled:bg-unitor-gray-soft"
                        />

                        <button
                            type="submit"
                            disabled={
                                sessionEnded ||
                                sending ||
                                !message.trim()
                            }
                            className="rounded-xl bg-unitor-primary px-5 py-3 font-medium text-white hover:bg-unitor-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {sending
                                ? "Sending..."
                                : "Send"}

                        </button>

                    </div>

                </form>

            </div>

        </main>
    );
}
