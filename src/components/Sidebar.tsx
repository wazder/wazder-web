import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, StickyNote, MessageCircle } from 'lucide-react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/notes', icon: StickyNote, label: 'Notes' },
    { path: '/ai-assistant', icon: MessageCircle, label: 'AI Assistant' },
];

export function BottomBar() {
    return (
        <footer className="glass" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'var(--bottombar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 1rem',
            zIndex: 1000,
            borderTop: '1px solid hsla(var(--hue), 15%, 80%, 0.08)',
            borderRadius: 0,
        }}>
            <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={item.label}
                        className={({ isActive }) =>
                            isActive ? 'bottombar-item active' : 'bottombar-item'
                        }
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '100%',
                            textDecoration: 'none',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            background: isActive ? 'hsla(var(--hue), 15%, 80%, 0.12)' : 'transparent',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                        })}
                    >
                        <item.icon size={16} />
                    </NavLink>
                ))}
            </nav>
        </footer>
    );
}""
