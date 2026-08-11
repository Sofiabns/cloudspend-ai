import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudSpend AI — AWS FinOps Intelligence Platform",
  description:
    "Forecast AWS spend, detect anomalies, and prioritize savings with explainable FinOps intelligence.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "CloudSpend AI",
    description: "AWS FinOps Intelligence Platform",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "CloudSpend AI dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudSpend AI",
    description: "AWS FinOps Intelligence Platform",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
