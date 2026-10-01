import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, AppNotification } from '../hooks/useNotifications';

interface Props {
    userId: number | string | null | undefined;
}

export default function NotificationBell({ userId }: Props) {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);

    const handlePress = (n: AppNotification) => {
        markAsRead(n);
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(true)}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 9999, position: 'relative' }}
            >
                <Ionicons name="notifications-outline" size={24} color="white" />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.sheet} onPress={() => {}}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Notifications</Text>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={styles.markAll}>Mark all read</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => String(item.id)}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Ionicons name="notifications-off-outline" size={32} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>No notifications yet</Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const d = item.data ?? item;
                                const isUnread = !item.read_at;
                                return (
                                    <TouchableOpacity
                                        style={[styles.row, isUnread && styles.rowUnread]}
                                        onPress={() => handlePress(item)}
                                    >
                                        <View style={styles.rowContent}>
                                            <Text style={[styles.rowTitle, isUnread && styles.rowTitleUnread]}>
                                                {d.title ?? 'Notification'}
                                            </Text>
                                            <Text style={styles.rowMessage}>{d.message ?? ''}</Text>
                                            <Text style={styles.rowTime}>
                                                {new Date(item.created_at).toLocaleString()}
                                            </Text>
                                        </View>
                                        {isUnread && <View style={styles.unreadDot} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: 2,
        right: 0,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 16, fontWeight: '700', color: '#111827' },
    markAll: { fontSize: 12, color: '#EC4899', fontWeight: '600' },
    empty: { alignItems: 'center', padding: 40 },
    emptyText: { color: '#9CA3AF', marginTop: 8, fontSize: 13 },
    row: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    rowUnread: { backgroundColor: '#FDF2F8' },
    rowContent: { flex: 1 },
    rowTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
    rowTitleUnread: { fontWeight: '700', color: '#111827' },
    rowMessage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    rowTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EC4899', marginTop: 6 },
});