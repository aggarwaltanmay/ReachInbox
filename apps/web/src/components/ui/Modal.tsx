import type { ReactNode } from 'react';

export function Modal({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/70">
      <button type="button" aria-label="Close modal backdrop" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl animate-slide-up">{children}</div>
    </div>
  );
}
