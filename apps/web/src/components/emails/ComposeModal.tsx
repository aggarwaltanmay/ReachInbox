import { useCallback, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { defaultStartAt, parseLeads } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type Props = {
  onClose(): void;
  onScheduled(count: number): void;
};

export function ComposeModal({ onClose, onScheduled }: Props) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    sender: '',
    subject: '',
    body: '',
    startAt: defaultStartAt(),
    delaySeconds: 2,
    hourlyLimit: 200
  });
  const [leads, setLeads] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const estimatedFinish = useMemo(() => {
    const start = new Date(form.startAt).getTime();
    if (!Number.isFinite(start) || !leads.length) return null;
    const spacingFinish = start + Math.max(leads.length - 1, 0) * form.delaySeconds * 1000;
    const overflowHours = Math.max(Math.ceil(leads.length / Math.max(form.hourlyLimit, 1)) - 1, 0);
    return new Date(spacingFinish + overflowHours * 60 * 60 * 1000);
  }, [form.delaySeconds, form.hourlyLimit, form.startAt, leads.length]);

  const ingest = useCallback((text: string) => {
    setLeads(parseLeads(text));
  }, []);

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) ingest(await file.text());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) {
      if (step === 1 && (!form.sender || !form.subject || !form.body)) {
        setError('Complete the sender, subject, and message before continuing.');
        return;
      }
      if (step === 2 && !leads.length) {
        setError('Upload a CSV or text file containing at least one valid email address.');
        return;
      }
      setError('');
      setStep((current) => current + 1);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await api.schedule({
        requestId,
        sender: form.sender,
        recipients: leads,
        subject: form.subject,
        body: form.body,
        startAt: new Date(form.startAt).toISOString(),
        delayMs: form.delaySeconds * 1000,
        hourlyLimitPerSender: form.hourlyLimit
      });
      onScheduled(result.count);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule emails');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="max-h-[92vh] overflow-auto rounded-2xl border border-white/60 bg-white text-slate-900 shadow-2xl dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:shadow-black/50">
        <div className="border-b border-slate-200 bg-white px-7 py-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Campaign studio</p>
              <h2 className="mt-1 text-xl font-bold">Compose new campaign</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Upload leads, set pacing, and queue durable BullMQ jobs.
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:rotate-90 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
              ✕
            </button>
          </div>
          <div className="mt-6 flex items-center gap-2">
            {['Message', 'Audience & pacing', 'Review'].map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${step > index ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{step > index + 1 ? '✓' : index + 1}</span>
                <span className={`hidden text-xs font-semibold lg:inline ${step > index ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
                {index < 2 && <span className={`h-0.5 flex-1 rounded-full transition ${step > index + 1 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[430px] space-y-4 bg-white px-7 py-6 dark:bg-slate-950">
          {step === 1 && <div className="animate-slide-up space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              From address
              <input
                required
                type="email"
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                value={form.sender}
                onChange={(e) => setForm({ ...form, sender: e.target.value })}
              />
            </label>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                <p className="font-semibold">Personalization tip</p>
                <p className="mt-1 text-xs leading-5 opacity-80">Write concise, human copy. Ethereal captures every message safely without delivering it to real inboxes.</p>
              </div>
            </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Subject
            <input
              required
              placeholder="Quick intro from ReachInbox"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Message
            <textarea
              required
              rows={5}
              placeholder="Write your outreach copy…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <div className="flex justify-end text-xs text-slate-400">{form.body.length} characters</div>
          </div>}

          {step === 2 && <div className="animate-slide-up space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Leads (.csv or .txt)</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`mt-1.5 rounded-2xl border-2 border-dashed p-7 text-center transition ${
                  dragOver ? 'scale-[1.01] border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                }`}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop or browse</p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="mt-2 block w-full rounded-lg text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-600 dark:bg-transparent dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-indigo-300"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) ingest(await file.text());
                  }}
                />
                <p className="mt-2 text-sm font-semibold text-indigo-600">
                  {leads.length} valid email{leads.length === 1 ? '' : 's'} detected
                </p>
              </div>
              {leads.length > 0 && <div className="mt-3 flex max-h-20 flex-wrap gap-2 overflow-auto scrollbar-thin">{leads.slice(0, 8).map((lead) => <span key={lead} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{lead}</span>)}{leads.length > 8 && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10">+{leads.length - 8} more</span>}</div>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Start sending
                <input required type="datetime-local" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Delay between emails (sec)
              <input
                required
                min={0}
                type="number"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
                value={form.delaySeconds}
                onChange={(e) => setForm({ ...form, delaySeconds: Number(e.target.value) })}
              />
              <span className="mt-1 block text-xs text-slate-500">Staggers each recipient in the batch.</span>
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Hourly limit (per sender)
              <input
                required
                min={1}
                type="number"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
                value={form.hourlyLimit}
                onChange={(e) => setForm({ ...form, hourlyLimit: Number(e.target.value) })}
              />
              <span className="mt-1 block text-xs text-slate-500">Overflow rolls to the next hour window.</span>
              </label>
            </div>
          </div>
          }

          {step === 3 && <div className="animate-slide-up space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">Ready to launch</p><p className="mt-1 text-lg font-bold">{form.subject}</p></div>
              <div className="grid gap-px bg-slate-200 dark:bg-slate-700 sm:grid-cols-3">
                <div className="bg-white p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Recipients</p><p className="mt-1 text-2xl font-bold">{leads.length}</p></div>
                <div className="bg-white p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Starts</p><p className="mt-1 text-sm font-semibold">{new Date(form.startAt).toLocaleString()}</p></div>
                <div className="bg-white p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Estimated finish</p><p className="mt-1 text-sm font-semibold">{estimatedFinish?.toLocaleString() || '—'}</p></div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">From</span><span className="font-semibold">{form.sender}</span></div><div className="my-4 h-px bg-slate-200 dark:bg-slate-700" /><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{form.body}</p></div>
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"><span>✓</span><p><strong>Durable scheduling enabled.</strong> Jobs persist in Redis and overflow respects the {form.hourlyLimit}/hour sender limit.</p></div>
          </div>}

          {error && <p className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        </div>

        <div className="flex justify-between gap-3 border-t bg-slate-50/60 px-7 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <Button type="button" variant="secondary" onClick={() => step === 1 ? onClose() : setStep((current) => current - 1)}>{step === 1 ? 'Cancel' : '← Back'}</Button>
          <Button type="submit" disabled={saving || (step === 3 && !leads.length)}>
            {step < 3 ? 'Continue →' : saving ? 'Scheduling…' : `Launch ${leads.length || 0} emails`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
