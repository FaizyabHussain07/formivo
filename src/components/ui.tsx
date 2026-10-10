import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/leads";

/* ──────────────────────────── Button ──────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-55 select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
};

const buttonSizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4",
  lg: "h-11 px-5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
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
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return (
    <Link
      href={href}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
}

/* ──────────────────────────── Badge ──────────────────────────── */

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "border-primary/30 bg-primary/10 text-primary",
  contacted: "border-warning/30 bg-warning-soft text-warning",
  qualified: "border-border bg-surface-muted text-foreground",
  converted: "border-success/30 bg-success-soft text-success",
  archived: "border-border bg-surface-muted text-subtle-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`badge ${statusStyles[status]}`}>{LEAD_STATUS_LABELS[status]}</span>
  );
}

/* ──────────────────────────── Input ──────────────────────────── */

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return (
    <label className={`block text-sm font-medium text-foreground ${className}`} {...props} />
  );
}

/* ──────────────────────────── Card ──────────────────────────── */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

/* ──────────────────────────── EmptyState ──────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ──────────────────────────── CodeBlock ──────────────────────────── */

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-surface-muted p-4 font-mono text-[13px] leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}
