import { useState, useEffect } from 'react';
import { useTaskContext } from '../contexts/TaskContext';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const JOB_COLORS = ['#1F6FEB', '#3FB950', '#9E741C', '#F0883E', '#A371F7', '#79C0FF', '#238636', '#F85149'];

const SYSTEM_PROMPT = `Sen bir iş takip asistanısın. Kullanıcının job (proje/iş) ve task (görev) eklemesine yardım ediyorsun.

KURALLAR:
0. ASLA emoji kullanma - hiçbir mesajında emoji olmamalı
1. Kullanıcı "job ekle", "proje ekle", "iş ekle" derse → create_jobs action'ı kullan
2. Kullanıcı "task ekle", "görev ekle" derse → create_tasks action'ı kullan
3. Sadece JSON döndür, başka açıklama YAPMA

JOB EKLEMEK İÇİN (sadece JSON döndür):
{"action":"create_jobs","jobs":[{"title":"İş Adı","description":"Açıklama"}]}

TASK EKLEMEK İÇİN (sadece JSON döndür):
{"action":"create_tasks","tasks":[{"title":"Görev Adı","description":"Açıklama"}]}

Örnek:
Kullanıcı: "job olarak heviAI, B4AFC ekle"
Sen: {"action":"create_jobs","jobs":[{"title":"heviAI","description":""},{"title":"B4AFC","description":""}]}

Kullanıcı: "görev ekle: rapor yaz"
Sen: {"action":"create_tasks","tasks":[{"title":"Rapor yaz","description":""}]}

Eğer kullanıcı bir aksiyon istemiyorsa, normal şekilde Türkçe cevap ver.`;

function extractJSON(text: string): any | null {
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            return null;
        }
    }
    return null;
}

export function useGroqChat() {
    const { addTask, addJob, jobs } = useTaskContext();
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
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
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
            const parsed = extractJSON(assistantContent);
            
            if (parsed?.action === 'create_jobs' && Array.isArray(parsed.jobs)) {
                parsed.jobs.forEach((j: any, index: number) => {
                    const color = JOB_COLORS[(jobs.length + index) % JOB_COLORS.length];
                    addJob(j.title, j.description || '', color);
                });
                displayedContent = `✅ ${parsed.jobs.length} job eklendi: ${parsed.jobs.map((j: any) => j.title).join(', ')}`;
            } else if (parsed?.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
                const defaultJobId = jobs.length > 0 ? jobs[0].id : '';
                parsed.tasks.forEach((t: any) => {
                    addTask(t.title, t.description || '', t.jobId || defaultJobId);
                });
                displayedContent = `✅ ${parsed.tasks.length} task eklendi: ${parsed.tasks.map((t: any) => t.title).join(', ')}`;
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
