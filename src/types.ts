export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Job {
    id: string;
    title: string;
    description: string;
    color: string;
    createdAt: number;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    jobId: string;
    workHours?: string; // e.g., "02:00"
    createdAt: number;
}

export interface Event {
    id: string;
    title: string;
    date: string; // ISO date string YYYY-MM-DD
    time: string; // HH:mm start time
    endTime?: string; // HH:mm end time (optional)
    location?: string; // optional location
    jobId?: string; // optional job association
    taskId?: string; // optional task association (events follow their task when moved)
}

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: number;
}
