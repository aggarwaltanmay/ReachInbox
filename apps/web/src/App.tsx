import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';

function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm">Loading session…</p>
        </div>
      </main>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard user={user} onLogout={logout} />;
}

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
