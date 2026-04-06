import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diaa Admin | ضياء",
  description: "Diaa electricity management admin portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
