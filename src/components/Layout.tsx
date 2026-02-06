import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BottomBar } from './Sidebar';

const pageShortcuts: Record<string, string> = {
    '1': '/',
    '2': '/tasks',
    '3': '/calendar',
    '4': '/notes',
    '5': '/ai-assistant',
};

export function Layout() {
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && pageShortcuts[e.key]) {
                e.preventDefault();
                navigate(pageShortcuts[e.key]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [navigate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <main style={{
                flex: 1,
                padding: '2vh',
                paddingBottom: 'calc(var(--bottombar-height) + 1vh)',
                overflowY: 'auto'
            }}>
                <div className="glass" style={{
                    minHeight: 'calc(100vh - 4vh - var(--bottombar-height))',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    position: 'relative'
                }}>
                    <Outlet />
                </div>
            </main>
            <BottomBar />
        </div>
    );
}
