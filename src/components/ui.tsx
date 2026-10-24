'use client';

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Copy, Loader2, X } from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/leads";

/* ──────────────────────────── Button ──────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
  ghost:
    "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  danger:
    "bg-danger text-white hover:bg-danger/90 shadow-sm",
  link:
    "text-primary hover:text-primary-hover underline underline-offset-4 px-0",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-9 px-4",
  lg: "h-10 px-5 text-[15px]",
  icon: "h-9 w-9 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
}

/* ──────────────────────────── Spinner ──────────────────────────── */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      className={`h-4 w-4 animate-spin ${className}`}
    />
  );
}

/* ──────────────────────────── Badge ──────────────────────────── */

export function Badge({
  children,
  className = "",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "brand";
}) {
  const tones: Record<string, string> = {
    neutral: "",
    brand: "border-primary/30 bg-primary/10 text-primary",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-info/30 bg-info-soft text-info",
  };
  return (
    <span className={`badge ${tones[tone]} ${className}`}>{children}</span>
  );
}

const statusStyles: Record<LeadStatus, string> = {
  new: "border-primary/30 bg-primary/10 text-primary",
  contacted: "border-info/30 bg-info-soft text-info",
  qualified: "border-warning/30 bg-warning-soft text-warning",
  converted: "border-success/30 bg-success-soft text-success",
  archived: "border-border bg-surface-muted text-subtle-foreground",
};

/** Status badge — colour is always paired with the written label (WCAG). */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`badge ${statusStyles[status]}`}>
      <span className="status-dot" aria-hidden="true" />
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

const FORM_STATUS_TONE: Record<string, "success" | "neutral"> = {
  active: "success",
  archived: "neutral",
};

export function FormStatusBadge({ status }: { status: string }) {
  const normalized = status === "active" ? "active" : "archived";
  return (
    <Badge tone={FORM_STATUS_TONE[normalized]}>
      <span className="status-dot" aria-hidden="true" />
      {normalized === "active" ? "Active" : "Archived"}
    </Badge>
  );
}

/* ──────────────────────────── Form controls ──────────────────────────── */

const controlBase =
  "w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`h-9 ${controlBase} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`min-h-24 py-2 ${controlBase} ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={`h-9 cursor-pointer appearance-none bg-right pr-8 ${controlBase} ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      className={`block text-[13px] font-medium text-foreground ${className}`}
      {...props}
    />
  );
}

/** Label + control + optional hint/error in one accessible wrapper. */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  htmlFor?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Password input with a visibility toggle (auth screens). */
export function PasswordInput({
  className = "",
  ...props
}: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`h-9 ${controlBase} pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-subtle-foreground transition-colors hover:text-foreground"
      >
        {visible ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ──────────────────────────── Surfaces ──────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

/** Card with a title, optional description and right-aligned actions. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex-none">{action}</div>}
        </header>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Separator({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full bg-border ${className}`}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

/* ──────────────────────────── Page header ──────────────────────────── */

/**
 * Standard page header used at the top of every dashboard view:
 * breadcrumb/title, description, optional actions.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  action,
}: {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  /** Alias kept for earlier call sites that used `action`. */
  action?: ReactNode;
}) {
  const trailing = actions ?? action;
  return (
    <div className="border-b border-border bg-background">
      <div className="px-5 py-5 lg:px-8">
        {breadcrumb && (
          <div className="mb-1.5 text-xs text-muted-foreground">{breadcrumb}</div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {trailing && <div className="flex flex-wrap items-center gap-2">{trailing}</div>}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── States ──────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-subtle-foreground">{icon}</div>}
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-[13px] text-muted-foreground">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-[13px] text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline alert for form-level errors and warnings. */
export function Callout({
  tone = "danger",
  title,
  children,
}: {
  tone?: "danger" | "warning" | "success" | "info";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    danger: "border-danger/30 bg-danger-soft text-danger",
    warning: "border-warning/30 bg-warning-soft text-warning",
    success: "border-success/30 bg-success-soft text-success",
    info: "border-info/30 bg-info-soft text-info",
  };
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2.5 text-[13px] leading-relaxed ${tones[tone]}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Skeleton matching the dashboard table layout. */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={c === 0 ? "h-4 w-48" : c === cols - 1 ? "ml-auto h-4 w-20" : "h-4 w-24"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── Copy button ──────────────────────────── */

export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  className = "",
}: {
  value: string;
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={copy}
      className={className}
      aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Read-only monospace value with a copy affordance (endpoints, IDs). */
export function CopyField({
  label,
  value,
  prefix,
  multiline = false,
}: {
  label?: string;
  value: string;
  prefix?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex items-start gap-2">
        <code
          className={`min-w-0 flex-1 break-all rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-foreground ${
            multiline ? "whitespace-pre-wrap" : "truncate"
          }`}
        >
          {prefix && <span className="text-primary">{prefix} </span>}
          {value}
        </code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

/* ──────────────────────────── Modal ──────────────────────────── */

/**
 * Accessible dialog: focus is moved in on open, trapped by Tab, returned to
 * the trigger on close, Escape and backdrop click both close it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${width} animate-[modal-in_180ms_ease-out] rounded-lg border border-border bg-surface-elevated shadow-lg`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-[15px] font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
      <style>{`@keyframes modal-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/** Confirmation dialog for destructive or consequential actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${
            destructive ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"
          }`}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Modal>
  );
}

/* ──────────────────────────── Tabs ──────────────────────────── */

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-px h-0.5 ${
                isActive ? "bg-primary" : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────── Table ──────────────────────────── */

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`scroll-thin overflow-x-auto ${className}`}>
      <table className="table-base min-w-[640px]">{children}</table>
    </div>
  );
}

export function TH({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={className}>{children}</th>;
}

export function TD({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={className}>{children}</td>;
}

/* ──────────────────────────── Pagination ──────────────────────────── */

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      className="flex items-center justify-between border-t border-border px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages} · {total.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}