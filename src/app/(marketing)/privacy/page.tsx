import { MarketingHeader, MarketingFooter } from "@/components/marketing";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container-page max-w-2xl py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Formivo collects only the information needed to provide the service: your
            account details, your form submissions, and standard technical logs.
            We do not sell your data. Client viewers can access only the forms explicitly
            shared with them. Third-party providers (Supabase, Lemon Squeezy, Resend)
            process data strictly to operate the service.
          </p>
          <p className="mt-4 text-sm text-subtle-foreground">
            Full legal review pending before public launch.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
