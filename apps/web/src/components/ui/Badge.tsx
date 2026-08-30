import type { EmailStatus } from '../../types';

const colors: Record<EmailStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-100',
  processing: 'bg-amber-50 text-amber-700 ring-amber-100',
  sent: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  failed: 'bg-rose-50 text-rose-700 ring-rose-100'
};

export function Badge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${colors[status]}`}>
      {status}
    </span>
  );
}
