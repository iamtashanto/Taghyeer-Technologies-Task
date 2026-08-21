import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay | Conversations that keep their shape",
  description: "A focused, real-time chat workspace for people and teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
