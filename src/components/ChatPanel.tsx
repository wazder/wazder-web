import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Sparkles } from 'lucide-react';
import { useGroqChat } from '../hooks/useGroqChat';

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
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

    if (!isOpen) return null;

    return (
        <div style={{
            width: 'var(--panel-width)',
            height: '100%',
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Panel Header */}
            <div style={{
                height: '35px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 0 12px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="var(--accent)" />
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
                        Copilot Chat
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={clearChat}
                        style={{
                            padding: '4px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Clear Chat"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8z"/>
                            <path d="M5.5 5.5l5 5M5.5 10.5l5-5" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '4px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Close Panel"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-secondary)',
                        gap: '12px',
                        padding: '20px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <MessageCircle size={24} color="var(--accent)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                AI Assistant
                            </h3>
                            <p style={{ fontSize: '12px', margin: 0 }}>
                                Ask me to help with tasks, planning, or anything else.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                            }}>
                                {msg.role === 'user' ? '👤' : '✨'}
                            </div>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                            }}>
                                {msg.role === 'user' ? 'You' : 'Copilot'}
                            </span>
                            <span style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                marginLeft: 'auto',
                            }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div style={{
                            fontSize: '13px',
                            lineHeight: '1.5',
                            color: 'var(--text-primary)',
                            paddingLeft: '28px',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingLeft: '28px',
                        color: 'var(--text-secondary)',
                    }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <div style={{ width: 4, height: 4, background: 'currentColor', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                            <div style={{ width: 4, height: 4, background: 'currentColor', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                            <div style={{ width: 4, height: 4, background: 'currentColor', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                        </div>
                        <span style={{ fontSize: '12px' }}>Copilot is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
            }}>
                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    gap: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    padding: '4px 8px',
                }}>
                    <input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="Ask Copilot..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            padding: '8px 4px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '13px',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        style={{
                            background: 'var(--accent)',
                            color: 'white',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                            alignSelf: 'center',
                        }}
                    >
                        <Send size={14} />
                    </button>
                </form>
                <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '8px',
                    textAlign: 'center',
                }}>
                    Press ⌘B to toggle chat
                </div>
            </div>
        </div>
    );
}
