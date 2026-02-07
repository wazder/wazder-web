import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTaskContext } from '../contexts/TaskContext';
import { useEvents } from '../hooks/useEvents';
import { RotateCcw, Plus, Move, Palette, Trash2, CalendarPlus, Undo2, X, Pencil, Type, Save, RotateCw, Grid3X3 } from 'lucide-react';
import type { Task, Job } from '../types';

interface Node {
    id: string;
    label: string;
    type: 'root' | 'job' | 'task' | 'event';
    color: string;
    x: number;
    y: number;
    row: number;
    col: number;
    parentId?: string;
    jobId?: string;
    index?: number;
}

interface Edge {
    from: string;
    to: string;
    color: string;
}

interface DragState {
    nodeId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
}

// Custom positions for nodes
interface NodePositions {
    [nodeId: string]: { x: number; y: number };
}

// Undo action types
type UndoAction = 
    | { type: 'deleteTask'; task: Task }
    | { type: 'deleteJob'; job: Job; tasks: Task[] }
    | { type: 'deleteEvent'; event: any }
    | { type: 'moveTask'; taskId: string; fromJobId: string }
    | { type: 'updateJobColor'; jobId: string; oldColor: string }
    | { type: 'updateJobTitle'; jobId: string; oldTitle: string }
    | { type: 'updateTaskTitle'; taskId: string; oldTitle: string }
    | { type: 'updateEventTitle'; eventId: string; oldTitle: string }
    | { type: 'addTask'; taskId: string }
    | { type: 'addEvent'; eventId: string }
    | { type: 'addJob'; jobId: string };

const COLORS = ['#3FB950', '#1F6FEB', '#A371F7', '#F0883E', '#F85149', '#79C0FF', '#9E741C', '#238636'];
const FONTS = [
    { label: 'Default', value: 'inherit' },
    { label: 'Mono', value: "'SF Mono', Menlo, monospace" },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Sans', value: 'system-ui, sans-serif' },
];

const GRID_SIZE = 40; // Grid cell size in pixels

// Check if color is light (needs dark text)
const isLightColor = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
};

// Snap position to grid
const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

type ActivePanel = 'actions' | 'addTask' | 'addEvent' | 'moveTask' | 'colorPicker' | 'editItem' | 'fontPicker' | 'addJob';

export function Worktree() {
    const { jobs, tasks, updateTask, updateJob, deleteTask, deleteJob, addTask, addJob } = useTaskContext();
    const { events, addEvent, deleteEvent, updateEvent } = useEvents();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const [dragState, setDragState] = useState<DragState | null>(null);
    
    // For single selection convenience (panel, etc.)
    const selectedNode = selectedNodes.size === 1 ? Array.from(selectedNodes)[0] : null;
    
    // Custom node positions (for free positioning on grid)
    const [customPositions, setCustomPositions] = useState<NodePositions>(() => {
        const saved = localStorage.getItem('worktreePositions');
        return saved ? JSON.parse(saved) : {};
    });
    const [savedPositions, setSavedPositions] = useState<NodePositions>(() => {
        const saved = localStorage.getItem('worktreeSavedPositions');
        return saved ? JSON.parse(saved) : {};
    });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Panel state
    const [activePanel, setActivePanel] = useState<ActivePanel>('actions');
    
    // Form states
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobColor, setJobColor] = useState(COLORS[0]);

    // Undo stack
    const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
    
    // Job fonts stored in state (jobId -> fontFamily)
    const [jobFonts, setJobFonts] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('jobFonts');
        return saved ? JSON.parse(saved) : {};
    });

    // Save fonts to localStorage
    useEffect(() => {
        localStorage.setItem('jobFonts', JSON.stringify(jobFonts));
    }, [jobFonts]);

    // Save custom positions to localStorage
    useEffect(() => {
        localStorage.setItem('worktreePositions', JSON.stringify(customPositions));
    }, [customPositions]);

    useEffect(() => {
        localStorage.setItem('worktreeSavedPositions', JSON.stringify(savedPositions));
    }, [savedPositions]);

    const pushUndo = useCallback((action: UndoAction) => {
        setUndoStack(prev => [...prev.slice(-19), action]);
    }, []);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        
        const action = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        
        switch (action.type) {
            case 'deleteTask':
                addTask(action.task.title, action.task.description, action.task.jobId);
                break;
            case 'deleteJob':
                break;
            case 'deleteEvent':
                addEvent({
                    title: action.event.title,
                    date: action.event.date,
                    time: action.event.time,
                    jobId: action.event.jobId,
                });
                break;
            case 'moveTask':
                updateTask(action.taskId, { jobId: action.fromJobId });
                break;
            case 'updateJobColor':
                updateJob(action.jobId, { color: action.oldColor });
                break;
            case 'updateJobTitle':
                updateJob(action.jobId, { title: action.oldTitle });
                break;
            case 'updateTaskTitle':
                updateTask(action.taskId, { title: action.oldTitle });
                break;
            case 'updateEventTitle':
                updateEvent(action.eventId, { title: action.oldTitle });
                break;
            case 'addTask':
                deleteTask(action.taskId);
                break;
            case 'addEvent':
                deleteEvent(action.eventId);
                break;
            case 'addJob':
                deleteJob(action.jobId);
                break;
        }
    }, [undoStack, addTask, addEvent, updateTask, updateJob, updateEvent, deleteTask, deleteEvent, deleteJob]);

    const resetPanel = () => {
        setActivePanel('actions');
        setEventTitle('');
        setEventDate('');
        setEventTime('');
        setTaskTitle('');
        setTaskDesc('');
        setEditTitle('');
        setEditDesc('');
        setJobTitle('');
        setJobDesc('');
        setJobColor(COLORS[0]);
    };

    const closeSelection = () => {
        setSelectedNodes(new Set());
        resetPanel();
    };

    // Delete all selected nodes
    const deleteSelectedNodes = useCallback(() => {
        if (selectedNodes.size === 0) return;
        
        // Don't delete root
        const nodesToDelete = Array.from(selectedNodes).filter(id => id !== 'root');
        if (nodesToDelete.length === 0) return;
        
        // Count types for confirmation
        const jobIds = nodesToDelete.filter(id => id.startsWith('job-'));
        const taskIds = nodesToDelete.filter(id => id.startsWith('task-'));
        const eventIds = nodesToDelete.filter(id => id.startsWith('event-'));
        
        const parts = [];
        if (jobIds.length > 0) parts.push(`${jobIds.length} job${jobIds.length > 1 ? 's' : ''}`);
        if (taskIds.length > 0) parts.push(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''}`);
        if (eventIds.length > 0) parts.push(`${eventIds.length} event${eventIds.length > 1 ? 's' : ''}`);
        
        if (!confirm(`Delete ${parts.join(', ')}?`)) return;
        
        // Delete in order: events, tasks, jobs (to avoid orphans)
        eventIds.forEach(nodeId => {
            const eventId = nodeId.replace('event-', '');
            const event = events.find(e => e.id === eventId);
            if (event) {
                pushUndo({ type: 'deleteEvent', event });
                deleteEvent(eventId);
            }
        });
        
        taskIds.forEach(nodeId => {
            const taskId = nodeId.replace('task-', '');
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                pushUndo({ type: 'deleteTask', task });
                deleteTask(taskId);
            }
        });
        
        jobIds.forEach(nodeId => {
            const jobId = nodeId.replace('job-', '');
            const job = jobs.find(j => j.id === jobId);
            const jobTasks = tasks.filter(t => t.jobId === jobId);
            if (job) {
                pushUndo({ type: 'deleteJob', job, tasks: jobTasks });
                deleteJob(jobId);
            }
        });
        
        setSelectedNodes(new Set());
        resetPanel();
    }, [selectedNodes, events, tasks, jobs, pushUndo, deleteEvent, deleteTask, deleteJob]);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Prevent browser back/forward gestures on this component
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const preventSwipe = (e: WheelEvent) => {
            // Always prevent horizontal scroll to avoid browser navigation
            if (Math.abs(e.deltaX) > 0) {
                e.preventDefault();
            }
        };

        const preventTouchSwipe = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        container.addEventListener('wheel', preventSwipe, { passive: false });
        container.addEventListener('touchstart', preventTouchSwipe, { passive: false });
        container.addEventListener('touchmove', preventTouchSwipe, { passive: false });

        return () => {
            container.removeEventListener('wheel', preventSwipe);
            container.removeEventListener('touchstart', preventTouchSwipe);
            container.removeEventListener('touchmove', preventTouchSwipe);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (activePanel !== 'actions') {
                    resetPanel();
                } else {
                    closeSelection();
                }
            }
            // ⌘D to reset view
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                setPan({ x: 0, y: 0 });
                setZoom(1);
                closeSelection();
            }
            // ⌘Z to undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // ⌘+Delete/Backspace to delete selected elements
            if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
                e.preventDefault();
                if (selectedNodes.size > 0) {
                    deleteSelectedNodes();
                }
            }
            // ⌘T to add sub-element when element is selected
            if ((e.metaKey || e.ctrlKey) && e.key === 't') {
                e.preventDefault();
                if (selectedNode) {
                    const node = nodes.find(n => n.id === selectedNode);
                    if (node) {
                        if (node.type === 'root') {
                            setActivePanel('addJob');
                        } else if (node.type === 'job') {
                            setActivePanel('addTask');
                        } else if (node.type === 'task') {
                            setActivePanel('addEvent');
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, activePanel, selectedNode, selectedNodes, deleteSelectedNodes]);

    // Build nodes and edges in Git-style horizontal layout
    const { nodes, edges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        const nodeSpacingX = 140;
        const nodeSpacingY = 90;
        const startX = 100;

        // Root node at the beginning - white tone color
        const rootY = Math.max(dimensions.height / 2, 200);
        const rootPos = customPositions['root'] || { x: startX, y: rootY };
        nodes.push({
            id: 'root',
            label: 'wazder',
            type: 'root',
            color: '#E6EDF3',
            x: rootPos.x,
            y: rootPos.y,
            row: 0,
            col: 0,
        });

        // Calculate vertical center for default positions
        const totalRows = jobs.length;
        const verticalStart = rootY - ((totalRows - 1) * nodeSpacingY) / 2;

        // Global counters for tasks and events
        let taskCounter = 1;
        let eventCounter = 1;

        // Process each job as a branch
        jobs.forEach((job, jobIndex) => {
            const row = jobIndex;
            const defaultJobY = verticalStart + row * nodeSpacingY;
            const defaultJobX = startX + nodeSpacingX;
            
            const jobNodeId = `job-${job.id}`;
            const jobPos = customPositions[jobNodeId] || { x: defaultJobX, y: defaultJobY };

            // Job node
            nodes.push({
                id: jobNodeId,
                label: job.title,
                type: 'job',
                color: job.color,
                x: jobPos.x,
                y: jobPos.y,
                row,
                col: 1,
                parentId: 'root',
                jobId: job.id,
            });

            edges.push({ 
                from: 'root', 
                to: jobNodeId,
                color: job.color,
            });

            // Get tasks for this job sorted by status
            const jobTasks = tasks
                .filter(t => t.jobId === job.id)
                .sort((a, b) => {
                    const statusOrder = { 'todo': 0, 'in-progress': 1, 'done': 2 };
                    return statusOrder[a.status] - statusOrder[b.status];
                });

            let prevNodeId = jobNodeId;
            let currentCol = 2;

            jobTasks.forEach((task) => {
                const defaultTaskX = startX + currentCol * nodeSpacingX;
                const taskNodeId = `task-${task.id}`;
                const taskPos = customPositions[taskNodeId] || { x: defaultTaskX, y: jobPos.y };
                
                // Color based on status
                let taskColor = job.color;
                if (task.status === 'done') {
                    taskColor = '#238636';
                } else if (task.status === 'in-progress') {
                    taskColor = '#9E741C';
                }

                nodes.push({
                    id: taskNodeId,
                    label: task.title,
                    type: 'task',
                    color: taskColor,
                    x: taskPos.x,
                    y: taskPos.y,
                    row,
                    col: currentCol,
                    parentId: prevNodeId,
                    jobId: job.id,
                    index: taskCounter++,
                });

                edges.push({
                    from: prevNodeId,
                    to: taskNodeId,
                    color: taskColor,
                });

                prevNodeId = taskNodeId;
                currentCol++;
            });

            // Add events for this job at the end of the branch
            const jobEvents = events.filter(e => e.jobId === job.id);
            const lastNode = nodes.find(n => n.id === prevNodeId);
            jobEvents.forEach((event, eventIndex) => {
                const defaultEventX = (lastNode?.x || jobPos.x) + 40 + eventIndex * 30;
                const defaultEventY = jobPos.y + 35;
                const eventNodeId = `event-${event.id}`;
                const eventPos = customPositions[eventNodeId] || { x: defaultEventX, y: defaultEventY };
                
                nodes.push({
                    id: eventNodeId,
                    label: event.title,
                    type: 'event',
                    color: job.color,
                    x: eventPos.x,
                    y: eventPos.y,
                    row,
                    col: currentCol,
                    parentId: prevNodeId,
                    jobId: job.id,
                    index: eventCounter++,
                });

                edges.push({
                    from: prevNodeId,
                    to: eventNodeId,
                    color: job.color + '60',
                });
            });
        });

        return { nodes, edges };
    }, [jobs, tasks, events, dimensions.height, customPositions]);

    // Get node radius based on type
    const getNodeRadius = (type: string) => {
        switch (type) {
            case 'root': return 28;
            case 'job': return 24;
            case 'task': return 16;
            case 'event': return 8;
            default: return 12;
        }
    };

    // Generate bezier curve path between nodes
    const generatePath = (from: Node, to: Node): string => {
        const midX = (from.x + to.x) / 2;
        
        if (from.type === 'task' && to.type === 'event') {
            return `M ${from.x} ${from.y + getNodeRadius(from.type)} L ${to.x} ${to.y - getNodeRadius(to.type)}`;
        }
        
        return `M ${from.x + getNodeRadius(from.type)} ${from.y} 
                C ${midX} ${from.y} ${midX} ${to.y} ${to.x - getNodeRadius(to.type)} ${to.y}`;
    };

    // Get all connected node IDs for a given node (entire branch/path)
    const getConnectedNodeIds = useCallback((nodeId: string): Set<string> => {
        const connected = new Set<string>();
        connected.add(nodeId);
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return connected;
        
        if (node.type === 'task' || node.type === 'event') {
            const jobId = node.jobId;
            nodes.forEach(n => {
                if (n.jobId === jobId || n.id === 'root') {
                    connected.add(n.id);
                }
            });
        } else if (node.type === 'job') {
            connected.add('root');
            nodes.forEach(n => {
                if (n.jobId === node.jobId?.replace('job-', '')) {
                    connected.add(n.id);
                }
            });
        } else if (node.type === 'root') {
            nodes.forEach(n => connected.add(n.id));
        }
        
        return connected;
    }, [nodes]);

    // Check if node is connected to selected or hovered
    const isConnected = useCallback((nodeId: string): boolean => {
        if (selectedNodes.size === 0 && !hoveredNode) return true;
        
        // For hover, check single connection
        if (hoveredNode && selectedNodes.size === 0) {
            const connectedIds = getConnectedNodeIds(hoveredNode);
            return connectedIds.has(nodeId);
        }
        
        // For selection, check if connected to any selected node
        if (selectedNodes.size > 0) {
            for (const selectedId of selectedNodes) {
                const connectedIds = getConnectedNodeIds(selectedId);
                if (connectedIds.has(nodeId)) return true;
            }
            return false;
        }
        
        return true;
    }, [selectedNodes, hoveredNode, getConnectedNodeIds]);

    // Mouse handlers for panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !dragState) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && !dragState) {
            setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
        }
        if (dragState) {
            setDragState(prev => prev ? { 
                ...prev, 
                currentX: e.clientX, 
                currentY: e.clientY 
            } : null);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        setIsPanning(false);
        
        if (dragState) {
            // Calculate new position snapped to grid
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const newX = snapToGrid((e.clientX - rect.left - pan.x) / zoom - dragState.offsetX);
                const newY = snapToGrid((e.clientY - rect.top - pan.y) / zoom - dragState.offsetY);
                
                setCustomPositions(prev => ({
                    ...prev,
                    [dragState.nodeId]: { x: newX, y: newY }
                }));
                setHasUnsavedChanges(true);
            }
            setDragState(null);
        }
    };

    // Click on empty area to deselect
    const handleContainerClick = (e: React.MouseEvent) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('grid-background')) {
            closeSelection();
        }
    };

    // Start dragging a node
    const startDrag = (e: React.MouseEvent, node: Node) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        
        setDragState({
            nodeId: node.id,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            offsetX: mouseX - node.x,
            offsetY: mouseY - node.y,
        });
    };

    // Position save/load handlers
    const savePositions = () => {
        setSavedPositions({ ...customPositions });
        setHasUnsavedChanges(false);
    };

    const loadSavedPositions = () => {
        setCustomPositions({ ...savedPositions });
        setHasUnsavedChanges(false);
    };

    const resetToDefault = () => {
        setCustomPositions({});
        setHasUnsavedChanges(Object.keys(savedPositions).length > 0);
    };

    // Action handlers
    const handleColorChange = (color: string) => {
        if (!selectedNode) return;
        const jobId = selectedNode.replace('job-', '');
        const job = jobs.find(j => j.id === jobId);
        if (job) {
            pushUndo({ type: 'updateJobColor', jobId, oldColor: job.color });
            updateJob(jobId, { color });
        }
        resetPanel();
    };

    const handleFontChange = (font: string) => {
        if (!selectedNode) return;
        const jobId = selectedNode.replace('job-', '');
        setJobFonts(prev => ({ ...prev, [jobId]: font }));
        resetPanel();
    };

    const handleAddJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobTitle) return;
        
        const jobId = crypto.randomUUID();
        addJob(jobTitle, jobDesc, jobColor);
        pushUndo({ type: 'addJob', jobId });
        resetPanel();
    };

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNode || !eventTitle || !eventDate || !eventTime) return;
        
        const node = nodes.find(n => n.id === selectedNode);
        let jobId = '';
        let taskId: string | undefined = undefined;
        
        if (node?.type === 'task') {
            taskId = selectedNode.replace('task-', '');
            const task = tasks.find(t => t.id === taskId);
            jobId = task?.jobId || '';
        } else if (node?.type === 'job') {
            jobId = selectedNode.replace('job-', '');
        }
        
        const eventId = crypto.randomUUID();
        addEvent({
            title: eventTitle,
            date: eventDate,
            time: eventTime,
            jobId,
            taskId,
        });
        
        pushUndo({ type: 'addEvent', eventId });
        resetPanel();
    };

    const handleMoveTask = (newJobId: string) => {
        if (!selectedNode) return;
        const taskId = selectedNode.replace('task-', '');
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            pushUndo({ type: 'moveTask', taskId, fromJobId: task.jobId });
            updateTask(taskId, { jobId: newJobId });
            
            // Also move events that are linked to this task
            const taskEvents = events.filter(e => e.taskId === taskId);
            taskEvents.forEach(event => {
                updateEvent(event.id, { jobId: newJobId });
            });
        }
        resetPanel();
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNode || !taskTitle) return;
        
        const jobId = selectedNode.replace('job-', '');
        const taskId = crypto.randomUUID();
        addTask(taskTitle, taskDesc, jobId);
        
        pushUndo({ type: 'addTask', taskId });
        resetPanel();
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNode || !editTitle) return;
        
        const node = nodes.find(n => n.id === selectedNode);
        if (!node) return;
        
        if (node.type === 'job') {
            const jobId = selectedNode.replace('job-', '');
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                pushUndo({ type: 'updateJobTitle', jobId, oldTitle: job.title });
                updateJob(jobId, { title: editTitle, description: editDesc });
            }
        } else if (node.type === 'task') {
            const taskId = selectedNode.replace('task-', '');
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                pushUndo({ type: 'updateTaskTitle', taskId, oldTitle: task.title });
                updateTask(taskId, { title: editTitle, description: editDesc });
            }
        } else if (node.type === 'event') {
            const eventId = selectedNode.replace('event-', '');
            const event = events.find(e => e.id === eventId);
            if (event) {
                pushUndo({ type: 'updateEventTitle', eventId, oldTitle: event.title });
                updateEvent(eventId, { title: editTitle });
            }
        }
        
        resetPanel();
    };

    const openEditPanel = () => {
        const node = nodes.find(n => n.id === selectedNode);
        if (!node) return;
        
        if (node.type === 'job') {
            const job = jobs.find(j => `job-${j.id}` === selectedNode);
            setEditTitle(job?.title || '');
            setEditDesc(job?.description || '');
        } else if (node.type === 'task') {
            const task = tasks.find(t => `task-${t.id}` === selectedNode);
            setEditTitle(task?.title || '');
            setEditDesc(task?.description || '');
        } else if (node.type === 'event') {
            const event = events.find(e => `event-${e.id}` === selectedNode);
            setEditTitle(event?.title || '');
            setEditDesc('');
        }
        
        setActivePanel('editItem');
    };

    const handleDelete = () => {
        if (!selectedNode) return;
        
        const node = nodes.find(n => n.id === selectedNode);
        if (!node) return;
        
        if (node.type === 'job') {
            const jobId = selectedNode.replace('job-', '');
            const job = jobs.find(j => j.id === jobId);
            const jobTasks = tasks.filter(t => t.jobId === jobId);
            if (job && confirm('Delete this job and all its tasks?')) {
                pushUndo({ type: 'deleteJob', job, tasks: jobTasks });
                deleteJob(jobId);
                closeSelection();
            }
        } else if (node.type === 'task') {
            const taskId = selectedNode.replace('task-', '');
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                pushUndo({ type: 'deleteTask', task });
                deleteTask(taskId);
                closeSelection();
            }
        } else if (node.type === 'event') {
            const eventId = selectedNode.replace('event-', '');
            const event = events.find(e => e.id === eventId);
            if (event) {
                pushUndo({ type: 'deleteEvent', event });
                deleteEvent(eventId);
                closeSelection();
            }
        }
    };

    // Wheel/Trackpad handler - macOS optimized
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.ctrlKey) {
            const zoomFactor = 1 - e.deltaY * 0.01;
            setZoom(prev => Math.min(Math.max(0.3, prev * zoomFactor), 3));
        } else {
            setPan(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY,
            }));
        }
    };

    // Reset view
    const resetView = () => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
        closeSelection();
    };

    // Get selected node data
    const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

    // Generate grid pattern
    const gridPattern = useMemo(() => {
        const size = GRID_SIZE;
        return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='${size}' height='${size}' patternUnits='userSpaceOnUse'%3E%3Cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='%2330363D' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`;
    }, []);

    return (
        <div 
            ref={containerRef}
            style={{ 
                width: '100%', 
                height: '100%', 
                background: 'var(--bg-primary)',
                position: 'relative',
                overflow: 'hidden',
                cursor: isPanning ? 'grabbing' : dragState ? 'grabbing' : 'grab',
                touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleContainerClick}
            onWheel={handleWheel}
        >
            {/* Grid Background */}
            <div 
                className="grid-background"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '200%',
                    height: '200%',
                    backgroundImage: gridPattern,
                    backgroundPosition: `${pan.x % GRID_SIZE}px ${pan.y % GRID_SIZE}px`,
                    backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
                    pointerEvents: 'none',
                    opacity: 0.8,
                }}
            />

            <svg 
                width={dimensions.width} 
                height={dimensions.height}
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Edges with curved paths */}
                    {edges.map((edge, index) => {
                        const fromNode = nodes.find(n => n.id === edge.from);
                        const toNode = nodes.find(n => n.id === edge.to);
                        if (!fromNode || !toNode) return null;
                        
                        // Handle dragging - update edge target position
                        let adjustedFromNode = fromNode;
                        let adjustedToNode = toNode;
                        
                        if (dragState) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            if (rect) {
                                const dragX = (dragState.currentX - rect.left - pan.x) / zoom - dragState.offsetX;
                                const dragY = (dragState.currentY - rect.top - pan.y) / zoom - dragState.offsetY;
                                
                                if (dragState.nodeId === edge.from) {
                                    adjustedFromNode = { ...fromNode, x: dragX, y: dragY };
                                }
                                if (dragState.nodeId === edge.to) {
                                    adjustedToNode = { ...toNode, x: dragX, y: dragY };
                                }
                            }
                        }
                        
                        const connected = isConnected(edge.from) && isConnected(edge.to);
                        const path = generatePath(adjustedFromNode, adjustedToNode);
                        
                        return (
                            <path
                                key={index}
                                d={path}
                                fill="none"
                                stroke={edge.color}
                                strokeWidth={connected ? 2.5 : 1.5}
                                opacity={connected ? 0.8 : 0.15}
                                style={{ transition: dragState ? 'none' : 'all 0.2s' }}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map((node) => {
                        const radius = getNodeRadius(node.type);
                        const connected = isConnected(node.id);
                        const isHovered = hoveredNode === node.id;
                        const isSelected = selectedNodes.has(node.id);
                        const textColor = isLightColor(node.color) ? '#000' : '#fff';
                        const isDragging = dragState?.nodeId === node.id;
                        const jobFont = node.type === 'job' && node.jobId ? jobFonts[node.jobId] : undefined;
                        
                        // Calculate position during drag
                        let nodeX = node.x;
                        let nodeY = node.y;
                        
                        if (isDragging && containerRef.current) {
                            const rect = containerRef.current.getBoundingClientRect();
                            nodeX = (dragState.currentX - rect.left - pan.x) / zoom - dragState.offsetX;
                            nodeY = (dragState.currentY - rect.top - pan.y) / zoom - dragState.offsetY;
                        }
                        
                        return (
                            <g 
                                key={node.id}
                                style={{ 
                                    cursor: 'grab', 
                                    transition: isDragging ? 'none' : 'all 0.2s',
                                }}
                                onMouseEnter={() => !dragState && setHoveredNode(node.id)}
                                onMouseLeave={() => !dragState && setHoveredNode(null)}
                                onClick={(e) => {
                                    if (dragState) return;
                                    e.stopPropagation();
                                    
                                    if (e.shiftKey) {
                                        // Shift+click: toggle selection
                                        setSelectedNodes(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(node.id)) {
                                                newSet.delete(node.id);
                                            } else {
                                                newSet.add(node.id);
                                            }
                                            return newSet;
                                        });
                                    } else {
                                        // Normal click: single select
                                        if (selectedNodes.size === 1 && selectedNodes.has(node.id)) {
                                            closeSelection();
                                        } else {
                                            setSelectedNodes(new Set([node.id]));
                                            resetPanel();
                                        }
                                    }
                                }}
                                onMouseDown={(e) => {
                                    if (e.button === 0) {
                                        startDrag(e, node);
                                    }
                                }}
                                opacity={connected ? 1 : 0.2}
                            >
                                {/* Glow ring for hovered/selected */}
                                {(isHovered || isSelected) && (
                                    <circle
                                        cx={nodeX}
                                        cy={nodeY}
                                        r={radius + 5}
                                        fill="none"
                                        stroke={node.color}
                                        strokeWidth={2}
                                        opacity={0.5}
                                    />
                                )}
                                
                                {/* Node circle */}
                                <circle
                                    cx={nodeX}
                                    cy={nodeY}
                                    r={radius}
                                    fill={node.color}
                                    stroke={isSelected ? '#fff' : isDragging ? '#1F6FEB' : 'transparent'}
                                    strokeWidth={isSelected || isDragging ? 2 : 0}
                                    style={{ transition: isDragging ? 'none' : 'all 0.15s' }}
                                />
                                
                                {/* Label - for root and job */}
                                {(node.type === 'root' || node.type === 'job') && (
                                    <text
                                        x={nodeX}
                                        y={nodeY}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={textColor}
                                        fontSize={node.type === 'root' ? 12 : 10}
                                        fontWeight={600}
                                        fontFamily={jobFont || 'inherit'}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {node.label.length > 8 ? node.label.slice(0, 7) + '…' : node.label}
                                    </text>
                                )}
                                
                                {/* Index number for tasks and events */}
                                {(node.type === 'task' || node.type === 'event') && node.index && (
                                    <text
                                        x={nodeX}
                                        y={nodeY}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={textColor}
                                        fontSize={node.type === 'task' ? 9 : 6}
                                        fontWeight={600}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {node.index}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Hover tooltip */}
            {hoveredNode && selectedNodes.size === 0 && (() => {
                const node = nodes.find(n => n.id === hoveredNode);
                if (!node || node.type === 'root' || node.type === 'job') return null;
                return (
                    <div style={{
                        position: 'fixed',
                        left: Math.min(node.x * zoom + pan.x + 30, dimensions.width - 220),
                        top: Math.max(node.y * zoom + pan.y - 10, 10),
                        background: 'rgba(1, 4, 9, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${node.color}50`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: '#E6EDF3',
                        maxWidth: '200px',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        boxShadow: `0 4px 16px rgba(0,0,0,0.5)`,
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            {node.index && <span style={{ color: node.color, marginRight: '6px' }}>#{node.index}</span>}
                            {node.label}
                        </div>
                        <div style={{ fontSize: '11px', color: node.color, textTransform: 'capitalize' }}>{node.type}</div>
                    </div>
                );
            })()}

            {/* Multi-selection Panel */}
            {selectedNodes.size > 1 && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '220px',
                    background: 'rgba(1, 4, 9, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#E6EDF3', marginBottom: '4px' }}>
                            {selectedNodes.size} items selected
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Shift+click to toggle selection
                        </div>
                    </div>
                    <div style={{ padding: '8px' }}>
                        <button
                            onClick={deleteSelectedNodes}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#F85149',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                borderRadius: '6px',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 81, 73, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} />
                            Delete Selected (⌘⌫)
                        </button>
                    </div>
                    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        Press Esc to deselect all
                    </div>
                </div>
            )}

            {/* Right Panel - Info & Actions */}
            {selectedNodeData && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '260px',
                    background: 'rgba(1, 4, 9, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    {/* Info Section */}
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: selectedNodeData.color,
                            marginBottom: '4px',
                        }}>
                            {selectedNodeData.index && <span style={{ opacity: 0.7, marginRight: '6px' }}>#{selectedNodeData.index}</span>}
                            {selectedNodeData.label}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {selectedNodeData.type}
                        </div>
                        
                        {/* Shortcut hint */}
                        {selectedNodeData.type !== 'event' && (
                            <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                ⌘T to add {selectedNodeData.type === 'root' ? 'job' : selectedNodeData.type === 'job' ? 'task' : 'event'}
                            </div>
                        )}
                        
                        {/* Node-specific info */}
                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {selectedNodeData.type === 'root' && (
                                <>
                                    <div>{jobs.length} Jobs</div>
                                    <div>{tasks.length} Tasks</div>
                                    <div>{events.length} Events</div>
                                </>
                            )}
                            {selectedNodeData.type === 'job' && (() => {
                                const job = jobs.find(j => `job-${j.id}` === selectedNodeData.id);
                                const jobTasks = tasks.filter(t => t.jobId === job?.id);
                                const jobEvents = events.filter(e => e.jobId === job?.id);
                                return (
                                    <>
                                        <div>{job?.description || 'No description'}</div>
                                        <div style={{ marginTop: '4px' }}>{jobTasks.length} Tasks · {jobEvents.length} Events</div>
                                    </>
                                );
                            })()}
                            {selectedNodeData.type === 'task' && (() => {
                                const task = tasks.find(t => `task-${t.id}` === selectedNodeData.id);
                                const job = jobs.find(j => j.id === task?.jobId);
                                return (
                                    <>
                                        <div>{task?.description || 'No description'}</div>
                                        <div style={{ marginTop: '4px' }}>Job: {job?.title}</div>
                                        <div>Status: <span style={{ textTransform: 'capitalize' }}>{task?.status}</span></div>
                                    </>
                                );
                            })()}
                            {selectedNodeData.type === 'event' && (() => {
                                const event = events.find(e => `event-${e.id}` === selectedNodeData.id);
                                return (
                                    <>
                                        <div>Date: {event?.date}</div>
                                        <div>Time: {event?.time}{event?.endTime ? ` - ${event.endTime}` : ''}</div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    {activePanel === 'actions' && (
                        <div style={{ padding: '8px' }}>
                            {/* Root actions */}
                            {selectedNodeData.type === 'root' && (
                                <ActionButton icon={<Plus size={14} />} label="Add Job" onClick={() => setActivePanel('addJob')} />
                            )}
                            
                            {/* Edit button for job, task, event */}
                            {selectedNodeData.type !== 'root' && (
                                <ActionButton icon={<Pencil size={14} />} label="Edit" onClick={openEditPanel} />
                            )}
                            
                            {selectedNodeData.type === 'job' && (
                                <>
                                    <ActionButton icon={<Plus size={14} />} label="Add Task" onClick={() => setActivePanel('addTask')} />
                                    <ActionButton icon={<CalendarPlus size={14} />} label="Add Event" onClick={() => setActivePanel('addEvent')} />
                                    <ActionButton icon={<Palette size={14} />} label="Change Color" onClick={() => setActivePanel('colorPicker')} />
                                    <ActionButton icon={<Type size={14} />} label="Change Font" onClick={() => setActivePanel('fontPicker')} />
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                    <ActionButton icon={<Trash2 size={14} />} label="Delete Job" onClick={handleDelete} danger />
                                </>
                            )}
                            {selectedNodeData.type === 'task' && (
                                <>
                                    <ActionButton icon={<CalendarPlus size={14} />} label="Add Event" onClick={() => setActivePanel('addEvent')} />
                                    <ActionButton icon={<Move size={14} />} label="Move to Job" onClick={() => setActivePanel('moveTask')} />
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                    <ActionButton icon={<Trash2 size={14} />} label="Delete Task" onClick={handleDelete} danger />
                                </>
                            )}
                            {selectedNodeData.type === 'event' && (
                                <>
                                    <ActionButton icon={<Trash2 size={14} />} label="Delete Event" onClick={handleDelete} danger />
                                </>
                            )}
                        </div>
                    )}

                    {/* Add Job Form */}
                    {activePanel === 'addJob' && (
                        <div style={{ padding: '12px' }}>
                            <SubPanelHeader title="Add Job" onBack={() => setActivePanel('actions')} />
                            <form onSubmit={handleAddJob} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Job title..."
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    style={inputStyle}
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={jobDesc}
                                    onChange={(e) => setJobDesc(e.target.value)}
                                    style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                                />
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Color</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setJobColor(color)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    background: color,
                                                    border: jobColor === color ? '2px solid #fff' : 'none',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" style={submitButtonStyle}>
                                    <Plus size={14} /> Add Job
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Edit Form */}
                    {activePanel === 'editItem' && (
                        <div style={{ padding: '12px' }}>
                            <SubPanelHeader title="Edit" onBack={() => setActivePanel('actions')} />
                            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Title..."
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    style={inputStyle}
                                    autoFocus
                                />
                                {selectedNodeData.type !== 'event' && (
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                                    />
                                )}
                                <button type="submit" style={submitButtonStyle}>
                                    <Pencil size={14} /> Save Changes
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Add Task Form */}
                    {activePanel === 'addTask' && (
                        <div style={{ padding: '12px' }}>
                            <SubPanelHeader title="Add Task" onBack={() => setActivePanel('actions')} />
                            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Task title..."
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    style={inputStyle}
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={taskDesc}
                                    onChange={(e) => setTaskDesc(e.target.value)}
                                    style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                                />
                                <button type="submit" style={submitButtonStyle}>
                                    <Plus size={14} /> Add Task
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Add Event Form */}
                    {activePanel === 'addEvent' && (
                        <div style={{ padding: '12px' }}>
                            <SubPanelHeader title="Add Event" onBack={() => setActivePanel('actions')} />
                            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Event title..."
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    style={inputStyle}
                                    autoFocus
                                />
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    style={inputStyle}
                                />
                                <input
                                    type="time"
                                    value={eventTime}
                                    onChange={(e) => setEventTime(e.target.value)}
                                    style={inputStyle}
                                />
                                <button type="submit" style={submitButtonStyle}>
                                    <CalendarPlus size={14} /> Add Event
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Move Task */}
                    {activePanel === 'moveTask' && (
                        <div style={{ padding: '8px' }}>
                            <SubPanelHeader title="Move to Job" onBack={() => setActivePanel('actions')} />
                            {jobs.map(job => (
                                <button
                                    key={job.id}
                                    onClick={() => handleMoveTask(job.id)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#E6EDF3',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        borderRadius: '6px',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ width: 12, height: 12, borderRadius: '3px', background: job.color }} />
                                    {job.title}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Color Picker */}
                    {activePanel === 'colorPicker' && (
                        <div style={{ padding: '12px' }}>
                            <SubPanelHeader title="Choose Color" onBack={() => setActivePanel('actions')} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => handleColorChange(color)}
                                        style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            borderRadius: '6px',
                                            background: color,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Font Picker */}
                    {activePanel === 'fontPicker' && (
                        <div style={{ padding: '8px' }}>
                            <SubPanelHeader title="Choose Font" onBack={() => setActivePanel('actions')} />
                            {FONTS.map(font => (
                                <button
                                    key={font.value}
                                    onClick={() => handleFontChange(font.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#E6EDF3',
                                        fontSize: '13px',
                                        fontFamily: font.value,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        borderRadius: '6px',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {font.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Esc hint */}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {activePanel === 'actions' ? '⌘⌫ delete · Esc deselect' : 'Esc to go back'}
                    </div>
                </div>
            )}

            {/* Stats - bottom left */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'rgba(1, 4, 9, 0.7)',
                padding: '6px 10px',
                borderRadius: '4px',
            }}>
                {nodes.length} nodes · {edges.length} connections · {Math.round(zoom * 100)}%
            </div>

            {/* Controls - bottom right */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}>
                {/* Undo button */}
                {undoStack.length > 0 && (
                    <ControlButton 
                        icon={<Undo2 size={16} />} 
                        shortcut="⌘Z" 
                        title="Undo (⌘Z)" 
                        onClick={undo} 
                    />
                )}
                
                {/* Reset view button */}
                <ControlButton 
                    icon={<RotateCcw size={16} />} 
                    shortcut="⌘D" 
                    title="Reset View (⌘D)" 
                    onClick={resetView} 
                />
                
                {/* Legend */}
                <div style={{
                    background: 'rgba(1, 4, 9, 0.7)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontSize: '11px',
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>Legend</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        Root → Jobs → Tasks → Events
                    </div>
                </div>
                
                {/* Position controls */}
                <div style={{
                    background: 'rgba(1, 4, 9, 0.7)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    {/* Load saved positions */}
                    <button
                        onClick={loadSavedPositions}
                        disabled={Object.keys(savedPositions).length === 0}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: Object.keys(savedPositions).length === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: Object.keys(savedPositions).length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.15s',
                            opacity: Object.keys(savedPositions).length === 0 ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (Object.keys(savedPositions).length > 0) {
                                e.currentTarget.style.background = 'rgba(31, 111, 235, 0.3)';
                                e.currentTarget.style.color = '#E6EDF3';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = Object.keys(savedPositions).length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
                        }}
                        title="Load saved layout"
                    >
                        <RotateCw size={14} />
                    </button>
                    
                    {/* Save positions */}
                    <button
                        onClick={savePositions}
                        disabled={!hasUnsavedChanges && Object.keys(customPositions).length === 0}
                        style={{
                            background: hasUnsavedChanges ? 'rgba(63, 185, 80, 0.2)' : 'transparent',
                            border: 'none',
                            cursor: (!hasUnsavedChanges && Object.keys(customPositions).length === 0) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: hasUnsavedChanges ? '#3FB950' : 'var(--text-secondary)',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.15s',
                            opacity: (!hasUnsavedChanges && Object.keys(customPositions).length === 0) ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (hasUnsavedChanges || Object.keys(customPositions).length > 0) {
                                e.currentTarget.style.background = 'rgba(63, 185, 80, 0.3)';
                                e.currentTarget.style.color = '#3FB950';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = hasUnsavedChanges ? 'rgba(63, 185, 80, 0.2)' : 'transparent';
                            e.currentTarget.style.color = hasUnsavedChanges ? '#3FB950' : 'var(--text-secondary)';
                        }}
                        title="Save layout"
                    >
                        <Save size={14} />
                    </button>
                    
                    {/* Reset to default */}
                    <button
                        onClick={resetToDefault}
                        disabled={Object.keys(customPositions).length === 0}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: Object.keys(customPositions).length === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: Object.keys(customPositions).length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.15s',
                            opacity: Object.keys(customPositions).length === 0 ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (Object.keys(customPositions).length > 0) {
                                e.currentTarget.style.background = 'rgba(248, 81, 73, 0.2)';
                                e.currentTarget.style.color = '#F85149';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = Object.keys(customPositions).length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
                        }}
                        title="Reset to default layout"
                    >
                        <Grid3X3 size={14} />
                    </button>
                </div>
            </div>

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
                <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '20px',
                    fontSize: '10px',
                    color: '#9E741C',
                    background: 'rgba(158, 116, 28, 0.15)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                }}>
                    Unsaved layout changes
                </div>
            )}
        </div>
    );
}

// Control Button Component
function ControlButton({ icon, shortcut, title, onClick }: { icon: React.ReactNode; shortcut: string; title: string; onClick: () => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
                onClick={onClick}
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(1, 4, 9, 0.7)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(31, 111, 235, 0.3)';
                    e.currentTarget.style.color = '#E6EDF3';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(1, 4, 9, 0.7)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                title={title}
            >
                {icon}
            </button>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>{shortcut}</span>
        </div>
    );
}

// Action Button Component
function ActionButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: danger ? '#F85149' : '#E6EDF3',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '6px',
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'rgba(248, 81, 73, 0.1)' : 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
            {icon}
            {label}
        </button>
    );
}

// Sub Panel Header Component
function SubPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
        }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
            <button
                onClick={onBack}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    borderRadius: '4px',
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

// Styles
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: '#010409',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: '#E6EDF3',
    fontSize: '12px',
};

const submitButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: '#1F6FEB',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
};
