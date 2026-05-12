"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { requestFCMToken, onMessageListener } from "@/lib/firebase";
import { toast } from "sonner";
import { sendBrowserNotification } from "@/lib/notifications";

export function FCMProvider() {
  const { user, setUser } = useStore();

  useEffect(() => {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registration successful with scope: ', registration.scope);
        })
        .catch((err) => {
          console.log('Service Worker registration failed: ', err);
        });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const setupFCM = async () => {
      try {
        const token = await requestFCMToken();
        if (token && token !== user.fcm_token) {
          // If token has changed or is new, save to user object and backend
          const updatedUser = { ...user, fcm_token: token };
          await setUser(updatedUser);
          console.log("FCM Token saved to user");
        }
      } catch (error) {
        console.error("FCM Setup failed:", error);
      }
    };

    setupFCM();

    // Listen for foreground messages
    const listen = async () => {
      const payload = await onMessageListener() as { notification?: { title: string, body: string } };
      if (payload?.notification) {
        toast(payload.notification.title, {
          description: payload.notification.body,
        });
        sendBrowserNotification(payload.notification.title, payload.notification.body);
      }
      // Re-register listener
      listen();
    };

    listen();
  }, [user, setUser]); // Only run when user logs in

  return null;
}
