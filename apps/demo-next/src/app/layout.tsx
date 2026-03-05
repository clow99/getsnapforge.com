import type { Metadata } from "next";
import Providers from "./providers";
import "@velocityuikit/velocityui/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snapforge Demo",
  description: "Live, cached website screenshots with Snapforge.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
