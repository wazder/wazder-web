import { useState } from 'react';
import { useTaskContext } from '../contexts/TaskContext';
import { Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import type { TaskStatus } from '../types';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'var(--text-secondary)' },
    { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
    { id: 'done', label: 'Done', color: 'var(--success)' }
];

export function Tasks() {
    const { tasks, addTask, updateStatus, deleteTask } = useTaskContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        addTask(newTaskTitle, newTaskDesc);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setIsAdding(false);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Task Board</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your projects and tasks</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    style={{
                        background: 'var(--accent)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500
                    }}
                >
                    <Plus size={20} />
                    New Task
                </button>
            </header>

            {/* Add Task Modal/Form Overlay - simplified inline for now */}
            {isAdding && (
                <div className="glass" style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: 10, padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <h3>Create New Task</h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                        <input
                            autoFocus
                            placeholder="Task Title"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '1rem'
                            }}
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={newTaskDesc}
                            onChange={e => setNewTaskDesc(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'white', minHeight: '80px', fontFamily: 'inherit'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setIsAdding(false)} style={{ flex: 1, padding: '0.75rem', color: 'var(--text-secondary)' }}>Cancel</button>
                            <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)' }}>Create</button>
                        </div>
                    </form>
                </div>
            )}

            {isAdding && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5 }} onClick={() => setIsAdding(false)} />}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem',
                height: '100%',
                overflowX: 'auto',
                paddingBottom: '1rem'
            }}>
                {COLUMNS.map(col => (
                    <div key={col.id} className="glass" style={{
                        display: 'flex', flexDirection: 'column',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem',
                        background: 'hsla(var(--hue), 20%, 14%, 0.4)'
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            padding: '0.5rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: col.color
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                            {col.label}
                            <span style={{
                                marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.5,
                                background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px'
                            }}>
                                {tasks.filter(t => t.status === col.id).length}
                            </span>
                        </h3>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div key={task.id} style={{
                                    background: 'var(--bg-card)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                                    {task.description && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{task.description}</div>}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            {col.id !== 'todo' && (
                                                <button title="Move Back" onClick={() => updateStatus(task.id, col.id === 'done' ? 'in-progress' : 'todo')} style={{ padding: '4px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                                                    <ArrowLeft size={16} />
                                                </button>
                                            )}
                                            {col.id !== 'done' && (
                                                <button title="Move Forward" onClick={() => updateStatus(task.id, col.id === 'todo' ? 'in-progress' : 'done')} style={{ padding: '4px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                                                    <ArrowRight size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => deleteTask(task.id)} style={{ color: 'var(--error)', opacity: 0.6, padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
