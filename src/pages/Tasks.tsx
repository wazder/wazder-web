import { useState, useEffect } from 'react';
import { useTaskContext } from '../contexts/TaskContext';
import { useEvents } from '../hooks/useEvents';
import { Plus, Trash2, ArrowRight, ArrowLeft, Briefcase, Clock, Pencil, CalendarPlus } from 'lucide-react';
import type { Task } from '../types';

export function Tasks() {
    const { tasks, jobs, addTask, updateTask, updateStatus, deleteTask } = useTaskContext();
    const { addEvent } = useEvents();
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    
    // Calendar scheduling state
    const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [scheduleEndTime, setScheduleEndTime] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedJobId) return;
        addTask(newTaskTitle, newTaskDesc, selectedJobId);
        resetForm();
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || !newTaskTitle.trim()) return;
        updateTask(editingTask.id, { title: newTaskTitle, description: newTaskDesc });
        resetForm();
    };

    const startEdit = (task: Task) => {
        setEditingTask(task);
        setNewTaskTitle(task.title);
        setNewTaskDesc(task.description);
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingTask(null);
        setNewTaskTitle('');
        setNewTaskDesc('');
    };

    // Escape key to close modals
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                resetForm();
                setSchedulingTask(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const startSchedule = (task: Task) => {
        setSchedulingTask(task);
        setScheduleDate(new Date().toISOString().split('T')[0]);
        setScheduleTime('09:00');
        setScheduleEndTime('');
    };

    const handleSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!schedulingTask || !scheduleDate || !scheduleTime) return;
        addEvent({
            title: schedulingTask.title,
            date: scheduleDate,
            time: scheduleTime,
            ...(scheduleEndTime ? { endTime: scheduleEndTime } : {}),
            jobId: schedulingTask.jobId
        });
        setSchedulingTask(null);
    };

    const handleMoveToInProgress = (taskId: string) => {
        updateStatus(taskId, 'in-progress');
    };

    const selectedJob = jobs.find(j => j.id === selectedJobId);
    const jobTasks = selectedJobId ? tasks.filter(t => t.jobId === selectedJobId && t.status === 'todo') : [];
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    const columnStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        borderRight: '1px solid var(--border)',
        padding: '1rem',
        minWidth: 0,
        overflow: 'hidden'
    };

    const headerStyle = {
        fontSize: '0.875rem',
        padding: '0.5rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--text-secondary)',
        fontWeight: 500
    };

    const taskCardStyle = {
        background: 'var(--bg-card)',
        padding: '1rem',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
        marginBottom: '0.5rem'
    };

    return (
        <div style={{ height: 'calc(100vh - var(--titlebar-height) - var(--statusbar-height) - 32px)', display: 'flex', flexDirection: 'column', margin: '-16px -20px', position: 'relative' }}>
            {/* Add/Edit Task Modal */}
            {(isAdding || editingTask) && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} onClick={resetForm} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 101, padding: '2rem', width: '400px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                    }}>
                        <h3>{editingTask ? 'Edit Task' : `New Task for ${selectedJob?.title}`}</h3>
                        <form onSubmit={editingTask ? handleEdit : handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            <input
                                autoFocus
                                placeholder="Task Title"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                    padding: '0.75rem', color: 'white', fontSize: '1rem'
                                }}
                            />
                            <textarea
                                placeholder="Description (optional)"
                                value={newTaskDesc}
                                onChange={e => setNewTaskDesc(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                    padding: '0.75rem', color: 'white', minHeight: '80px', fontFamily: 'inherit'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={resetForm} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white' }}>{editingTask ? 'Save' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Schedule to Calendar Modal */}
            {schedulingTask && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} onClick={() => setSchedulingTask(null)} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 101, padding: '2rem', width: '400px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                    }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarPlus size={20} />
                            Add to Calendar
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            {schedulingTask.title}
                        </p>
                        <form onSubmit={handleSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={e => setScheduleDate(e.target.value)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                        padding: '0.75rem', color: 'white'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={e => setScheduleTime(e.target.value)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                            padding: '0.75rem', color: 'white'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End Time (optional)</label>
                                    <input
                                        type="time"
                                        value={scheduleEndTime}
                                        onChange={e => setScheduleEndTime(e.target.value)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                            padding: '0.75rem', color: 'white'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setSchedulingTask(null)} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white' }}>Add to Calendar</button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* 4 Column Layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Column 1: Jobs */}
                <div style={columnStyle}>
                    <div style={headerStyle}>
                        <Briefcase size={16} />
                        Jobs
                        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px' }}>
                            {jobs.length}
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {jobs.map(job => (
                            <div
                                key={job.id}
                                onClick={() => setSelectedJobId(job.id)}
                                style={{
                                    ...taskCardStyle,
                                    cursor: 'pointer',
                                    borderLeft: `3px solid ${job.color}`,
                                    background: selectedJobId === job.id ? 'rgba(255,255,255,0.08)' : 'var(--bg-card)'
                                }}
                            >
                                <div style={{ fontWeight: 500 }}>{job.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {tasks.filter(t => t.jobId === job.id).length} tasks
                                </div>
                            </div>
                        ))}
                        {jobs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No jobs yet.<br />Create one from Jobs page.
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Tasks (for selected job) */}
                <div style={columnStyle}>
                    <div style={{ ...headerStyle, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedJob?.color || 'var(--text-muted)' }} />
                            {selectedJob ? `${selectedJob.title} Tasks` : 'Select a Job'}
                            <span style={{ marginLeft: '0.5rem', opacity: 0.5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px' }}>
                                {jobTasks.length}
                            </span>
                        </div>
                        {selectedJobId && (
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{ padding: '4px', color: 'var(--accent)' }}
                                title="Add Task"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {jobTasks.map(task => (
                            <div key={task.id} style={taskCardStyle}>
                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                {task.description && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{task.description}</div>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button
                                        onClick={() => handleMoveToInProgress(task.id)}
                                        title="Start Working"
                                        style={{ padding: '4px', color: 'var(--accent)' }}
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button onClick={() => startEdit(task)} style={{ color: 'var(--text-secondary)', padding: '4px' }} title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => startSchedule(task)} style={{ color: 'var(--accent)', padding: '4px' }} title="Add to Calendar">
                                            <CalendarPlus size={16} />
                                        </button>
                                        <button onClick={() => deleteTask(task.id)} style={{ color: 'var(--error)', opacity: 0.6, padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {selectedJobId && jobTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No tasks yet.<br />Click + to add one.
                            </div>
                        )}
                        {!selectedJobId && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Select a job from the left<br />to view its tasks.
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: In Progress */}
                <div style={columnStyle}>
                    <div style={headerStyle}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                        In Progress
                        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px' }}>
                            {inProgressTasks.length}
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {inProgressTasks.map(task => {
                            const job = jobs.find(j => j.id === task.jobId);
                            return (
                                <div key={task.id} style={{ ...taskCardStyle, borderLeft: `3px solid ${job?.color || 'var(--accent)'}` }}>
                                    <div style={{ fontSize: '0.7rem', color: job?.color || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {job?.title}
                                    </div>
                                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                                    {task.workHours && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <Clock size={12} /> {task.workHours}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button onClick={() => updateStatus(task.id, 'todo')} title="Move Back" style={{ padding: '4px', color: 'var(--text-secondary)' }}>
                                                <ArrowLeft size={16} />
                                            </button>
                                            <button onClick={() => updateStatus(task.id, 'done')} title="Complete" style={{ padding: '4px', color: 'var(--success)' }}>
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button onClick={() => startEdit(task)} style={{ color: 'var(--text-secondary)', padding: '4px' }} title="Edit">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => startSchedule(task)} style={{ color: 'var(--accent)', padding: '4px' }} title="Add to Calendar">
                                                <CalendarPlus size={16} />
                                            </button>
                                            <button onClick={() => deleteTask(task.id)} style={{ color: 'var(--error)', opacity: 0.6, padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {inProgressTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No tasks in progress.
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 4: Done */}
                <div style={{ ...columnStyle, borderRight: 'none' }}>
                    <div style={headerStyle}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                        Done
                        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px' }}>
                            {doneTasks.length}
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {doneTasks.map(task => {
                            const job = jobs.find(j => j.id === task.jobId);
                            return (
                                <div key={task.id} style={{ ...taskCardStyle, opacity: 0.7, borderLeft: `3px solid ${job?.color || 'var(--success)'}` }}>
                                    <div style={{ fontSize: '0.7rem', color: job?.color || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {job?.title}
                                    </div>
                                    <div style={{ fontWeight: 500, textDecoration: 'line-through' }}>{task.title}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <button onClick={() => updateStatus(task.id, 'in-progress')} title="Move Back" style={{ padding: '4px', color: 'var(--text-secondary)' }}>
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button onClick={() => startEdit(task)} style={{ color: 'var(--text-secondary)', padding: '4px' }} title="Edit">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => startSchedule(task)} style={{ color: 'var(--accent)', padding: '4px' }} title="Add to Calendar">
                                                <CalendarPlus size={16} />
                                            </button>
                                            <button onClick={() => deleteTask(task.id)} style={{ color: 'var(--error)', opacity: 0.6, padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {doneTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No completed tasks.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
