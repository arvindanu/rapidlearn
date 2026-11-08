import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RapidLearn — Learn Something New",
  description:
    "Discover something new every day. Spin, learn, explore and grow.",
  applicationName: "RapidLearn",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RapidLearn",
  },
};

export const viewport: Viewport = {
  themeColor: "#090b13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}