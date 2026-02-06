import { useState, useEffect } from 'react';
import type { Event } from '../types';

export function useEvents() {
    const [events, setEvents] = useState<Event[]>(() => {
        const saved = localStorage.getItem('events');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('events', JSON.stringify(events));
    }, [events]);

    const addEvent = (event: Omit<Event, 'id'>) => {
        const newEvent: Event = {
            ...event,
            id: crypto.randomUUID()
        };
        setEvents(prev => [...prev, newEvent]);
    };

    const deleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    const getEventsForDate = (date: string) => {
        return events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
    };

    return { events, addEvent, deleteEvent, getEventsForDate };
}
