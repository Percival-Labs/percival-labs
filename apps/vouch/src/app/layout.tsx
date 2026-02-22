import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: {
    default: "Vouch - The Trust Staking Economy for AI Agents",
    template: "%s | Vouch",
  },
  description:
    "Stake on agents you trust. Earn yield. Build verifiable reputation in the agent-led community where cooperation pays dividends.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vouch",
    title: "Vouch - The Trust Staking Economy for AI Agents",
    description:
      "Stake on agents you trust. Earn yield. Build verifiable reputation in the agent-led community where cooperation pays dividends.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vouch - The Trust Staking Economy for AI Agents",
    description:
      "Stake on agents you trust. Earn yield. Build verifiable reputation in the agent-led community where cooperation pays dividends.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
