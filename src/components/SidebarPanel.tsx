import { CheckSquare, Calendar, StickyNote, Briefcase, X, ChevronDown, MessageCircle, Settings, Columns2, GitBranch, CalendarDays } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SidebarPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onToggleChat: () => void;
    isChatOpen: boolean;
    width: number;
    onResize: (width: number) => void;
}

const navItems = [
    { path: '/jobs', icon: Briefcase, label: 'Jobs', shortcut: '⌘3' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks', shortcut: '⌘4' },
    { path: '/events', icon: CalendarDays, label: 'Events', shortcut: '⌘5' },
    { path: '/notes', icon: StickyNote, label: 'Notes', shortcut: '⌘6' },
];

export function SidebarPanel({ isOpen, onClose, onToggleChat, isChatOpen, width, onResize }: SidebarPanelProps) {
    const location = useLocation();
    const [isNavExpanded, setIsNavExpanded] = useState(true);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            onResize(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onResize]);

    if (!isOpen) return null;

    const renderExplorer = () => (
        <div style={{ padding: '0' }}>
            {/* Worktree - Separate Element */}
            <NavLink
                to="/"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    color: location.pathname === '/' ? '#3FB950' : '#3FB950',
                    background: location.pathname === '/' ? 'var(--bg-hover)' : 'transparent',
                    fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                    if (location.pathname !== '/') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (location.pathname !== '/') {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                <GitBranch size={16} style={{ color: '#3FB950' }} />
                <span style={{ flex: 1, color: '#3FB950' }}>Worktree</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⌘1</span>
            </NavLink>

            {/* Calendar - Separate Element */}
            <NavLink
                to="/calendar"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    color: location.pathname === '/calendar' ? '#A371F7' : '#A371F7',
                    background: location.pathname === '/calendar' ? 'var(--bg-hover)' : 'transparent',
                    fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                    if (location.pathname !== '/calendar') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (location.pathname !== '/calendar') {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                <Calendar size={16} style={{ color: '#A371F7' }} />
                <span style={{ flex: 1, color: '#A371F7' }}>Calendar</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⌘2</span>
            </NavLink>

            {/* Project Header */}
            <div 
                style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    marginTop: '8px',
                }}
                onClick={() => setIsNavExpanded(!isNavExpanded)}
            >
                <ChevronDown size={16} style={{ transform: isNavExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                WORK-TRACKER
            </div>

            {/* Navigation Items */}
            {isNavExpanded && (
                <nav style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px 6px 20px',
                                fontSize: '13px',
                                textDecoration: 'none',
                                color: location.pathname === item.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: location.pathname === item.path ? 'var(--bg-hover)' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== item.path) {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== item.path) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <item.icon size={16} />
                            <span style={{ flex: 1 }}>{item.label}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.shortcut}</span>
                        </NavLink>
                    ))}
                </nav>
            )}
        </div>
    );

    return (
        <aside 
            ref={sidebarRef}
            style={{
                width: `${width}px`,
                minWidth: '150px',
                maxWidth: '400px',
                height: '100%',
                background: 'var(--bg-sidebar)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Resize Handle */}
            <div
                onMouseDown={() => setIsResizing(true)}
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'ew-resize',
                    background: isResizing ? 'var(--accent)' : 'transparent',
                    zIndex: 10,
                }}
                onMouseEnter={(e) => {
                    if (!isResizing) e.currentTarget.style.background = 'var(--border)';
                }}
                onMouseLeave={(e) => {
                    if (!isResizing) e.currentTarget.style.background = 'transparent';
                }}
            />
            {/* Panel Header */}
            <div style={{
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>EXPLORER</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Panel Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderExplorer()}
            </div>

            {/* Bottom Actions */}
            <div style={{
                borderTop: '1px solid var(--border)',
                padding: '8px',
                display: 'flex',
                gap: '4px',
            }}>
                <button
                    onClick={onToggleChat}
                    title="Toggle Chat (⌘⌥B)"
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        background: isChatOpen ? 'var(--bg-hover)' : 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    <MessageCircle size={14} />
                    Chat
                </button>
                <button
                    onClick={() => onResize(220)}
                    title="Reset Sidebar Width"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 8px',
                        background: width === 220 ? 'var(--bg-hover)' : 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                    }}
                >
                    <Columns2 size={14} />
                </button>
                <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 8px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                    }}
                >
                    <Settings size={14} />
                </button>
            </div>
        </aside>
    );
}
