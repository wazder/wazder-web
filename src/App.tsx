import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TaskProvider } from './contexts/TaskContext';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Notes } from './pages/Notes';
import { ChatbotPage } from './pages/ChatbotPage';

function App() {
  return (
    <TaskProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="notes" element={<Notes />} />
            <Route path="ai-assistant" element={<ChatbotPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TaskProvider>
  );
}

export default App;
