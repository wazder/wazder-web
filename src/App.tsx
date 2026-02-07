import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TaskProvider } from './contexts/TaskContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Jobs } from './pages/Jobs';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Notes } from './pages/Notes';
import { Worktree } from './pages/Worktree';
import { Events } from './pages/Events';
import { LoginPage } from './pages/LoginPage';
import { useTaskContext } from './contexts/TaskContext';
import { useEffect } from 'react';

function AuthSync() {
  const { user } = useAuth();
  const { setUserId } = useTaskContext();

  useEffect(() => {
    setUserId(user?.id ?? null);
  }, [user, setUserId]);

  return null;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <AuthSync />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Worktree />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="events" element={<Events />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="notes" element={<Notes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;
