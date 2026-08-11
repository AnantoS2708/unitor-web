"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    onAuthStateChanged,
} from "firebase/auth";

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from "firebase/firestore";

import {
    auth,
    firestore,
} from "@/lib/firebase";

const ADMIN_EMAIL =
    "unitor.4dmin@gmail.com";

type ChatItem = {
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

    createdAt:
        | Timestamp
        | null;

    lastMessageAt:
        | Timestamp
        | null;

    endedAt:
        | Timestamp
        | null;

    endedBy: string;
    endedReason: string;
};

type JobProposalItem = {
    id: string;

    proposalId: string;

    dateFrom: string;
    dateTo: string;

    timeFrom: string;
    timeTo: string;

    status: string;
};

type ReviewItem = {
    id: string;

    jobProposalId: string;

    rating: number;
};

type ChatFilter =
    | "all"
    | "active"
    | "overdue"
    | "closed"
    | "review_pending";

export default function AdminChatsPage() {
    const router =
        useRouter();

    const [
        chats,
        setChats,
    ] =
        useState<ChatItem[]>(
            []
        );

    const [
        jobProposals,
        setJobProposals,
    ] =
        useState<
            JobProposalItem[]
        >([]);

    const [
        reviews,
        setReviews,
    ] =
        useState<
            ReviewItem[]
        >([]);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        checkingAdmin,
        setCheckingAdmin,
    ] =
        useState(true);

    const [
        closingChatId,
        setClosingChatId,
    ] =
        useState("");

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        success,
        setSuccess,
    ] =
        useState("");

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        filter,
        setFilter,
    ] =
        useState<ChatFilter>(
            "all"
        );

    /*
     * Update once per minute so
     * overdue status changes automatically.
     */
    const [
        currentTime,
        setCurrentTime,
    ] =
        useState(
            () =>
                Date.now()
        );

    /*
     * ==========================================
     * ADMIN AUTH + REAL-TIME DATA
     * ==========================================
     */
    useEffect(() => {
        let unsubscribeChats:
            | (() => void)
            | undefined;

        let unsubscribeJobProposals:
            | (() => void)
            | undefined;

        let unsubscribeReviews:
            | (() => void)
            | undefined;

        const unsubscribeAuth =
            onAuthStateChanged(
                auth,
                (
                    user
                ) => {
                    const email =
                        user?.email
                            ?.trim()
                            .toLowerCase() ??
                        "";

                    if (
                        !user ||
                        email !==
                            ADMIN_EMAIL
                    ) {
                        router.replace(
                            "/admin/login"
                        );

                        return;
                    }

                    setCheckingAdmin(
                        false
                    );

                    /*
                     * CHATS
                     */
                    unsubscribeChats =
                        onSnapshot(
                            collection(
                                firestore,
                                "chats"
                            ),
                            (
                                snapshot
                            ) => {
                                const loadedChats: ChatItem[] =
                                    snapshot.docs.map(
                                        (
                                            chatDoc
                                        ) => {
                                            const data =
                                                chatDoc.data();

                                            return {
                                                id:
                                                    chatDoc.id,

                                                studentId:
                                                    data.studentId ??
                                                    "",

                                                studentName:
                                                    data.studentName ??
                                                    "Unknown student",

                                                tutorId:
                                                    data.tutorId ??
                                                    "",

                                                tutorName:
                                                    data.tutorName ??
                                                    "Unknown tutor",

                                                proposalId:
                                                    data.proposalId ??
                                                    "",

                                                jobProposalId:
                                                    data.jobProposalId ??
                                                    "",

                                                paymentId:
                                                    data.paymentId ??
                                                    "",

                                                lastMessage:
                                                    data.lastMessage ??
                                                    "",

                                                isActive:
                                                    data.isActive ===
                                                    true,

                                                createdAt:
                                                    data.createdAt ??
                                                    null,

                                                lastMessageAt:
                                                    data.lastMessageAt ??
                                                    null,

                                                endedAt:
                                                    data.endedAt ??
                                                    null,

                                                endedBy:
                                                    data.endedBy ??
                                                    "",

                                                endedReason:
                                                    data.endedReason ??
                                                    "",
                                            };
                                        }
                                    );

                                /*
                                 * Newest first.
                                 */
                                loadedChats.sort(
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

                                setChats(
                                    loadedChats
                                );

                                setLoading(
                                    false
                                );
                            },
                            (
                                snapshotError
                            ) => {
                                console.error(
                                    "Error loading chats:",
                                    snapshotError
                                );

                                setError(
                                    "Unable to load chats."
                                );

                                setLoading(
                                    false
                                );
                            }
                        );

                    /*
                     * JOB PROPOSALS
                     *
                     * We use their agreed date/time
                     * to determine whether a session
                     * is overdue.
                     */
                    unsubscribeJobProposals =
                        onSnapshot(
                            collection(
                                firestore,
                                "jobProposals"
                            ),
                            (
                                snapshot
                            ) => {
                                const items =
                                    snapshot.docs.map(
                                        (
                                            document
                                        ) => {
                                            const data =
                                                document.data();

                                            return {
                                                id:
                                                    document.id,

                                                proposalId:
                                                    data.proposalId ??
                                                    "",

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

                                                status:
                                                    data.status ??
                                                    "",
                                            } as JobProposalItem;
                                        }
                                    );

                                setJobProposals(
                                    items
                                );
                            },
                            (
                                snapshotError
                            ) => {
                                console.error(
                                    "Job proposal loading error:",
                                    snapshotError
                                );
                            }
                        );

                    /*
                     * REVIEWS
                     *
                     * Review document ID normally
                     * equals jobProposalId.
                     */
                    unsubscribeReviews =
                        onSnapshot(
                            collection(
                                firestore,
                                "reviews"
                            ),
                            (
                                snapshot
                            ) => {
                                const items =
                                    snapshot.docs.map(
                                        (
                                            reviewDocument
                                        ) => {
                                            const data =
                                                reviewDocument.data();

                                            return {
                                                id:
                                                    reviewDocument.id,

                                                jobProposalId:
                                                    data.jobProposalId ??
                                                    reviewDocument.id,

                                                rating:
                                                    Number(
                                                        data.rating ??
                                                            0
                                                    ),
                                            } as ReviewItem;
                                        }
                                    );

                                setReviews(
                                    items
                                );
                            },
                            (
                                snapshotError
                            ) => {
                                console.error(
                                    "Reviews loading error:",
                                    snapshotError
                                );
                            }
                        );
                }
            );

        return () => {
            unsubscribeAuth();

            unsubscribeChats?.();
            unsubscribeJobProposals?.();
            unsubscribeReviews?.();
        };
    }, [router]);

    /*
     * ==========================================
     * CLOCK
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
                60_000
            );

        return () =>
            window.clearInterval(
                timer
            );
    }, []);

    /*
     * ==========================================
     * LOOK UP JOB PROPOSAL
     * ==========================================
     */
    function getJobProposal(
        chat: ChatItem
    ) {
        if (
            !chat.jobProposalId
        ) {
            return null;
        }

        return (
            jobProposals.find(
                (
                    jobProposal
                ) =>
                    jobProposal.id ===
                    chat.jobProposalId
            ) ??
            null
        );
    }

    /*
     * ==========================================
     * REVIEW CHECK
     * ==========================================
     */
    function getReview(
        chat: ChatItem
    ) {
        if (
            !chat.jobProposalId
        ) {
            return null;
        }

        return (
            reviews.find(
                (
                    review
                ) =>
                    review.jobProposalId ===
                    chat.jobProposalId ||
                    review.id ===
                    chat.jobProposalId
            ) ??
            null
        );
    }

    /*
     * ==========================================
     * AGREED SESSION END TIME
     * ==========================================
     *
     * Supports formats such as:
     *
     * 2026-08-15
     * 15/08/26
     * 15/08/2026
     *
     * Time examples:
     *
     * 17:30
     * 5:30 PM
     */
    function getScheduledEnd(
        chat: ChatItem
    ): Date | null {
        const jobProposal =
            getJobProposal(
                chat
            );

        if (
            !jobProposal
        ) {
            return null;
        }

        const dateText =
            jobProposal.dateTo ||
            jobProposal.dateFrom;

        const timeText =
            jobProposal.timeTo ||
            jobProposal.timeFrom;

        return parseDateTime(
            dateText,
            timeText
        );
    }

    /*
     * ==========================================
     * OVERDUE
     * ==========================================
     *
     * IMPORTANT:
     * Being overdue DOES NOT automatically
     * close the chat.
     *
     * It only tells admin:
     *
     * "This session should probably be reviewed."
     */
    function isOverdue(
        chat: ChatItem
    ) {
        if (
            !chat.isActive
        ) {
            return false;
        }

        const scheduledEnd =
            getScheduledEnd(
                chat
            );

        if (
            !scheduledEnd
        ) {
            return false;
        }

        return (
            scheduledEnd.getTime() <
            currentTime
        );
    }

    /*
     * ==========================================
     * COUNTS
     * ==========================================
     */
    const activeCount =
        useMemo(
            () =>
                chats.filter(
                    (
                        chat
                    ) =>
                        chat.isActive
                ).length,
            [chats]
        );

    const closedCount =
        useMemo(
            () =>
                chats.filter(
                    (
                        chat
                    ) =>
                        !chat.isActive
                ).length,
            [chats]
        );

    const overdueCount =
        useMemo(
            () =>
                chats.filter(
                    (
                        chat
                    ) =>
                        isOverdue(
                            chat
                        )
                ).length,
            [
                chats,
                jobProposals,
                currentTime,
            ]
        );

    const reviewPendingCount =
        useMemo(
            () =>
                chats.filter(
                    (
                        chat
                    ) =>
                        !chat.isActive &&
                        !getReview(
                            chat
                        )
                ).length,
            [
                chats,
                reviews,
            ]
        );

    /*
     * ==========================================
     * FILTER
     * ==========================================
     */
    const filteredChats =
        useMemo(() => {
            const searchText =
                search
                    .trim()
                    .toLowerCase();

            return chats.filter(
                (
                    chat
                ) => {
                    const overdue =
                        isOverdue(
                            chat
                        );

                    const review =
                        getReview(
                            chat
                        );

                    if (
                        filter ===
                            "active" &&
                        !chat.isActive
                    ) {
                        return false;
                    }

                    if (
                        filter ===
                            "closed" &&
                        chat.isActive
                    ) {
                        return false;
                    }

                    if (
                        filter ===
                            "overdue" &&
                        !overdue
                    ) {
                        return false;
                    }

                    if (
                        filter ===
                            "review_pending" &&
                        (
                            chat.isActive ||
                            review
                        )
                    ) {
                        return false;
                    }

                    if (
                        !searchText
                    ) {
                        return true;
                    }

                    const searchableText =
                        [
                            chat.studentName,
                            chat.tutorName,
                            chat.studentId,
                            chat.tutorId,
                            chat.proposalId,
                            chat.jobProposalId,
                            chat.paymentId,
                            chat.lastMessage,
                        ]
                            .join(
                                " "
                            )
                            .toLowerCase();

                    return searchableText.includes(
                        searchText
                    );
                }
            );
        }, [
            chats,
            reviews,
            jobProposals,
            search,
            filter,
            currentTime,
        ]);

    /*
     * ==========================================
     * ADMIN CLOSE SESSION
     * ==========================================
     */
    async function handleCloseSession(
        chat: ChatItem
    ) {
        if (
            !chat.isActive ||
            closingChatId
        ) {
            return;
        }

        const scheduledEnd =
            getScheduledEnd(
                chat
            );

        const review =
            getReview(
                chat
            );

        let confirmationMessage =
            `Close the tutoring session between ${chat.studentName} and ${chat.tutorName}?`;

        if (
            scheduledEnd
        ) {
            confirmationMessage +=
                `\n\nScheduled end: ${scheduledEnd.toLocaleString()}`;
        }

        if (
            !review
        ) {
            confirmationMessage +=
                "\n\nThe student has not submitted a review yet. They will still be able to rate the tutor after the session is closed.";
        }

        confirmationMessage +=
            "\n\nThe chat history will remain visible, but new messages will be disabled.";

        const confirmed =
            window.confirm(
                confirmationMessage
            );

        if (
            !confirmed
        ) {
            return;
        }

        setClosingChatId(
            chat.id
        );

        setError(
            ""
        );

        setSuccess(
            ""
        );

        try {
            const currentAdmin =
                auth.currentUser;

            if (
                !currentAdmin
            ) {
                router.replace(
                    "/admin/login"
                );

                return;
            }

            const batch =
                writeBatch(
                    firestore
                );

            /*
             * -----------------------------
             * CHAT
             * -----------------------------
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
                        "admin",

                    endedByUid:
                        currentAdmin.uid,

                    endedReason:
                        "admin_closed",

                    updatedAt:
                        serverTimestamp(),
                }
            );

            /*
             * -----------------------------
             * JOB PROPOSAL
             * -----------------------------
             */
            if (
                chat.jobProposalId
            ) {
                batch.update(
                    doc(
                        firestore,
                        "jobProposals",
                        chat.jobProposalId
                    ),
                    {
                        status:
                            "completed",

                        completedAt:
                            serverTimestamp(),

                        completedBy:
                            "admin",

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            /*
             * -----------------------------
             * ORIGINAL PROPOSAL
             * -----------------------------
             */
            if (
                chat.proposalId
            ) {
                batch.update(
                    doc(
                        firestore,
                        "proposals",
                        chat.proposalId
                    ),
                    {
                        status:
                            "completed",

                        completedAt:
                            serverTimestamp(),

                        completedBy:
                            "admin",

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            await batch.commit();

            setSuccess(
                `Session between ${chat.studentName} and ${chat.tutorName} was closed successfully.`
            );
        } catch (
            closeError
        ) {
            console.error(
                "Admin close session error:",
                closeError
            );

            setError(
                "Unable to close this tutoring session."
            );
        } finally {
            setClosingChatId(
                ""
            );
        }
    }

    /*
     * ==========================================
     * FORMAT DATE
     * ==========================================
     */
    function formatTimestamp(
        timestamp:
            | Timestamp
            | null
    ) {
        if (
            !timestamp
        ) {
            return "—";
        }

        return timestamp
            .toDate()
            .toLocaleString();
    }

    /*
     * ==========================================
     * STATUS
     * ==========================================
     */
    function getStatus(
        chat: ChatItem
    ) {
        if (
            !chat.isActive
        ) {
            return {
                label:
                    "Closed",

                className:
                    "bg-slate-200 text-slate-700",
            };
        }

        if (
            isOverdue(
                chat
            )
        ) {
            return {
                label:
                    "Overdue",

                className:
                    "bg-amber-100 text-amber-800",
            };
        }

        return {
            label:
                "Active",

            className:
                "bg-emerald-100 text-emerald-700",
        };
    }

    /*
     * ==========================================
     * LOADING
     * ==========================================
     */
    if (
        checkingAdmin ||
        loading
    ) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">

                <div className="mx-auto max-w-7xl">

                    <p className="text-slate-600">
                        Loading chats...
                    </p>

                </div>

            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-8">

            <div className="mx-auto max-w-7xl">

                {/* HEADER */}

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <p className="text-sm font-semibold text-emerald-600">
                            Admin
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-slate-900">
                            Session management
                        </h1>

                        <p className="mt-2 max-w-3xl text-slate-600">
                            Monitor tutoring sessions. Sessions are not
                            automatically closed after a fixed time. Admin can
                            review overdue sessions and close them when needed.
                        </p>

                    </div>

                    <Link
                        href="/admin/dashboard"
                        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Back to dashboard
                    </Link>

                </div>

                {/* COUNTS */}

                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                    <DashboardCard
                        title="Total sessions"
                        count={
                            chats.length
                        }
                        styleName="text-slate-900"
                    />

                    <DashboardCard
                        title="Active"
                        count={
                            activeCount
                        }
                        styleName="text-emerald-600"
                    />

                    <DashboardCard
                        title="Overdue"
                        count={
                            overdueCount
                        }
                        styleName="text-amber-600"
                    />

                    <DashboardCard
                        title="Closed"
                        count={
                            closedCount
                        }
                        styleName="text-slate-700"
                    />

                    <DashboardCard
                        title="Awaiting review"
                        count={
                            reviewPendingCount
                        }
                        styleName="text-blue-600"
                    />

                </div>

                {/* INFORMATION */}

                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

                    <h2 className="font-bold text-blue-900">
                        How session closing works
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-blue-800">
                        Students can end their sessions themselves. If a
                        tutoring session remains active after its agreed end
                        date and time, it will be marked as overdue here.
                        Admin can then review and manually close the session.
                    </p>

                </div>

                {/* SUCCESS */}

                {success && (

                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                        {success}
                    </div>

                )}

                {/* ERROR */}

                {error && (

                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>

                )}

                {/* SEARCH / FILTER */}

                <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

                    <div className="flex flex-col gap-4 lg:flex-row">

                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search student, tutor, proposal or payment..."
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />

                        <select
                            value={
                                filter
                            }
                            onChange={(
                                event
                            ) =>
                                setFilter(
                                    event.target.value as ChatFilter
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-600"
                        >

                            <option value="all">
                                All sessions
                            </option>

                            <option value="active">
                                Active
                            </option>

                            <option value="overdue">
                                Overdue
                            </option>

                            <option value="closed">
                                Closed
                            </option>

                            <option value="review_pending">
                                Awaiting review
                            </option>

                        </select>

                    </div>

                </div>

                {/* TABLE */}

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

                    {filteredChats.length ===
                    0 ? (

                        <div className="p-10 text-center">

                            <p className="font-semibold text-slate-800">
                                No sessions found
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                No tutoring sessions match this filter.
                            </p>

                        </div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-slate-100">

                                    <tr>

                                        <TableHeading>
                                            Student
                                        </TableHeading>

                                        <TableHeading>
                                            Tutor
                                        </TableHeading>

                                        <TableHeading>
                                            Status
                                        </TableHeading>

                                        <TableHeading>
                                            Scheduled end
                                        </TableHeading>

                                        <TableHeading>
                                            Review
                                        </TableHeading>

                                        <TableHeading>
                                            Last message
                                        </TableHeading>

                                        <TableHeading>
                                            Action
                                        </TableHeading>

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-200">

                                    {filteredChats.map(
                                        (
                                            chat
                                        ) => {
                                            const status =
                                                getStatus(
                                                    chat
                                                );

                                            const scheduledEnd =
                                                getScheduledEnd(
                                                    chat
                                                );

                                            const review =
                                                getReview(
                                                    chat
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        chat.id
                                                    }
                                                    className={`hover:bg-slate-50 ${
                                                        isOverdue(
                                                            chat
                                                        )
                                                            ? "bg-amber-50/40"
                                                            : ""
                                                    }`}
                                                >

                                                    {/* STUDENT */}

                                                    <td className="px-5 py-5">

                                                        <p className="font-semibold text-slate-900">
                                                            {
                                                                chat.studentName
                                                            }
                                                        </p>

                                                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                                            {
                                                                chat.studentId
                                                            }
                                                        </p>

                                                    </td>

                                                    {/* TUTOR */}

                                                    <td className="px-5 py-5">

                                                        <p className="font-semibold text-slate-900">
                                                            {
                                                                chat.tutorName
                                                            }
                                                        </p>

                                                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                                            {
                                                                chat.tutorId
                                                            }
                                                        </p>

                                                    </td>

                                                    {/* STATUS */}

                                                    <td className="px-5 py-5">

                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                                                        >
                                                            {
                                                                status.label
                                                            }
                                                        </span>

                                                        {isOverdue(
                                                            chat
                                                        ) && (

                                                            <p className="mt-2 text-xs font-semibold text-amber-700">
                                                                ⚠ Needs admin review
                                                            </p>

                                                        )}

                                                        {!chat.isActive &&
                                                            chat.endedReason && (

                                                            <p className="mt-2 text-xs text-slate-500">
                                                                {
                                                                    formatEndReason(
                                                                        chat.endedReason
                                                                    )
                                                                }
                                                            </p>

                                                        )}

                                                    </td>

                                                    {/* SCHEDULED END */}

                                                    <td className="whitespace-nowrap px-5 py-5">

                                                        <p className="text-sm font-medium text-slate-700">

                                                            {scheduledEnd
                                                                ? scheduledEnd.toLocaleString()
                                                                : "Not available"}

                                                        </p>

                                                        {!scheduledEnd && (

                                                            <p className="mt-1 text-xs text-slate-400">
                                                                No agreed end time found
                                                            </p>

                                                        )}

                                                    </td>

                                                    {/* REVIEW */}

                                                    <td className="px-5 py-5">

                                                        {review ? (

                                                            <div>

                                                                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                                    Reviewed
                                                                </span>

                                                                <p className="mt-2 text-sm font-semibold text-amber-500">
                                                                    {"★".repeat(
                                                                        Math.max(
                                                                            0,
                                                                            Math.min(
                                                                                5,
                                                                                review.rating
                                                                            )
                                                                        )
                                                                    )}
                                                                </p>

                                                            </div>

                                                        ) : (

                                                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                                Not reviewed
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* LAST MESSAGE */}

                                                    <td className="max-w-xs px-5 py-5">

                                                        <p className="max-w-[220px] truncate text-sm text-slate-700">
                                                            {chat.lastMessage ||
                                                                "No messages yet"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {
                                                                formatTimestamp(
                                                                    chat.lastMessageAt
                                                                )
                                                            }
                                                        </p>

                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex min-w-[150px] flex-col gap-2">

                                                            <Link
                                                                href={`/admin/chats/${chat.id}`}
                                                                className="inline-flex justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                                            >
                                                                View chat
                                                            </Link>

                                                            {chat.isActive && (

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCloseSession(
                                                                            chat
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        closingChatId ===
                                                                        chat.id
                                                                    }
                                                                    className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                                                                        isOverdue(
                                                                            chat
                                                                        )
                                                                            ? "bg-red-600 hover:bg-red-700"
                                                                            : "bg-slate-700 hover:bg-slate-800"
                                                                    }`}
                                                                >
                                                                    {closingChatId ===
                                                                    chat.id
                                                                        ? "Closing..."
                                                                        : "Close session"}
                                                                </button>

                                                            )}

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

            </div>

        </main>
    );
}

/*
 * ==========================================
 * DASHBOARD CARD
 * ==========================================
 */
function DashboardCard({
    title,
    count,
    styleName,
}: {
    title: string;
    count: number;
    styleName: string;
}) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
                {title}
            </p>

            <p
                className={`mt-2 text-3xl font-bold ${styleName}`}
            >
                {count}
            </p>

        </div>
    );
}

/*
 * ==========================================
 * TABLE HEADING
 * ==========================================
 */
function TableHeading({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            {children}
        </th>
    );
}

/*
 * ==========================================
 * DATE + TIME PARSER
 * ==========================================
 */
function parseDateTime(
    dateText: string,
    timeText: string
): Date | null {
    const cleanDate =
        String(
            dateText ?? ""
        ).trim();

    const cleanTime =
        String(
            timeText ?? ""
        ).trim();

    if (
        !cleanDate
    ) {
        return null;
    }

    let year = 0;
    let month = 0;
    let day = 0;

    /*
     * YYYY-MM-DD
     */
    const isoMatch =
        cleanDate.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/
        );

    if (
        isoMatch
    ) {
        year =
            Number(
                isoMatch[1]
            );

        month =
            Number(
                isoMatch[2]
            );

        day =
            Number(
                isoMatch[3]
            );
    } else {
        /*
         * DD/MM/YY
         * DD/MM/YYYY
         */
        const slashMatch =
            cleanDate.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/
            );

        if (
            !slashMatch
        ) {
            return null;
        }

        day =
            Number(
                slashMatch[1]
            );

        month =
            Number(
                slashMatch[2]
            );

        year =
            Number(
                slashMatch[3]
            );

        if (
            year <
            100
        ) {
            year +=
                2000;
        }
    }

    let hours =
        23;

    let minutes =
        59;

    if (
        cleanTime
    ) {
        /*
         * 17:30
         */
        const twentyFourHour =
            cleanTime.match(
                /^(\d{1,2}):(\d{2})$/
            );

        /*
         * 5:30 PM
         */
        const twelveHour =
            cleanTime.match(
                /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
            );

        if (
            twelveHour
        ) {
            hours =
                Number(
                    twelveHour[1]
                );

            minutes =
                Number(
                    twelveHour[2]
                );

            const meridiem =
                twelveHour[3]
                    .toUpperCase();

            if (
                meridiem ===
                    "PM" &&
                hours !==
                    12
            ) {
                hours +=
                    12;
            }

            if (
                meridiem ===
                    "AM" &&
                hours ===
                    12
            ) {
                hours =
                    0;
            }
        } else if (
            twentyFourHour
        ) {
            hours =
                Number(
                    twentyFourHour[1]
                );

            minutes =
                Number(
                    twentyFourHour[2]
                );
        }
    }

    const result =
        new Date(
            year,
            month - 1,
            day,
            hours,
            minutes,
            0,
            0
        );

    if (
        Number.isNaN(
            result.getTime()
        )
    ) {
        return null;
    }

    return result;
}

/*
 * ==========================================
 * END REASON
 * ==========================================
 */
function formatEndReason(
    reason: string
) {
    const normalized =
        String(
            reason ?? ""
        )
            .trim()
            .toLowerCase();

    if (
        normalized ===
        "admin_closed"
    ) {
        return "Closed by admin";
    }

    if (
        normalized ===
        "student_ended"
    ) {
        return "Ended by student";
    }

    if (
        normalized ===
        "expired"
    ) {
        return "Previously auto-expired";
    }

    return reason
        .replaceAll(
            "_",
            " "
        );
}