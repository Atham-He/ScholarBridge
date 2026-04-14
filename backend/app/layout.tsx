import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarBridge — Mentor-Student Matching",
  description:
    "Discover research mentors and chat with AI agents. Powered by Skill Hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="m-0 min-h-screen overflow-hidden bg-[#FAF8F5] antialiased">
        {children}
      </body>
    </html>
  );
}
