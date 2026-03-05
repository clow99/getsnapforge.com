import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snapforge Demo",
  description: "Live, cached website screenshots with Snapforge."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
