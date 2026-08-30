import { useCallback, useEffect, useState } from 'react';
import { ComposeModal } from '../components/emails/ComposeModal';
import { EmailTable } from '../components/emails/EmailTable';
import { StatsCards } from '../components/emails/StatsCards';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useEmails } from '../hooks/useEmails';
import { useToast } from '../hooks/useToast';
import { api, API } from '../lib/api';
import type { EmailStatus, Tab, User } from '../types';

type Props = {
  user: User;
  onLogout(): void;
};

export function Dashboard({ user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('scheduled');
  const [compose, setCompose] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EmailStatus | null>(null);
  const { push } = useToast();
  const { emails, stats, loading, searching, refreshing, searchQuery, lastUpdated, autoRefresh, error, load, search, setAutoRefresh } = useEmails(tab, true);
  const visibleEmails = statusFilter ? emails.filter((email) => email.status === statusFilter) : emails;

  const refreshSlack = useCallback(async () => {
    try {
      const status = await api.slackStatus();
      setSlackConnected(status.connected);
      setSlackTeam(status.teamName);
    } catch {
      setSlackConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshSlack();
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'connected') {
      push('Slack connected — rate-limit alerts are enabled.', 'success');
      window.history.replaceState({}, '', '/');
      refreshSlack();
    }
  }, [push, refreshSlack]);

  const disconnectSlack = async () => {
    await api.disconnectSlack();
    setSlackConnected(false);
    setSlackTeam(null);
    push('Slack disconnected.', 'info');
  };

  const connectSlack = async () => {
    try {
      const { url } = await api.connectSlack();
      window.location.assign(url);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Unable to connect Slack.', 'error');
    }
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <Header
        user={user}
        slackConnected={slackConnected}
        slackTeam={slackTeam}
        onLogout={onLogout}
        onConnectSlack={connectSlack}
        onDisconnectSlack={disconnectSlack}
      />

      <section className="relative mx-auto max-w-6xl space-y-6 p-6">
        <div className="pointer-events-none absolute -left-24 -top-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/15" />
        <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Outreach delivery</p>
            <h1 className="mt-1 text-3xl font-bold">Email scheduler</h1>
            <p className="mt-2 text-slate-500">Queue visibility for every outbound message.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!slackConnected && (
              <button
                type="button"
                onClick={connectSlack}
                className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:hidden"
              >
                Connect Slack
              </button>
            )}
            <a
              href={`${API}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              BullMQ dashboard ↗
            </a>
            <Button onClick={() => setCompose(true)}>+ Compose new email</Button>
          </div>
        </div>

        <div className="relative animate-fade-up animation-delay-100">
          <StatsCards stats={stats} onSelect={(status) => {
            setStatusFilter(status);
            setTab(['sent', 'failed'].includes(status) ? 'sent' : 'scheduled');
          }} />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-lg shadow-slate-200/40 backdrop-blur animate-fade-up animation-delay-200 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none">
          <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-6">
              {(['scheduled', 'sent'] as Tab[]).map((value) => (
                <button
                  key={value}
                  onClick={() => { setTab(value); setStatusFilter(null); }}
                  className={`border-b-2 py-1 text-sm font-semibold capitalize transition ${
                    tab === value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {value} emails
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAutoRefresh(!autoRefresh)} className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:inline-flex ${autoRefresh ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`} title="Toggle live refresh">
                <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} /> {autoRefresh ? 'Live' : 'Paused'}
              </button>
              <input
                type="search"
                placeholder="Search emails…"
                value={searchQuery}
                onChange={(e) => search(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:w-72 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 sm:w-56"
              />
              <Button variant="ghost" className={`px-3 ${refreshing ? 'animate-spin' : ''}`} onClick={load} title="Refresh">
                ↻
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center gap-2">
              <span>{visibleEmails.length} result{visibleEmails.length === 1 ? '' : 's'}</span>
              {statusFilter && <button type="button" onClick={() => setStatusFilter(null)} className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold capitalize text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10">{statusFilter} ×</button>}
            </div>
            <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Connecting to queue…'}</span>
          </div>

          {error && <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
          {searching ? (
            <div className="p-8 text-center text-sm text-slate-500">Searching…</div>
          ) : (
            <EmailTable emails={visibleEmails} loading={loading} tab={tab} onCompose={() => setCompose(true)} />
          )}
        </div>
      </section>

      {compose && (
        <ComposeModal
          onClose={() => setCompose(false)}
          onScheduled={(count) => {
            push(`Scheduled ${count} email${count === 1 ? '' : 's'} successfully.`, 'success');
            load();
          }}
        />
      )}
    </main>
  );
}
