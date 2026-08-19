"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string;
  route: string;
  proposalId: string;
  jobProposalId: string;
  isRead: boolean;
  createdAt?: Timestamp;
}

export default function TutorNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeNotifications: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const notificationsQuery = query(
        collection(firestore, "notifications"),
        where("userId", "==", user.uid)
      );

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationList = snapshot.docs.map((notificationDocument) => {
            const data = notificationDocument.data();

            return {
              id: notificationDocument.id,
              title: data.title ?? "Notification",
              message: data.message ?? "",
              type: data.type ?? "",
              userId: data.userId ?? "",
              route: data.route ?? "",
              proposalId: data.proposalId ?? "",
              jobProposalId: data.jobProposalId ?? "",
              isRead: data.isRead ?? false,
              createdAt: data.createdAt,
            } as Notification;
          });

          notificationList.sort((first, second) => {
            const firstTime = first.createdAt?.toMillis?.() ?? 0;
            const secondTime = second.createdAt?.toMillis?.() ?? 0;

            return secondTime - firstTime;
          });

          setNotifications(notificationList);
          setError("");
          setLoading(false);
        },
        (notificationError) => {
          console.error(
            "Tutor notification loading error:",
            notificationError
          );

          setError("Unable to load your notifications.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications?.();
    };
  }, [router]);

  async function handleNotificationClick(
    notification: Notification
  ) {
    try {
      if (!notification.isRead) {
        await updateDoc(
          doc(firestore, "notifications", notification.id),
          {
            isRead: true,
          }
        );
      }
    } catch (updateError) {
      console.error(
        "Notification update error:",
        updateError
      );
    }

    const destination = getNotificationDestination(notification);

    if (destination) {
      router.push(destination);
    }
  }

  async function markAllAsRead() {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead
    );

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(
            doc(firestore, "notifications", notification.id),
            {
              isRead: true,
            }
          )
        )
      );
    } catch (updateError) {
      console.error(
        "Mark all notifications error:",
        updateError
      );

      setError("Unable to mark all notifications as read.");
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/tutor/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
            Unitor
          </Link>

          <Link
            href="/tutor/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-medium text-unitor-primary">
              Updates
            </p>

            <h1 className="mt-2 text-3xl font-bold text-unitor-black">
              Notifications
            </h1>

            <p className="mt-3 text-unitor-gray-dark">
              Check application, payment and session updates.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-lg border border-unitor-primary px-4 py-2 font-medium text-unitor-primary hover:bg-unitor-background"
            >
              Mark all as read
            </button>
          )}
        </div>

        {unreadCount > 0 && (
          <p className="mt-6 text-sm font-medium text-unitor-primary-hover">
            {unreadCount} unread{" "}
            {unreadCount === 1 ? "notification" : "notifications"}
          </p>
        )}

        {loading && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-unitor-gray-dark">
              Loading notifications...
            </p>
          </section>
        )}

        {error && (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🔔</div>

            <h2 className="mt-5 text-2xl font-bold text-unitor-black">
              No notifications
            </h2>

            <p className="mt-3 text-unitor-gray-dark">
              Your tutor updates will appear here.
            </p>
          </section>
        )}

        {!loading && notifications.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-unitor-gray-light bg-white shadow-sm">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  handleNotificationClick(notification)
                }
                className={`flex w-full gap-4 border-b border-unitor-gray-soft p-5 text-left transition last:border-b-0 hover:bg-unitor-background ${
                  notification.isRead
                    ? "bg-white"
                    : "bg-unitor-background/60"
                }`}
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl ${getNotificationIconStyle(
                    notification.type
                  )}`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2
                      className={`text-base text-unitor-black ${
                        notification.isRead
                          ? "font-medium"
                          : "font-bold"
                      }`}
                    >
                      {notification.title}
                    </h2>

                    {!notification.isRead && (
                      <span className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-unitor-primary" />
                    )}
                  </div>

                  <p className="mt-1 leading-6 text-unitor-gray-dark">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-unitor-gray-dark/70">
                    {formatNotificationTime(
                      notification.createdAt
                    )}
                  </p>
                </div>

                <span className="self-center text-xl text-unitor-gray-dark/70">
                  ›
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function getNotificationDestination(
  notification: Notification
) {
  const type = notification.type.toLowerCase();

  if (type === "chat") {
    return "/tutor/messages";
  }

  if (
    type === "payment" ||
    type === "session_completed" ||
    type === "rating"
  ) {
    return "/tutor/applications";
  }

  if (
    type === "tutor_application" ||
    type === "admin"
  ) {
    return "/tutor/profile";
  }

  if (notification.proposalId) {
    return `/tutor/proposals/${notification.proposalId}`;
  }

  return "/tutor/dashboard";
}

function getNotificationIcon(type: string) {
  switch (type.toLowerCase()) {
    case "tutor_application":
      return "🎓";

    case "payment":
      return "💳";

    case "chat":
      return "💬";

    case "session_completed":
      return "✅";

    case "rating":
      return "⭐";

    case "admin":
      return "🛡️";

    default:
      return "🔔";
  }
}

function getNotificationIconStyle(type: string) {
  switch (type.toLowerCase()) {
    case "payment":
      return "bg-unitor-blue-light text-unitor-primary-hover";

    case "chat":
      return "bg-unitor-blue-light text-unitor-primary-hover";

    case "session_completed":
      return "bg-green-100 text-green-700";

    case "rating":
      return "bg-amber-100 text-amber-700";

    case "admin":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-unitor-gray-soft text-unitor-gray-dark";
  }
}

function formatNotificationTime(timestamp?: Timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = timestamp.toDate();
  const now = new Date();

  const difference = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}