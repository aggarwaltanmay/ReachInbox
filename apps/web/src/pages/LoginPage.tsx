import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { API } from '../lib/api';

const features = [
  { icon: '◷', title: 'Schedule with confidence', description: 'Durable delayed jobs survive restarts and run exactly when your campaign needs them.' },
  { icon: '⌁', title: 'Built for real volume', description: 'Redis-backed pacing and hourly sender limits keep large batches controlled and ordered.' },
  { icon: '↗', title: 'See every delivery', description: 'Live queue visibility, searchable email history, and Slack alerts keep you in the loop.' }
];

const activity = [
  { name: 'ava@northstar.io', time: 'Sending now', color: 'emerald', status: 'Sending' },
  { name: 'noah@orbitlabs.ai', time: 'Today, 10:32 PM', color: 'indigo', status: 'Scheduled' },
  { name: 'mia@lumon.co', time: 'Today, 10:34 PM', color: 'indigo', status: 'Scheduled' }
];

export function LoginPage() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('reachinbox_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('reachinbox_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8faff] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60 dark:opacity-25" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-indigo-300/30 blur-[100px] dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[32rem] w-[32rem] rounded-full bg-cyan-300/25 blur-[100px] dark:bg-cyan-600/10" />

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="#top" className="group flex items-center gap-3" aria-label="ReachInbox home">
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 font-black text-white shadow-lg shadow-indigo-200 transition group-hover:-rotate-6 group-hover:scale-105 dark:shadow-indigo-950">
            <span className="absolute inset-0 translate-y-full bg-white/20 transition duration-500 group-hover:translate-y-0" />
            <span className="relative">R</span>
          </span>
          <span><span className="block text-base font-black leading-tight tracking-tight">ReachInbox</span><span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Delivery OS</span></span>
        </a>

        <div className="hidden items-center gap-7 text-sm font-semibold text-slate-500 md:flex dark:text-slate-400">
          <a href="#features" className="transition hover:text-indigo-600">Features</a>
          <a href="#workflow" className="transition hover:text-indigo-600">How it works</a>
          <a href={`${API}/admin/queues`} target="_blank" rel="noreferrer" className="transition hover:text-indigo-600">Live queues ↗</a>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Toggle dark mode" onClick={() => setDarkMode((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white/70 text-lg shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900/70">{darkMode ? '☀︎' : '☾'}</button>
          <a href={`${API}/auth/google`} className="hidden sm:block"><Button className="px-5 py-2.5">Sign in</Button></a>
        </div>
      </nav>

      <section id="top" className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Queue infrastructure is online
          </div>

          <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">Outreach that sends<span className="landing-gradient-text block">right on time.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">Schedule, pace, and monitor every outbound email from one reliable workspace. Built for teams that care about delivery—not babysitting queues.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={`${API}/auth/google`} className="group">
              <Button className="w-full px-6 py-3.5 text-base sm:w-auto">
                <svg viewBox="0 0 24 24" className="h-5 w-5 rounded-full bg-white p-0.5" aria-hidden>
                  <path fill="#4285F4" d="M22 12c0-.68-.06-1.37-.17-2H12v3.77h5.76c-.25 1.36-1 2.5-2.13 3.27v2.73h3.45c2.02-1.86 3.18-4.6 3.18-7.77z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.45-2.73c-.96.64-2.18 1.01-3.83 1.01-2.94 0-5.43-2.01-6.33-4.71H1.27v2.81C3.06 20.43 7.27 23 12 23z" /><path fill="#FBBC05" d="M5.67 14.91c-.22-.64-.35-1.33-.35-2.04s.13-1.4.35-2.04V8.02H1.27C.46 9.59 0 11.28 0 13s.46 3.41 1.27 4.98l4.4-3.07z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.27 1 3.06 3.57 1.27 8.02l4.4 3.07C6.57 8.39 9.06 6.38 12 5.38z" />
                </svg>
                Continue with Google <span className="transition group-hover:translate-x-1">→</span>
              </Button>
            </a>
            <span className="text-center text-xs text-slate-400 sm:text-left">Secure OAuth · No password required</span>
          </div>

          <div id="architecture" className="mt-10 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Powered by</span>{['BullMQ', 'Redis', 'PostgreSQL', 'Ethereal'].map((technology) => <span key={technology} className="rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">{technology}</span>)}</div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl animate-fade-up animation-delay-200 lg:mx-0">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-indigo-500/20 via-violet-500/10 to-cyan-500/20 blur-2xl" />
          <div className="landing-float relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/85 p-3 shadow-2xl shadow-indigo-200/50 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-indigo-950/50 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-4 dark:border-slate-800"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><div className="flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</div></div>

            <div className="grid gap-3 py-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-500/10"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Scheduled</p><p className="mt-2 text-3xl font-black text-indigo-700 dark:text-indigo-300">248</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950"><div className="h-full w-4/5 rounded-full bg-indigo-500" /></div></div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sent today</p><p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">1,842</p><div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">↗ 18% this week</div></div>
              <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Queue health</p><p className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">99.9%</p><div className="mt-3 flex gap-1">{[1, 1, 1, 1, 1, 1, 1, 1].map((_, index) => <span key={index} className="h-3 flex-1 rounded-sm bg-amber-400" style={{ opacity: 0.35 + index * 0.08 }} />)}</div></div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><p className="text-sm font-bold">Live delivery stream</p><p className="text-[10px] text-slate-400">Worker concurrency: 5</p></div><span className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm">+ Campaign</span></div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activity.map((item) => <div key={item.name} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-900"><span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${item.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'}`}>{item.name[0].toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.name}</p><p className="mt-0.5 text-[10px] text-slate-400">Product introduction sequence</p></div><div className="text-right"><p className={`text-[10px] font-bold ${item.color === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'}`}>{item.status}</p><p className="mt-0.5 text-[9px] text-slate-400">{item.time}</p></div></div>)}
              </div>
            </div>
          </div>

          <div className="landing-float-delayed absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:flex dark:border-slate-700 dark:bg-slate-900/95"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#4a154b] text-sm text-white">#</span><div><p className="text-xs font-bold">Slack alerts connected</p><p className="text-[10px] text-slate-400">Rate-limit notifications active</p></div><span className="ml-2 h-2 w-2 rounded-full bg-emerald-500" /></div>
        </div>
      </section>

      <section className="relative z-10 border-y border-slate-200/60 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/45">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200/70 px-5 dark:divide-slate-800 sm:px-8 lg:grid-cols-4 lg:px-10">
          {[['1,000+', 'Batch-ready jobs'], ['Persistent', 'Restart-safe queue'], ['Per sender', 'Hourly protection'], ['Real time', 'Queue visibility']].map(([value, label]) => (
            <div key={label} className="group px-4 py-7 text-center transition hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 sm:py-9">
              <p className="text-2xl font-black tracking-tight text-slate-900 transition group-hover:text-indigo-600 dark:text-white sm:text-3xl">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">From list to inbox</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">A calm workflow for busy queues.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 dark:text-slate-400">Upload your audience once. The scheduler handles timing, pacing, delivery, and visibility while you stay focused on the campaign.</p>
            <a href={`${API}/auth/google`} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 transition hover:gap-3">Start scheduling <span>→</span></a>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-2">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/20 blur-3xl" />
            {[
              ['01', 'Compose', 'Create the message and add a verified sender.'],
              ['02', 'Queue', 'Upload leads and choose the exact start time.'],
              ['03', 'Pace', 'Respect delay and hourly limits automatically.'],
              ['04', 'Observe', 'Track results live and receive Slack alerts.']
            ].map(([number, title, description], index) => (
              <article key={title} className={`group relative rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80 ${index % 2 ? 'sm:translate-y-6 sm:hover:translate-y-5' : ''}`}>
                <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-widest text-indigo-500">{number}</span><span className="h-2 w-2 rounded-full bg-indigo-200 transition group-hover:scale-150 group-hover:bg-indigo-500" /></div>
                <h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 border-y border-slate-200/70 bg-white/55 py-16 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-10 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Everything stays moving</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Reliable by design. Clear by default.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{features.map((feature, index) => <article key={feature.title} className="group rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/40 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-indigo-500/30"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-xl font-black text-indigo-600 transition group-hover:rotate-6 group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-300">{feature.icon}</span><span className="text-xs font-black text-slate-200 dark:text-slate-700">0{index + 1}</span></div><h3 className="mt-5 text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{feature.description}</p></article>)}</div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><p>ReachInbox Email Scheduler · Built for dependable outreach</p><p>Persistent jobs · Idempotent sends · Real-time visibility</p></footer>
    </main>
  );
}
