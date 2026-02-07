import { useState, useEffect } from 'react';
import { useTaskContext } from '../contexts/TaskContext';
import { Plus, Trash2, Briefcase, Pencil } from 'lucide-react';
import type { Job } from '../types';

const COLORS = ['#3FB950', '#1F6FEB', '#A371F7', '#9E741C', '#F0883E', '#79C0FF'];

export function Jobs() {
    const { jobs, tasks, addJob, updateJob, deleteJob } = useTaskContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newJobDesc, setNewJobDesc] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    // Keyboard shortcut: ⌘T to add job, Escape to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 't') {
                e.preventDefault();
                setIsAdding(true);
            }
            if (e.key === 'Escape') {
                resetForm();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJobTitle.trim()) return;
        addJob(newJobTitle, newJobDesc, selectedColor);
        resetForm();
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingJob || !newJobTitle.trim()) return;
        updateJob(editingJob.id, { title: newJobTitle, description: newJobDesc, color: selectedColor });
        resetForm();
    };

    const startEdit = (job: Job) => {
        setEditingJob(job);
        setNewJobTitle(job.title);
        setNewJobDesc(job.description);
        setSelectedColor(job.color);
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingJob(null);
        setNewJobTitle('');
        setNewJobDesc('');
        setSelectedColor(COLORS[0]);
    };

    const getJobTaskCount = (jobId: string) => tasks.filter(t => t.jobId === jobId).length;
    const getJobInProgressCount = (jobId: string) => tasks.filter(t => t.jobId === jobId && t.status === 'in-progress').length;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', marginBottom: '4px' }}>Jobs</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Manage your projects and jobs</p>
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
                    New Job
                    <span style={{ opacity: 0.7, marginLeft: '4px', fontSize: '11px' }}>⌘T</span>
                </button>
            </header>

            {(isAdding || editingJob) && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: 10, padding: '2rem', width: '400px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <h3>{editingJob ? 'Edit Job' : 'Create New Job'}</h3>
                    <form onSubmit={editingJob ? handleEdit : handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                        <input
                            autoFocus
                            placeholder="Job Title"
                            value={newJobTitle}
                            onChange={e => setNewJobTitle(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                padding: '0.75rem', color: 'white', fontSize: '1rem'
                            }}
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={newJobDesc}
                            onChange={e => setNewJobDesc(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                padding: '0.75rem', color: 'white', minHeight: '80px', fontFamily: 'inherit'
                            }}
                        />
                        <div>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Color</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        style={{
                                            width: 32, height: 32,
                                            background: color,
                                            border: selectedColor === color ? '2px solid white' : '2px solid transparent',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" onClick={resetForm} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                            <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white' }}>{editingJob ? 'Save' : 'Create'}</button>
                        </div>
                    </form>
                </div>
            )}

            {(isAdding || editingJob) && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5 }} onClick={resetForm} />}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
            }}>
                {jobs.map(job => (
                    <div key={job.id} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderLeft: `4px solid ${job.color}`,
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Briefcase size={20} style={{ color: job.color }} />
                            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{job.title}</span>
                        </div>
                        {job.description && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{job.description}</p>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <span>{getJobTaskCount(job.id)} tasks</span>
                            <span>{getJobInProgressCount(job.id)} in progress</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={() => startEdit(job)}
                                style={{ color: 'var(--text-secondary)', padding: '4px' }}
                                title="Edit Job"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                onClick={() => deleteJob(job.id)}
                                style={{ color: 'var(--error)', opacity: 0.6, padding: '4px' }}
                                title="Delete Job"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {jobs.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No jobs yet. Create your first job to start organizing tasks.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
