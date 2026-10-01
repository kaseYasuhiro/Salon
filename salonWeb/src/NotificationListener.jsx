import { useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import echo from '../echo';

export default function NotificationListener({ onNotification }) {
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        console.log('🔌 Subscribing to App.Models.User.' + user.id);

        const channel = echo.private(`App.Models.User.${user.id}`)
            .notification((notification) => {
                console.log('🔔 Notification received:', notification);
                if (onNotification) {
                    onNotification(notification);
                }
            });

        return () => {
            echo.leave(`App.Models.User.${user.id}`);
        };
    }, [user?.id, onNotification]);

    return null;
}