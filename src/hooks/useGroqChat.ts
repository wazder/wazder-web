import { useState, useEffect } from 'react';
import { useTaskContext } from '../contexts/TaskContext';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export function useGroqChat() {
    const { addTask } = useTaskContext();
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem('chat_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(messages));
    }, [messages]);

    const sendMessage = async (content: string) => {
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                throw new Error('API Key missing. Check .env file.');
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are a helpful personal assistant. You can create tasks. If the user asks to create a task(s), return a JSON object (NO MARKDOWN) with: { "action": "create_tasks", "tasks": [{ "title": "...", "description": "..." }] }. Otherwise, just reply normally.' },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Groq API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            const assistantContent = data.choices[0]?.message?.content || '';

            // Try to parse as JSON Action
            let displayedContent = assistantContent;
            try {
                // simple cleanup in case logic adds backticks
                const cleanJson = assistantContent.replace(/```json/g, '').replace(/```/g, '').trim();
                if (cleanJson.startsWith('{')) {
                    const parsed = JSON.parse(cleanJson);
                    if (parsed.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
                        parsed.tasks.forEach((t: any) => addTask(t.title, t.description || ''));
                        displayedContent = `✅ Created ${parsed.tasks.length} task(s) on your board.`;
                    }
                }
            } catch (e) {
                // Not JSON or failed to parse, treat as normal text
                console.log('Not a JSON action', e);
            }

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: displayedContent,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred.',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return { messages, sendMessage, clearChat, isLoading };
}
