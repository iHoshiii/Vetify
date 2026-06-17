import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vetify",
  description: "Your pet's health companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
