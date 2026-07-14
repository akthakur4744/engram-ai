import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Engram AI",
  description: "RAG + Agent Culture POC — a shared engineering memory that agents read and write.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
