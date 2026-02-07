import { useState, useEffect } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useTaskContext } from '../contexts/TaskContext';
import { Plus, Trash2, Pencil, Calendar, Clock, MapPin, Briefcase } from 'lucide-react';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import type { Event } from '../types';

export function Events() {
    const { events, addEvent, updateEvent, deleteEvent } = useEvents();
    const { jobs } = useTaskContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
    const [jobFilter, setJobFilter] = useState<string>('all');

    // Form state
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [jobId, setJobId] = useState('');

    const today = new Date().toISOString().split('T')[0];

    const resetForm = () => {
        setIsAdding(false);
        setEditingEvent(null);
        setTitle('');
        setDate('');
        setTime('');
        setEndTime('');
        setLocation('');
        setJobId('');
    };

    // Escape key to close modals
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                resetForm();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !date || !time) return;
        addEvent({
            title,
            date,
            time,
            endTime: endTime || undefined,
            location: location || undefined,
            jobId: jobId || undefined,
        });
        resetForm();
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent || !title.trim() || !date || !time) return;
        updateEvent(editingEvent.id, {
            title,
            date,
            time,
            endTime: endTime || undefined,
            location: location || undefined,
            jobId: jobId || undefined,
        });
        resetForm();
    };

    const startEdit = (event: Event) => {
        setEditingEvent(event);
        setTitle(event.title);
        setDate(event.date);
        setTime(event.time);
        setEndTime(event.endTime || '');
        setLocation(event.location || '');
        setJobId(event.jobId || '');
    };

    const getJobColor = (id?: string) => {
        if (!id) return '#79C0FF';
        const job = jobs.find(j => j.id === id);
        return job?.color || '#79C0FF';
    };

    const getJobTitle = (id?: string) => {
        if (!id) return 'No Job';
        const job = jobs.find(j => j.id === id);
        return job?.title || 'Unknown';
    };

    // Filter events
    const filteredEvents = events
        .filter(e => {
            if (filter === 'upcoming') return e.date >= today;
            if (filter === 'past') return e.date < today;
            return true;
        })
        .filter(e => {
            if (jobFilter === 'all') return true;
            if (jobFilter === 'none') return !e.jobId;
            return e.jobId === jobFilter;
        })
        .sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        });

    // Group events by date
    const eventsByDate = filteredEvents.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('tr-TR', options);
    };

    const isToday = (dateStr: string) => dateStr === today;
    const isPast = (dateStr: string) => dateStr < today;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px',
                flexShrink: 0,
            }}>
                <div>
                    <h1 style={{ fontSize: '20px', marginBottom: '4px' }}>Events</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {events.length} total events · {events.filter(e => e.date >= today).length} upcoming
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    style={{
                        background: 'var(--accent)',
                        color: 'white',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                    }}
                >
                    <Plus size={16} />
                    New Event
                </button>
            </header>

            {/* Filters */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '16px',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {(['all', 'upcoming', 'past'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                background: filter === f ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: filter === f ? 'white' : 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
                        </button>
                    ))}
                </div>
                <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <option value="all">All Jobs</option>
                    <option value="none">No Job</option>
                    {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                </select>
            </div>

            {/* Events List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {Object.keys(eventsByDate).length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        color: 'var(--text-muted)' 
                    }}>
                        No events found
                    </div>
                ) : (
                    Object.entries(eventsByDate).map(([date, dateEvents]) => (
                        <div key={date} style={{ marginBottom: '24px' }}>
                            {/* Date Header */}
                            <div style={{
                                padding: '8px 12px',
                                background: isToday(date) ? 'rgba(78, 201, 176, 0.15)' : isPast(date) ? 'var(--bg-secondary)' : 'var(--bg-hover)',
                                borderLeft: `3px solid ${isToday(date) ? '#3FB950' : isPast(date) ? 'var(--text-muted)' : 'var(--accent)'}`,
                                marginBottom: '8px',
                            }}>
                                <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: 600,
                                    color: isPast(date) ? 'var(--text-muted)' : 'var(--text-primary)',
                                }}>
                                    {isToday(date) && <span style={{ color: '#3FB950', marginRight: '8px' }}>Today</span>}
                                    {formatDate(date)}
                                </span>
                            </div>

                            {/* Events for this date */}
                            {dateEvents.map(event => (
                                <div
                                    key={event.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        padding: '12px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        marginBottom: '8px',
                                        opacity: isPast(date) ? 0.6 : 1,
                                    }}
                                >
                                    {/* Job color indicator */}
                                    <div style={{
                                        width: '4px',
                                        height: '100%',
                                        minHeight: '40px',
                                        background: getJobColor(event.jobId),
                                        borderRadius: '2px',
                                    }} />

                                    {/* Event content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ 
                                            fontSize: '14px', 
                                            fontWeight: 500, 
                                            marginBottom: '4px',
                                            color: 'var(--text-primary)',
                                        }}>
                                            {event.title}
                                        </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap',
                                            gap: '12px', 
                                            fontSize: '12px', 
                                            color: 'var(--text-secondary)' 
                                        }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} />
                                                {event.time}{event.endTime && ` - ${event.endTime}`}
                                            </span>
                                            {event.location && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={12} />
                                                    {event.location}
                                                </span>
                                            )}
                                            {event.jobId && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Briefcase size={12} style={{ color: getJobColor(event.jobId) }} />
                                                    {getJobTitle(event.jobId)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => startEdit(event)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: 'var(--text-muted)',
                                            }}
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: 'var(--text-muted)',
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {(isAdding || editingEvent) && (
                <>
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 9,
                        }}
                        onClick={resetForm}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        padding: '24px',
                        width: '400px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    }}>
                        <h3 style={{ marginBottom: '16px' }}>
                            {editingEvent ? 'Edit Event' : 'New Event'}
                        </h3>
                        <form onSubmit={editingEvent ? handleEdit : handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                autoFocus
                                placeholder="Event Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    padding: '10px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        <Calendar size={12} style={{ marginRight: '4px' }} />
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            padding: '10px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        <Clock size={12} style={{ marginRight: '4px' }} />
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            padding: '10px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        End Time (optional)
                                    </label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            padding: '10px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    <MapPin size={12} style={{ marginRight: '4px' }} />
                                    Location (optional)
                                </label>
                                <LocationAutocomplete
                                    value={location}
                                    onChange={setLocation}
                                    placeholder="Search location..."
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    <Briefcase size={12} style={{ marginRight: '4px' }} />
                                    Job (optional)
                                </label>
                                <select
                                    value={jobId}
                                    onChange={e => setJobId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        padding: '10px',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                    }}
                                >
                                    <option value="">No Job</option>
                                    {jobs.map(job => (
                                        <option key={job.id} value={job.id}>{job.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'var(--accent)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {editingEvent ? 'Save' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
