export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: number;
}

export interface Event {
    id: string;
    title: string;
    date: string; // ISO date string YYYY-MM-DD
    time: string; // HH:mm
    type: 'meeting' | 'work' | 'personal';
}

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: number;
}
