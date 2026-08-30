import { useEffect, useState } from 'react';
import type { User } from '../../types';
import { Button } from '../ui/Button';

type Props = {
  user: User;
  slackConnected: boolean;
  slackTeam?: string | null;
  onLogout(): void;
  onConnectSlack(): void;
  onDisconnectSlack(): void;
};

export function Header({ user, slackConnected, slackTeam, onLogout, onConnectSlack, onDisconnectSlack }: Props) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('reachinbox_theme') === 'dark');
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('reachinbox_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => setAvatarFailed(false), [user.avatar_url]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">
            R
          </div>
          <div>
            <p className="font-bold leading-tight">ReachInbox</p>
            <p className="text-xs text-slate-500">Email scheduler</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {slackConnected ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                Slack · {slackTeam || 'Connected'}
              </span>
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onDisconnectSlack}>
                Disconnect
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectSlack}
              className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:inline-flex"
            >
              Connect Slack
            </button>
          )}

          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            {user.avatar_url && !avatarFailed ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onLogout}>
              Logout
            </Button>
            <button
              type="button"
              aria-label="Toggle dark mode"
              onClick={() => setDarkMode((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {darkMode ? '☀︎' : '☾'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
