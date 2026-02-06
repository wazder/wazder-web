import { useState, useEffect } from 'react';
import type { Task, TaskStatus } from '../types';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('tasks');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (title: string, description: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            description,
            status: 'todo',
            createdAt: Date.now()
        };
        setTasks(prev => [newTask, ...prev]);
    };

    const updateStatus = (id: string, status: TaskStatus) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    return { tasks, addTask, updateStatus, deleteTask };
}
