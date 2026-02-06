import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import type { Event } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Calendar() {
    const { addEvent, deleteEvent, getEventsForDate } = useEvents();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<Event>>({ type: 'work', time: '09:00' });

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setNewEvent(prev => ({ ...prev, date: dateStr }));
    };

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEvent.title && newEvent.date && newEvent.time && newEvent.type) {
            addEvent(newEvent as Omit<Event, 'id'>);
            setIsAdding(false);
            setNewEvent({ type: 'work', time: '09:00', date: selectedDate || '' });
        }
    };

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Calendar</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Schedule your meetings and events</p>
                </div>
                <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                    <button onClick={prevMonth} style={{ padding: '0.5rem', color: 'var(--text-primary)' }}><ChevronLeft size={20} /></button>
                    <span style={{ margin: '0 1rem', fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>
                        {MONTHS[month]} {year}
                    </span>
                    <button onClick={nextMonth} style={{ padding: '0.5rem', color: 'var(--text-primary)' }}><ChevronRight size={20} /></button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
                {/* Calendar Grid */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '1rem' }}>
                        {DAYS.map(d => (
                            <div key={d} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>
                                {d}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: '0.5rem', flex: 1 }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = selectedDate === dateStr;
                            const isToday = new Date().toISOString().split('T')[0] === dateStr;
                            const dayEvents = getEventsForDate(dateStr);

                            return (
                                <div
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    className="glass"
                                    style={{
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--accent)' : isToday ? 'hsla(var(--hue), 20%, 30%, 0.4)' : undefined,
                                        border: isSelected ? '1px solid var(--accent)' : undefined,
                                        display: 'flex', flexDirection: 'column'
                                    }}
                                >
                                    <span style={{ fontWeight: 500, opacity: isSelected ? 1 : 0.7 }}>{day}</span>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                        {dayEvents.map(ev => (
                                            <div key={ev.id} title={ev.title} style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: ev.type === 'meeting' ? 'var(--warning)' : ev.type === 'personal' ? 'var(--success)' : 'var(--text-primary)'
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Details */}
                <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarIcon size={20} className="text-secondary" />
                            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                        </h3>
                        {selectedDate && (
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{ background: 'var(--accent)', color: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!selectedDate ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
                                Select a date from the grid<br />to view or add events.
                            </div>
                        ) : selectedEvents.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
                                No events scheduled.<br />Click + to add one.
                            </div>
                        ) : (
                            selectedEvents.map(ev => (
                                <div key={ev.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${ev.type === 'meeting' ? 'var(--warning)' : 'var(--text-primary)'}` }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ev.title}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={14} /> {ev.time}
                                        </div>
                                        <span style={{ textTransform: 'capitalize' }}>{ev.type}</span>
                                        <button onClick={() => deleteEvent(ev.id)} style={{ color: 'var(--error)', opacity: 0.6 }}><X size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isAdding && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px', background: 'var(--bg-card)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Add Event</h3>
                        <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                placeholder="Event Title"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="time"
                                    value={newEvent.time}
                                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                />
                                <select
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                >
                                    <option value="meeting">Meeting</option>
                                    <option value="work">Work</option>
                                    <option value="personal">Personal</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsAdding(false)} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>Add Event</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
