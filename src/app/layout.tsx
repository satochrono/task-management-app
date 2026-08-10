import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Task Management",
  description: "Business task management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
