import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarBridge — Research Matching",
  description:
    "Discover open research projects and connect with research collaborators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="m-0 min-h-screen bg-[#FAF8F5] antialiased">
        {children}
      </body>
    </html>
  );
}
