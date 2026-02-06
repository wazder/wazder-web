import { useState, useEffect } from 'react';
import type { Note } from '../types';

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>(() => {
        const saved = localStorage.getItem('notes');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('notes', JSON.stringify(notes));
    }, [notes]);

    const addNote = () => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: 'Untitled Note',
            content: '',
            tags: [],
            createdAt: Date.now()
        };
        setNotes(prev => [newNote, ...prev]);
        return newNote.id;
    };

    const updateNote = (id: string, partial: Partial<Note>) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...partial } : n));
    };

    const deleteNote = (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    return { notes, addNote, updateNote, deleteNote };
}
