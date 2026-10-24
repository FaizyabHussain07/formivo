import { ArrowUpRight, FileText, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui';
import { CodeBlock } from '@/components/code';

/**
 * Representative product previews for the public site.
 *
 * Data below is illustrative and always labelled as demo data inside the
 * preview itself — no metrics, logos or testimonials are invented elsewhere.
 */

const DEMO_FORMS = [
  { name: 'Website Contact Form', id: 'frm_2c9a41be7f', leads: 128, status: 'Active' },
  { name: 'Project Enquiry', id: 'frm_77d3e0a115', leads: 64, status: 'Active' },
  { name: 'Newsletter Signup', id: 'frm_9b1f5c82da', leads: 41, status: 'Archived' },
];

const DEMO_LEADS = [
  { name: 'Jordan Alvarez', email: 'jordan@northside.co', form: 'Contact', when: '2m ago', status: 'New' },
  { name: 'Priya Raman', email: 'priya@raman.dev', form: 'Enquiry', when: '1h ago', status: 'Contacted' },
  { name: 'Tomas Lind', email: 'tomas@lindstudio.se', form: 'Contact', when: '3h ago', status: 'Qualified' },
];

const STATUS_TONE: Record<string, string> = {
  New: 'border-primary/30 bg-primary/10 text-primary',
  Contacted: 'border-info/30 bg-info-soft text-info',
  Qualified: 'border-warning/30 bg-warning-soft text-warning',
  Active: 'border-success/30 bg-success-soft text-success',
  Archived: 'border-border bg-surface-muted text-muted-foreground',
};

export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-md">
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        </div>
        <span className="font-mono text-[11px] text-subtle-foreground">
          formivo / overview
        </span>
        <Badge className="border-primary/25 bg-primary/10 text-primary">Demo data</Badge>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: 'Forms', value: '3' },
          { label: 'Total leads', value: '233' },
          { label: 'New this week', value: '17' },
        ].map((stat) => (
          <div key={stat.label} className="px-4 py-3.5">
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Forms
          </p>
          <span className="text-[11px] text-subtle-foreground">Endpoint</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {DEMO_FORMS.map((form) => (
            <li
              key={form.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-foreground">
                  {form.name}
                </p>
                <p className="truncate font-mono text-[10.5px] text-subtle-foreground">
                  /api/f/{form.id}
                </p>
              </div>
              <span
                className={`badge flex-none ${STATUS_TONE[form.status]}`}
                title={`${form.leads} leads`}
              >
                {form.leads}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          <Inbox className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Recent submissions
        </p>
        <ul className="mt-2 space-y-1">
          {DEMO_LEADS.map((lead) => (
            <li key={lead.email} className="flex items-center gap-3 py-1.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
                {lead.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-foreground">
                  {lead.name}
                </span>
                <span className="block truncate text-[11px] text-subtle-foreground">
                  {lead.email}
                </span>
              </span>
              <span
                className={`badge flex-none ${STATUS_TONE[lead.status]}`}
              >
                {lead.status}
              </span>
              <span className="w-14 flex-none text-right text-[11px] text-subtle-foreground">
                {lead.when}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const HTML_SAMPLE = `<!-- Your existing form — markup unchanged -->
<form id="contact">
  <input name="name"  type="text"  required />
  <input name="email" type="email" required />
  <textarea name="message"></textarea>
  <button type="submit">Send</button>
</form>`;

const JS_SAMPLE = `// Same endpoint from JavaScript — still no backend of your own.
await fetch('https://formivo.faizyab.me/api/f/YOUR_FORM_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'Hello from my site.',
  }),
});`;

export function IntegrationSnippet() {
  return (
    <div className="space-y-4">
      <CodeBlock lang="html" filename="index.html" code={HTML_SAMPLE} />
      <CodeBlock lang="ts" filename="submit handler" code={JS_SAMPLE} />
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" aria-hidden="true" />
        <span>
          One endpoint for HTML forms, fetch calls and server-side code. Field
          names and values arrive exactly as submitted — full reference in the
          docs.
        </span>
      </p>
    </div>
  );
}