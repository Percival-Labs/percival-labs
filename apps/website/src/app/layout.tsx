import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "Percival Labs - Solid Ground for Humans in AI",
    template: "%s | Percival Labs",
  },
  description:
    "Open-source, model-agnostic personal AI infrastructure. Your identity, skills, and memory — portable across any AI model.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Percival Labs",
    title: "Percival Labs - Solid Ground for Humans in AI",
    description:
      "Open-source, model-agnostic personal AI infrastructure. Your identity, skills, and memory — portable across any AI model.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Percival Labs - Solid Ground for Humans in AI",
    description:
      "Open-source, model-agnostic personal AI infrastructure. Your identity, skills, and memory — portable across any AI model.",
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
