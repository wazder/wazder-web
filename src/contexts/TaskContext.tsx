import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Task, TaskStatus, Job, Event, Note } from '../types';
import { supabase } from '../lib/supabase';

interface TaskContextType {
    tasks: Task[];
    jobs: Job[];
    events: Event[];
    notes: Note[];
    loading: boolean;
    userId: string | null;
    setUserId: (id: string | null) => void;
    addTask: (title: string, description: string, jobId: string) => void;
    updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
    updateStatus: (id: string, status: TaskStatus, workHours?: string) => void;
    deleteTask: (id: string) => void;
    addJob: (title: string, description: string, color: string) => void;
    updateJob: (id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) => void;
    deleteJob: (id: string) => void;
    addEvent: (event: Omit<Event, 'id'>) => void;
    updateEvent: (id: string, updates: Partial<Omit<Event, 'id'>>) => void;
    deleteEvent: (id: string) => void;
    getEventsForDate: (date: string) => Event[];
    addNote: () => string;
    updateNote: (id: string, partial: Partial<Note>) => void;
    deleteNote: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('tasks');
        return saved ? JSON.parse(saved) : [];
    });

    const [jobs, setJobs] = useState<Job[]>(() => {
        const saved = localStorage.getItem('jobs');
        return saved ? JSON.parse(saved) : [];
    });

    const [events, setEvents] = useState<Event[]>(() => {
        const saved = localStorage.getItem('events');
        return saved ? JSON.parse(saved) : [];
    });

    const [notes, setNotes] = useState<Note[]>(() => {
        const saved = localStorage.getItem('notes');
        return saved ? JSON.parse(saved) : [];
    });

    // Load data from Supabase when userId changes
    useEffect(() => {
        if (!supabase || !userId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [jobsRes, tasksRes, eventsRes, notesRes] = await Promise.all([
                    supabase.from('jobs').select('*').eq('user_id', userId),
                    supabase.from('tasks').select('*').eq('user_id', userId),
                    supabase.from('events').select('*').eq('user_id', userId),
                    supabase.from('notes').select('*').eq('user_id', userId),
                ]);

                if (jobsRes.data) setJobs(jobsRes.data.map(j => ({ ...j, createdAt: new Date(j.created_at).getTime() })));
                if (tasksRes.data) setTasks(tasksRes.data.map(t => ({ ...t, createdAt: new Date(t.created_at).getTime() })));
                if (eventsRes.data) setEvents(eventsRes.data);
                if (notesRes.data) setNotes(notesRes.data.map(n => ({ ...n, createdAt: new Date(n.created_at).getTime() })));
            } catch (error) {
                console.error('Error loading data:', error);
            }
            setLoading(false);
        };

        loadData();
    }, [userId]);

    // Save to localStorage (fallback)
    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('jobs', JSON.stringify(jobs));
    }, [jobs]);

    useEffect(() => {
        localStorage.setItem('events', JSON.stringify(events));
    }, [events]);

    useEffect(() => {
        localStorage.setItem('notes', JSON.stringify(notes));
    }, [notes]);

    const addTask = useCallback(async (title: string, description: string, jobId: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            description,
            status: 'todo',
            jobId,
            createdAt: Date.now()
        };
        setTasks(prev => [newTask, ...prev]);

        if (supabase && userId) {
            await supabase.from('tasks').insert({
                id: newTask.id,
                user_id: userId,
                title,
                description,
                status: 'todo',
                job_id: jobId,
                created_at: new Date(newTask.createdAt).toISOString()
            });
        }
    }, [userId]);

    const updateStatus = useCallback(async (id: string, status: TaskStatus, workHours?: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status, ...(workHours && { workHours }) } : t));

        if (supabase && userId) {
            await supabase.from('tasks').update({ status, work_hours: workHours }).eq('id', id);
        }
    }, [userId]);

    const updateTask = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        if (supabase && userId) {
            const dbUpdates: Record<string, unknown> = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
            if (updates.workHours !== undefined) dbUpdates.work_hours = updates.workHours;
            await supabase.from('tasks').update(dbUpdates).eq('id', id);
        }
    }, [userId]);

    const deleteTask = useCallback(async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));

        if (supabase && userId) {
            await supabase.from('tasks').delete().eq('id', id);
        }
    }, [userId]);

    const addJob = useCallback(async (title: string, description: string, color: string) => {
        const newJob: Job = {
            id: crypto.randomUUID(),
            title,
            description,
            color,
            createdAt: Date.now()
        };
        setJobs(prev => [newJob, ...prev]);

        if (supabase && userId) {
            await supabase.from('jobs').insert({
                id: newJob.id,
                user_id: userId,
                title,
                description,
                color,
                created_at: new Date(newJob.createdAt).toISOString()
            });
        }
    }, [userId]);

    const deleteJob = useCallback(async (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
        setTasks(prev => prev.filter(t => t.jobId !== id));

        if (supabase && userId) {
            await supabase.from('tasks').delete().eq('job_id', id);
            await supabase.from('jobs').delete().eq('id', id);
        }
    }, [userId]);

    const updateJob = useCallback(async (id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));

        if (supabase && userId) {
            await supabase.from('jobs').update(updates).eq('id', id);
        }
    }, [userId]);

    // Events
    const addEvent = useCallback(async (event: Omit<Event, 'id'>) => {
        const newEvent: Event = { ...event, id: crypto.randomUUID() };
        setEvents(prev => [...prev, newEvent]);

        if (supabase && userId) {
            await supabase.from('events').insert({
                id: newEvent.id,
                user_id: userId,
                title: event.title,
                date: event.date,
                time: event.time,
                end_time: event.endTime,
                location: event.location,
                job_id: event.jobId,
                task_id: event.taskId,
            });
        }
    }, [userId]);

    const updateEvent = useCallback(async (id: string, updates: Partial<Omit<Event, 'id'>>) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

        if (supabase && userId) {
            const dbUpdates: Record<string, unknown> = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.date !== undefined) dbUpdates.date = updates.date;
            if (updates.time !== undefined) dbUpdates.time = updates.time;
            if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
            if (updates.location !== undefined) dbUpdates.location = updates.location;
            if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
            if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId;
            await supabase.from('events').update(dbUpdates).eq('id', id);
        }
    }, [userId]);

    const deleteEvent = useCallback(async (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));

        if (supabase && userId) {
            await supabase.from('events').delete().eq('id', id);
        }
    }, [userId]);

    const getEventsForDate = useCallback((date: string) => {
        return events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
    }, [events]);

    // Notes
    const addNote = useCallback(() => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: 'Untitled Note',
            content: '',
            tags: [],
            createdAt: Date.now()
        };
        setNotes(prev => [newNote, ...prev]);

        if (supabase && userId) {
            supabase.from('notes').insert({
                id: newNote.id,
                user_id: userId,
                title: newNote.title,
                content: newNote.content,
                tags: newNote.tags,
                created_at: new Date(newNote.createdAt).toISOString()
            });
        }

        return newNote.id;
    }, [userId]);

    const updateNote = useCallback(async (id: string, partial: Partial<Note>) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...partial } : n));

        if (supabase && userId) {
            const dbUpdates: Record<string, unknown> = {};
            if (partial.title !== undefined) dbUpdates.title = partial.title;
            if (partial.content !== undefined) dbUpdates.content = partial.content;
            if (partial.tags !== undefined) dbUpdates.tags = partial.tags;
            await supabase.from('notes').update(dbUpdates).eq('id', id);
        }
    }, [userId]);

    const deleteNote = useCallback(async (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));

        if (supabase && userId) {
            await supabase.from('notes').delete().eq('id', id);
        }
    }, [userId]);

    return (
        <TaskContext.Provider value={{
            tasks, jobs, events, notes, loading, userId, setUserId,
            addTask, updateTask, updateStatus, deleteTask,
            addJob, updateJob, deleteJob,
            addEvent, updateEvent, deleteEvent, getEventsForDate,
            addNote, updateNote, deleteNote
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTaskContext() {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTaskContext must be used within a TaskProvider');
    }
    return context;
}
