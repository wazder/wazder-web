import { useState, useEffect, useCallback } from 'react';

interface SpotifyTrack {
    name: string;
    artist: string;
    albumArt?: string;
    isPlaying: boolean;
    progress?: number;
    duration?: number;
}

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
// Spotify only has https://wazder.com configured - always use that for OAuth
const REDIRECT_URI = 'https://wazder.com/';
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];

function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export function useSpotify() {
    const [accessToken, setAccessToken] = useState<string | null>(() => {
        return localStorage.getItem('spotify_access_token');
    });
    const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Check for token expiry
    useEffect(() => {
        const expiry = localStorage.getItem('spotify_token_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expiry');
            setAccessToken(null);
        }
    }, []);

    // Handle OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            const codeVerifier = localStorage.getItem('spotify_code_verifier');
            if (codeVerifier) {
                exchangeCodeForToken(code, codeVerifier);
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: SPOTIFY_CLIENT_ID,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier,
                }),
            });

            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
                localStorage.removeItem('spotify_code_verifier');
                setAccessToken(data.access_token);
            }
        } catch (error) {
            console.error('Failed to exchange code for token:', error);
        }
    };

    const login = useCallback(async () => {
        if (!SPOTIFY_CLIENT_ID) {
            alert('Spotify Client ID not configured. Add VITE_SPOTIFY_CLIENT_ID to .env');
            return;
        }

        const codeVerifier = generateRandomString(64);
        localStorage.setItem('spotify_code_verifier', codeVerifier);
        
        const hashed = await sha256(codeVerifier);
        const codeChallenge = base64encode(hashed);

        const params = new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            scope: SCOPES.join(' '),
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiry');
        setAccessToken(null);
        setCurrentTrack(null);
        setIsConnected(false);
    }, []);

    const fetchCurrentTrack = useCallback(async () => {
        if (!accessToken) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.status === 204) {
                // No track playing
                setCurrentTrack(null);
                setIsConnected(true);
                return;
            }

            if (response.status === 401) {
                // Token expired
                logout();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setIsConnected(true);
                
                if (data && data.item) {
                    setCurrentTrack({
                        name: data.item.name,
                        artist: data.item.artists.map((a: any) => a.name).join(', '),
                        albumArt: data.item.album?.images?.[2]?.url || data.item.album?.images?.[0]?.url,
                        isPlaying: data.is_playing,
                        progress: data.progress_ms,
                        duration: data.item.duration_ms,
                    });
                } else {
                    setCurrentTrack(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch current track:', error);
        }
    }, [accessToken, logout]);

    // Poll for currently playing track
    useEffect(() => {
        if (!accessToken) return;

        fetchCurrentTrack();
        const interval = setInterval(fetchCurrentTrack, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [accessToken, fetchCurrentTrack]);

    return {
        isConnected,
        currentTrack,
        login,
        logout,
        isLoggedIn: !!accessToken,
    };
}
