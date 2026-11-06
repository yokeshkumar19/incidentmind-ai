import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, X } from "lucide-react";
import { motion } from "framer-motion";

export const severityStyles = {
  Critical:
    "bg-[#FF5A1F] text-white dark:border dark:border-[#F87171] dark:bg-[#F87171]/15 dark:text-[#F87171]",
  High: "bg-[#6428C8] text-white dark:border dark:border-[#FB923C] dark:bg-[#FB923C]/15 dark:text-[#FB923C]",
  Medium:
    "bg-[#3155E7] text-white dark:border dark:border-[#FBBF24] dark:bg-[#FBBF24]/15 dark:text-[#FBBF24]",
  Low: "bg-[#D6FF45] text-[#171717] dark:border dark:border-[#60A5FA] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA]",
};

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${className}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-black/60 dark:text-[#D1D5DB]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function StatCard({
  label,
  value,
  detail,
  color,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <motion.article
      whileHover={{ y: -5, rotate: -0.5 }}
      className={`stat-card ${className}`}
      style={{ background: color }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-black uppercase tracking-[.16em]">{label}</span>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <strong className="mt-5 block font-display text-5xl font-black tracking-[-.07em] sm:text-6xl">
        {value}
      </strong>
      <div className="mt-3 flex items-center justify-between border-t border-current/20 pt-3 text-xs font-bold">
        <span>{detail}</span>
        <ArrowUpRight size={16} />
      </div>
    </motion.article>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[24px] border-2 border-dashed border-black/15 p-10 text-center dark:border dark:border-[#374151] dark:bg-[#111827]">
      <p className="font-display text-2xl font-black">{title}</p>
      <p className="mt-2 text-sm opacity-60">{detail}</p>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#171717]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-[28px] border-2 border-black bg-[#FFF7E8] p-6 shadow-[10px_10px_0_#171717] dark:border dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#F3F4F6] dark:shadow-[10px_10px_0_#05070C]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-black">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
