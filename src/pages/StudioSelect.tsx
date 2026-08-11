import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, FolderOpen } from 'lucide-react';
import { Badge } from '../components/ui/index';
import { COMPANY, FAMILY_BY_CODE, STUDIO_CARDS } from '../lib/constants';
import { getStorageAdapter } from '../lib/storage/index';
import { revisionLabel } from '../lib/ids';
import type { DesignRecord, DesignStatus } from '../lib/types';

const STATUS_TONE: Record<DesignStatus, 'brand' | 'green' | 'amber' | 'red' | 'slate'> = {
  Draft: 'slate',
  Submitted: 'brand',
  'Under Technical Review': 'brand',
  'Modification Required': 'amber',
  'Sample Development': 'brand',
  'Sample Approved': 'green',
  Quoted: 'green',
  'Order Confirmed': 'green',
  Rejected: 'red',
  Archived: 'slate',
};

export default function StudioSelect() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<DesignRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStorageAdapter()
      .listMyDesigns()
      .then((list) => {
        if (!cancelled) setDesigns(list);
      })
      .catch(() => {
        if (!cancelled) setDesigns([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-16 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2 py-1">
              <img src={COMPANY.logo} alt="Interconverters" className="h-6 w-auto" />
              <span className="text-xs font-bold tracking-tight text-brand-600">INTERCONVERTERS</span>
            </span>
          </Link>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-300">
            Narrow Fabric Design Studio
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            What would you like to design?
          </motion.h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Describe the elastic or tape you need in plain language, preview it in real time, and
            send it straight to our technical team for review — no manufacturing jargon required.
          </p>
        </div>
      </section>

      {/* Studio cards */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2">
          {STUDIO_CARDS.map((card, i) => (
            <motion.button
              key={card.slug}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              onClick={() => navigate(`/studio/${card.slug}`)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-44 overflow-hidden bg-slate-900">
                <img
                  src={card.image}
                  alt={card.label}
                  className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 font-mono text-sm font-bold text-brand-600 shadow">
                  {card.code}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="text-lg font-bold text-slate-900">{card.label}</h2>
                <p className="flex-1 text-sm leading-relaxed text-slate-500">{card.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {card.styles.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-end border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600">
                    Start designing{' '}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Saved designs */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <FolderOpen className="w-4 h-4" /> Your saved designs
        </h2>

        {designs === null && (
          <p className="text-sm text-slate-400">Loading your saved designs…</p>
        )}

        {designs !== null && designs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-400">
            No saved designs yet in this browser. Start a design above to see it here.
          </div>
        )}

        {designs !== null && designs.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Design</th>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => {
                  const familyMeta = FAMILY_BY_CODE[d.family];
                  return (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`/studio/${familyMeta?.slug ?? 'jacquard'}/${d.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-brand-600">
                          {d.designCode} · {revisionLabel(d.revisionNo)}
                        </div>
                        <div className="text-sm text-slate-700">{d.spec.name || 'Untitled design'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{familyMeta?.label ?? d.family}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
