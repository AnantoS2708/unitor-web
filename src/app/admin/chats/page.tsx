"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";

import { firestore } from "@/lib/firebase";

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
    createdAt: Timestamp | null;
    lastMessageAt: Timestamp | null;
    expiresAt: Timestamp | null;
};

export default function AdminChatsPage() {
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<
        "all" | "active" | "inactive" | "expired"
    >("all");

    useEffect(() => {
        const chatsQuery = query(
            collection(firestore, "chats"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            chatsQuery,
            (snapshot) => {
                const loadedChats: ChatItem[] = snapshot.docs.map((chatDoc) => {
                    const data = chatDoc.data();

                    return {
                        id: chatDoc.id,
                        studentId: data.studentId ?? "",
                        studentName: data.studentName ?? "Unknown student",
                        tutorId: data.tutorId ?? "",
                        tutorName: data.tutorName ?? "Unknown tutor",
                        proposalId: data.proposalId ?? "",
                        jobProposalId: data.jobProposalId ?? "",
                        paymentId: data.paymentId ?? "",
                        lastMessage: data.lastMessage ?? "",
                        isActive: data.isActive ?? false,
                        createdAt: data.createdAt ?? null,
                        lastMessageAt: data.lastMessageAt ?? null,
                        expiresAt: data.expiresAt ?? null,
                    };
                });

                setChats(loadedChats);
                setLoading(false);
            },
            (snapshotError) => {
                console.error("Error loading chats:", snapshotError);
                setError("Unable to load chats.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    function isExpired(chat: ChatItem) {
        if (!chat.expiresAt) {
            return false;
        }

        return chat.expiresAt.toDate().getTime() < Date.now();
    }

    const filteredChats = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return chats.filter((chat) => {
            const expired = isExpired(chat);

            if (filter === "active" && (!chat.isActive || expired)) {
                return false;
            }

            if (filter === "inactive" && chat.isActive && !expired) {
                return false;
            }

            if (filter === "expired" && !expired) {
                return false;
            }

            if (!searchText) {
                return true;
            }

            const searchableText = [
                chat.studentName,
                chat.tutorName,
                chat.studentId,
                chat.tutorId,
                chat.proposalId,
                chat.jobProposalId,
                chat.paymentId,
                chat.lastMessage,
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchText);
        });
    }, [chats, search, filter]);

    const activeCount = chats.filter(
        (chat) => chat.isActive && !isExpired(chat)
    ).length;

    const expiredCount = chats.filter((chat) => isExpired(chat)).length;

    const inactiveCount = chats.filter(
        (chat) => !chat.isActive && !isExpired(chat)
    ).length;

    function formatDate(timestamp: Timestamp | null) {
        if (!timestamp) {
            return "—";
        }

        return timestamp.toDate().toLocaleString();
    }

    function getStatus(chat: ChatItem) {
        if (isExpired(chat)) {
            return {
                label: "Expired",
                className: "bg-amber-100 text-amber-700",
            };
        }

        if (chat.isActive) {
            return {
                label: "Active",
                className: "bg-emerald-100 text-emerald-700",
            };
        }

        return {
            label: "Inactive",
            className: "bg-slate-200 text-slate-700",
        };
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl">
                    <p className="text-slate-600">Loading chats...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-emerald-600">
                            Admin
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-slate-900">
                            Chat monitoring
                        </h1>

                        <p className="mt-2 text-slate-600">
                            Monitor tutoring chats created after approved
                            payments.
                        </p>
                    </div>

                    <Link
                        href="/admin/dashboard"
                        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Back to dashboard
                    </Link>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Total chats</p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {chats.length}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Active</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-600">
                            {activeCount}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Inactive</p>
                        <p className="mt-2 text-3xl font-bold text-slate-700">
                            {inactiveCount}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Expired</p>
                        <p className="mt-2 text-3xl font-bold text-amber-600">
                            {expiredCount}
                        </p>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search student, tutor, proposal or payment..."
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />

                        <select
                            value={filter}
                            onChange={(event) =>
                                setFilter(
                                    event.target.value as
                                        | "all"
                                        | "active"
                                        | "inactive"
                                        | "expired"
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-600"
                        >
                            <option value="all">All chats</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    {filteredChats.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="font-semibold text-slate-800">
                                No chats found
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                There are no chat records matching your current
                                search or filter.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Student
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Tutor
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Status
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Last message
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Created
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Expires
                                        </th>

                                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200">
                                    {filteredChats.map((chat) => {
                                        const status = getStatus(chat);

                                        return (
                                            <tr
                                                key={chat.id}
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-5">
                                                    <p className="font-semibold text-slate-900">
                                                        {chat.studentName}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {chat.studentId}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <p className="font-semibold text-slate-900">
                                                        {chat.tutorName}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {chat.tutorId}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </td>

                                                <td className="max-w-xs px-5 py-5">
                                                    <p className="truncate text-sm text-slate-700">
                                                        {chat.lastMessage ||
                                                            "No messages yet"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {formatDate(
                                                            chat.lastMessageAt
                                                        )}
                                                    </p>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                                                    {formatDate(chat.createdAt)}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                                                    {formatDate(chat.expiresAt)}
                                                </td>

                                                <td className="px-5 py-5">
                                                    <Link
                                                        href={`/admin/chats/${chat.id}`}
                                                        className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        View chat
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}