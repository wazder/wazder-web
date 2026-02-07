import { useTaskContext } from '../contexts/TaskContext';

export function useNotes() {
    const { notes, addNote, updateNote, deleteNote } = useTaskContext();

    return { notes, addNote, updateNote, deleteNote };
}
