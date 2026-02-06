import { useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { Plus, Trash2, Search, FileText } from 'lucide-react';

export function Notes() {
    const { notes, addNote, updateNote, deleteNote } = useNotes();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedNote = notes.find(n => n.id === selectedId);

    const handleCreate = () => {
        const id = addNote();
        setSelectedId(id);
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '2rem' }}>
            {/* Sidebar List */}
            <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Notes</h2>
                    <button
                        onClick={handleCreate}
                        style={{
                            background: 'var(--accent)', color: 'white', padding: '0.5rem',
                            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="glass" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredNotes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setSelectedId(note.id)}
                            className="glass"
                            style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                background: selectedId === note.id ? 'var(--accent)' : undefined,
                                border: selectedId === note.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {note.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: selectedId === note.id ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {note.content || 'No content...'}
                            </div>
                        </div>
                    ))}
                    {filteredNotes.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                            No notes found.
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                {!selectedNote ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>Select a note to view or create a new one.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <input
                                value={selectedNote.title}
                                onChange={e => updateNote(selectedNote.id, { title: e.target.value })}
                                placeholder="Note Title"
                                style={{
                                    background: 'transparent', border: 'none', color: 'white',
                                    fontSize: '1.5rem', fontWeight: 600, outline: 'none', flex: 1
                                }}
                            />
                            <button onClick={() => { deleteNote(selectedNote.id); setSelectedId(null); }} style={{ color: 'var(--error)', opacity: 0.7 }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <textarea
                            value={selectedNote.content}
                            onChange={e => updateNote(selectedNote.id, { content: e.target.value })}
                            placeholder="Start typing..."
                            style={{
                                flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                fontSize: '1rem', lineHeight: '1.6', outline: 'none', resize: 'none', fontFamily: 'inherit'
                            }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
