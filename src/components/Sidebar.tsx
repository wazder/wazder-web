import { useState, useEffect } from 'react';
import { MessageCircle, PanelLeft } from 'lucide-react';

const PAGE_INFO: Record<string, { name: string; emoji: string }> = {
    '/': { name: 'Worktree', emoji: '🌳' },
    '/jobs': { name: 'Jobs', emoji: '💼' },
    '/tasks': { name: 'Tasks', emoji: '✅' },
    '/events': { name: 'Events', emoji: '📅' },
    '/calendar': { name: 'Calendar', emoji: '🗓️' },
    '/notes': { name: 'Notes', emoji: '📝' },
};

interface StatusBarProps {
    isChatOpen: boolean;
    onToggleChat: () => void;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    currentPath: string;
}

export function StatusBar({ isChatOpen, onToggleChat, onToggleSidebar, currentPath }: StatusBarProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const pageInfo = PAGE_INFO[currentPath] || PAGE_INFO['/'];

    return (
        <footer style={{
            height: 'var(--statusbar-height)',
            background: 'var(--bg-statusbar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
        }}>
            {/* Left items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                    onClick={onToggleSidebar}
                    className="statusbar-item"
                    style={{ border: 'none', background: 'none', color: 'white' }}
                    title="Toggle Sidebar (⌘B)"
                >
                    <PanelLeft size={14} />
                </button>
                <span className="statusbar-item">
                    {pageInfo.emoji} {pageInfo.name}
                </span>
            </div>

            {/* Right items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span className="statusbar-item">
                    {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <button
                    onClick={onToggleChat}
                    className="statusbar-item"
                    style={{ border: 'none', background: 'none', color: 'white' }}
                    title="Toggle Chat (⌘⌥B)"
                >
                    <MessageCircle size={14} />
                    {isChatOpen ? 'Hide Chat' : 'Llama 3.3 70B'}
                </button>
            </div>
        </footer>
    );
}
