'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

/* ───────────────────────────── Syntax highlighting ─────────────────────────
   Minimal, brand-constrained tokenizer. Four hues only, all drawn from the
   design tokens: primary (structure), success (strings/numbers),
   warning (attributes/keywords), subtle (comments). No dependency added.
   ------------------------------------------------------------------------ */

type Rule = { re: RegExp; cls: string };

const COMMENT: Rule = {
  re: /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/y,
  cls: 'text-subtle-foreground',
};
const HASH_COMMENT: Rule = {
  re: /(?:#[^\n]*)/y,
  cls: 'text-subtle-foreground',
};
const STRING: Rule = {
  re: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/y,
  cls: 'text-success',
};
const NUMBER: Rule = { re: /\b\d+(?:\.\d+)?\b/y, cls: 'text-success' };

const HTML_RULES: Rule[] = [
  COMMENT,
  STRING,
  { re: /<\/?[A-Za-z][\w:-]*/y, cls: 'text-primary' },
  { re: /\/?>/y, cls: 'text-primary' },
  { re: /[A-Za-z-]+(?=\s*=)/y, cls: 'text-warning' },
];

const JSON_RULES: Rule[] = [
  STRING,
  { re: /"[^"\n]*"(?=\s*:)/y, cls: 'text-primary' },
  NUMBER,
  { re: /\b(?:true|false|null)\b/y, cls: 'text-warning' },
];

const TS_RULES: Rule[] = [
  COMMENT,
  STRING,
  {
    re: /\b(?:await|async|const|let|var|return|if|else|function|new|import|from|export|default|for|of|try|catch|throw|typeof)\b/y,
    cls: 'text-warning',
  },
  { re: /\b(?:fetch|console|document|window|JSON|Promise)\b/y, cls: 'text-primary' },
  { re: /[A-Za-z_$][\w$]*(?=\s*\()/y, cls: 'text-primary' },
  NUMBER,
];

const BASH_RULES: Rule[] = [
  HASH_COMMENT,
  STRING,
  { re: /-{1,2}[\w-]+/y, cls: 'text-warning' },
  { re: /\b(?:curl|POST|GET|npm|npx|node|npx)\b/y, cls: 'text-primary' },
];

const HTTP_RULES: Rule[] = [
  COMMENT,
  STRING,
  { re: /^\s*[A-Za-z-]+(?=:)/my, cls: 'text-primary' },
  { re: /\b(?:GET|POST|PATCH|PUT|DELETE|Bearer|HTTP\/[\d.]+)\b/y, cls: 'text-warning' },
];

const RULES: Record<string, Rule[]> = {
  html: HTML_RULES,
  xml: HTML_RULES,
  json: JSON_RULES,
  ts: TS_RULES,
  js: TS_RULES,
  javascript: TS_RULES,
  typescript: TS_RULES,
  jsx: TS_RULES,
  tsx: TS_RULES,
  bash: BASH_RULES,
  shell: BASH_RULES,
  sh: BASH_RULES,
  curl: BASH_RULES,
  http: HTTP_RULES,
};

function highlight(code: string, lang?: string): ReactNode[] {
  const rules = lang ? RULES[lang] : undefined;
  if (!rules) return [code];

  const out: ReactNode[] = [];
  let plain = '';
  let i = 0;
  let key = 0;

  while (i < code.length) {
    let consumed = false;
    for (const rule of rules) {
      rule.re.lastIndex = i;
      const m = rule.re.exec(code);
      if (m && m.index === i && m[0].length > 0) {
        if (plain) {
          out.push(plain);
          plain = '';
        }
        out.push(
          <span key={key++} className={rule.cls}>
            {m[0]}
          </span>,
        );
        i += m[0].length;
        consumed = true;
        break;
      }
    }
    if (!consumed) {
      plain += code[i];
      i += 1;
    }
  }
  if (plain) out.push(plain);
  return out;
}

/* ───────────────────────────── Code block ───────────────────────────── */

export function CodeBlock({
  code,
  lang,
  filename,
  copyable = true,
  className = '',
}: {
  code: string;
  lang?: string;
  filename?: string;
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`group overflow-hidden rounded-lg border border-border bg-surface-muted ${className}`}
    >
      {(filename || copyable) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            {filename ?? lang ?? 'code'}
          </span>
          {copyable && (
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
      <pre className="scroll-thin overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-foreground">
        <code>{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}