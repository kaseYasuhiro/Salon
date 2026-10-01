import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEcho } from '../services/echo';

export interface AppNotification {
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
}

export function useNotifications(userId?: number | string | null, onNew?: (n: AppNotification) => void) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    // Keep the latest `onNew` in a ref so the subscription effect below
    // never re-runs when the parent re-renders with a fresh callback.
    const onNewRef = useRef(onNew);
    useEffect(() => {
        onNewRef.current = onNew;
    }, [onNew]);

    // ── Load persisted notifications ──
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const token = await AsyncStorage.getItem('token');
                const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
                const res = await fetch(`${apiUrl}/notifications`, {
                    headers: {
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data)) setNotifications(data);
            } catch (err) {
                console.log('[Notifications] Load error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    // ── Subscribe to Reverb (lazy init) ──
    // Note: only `userId` is in the dependency array.
    // `onNew` is accessed through `onNewRef` so that changing the callback
    // does NOT unsubscribe and resubscribe (which was losing notifications).
    useEffect(() => {
        if (!userId) return;

        const echo = createEcho();
        const channelName = `App.Models.User.${userId}`;
        console.log('[Echo] Subscribing to', channelName);

        const channel = echo.private(channelName);
        channel.notification((notification: any) => {
            console.log('[Echo] Notification received:', notification);
            const entry: AppNotification = {
                id: notification.id ?? `local-${Date.now()}`,
                type: notification.type ?? 'notification',
                data: notification.data ?? notification,
                read_at: null,
                created_at: new Date().toISOString(),
            };
            setNotifications((prev) => [entry, ...prev]);
            onNewRef.current?.(entry);
        });

        return () => {
            console.log('[Echo] Leaving', channelName);
            echo.leave(channelName);
        };
    }, [userId]);

    // ── Mark ONE notification as read ──
    const markAsRead = async (n: AppNotification) => {
        if (n.read_at) return;

        const optimisticReadAt = new Date().toISOString();
        setNotifications((prev) =>
            prev.map((item) =>
                item.id === n.id ? { ...item, read_at: optimisticReadAt } : item
            )
        );

        try {
            const token = await AsyncStorage.getItem('token');
            const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
            const res = await fetch(`${apiUrl}/notifications/${n.id}/read`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) throw new Error(`Status ${res.status}`);
        } catch (err) {
            console.log('[Notifications] markAsRead error:', err);
            setNotifications((prev) =>
                prev.map((item) =>
                    item.id === n.id ? { ...item, read_at: null } : item
                )
            );
        }
    };

    // ── Mark ALL notifications as read ──
    const markAllAsRead = async () => {
        const snapshot = notifications;

        const optimisticReadAt = new Date().toISOString();
        setNotifications((prev) =>
            prev.map((item) => ({
                ...item,
                read_at: item.read_at ?? optimisticReadAt,
            }))
        );

        try {
            const token = await AsyncStorage.getItem('token');
            const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
            const res = await fetch(`${apiUrl}/notifications/read-all`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) throw new Error(`Status ${res.status}`);
        } catch (err) {
            console.log('[Notifications] markAllAsRead error:', err);
            setNotifications(snapshot);
        }
    };

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}