import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

/* Brand doc §27/§28: Inter for interface text, Geist Mono for technical values. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://formivo.faizyab.me";

export const metadata: Metadata = {
  title: {
    default: "Formivo — Forms to leads. Leads to clients.",
    template: "%s · Formivo",
  },
  description:
    "Formivo connects your existing website forms to a single endpoint. Collect submissions, manage leads, and share read-only dashboards with your clients.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
  ),
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "Formivo — Forms to leads. Leads to clients.",
    description:
      "Connect existing website forms to Formivo, collect submissions as leads, and share a read-only dashboard with your clients.",
    type: "website",
    siteName: "Formivo",
    url: appUrl,
  },
  twitter: {
    card: "summary",
    title: "Formivo — Forms to leads. Leads to clients.",
    description:
      "Connect existing website forms to Formivo and manage every submission as a lead.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}