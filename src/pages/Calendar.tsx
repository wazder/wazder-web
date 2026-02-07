import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon, Pencil, MapPin } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { useTaskContext } from '../contexts/TaskContext';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import type { Event } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Calendar() {
    const { addEvent, deleteEvent, updateEvent, getEventsForDate } = useEvents();
    const { jobs } = useTaskContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [newEvent, setNewEvent] = useState<Partial<Event>>({ jobId: '', time: '09:00', endTime: '', location: '' });

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return (day + 6) % 7; // Convert Sunday-first (0-6) to Monday-first (0-6)
    };

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
        if (newEvent.title && newEvent.date && newEvent.time) {
            const eventToAdd = {
                title: newEvent.title,
                date: newEvent.date,
                time: newEvent.time,
                ...(newEvent.jobId ? { jobId: newEvent.jobId } : {}),
                ...(newEvent.endTime ? { endTime: newEvent.endTime } : {}),
                ...(newEvent.location ? { location: newEvent.location } : {})
            };
            addEvent(eventToAdd as Omit<Event, 'id'>);
            resetForm();
        }
    };

    const handleEditEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEvent && newEvent.title && newEvent.time) {
            updateEvent(editingEvent.id, {
                title: newEvent.title,
                time: newEvent.time,
                endTime: newEvent.endTime || undefined,
                jobId: newEvent.jobId || undefined,
                location: newEvent.location || undefined
            });
            resetForm();
        }
    };

    const startEdit = (event: Event) => {
        setEditingEvent(event);
        setNewEvent({
            title: event.title,
            date: event.date,
            time: event.time,
            endTime: event.endTime || '',
            jobId: event.jobId || '',
            location: event.location || ''
        });
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingEvent(null);
        setNewEvent({ jobId: '', time: '09:00', endTime: '', location: '', date: selectedDate || '' });
    };

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', marginBottom: '4px' }}>Calendar</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Schedule your meetings and events</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <button onClick={prevMonth} style={{ padding: '6px 8px', color: 'var(--text-primary)' }}><ChevronLeft size={16} /></button>
                    <span style={{ padding: '0 12px', fontSize: '13px', minWidth: '120px', textAlign: 'center' }}>
                        {MONTHS[month]} {year}
                    </span>
                    <button onClick={nextMonth} style={{ padding: '6px 8px', color: 'var(--text-primary)' }}><ChevronRight size={16} /></button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
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
                                    style={{
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--accent)' : isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        display: 'flex', flexDirection: 'column'
                                    }}
                                >
                                    <span style={{ fontWeight: 500, opacity: isSelected ? 1 : 0.7 }}>{day}</span>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                        {dayEvents.map(ev => {
                                            const evJob = jobs.find(j => j.id === ev.jobId);
                                            return (
                                                <div key={ev.id} title={ev.title} style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: evJob?.color || 'var(--accent)'
                                                }} />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Details */}
                <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
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
                            selectedEvents.map(ev => {
                                const job = jobs.find(j => j.id === ev.jobId);
                                return (
                                    <div key={ev.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${job?.color || 'var(--accent)'}` }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ev.title}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={14} /> {ev.time}{ev.endTime ? ` - ${ev.endTime}` : ''}
                                            </div>
                                            {ev.location && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <MapPin size={14} /> {ev.location}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                                {job && <span style={{ color: job.color }}>{job.title}</span>}
                                                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                                                    <button onClick={() => startEdit(ev)} style={{ color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                                                    <button onClick={() => deleteEvent(ev.id)} style={{ color: 'var(--error)', opacity: 0.6 }}><X size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {(isAdding || editingEvent) && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px', background: 'var(--bg-card)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
                        <form onSubmit={editingEvent ? handleEditEvent : handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                placeholder="Event Title"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End Time (optional)</label>
                                    <input
                                        type="time"
                                        value={newEvent.endTime || ''}
                                        onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                                    />
                                </div>
                            </div>
                            <select
                                value={newEvent.jobId || ''}
                                onChange={e => setNewEvent({ ...newEvent, jobId: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white' }}
                            >
                                <option value="">No Job</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>
                            <LocationAutocomplete
                                value={newEvent.location || ''}
                                onChange={(location) => setNewEvent({ ...newEvent, location })}
                                placeholder="Search location..."
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={resetForm} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>{editingEvent ? 'Save' : 'Add Event'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
