import { useTaskContext } from '../contexts/TaskContext';

export function useEvents() {
    const { events, addEvent, deleteEvent, updateEvent, getEventsForDate } = useTaskContext();

    return { events, addEvent, deleteEvent, updateEvent, getEventsForDate };
}
