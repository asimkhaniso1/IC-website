/**
 * Shared brand-styled UI primitives for the Design Studio + admin dashboard.
 * Keep these minimal and dependency-free (Tailwind classes only).
 */
import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { X, HelpCircle } from 'lucide-react';
import { isLight } from '../../lib/color';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-blue-900/20 disabled:bg-slate-300 disabled:shadow-none',
  secondary:
    'bg-white hover:bg-slate-50 text-brand-600 border border-brand-600/30 disabled:text-slate-400 disabled:border-slate-200',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 disabled:text-slate-300',
  danger:
    'bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-300',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-8 py-4 text-base rounded-lg gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center font-bold transition-all disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Panel — titled container used for control groups / summary sections
// ---------------------------------------------------------------------------

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}
    >
      {title !== undefined && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field — label + control wrapper (with optional tooltip)
// ---------------------------------------------------------------------------

export function Field({
  label,
  tooltip,
  htmlFor,
  children,
  className = '',
}: {
  label: ReactNode;
  tooltip?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500"
      >
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all disabled:bg-slate-50 disabled:text-slate-400';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`${inputClass} ${className}`} {...rest} />;
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Slider({
  label,
  valueLabel,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  valueLabel?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(label || valueLabel) && (
        <div className="flex justify-between text-xs text-slate-500">
          <span className="font-medium">{label}</span>
          <span className="font-mono">{valueLabel}</span>
        </div>
      )}
      <input type="range" className="w-full accent-brand-600" {...rest} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorSwatch
// ---------------------------------------------------------------------------

export function ColorSwatch({
  color,
  selected,
  size = 'md',
  onClick,
  title,
}: {
  color: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  title?: string;
}) {
  const px = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <button
      type="button"
      title={title ?? color}
      onClick={onClick}
      className={`${px} rounded-md border transition-all ${
        selected
          ? 'ring-2 ring-brand-600 ring-offset-2 border-transparent'
          : isLight(color)
            ? 'border-slate-300 hover:scale-110'
            : 'border-transparent hover:scale-110'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------------------
// Tooltip — simple hover/focus tooltip ("What is repeat length?")
// ---------------------------------------------------------------------------

export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="relative inline-flex group">
      {children ?? (
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
      )}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50 hidden group-hover:block group-focus-within:block">
        <span className="block bg-slate-900 text-white text-xs font-normal normal-case tracking-normal rounded-lg px-3 py-2 shadow-xl leading-relaxed">
          {text}
        </span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge — status pills / feasibility indicator base
// ---------------------------------------------------------------------------

type BadgeTone = 'brand' | 'green' | 'amber' | 'red' | 'slate';

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-blue-50 text-brand-600 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({
  tone = 'slate',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// NumberField — number input with unit suffix (mm/in aware callers)
// ---------------------------------------------------------------------------

export function NumberField({
  value,
  onValue,
  suffix,
  min,
  max,
  step,
  disabled,
  id,
}: {
  value: number;
  onValue: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
}) {
  const autoId = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <div className="relative">
      <input
        id={id ?? autoId}
        type="number"
        className={`${inputClass} ${suffix ? 'pr-12' : ''}`}
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onValue(v);
        }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
