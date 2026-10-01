import 'react-native-get-random-values';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.73:8000/api';
const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? 'oo7wrw5fvios0uspuzmd';
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST ?? '192.168.100.73';
const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080);

const BASE_URL = API_URL.replace(/\/api\/?$/, '');

let echoInstance: any = null;

export function createEcho() {
    if (echoInstance) return echoInstance;

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: REVERB_APP_KEY,
        wsHost: REVERB_HOST,
        wsPort: REVERB_PORT,
        wssPort: REVERB_PORT,
        forceTLS: false,
        enabledTransports: ['ws'],
        Pusher, // ← pass the imported Pusher explicitly

        authorizer: (channel: any) => ({
            authorize: async (socketId: string, callback: (error: any, data: any) => void) => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    const response = await fetch(`${BASE_URL}/broadcasting/auth`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({
                            socket_id: socketId,
                            channel_name: channel.name,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Auth failed: ${response.status}`);
                    }

                    const data = await response.json();
                    callback(null, data);
                } catch (error) {
                    console.log('[Echo] Authorizer error:', error);
                    callback(error, null);
                }
            },
        }),
    });

    return echoInstance;
}

export function getEcho() {
    return echoInstance;
}

export function disconnectEcho() {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
}