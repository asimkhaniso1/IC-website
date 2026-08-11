import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

type Tab = 'controls' | 'preview' | 'spec';

const TABS: { key: Tab; label: string }[] = [
  { key: 'controls', label: 'Controls' },
  { key: 'preview', label: 'Preview' },
  { key: 'spec', label: 'Specification' },
];

export function StudioLayout({
  topBar,
  controls,
  preview,
  specification,
}: {
  topBar: ReactNode;
  controls: ReactNode;
  preview: ReactNode;
  specification: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('preview');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      {topBar}

      {/* Desktop: fixed 3-panel workspace */}
      <div className="hidden lg:grid flex-1 min-h-0 lg:grid-cols-[320px_1fr_300px] overflow-hidden">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4">{controls}</div>
        </aside>
        <main
          className="relative flex min-h-0 flex-col overflow-hidden bg-slate-100 p-6"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {preview}
        </main>
        <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4">
          {specification}
        </aside>
      </div>

      {/* Tablet/mobile: tabbed single panel */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:hidden">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          For precise logo placement we recommend desktop or tablet.
        </div>
        <div className="flex border-b border-slate-200 bg-white">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {tab === 'controls' && controls}
            {tab === 'preview' && preview}
            {tab === 'spec' && specification}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
