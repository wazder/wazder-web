import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { StatusBar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { SidebarPanel } from './SidebarPanel';
import { useSpotify } from '../hooks/useSpotify';
import { useAuth } from '../contexts/AuthContext';

const pageShortcuts: Record<string, string> = {
    '1': '/',
    '2': '/calendar',
    '3': '/jobs',
    '4': '/tasks',
    '5': '/events',
    '6': '/notes',
};

export function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoggedIn, currentTrack, login, logout, isConnected } = useSpotify();
    const { user, signOut } = useAuth();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(220);

    // Prevent browser back/forward swipe and page zoom on macOS
    useEffect(() => {
        const preventBrowserGestures = (e: WheelEvent) => {
            // Always prevent horizontal scroll to avoid browser back/forward navigation
            if (Math.abs(e.deltaX) > 5) {
                e.preventDefault();
            }
            // Prevent browser zoom on pinch
            if (e.ctrlKey) {
                e.preventDefault();
            }
        };

        const preventGestureZoom = (e: Event) => {
            e.preventDefault();
        };

        // Prevent touch swipe navigation
        let touchStartX = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchX = e.touches[0].clientX;
            const diff = touchX - touchStartX;
            // Prevent swipe if starting from edge of screen (browser back/forward gesture)
            if (touchStartX < 30 || touchStartX > window.innerWidth - 30) {
                if (Math.abs(diff) > 10) {
                    e.preventDefault();
                }
            }
        };

        // Add listeners with { passive: false } to allow preventDefault
        document.addEventListener('wheel', preventBrowserGestures, { passive: false });
        document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
        document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
        document.addEventListener('gestureend', preventGestureZoom, { passive: false });
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('wheel', preventBrowserGestures);
            document.removeEventListener('gesturestart', preventGestureZoom);
            document.removeEventListener('gesturechange', preventGestureZoom);
            document.removeEventListener('gestureend', preventGestureZoom);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Toggle chat with Cmd+Option+B (use code for reliable detection)
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyB') {
                e.preventDefault();
                e.stopPropagation();
                setIsChatOpen(prev => !prev);
                return;
            }
            // Toggle sidebar with Cmd+B (without Alt)
            if ((e.metaKey || e.ctrlKey) && !e.altKey && e.code === 'KeyB') {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(prev => !prev);
                return;
            }
            // Page shortcuts
            if ((e.metaKey || e.ctrlKey) && !e.altKey && pageShortcuts[e.key]) {
                e.preventDefault();
                navigate(pageShortcuts[e.key]);
                return;
            }
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [navigate]);

    const toggleChat = () => setIsChatOpen(prev => !prev);
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    const handleSidebarResize = (newWidth: number) => {
        setSidebarWidth(Math.max(150, Math.min(400, newWidth)));
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            overflow: 'hidden', 
            background: 'var(--bg-primary)' 
        }}>
            {/* Title Bar */}
            <div style={{
                height: 'var(--titlebar-height)',
                background: 'var(--bg-titlebar)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--border)',
                WebkitAppRegion: 'drag',
                userSelect: 'none',
                position: 'relative',
            } as React.CSSProperties}>
                {/* Logo */}
                <div style={{
                    position: 'absolute',
                    left: '8px',
                    width: '22px',
                    height: '22px',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <span style={{
                        fontFamily: '"Times New Roman", Times, Georgia, serif',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        lineHeight: 1,
                    }}>W</span>
                </div>
                
                {/* Spotify */}
                {!isLoggedIn ? (
                    <button
                        onClick={login}
                        style={{
                            WebkitAppRegion: 'no-drag',
                            background: '#1DB954',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        } as React.CSSProperties}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Connect Spotify
                    </button>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        maxWidth: '300px',
                    }}>
                        {currentTrack ? (
                            <>
                                {currentTrack.albumArt && (
                                    <img
                                        src={currentTrack.albumArt}
                                        alt=""
                                        style={{ width: '20px', height: '20px', borderRadius: '3px' }}
                                    />
                                )}
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: currentTrack.isPlaying ? '#1DB954' : 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {currentTrack.isPlaying ? '♫ ' : '⏸ '}
                                        {currentTrack.name} — {currentTrack.artist}
                                    </div>
                                </div>
                            </>
                        ) : isConnected ? (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                No track playing
                            </span>
                        ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Connecting...
                            </span>
                        )}
                        <button
                            onClick={logout}
                            style={{
                                WebkitAppRegion: 'no-drag',
                                background: 'none',
                                border: 'none',
                                fontSize: '10px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                opacity: 0.6,
                            } as React.CSSProperties}
                            title="Disconnect Spotify"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* User Profile */}
                <div style={{
                    position: 'absolute',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {user?.email?.split('@')[0]}
                    </span>
                    <button
                        onClick={signOut}
                        style={{
                            WebkitAppRegion: 'no-drag',
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '10px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        } as React.CSSProperties}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar Panel */}
                <SidebarPanel 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    onToggleChat={toggleChat}
                    isChatOpen={isChatOpen}
                    width={sidebarWidth}
                    onResize={handleSidebarResize}
                />

                {/* Editor Area */}
                <main style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'var(--bg-primary)',
                }}>
                    {/* Content */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px 20px',
                    }}>
                        <Outlet />
                    </div>
                </main>

                {/* Chat Panel */}
                <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            </div>

            {/* Status Bar */}
            <StatusBar 
                isChatOpen={isChatOpen} 
                onToggleChat={toggleChat}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
                currentPath={location.pathname}
            />
        </div>
    );
}
