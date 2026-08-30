import { Fragment, useMemo, useState } from 'react';
import type { Email, Tab } from '../../types';
import { formatDate } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { EmptyState, Spinner } from '../ui/States';

type Props = {
  emails: Email[];
  loading: boolean;
  tab: Tab;
  onCompose?(): void;
};

export function EmailTable({ emails, loading, tab, onCompose }: Props) {
  const [sortNewest, setSortNewest] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sortedEmails = useMemo(() => [...emails].sort((left, right) => {
    const leftTime = new Date(tab === 'sent' ? left.sent_at || left.scheduled_at : left.scheduled_at).getTime();
    const rightTime = new Date(tab === 'sent' ? right.sent_at || right.scheduled_at : right.scheduled_at).getTime();
    return sortNewest ? rightTime - leftTime : leftTime - rightTime;
  }), [emails, sortNewest, tab]);

  if (loading) return <Spinner label={`Loading ${tab} emails…`} />;

  if (!emails.length) {
    return (
      <EmptyState
        title={`No ${tab} emails yet`}
        description={
          tab === 'scheduled'
            ? 'Compose a campaign to queue your first batch of outreach.'
            : 'Sent and failed deliveries will appear here once the worker runs.'
        }
        action={
          tab === 'scheduled' && onCompose ? (
            <button
              onClick={onCompose}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Compose new email
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
          <tr>
            <th className="px-6 py-4 font-semibold">Recipient</th>
            <th className="px-6 py-4 font-semibold">Subject</th>
            <th className="px-6 py-4 font-semibold">
              <button type="button" onClick={() => setSortNewest((value) => !value)} className="inline-flex items-center gap-1.5 hover:text-indigo-600">
                {tab === 'sent' ? 'Sent time' : 'Scheduled time'} <span>{sortNewest ? '↓' : '↑'}</span>
              </button>
            </th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="w-12 px-3 py-4"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {sortedEmails.map((email) => (
            <Fragment key={email.id}>
              <tr onClick={() => setExpanded(expanded === email.id ? null : email.id)} className="group cursor-pointer border-b border-slate-100 transition hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-indigo-500/5">
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-xs font-bold text-indigo-700 dark:from-indigo-500/20 dark:to-cyan-500/20 dark:text-indigo-300">{email.recipient[0]?.toUpperCase()}</span>
                    {email.recipient}
                  </div>
                </td>
                <td className="max-w-xs truncate px-6 py-4 text-slate-600 dark:text-slate-300" title={email.subject}>{email.subject}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatDate(tab === 'sent' ? email.sent_at : email.scheduled_at)}</td>
                <td className="px-6 py-4"><Badge status={email.status} /></td>
                <td className="px-3 py-4 text-slate-400"><span className={`inline-block transition ${expanded === email.id ? 'rotate-180' : ''}`}>⌄</span></td>
              </tr>
              {expanded === email.id && (
                <tr className="animate-fade-in border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="grid gap-4 text-xs sm:grid-cols-3">
                      <div><p className="font-semibold uppercase tracking-wide text-slate-400">Email ID</p><p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-300">{email.id}</p></div>
                      <div><p className="font-semibold uppercase tracking-wide text-slate-400">Queue state</p><p className="mt-1 capitalize text-slate-600 dark:text-slate-300">{email.status}</p></div>
                      <div><p className="font-semibold uppercase tracking-wide text-slate-400">Result</p><p className={`mt-1 ${email.error ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>{email.error || 'No delivery errors reported'}</p></div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
