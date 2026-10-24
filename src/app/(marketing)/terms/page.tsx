import { MarketingHeader, MarketingFooter } from "@/components/marketing";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container-page max-w-2xl py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            By using Formivo you agree to use the service lawfully, keep your credentials
            secure, and respect the usage limits of your plan. Submissions you send to
            Formivo remain your data. Plans, limits, and prices may change with notice.
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
