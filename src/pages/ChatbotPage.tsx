import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { useGroqChat } from '../hooks/useGroqChat';

export function ChatbotPage() {
    const { messages, sendMessage, clearChat, isLoading } = useGroqChat();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>AI Assistant</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Chat with your personal productivity assistant</p>
                </div>
                <button
                    onClick={clearChat}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid var(--border)'
                    }}
                >
                    <Trash2 size={18} />
                    Clear History
                </button>
            </header>

            <div className="glass" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'hsla(var(--hue), 20%, 14%, 0.4)',
                position: 'relative'
            }}>
                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}>
                    {messages.length === 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'var(--text-secondary)',
                            gap: '1rem',
                            opacity: 0.7
                        }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <MessageCircle size={40} color="var(--accent)" />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>How can I help you today?</h2>
                            <p>Ask me to create tasks, plan your day, or just chat.</p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderRadius: '1.5rem',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '1.5rem',
                                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '1.5rem',
                                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                lineHeight: '1.6',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
                            }}>
                                {msg.content}
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                margin: '0 0.5rem'
                            }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>
                            <div className="typing-dot" style={{ width: 6, height: 6, background: 'currentColor', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
                            <div className="typing-dot" style={{ width: 6, height: 6, background: 'currentColor', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
                            <div className="typing-dot" style={{ width: 6, height: 6, background: 'currentColor', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '1.5rem 2rem',
                    background: 'var(--bg-card)',
                    borderTop: '1px solid var(--border)'
                }}>
                    <form onSubmit={handleSubmit} style={{
                        display: 'flex',
                        gap: '1rem',
                        maxWidth: '900px',
                        margin: '0 auto',
                        background: 'var(--bg-primary)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <input
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Type a message to your assistant..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            style={{
                                background: 'var(--accent)',
                                color: 'white',
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                                transform: isLoading || !inputValue.trim() ? 'none' : 'scale(1)'
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
