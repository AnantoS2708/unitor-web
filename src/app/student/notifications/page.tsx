"use client";

import { useEffect, useState } from "react";
import { UnitorBrand } from "@/components/UnitorBrand";
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
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  route: string;
  proposalId: string;
  jobProposalId: string;
  createdAt?: Timestamp;
}

export default function StudentNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeNotifications:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
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
            const notificationList =
              snapshot.docs.map((document) => {
                const data = document.data();

                return {
                  id: document.id,
                  userId: data.userId ?? "",
                  title: data.title ?? "Unitor",
                  message: data.message ?? "",
                  type: data.type ?? "default",
                  isRead: data.isRead ?? false,
                  route: data.route ?? "",
                  proposalId: data.proposalId ?? "",
                  jobProposalId:
                    data.jobProposalId ?? "",
                  createdAt: data.createdAt,
                } as Notification;
              });

            notificationList.sort(
              (first, second) => {
                const firstTime =
                  first.createdAt?.toMillis?.() ?? 0;

                const secondTime =
                  second.createdAt?.toMillis?.() ?? 0;

                return secondTime - firstTime;
              }
            );

            setNotifications(notificationList);
            setError("");
            setLoading(false);
          },
          (error) => {
            console.error(
              "Notification loading error:",
              error
            );

            setError(
              "Unable to load your notifications."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications?.();
    };
  }, [router]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  async function handleNotificationClick(
    notification: Notification
  ) {
    try {
      if (!notification.isRead) {
        await updateDoc(
          doc(
            firestore,
            "notifications",
            notification.id
          ),
          {
            isRead: true,
          }
        );
      }

      const destination =
        getNotificationDestination(notification);

      router.push(destination);
    } catch (error) {
      console.error(
        "Notification update error:",
        error
      );

      setError(
        "Unable to open this notification."
      );
    }
  }

  async function handleMarkAllAsRead() {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead
    );

    if (unreadNotifications.length === 0) return;

    setMarkingAll(true);
    setError("");

    try {
      const batch = writeBatch(firestore);

      unreadNotifications.forEach((notification) => {
        batch.update(
          doc(
            firestore,
            "notifications",
            notification.id
          ),
          {
            isRead: true,
          }
        );
      });

      await batch.commit();
    } catch (error) {
      console.error(
        "Mark-all notification error:",
        error
      );

      setError(
        "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="min-h-screen bg-unitor-background">
      <header className="border-b border-unitor-gray-light bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-2xl font-bold text-unitor-primary"
          >
              <UnitorBrand label="Unitor" />
          </Link>

          <Link
            href="/student/dashboard"
            className="font-medium text-unitor-gray-dark hover:text-unitor-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-medium text-unitor-primary">
              Account updates
            </p>

            <h1 className="mt-2 text-3xl font-bold text-unitor-black">
              Notifications
            </h1>

            <p className="mt-3 text-unitor-gray-dark">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount === 1 ? "" : "s"
                  }`
                : "You have no unread notifications."}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="rounded-lg border border-unitor-primary px-4 py-2 font-medium text-unitor-primary hover:bg-unitor-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll
                ? "Updating..."
                : "Mark all as read"}
            </button>
          )}
        </div>

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

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">🔔</div>

              <h2 className="mt-5 text-2xl font-bold text-unitor-black">
                No notifications
              </h2>

              <p className="mt-3 text-unitor-gray-dark">
                New proposal, payment and session updates
                will appear here.
              </p>
            </section>
          )}

        {!loading && notifications.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-unitor-gray-light bg-white shadow-sm">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onClick={() =>
                  handleNotificationClick(
                    notification
                  )
                }
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const appearance =
    getNotificationAppearance(notification.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full gap-4 border-b border-unitor-gray-soft p-5 text-left transition last:border-b-0 hover:bg-unitor-background ${
        notification.isRead
          ? "bg-white"
          : "bg-unitor-background/50"
      }`}
    >
      {!notification.isRead && (
        <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-unitor-primary" />
      )}

      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl ${appearance.classes}`}
      >
        {appearance.icon}
      </div>

      <div className="min-w-0 flex-1 pr-5">
        <h2
          className={`text-unitor-black ${
            notification.isRead
              ? "font-medium"
              : "font-bold"
          }`}
        >
          {notification.title}
        </h2>

        <p className="mt-1 leading-6 text-unitor-gray-dark">
          {notification.message}
        </p>

        <p className="mt-3 text-xs text-unitor-gray-dark/70">
          {formatNotificationDate(
            notification.createdAt
          )}
        </p>
      </div>
    </button>
  );
}

function getNotificationAppearance(type: string) {
  switch (type.toLowerCase()) {
    case "tutor_application":
      return {
        icon: "🎓",
        classes: "bg-unitor-background text-unitor-primary",
      };

    case "payment":
      return {
        icon: "💳",
        classes: "bg-unitor-background text-unitor-primary",
      };

    case "chat":
      return {
        icon: "💬",
        classes: "bg-violet-50 text-violet-600",
      };

    case "session_completed":
      return {
        icon: "✓",
        classes: "bg-green-100 text-green-700",
      };

    case "rating":
      return {
        icon: "★",
        classes: "bg-amber-50 text-amber-600",
      };

    case "admin":
      return {
        icon: "⚙",
        classes: "bg-unitor-gray-soft text-unitor-gray-dark",
      };

    default:
      return {
        icon: "🔔",
        classes: "bg-unitor-gray-soft text-unitor-gray-dark",
      };
  }
}

function getNotificationDestination(
  notification: Notification
) {
  if (notification.proposalId) {
    return `/student/proposals/${notification.proposalId}`;
  }

  if (
    notification.route === "/student-proposals"
  ) {
    return "/student/proposals";
  }

  if (
    notification.route === "/student-messages" ||
    notification.type.toLowerCase() === "chat"
  ) {
    return "/student/messages";
  }

  return "/student/dashboard";
}

function formatNotificationDate(
  timestamp?: Timestamp
) {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const now = new Date();

  const difference = now.getTime() - date.getTime();
  const minutes = Math.floor(
    difference / (1000 * 60)
  );
  const hours = Math.floor(
    difference / (1000 * 60 * 60)
  );
  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
