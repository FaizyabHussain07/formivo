import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Formivo — Connect your forms. Capture your leads.",
    template: "%s · Formivo",
  },
  description:
    "Formivo gives developers a simple, secure way to connect existing website forms, manage incoming leads, and give clients a professional read-only dashboard.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
  ),
  openGraph: {
    title: "Formivo — Connect your forms. Capture your leads.",
    description:
      "Connect existing website forms to Formivo, manage incoming leads, and give clients a secure read-only dashboard.",
    type: "website",
    siteName: "Formivo",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
