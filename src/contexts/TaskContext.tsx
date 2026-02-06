import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Task, TaskStatus } from '../types';

interface TaskContextType {
    tasks: Task[];
    addTask: (title: string, description: string) => void;
    updateStatus: (id: string, status: TaskStatus) => void;
    deleteTask: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
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

    return (
        <TaskContext.Provider value={{ tasks, addTask, updateStatus, deleteTask }}>
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
