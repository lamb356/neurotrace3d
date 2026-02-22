import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroTrace3D",
  description: "3D neuron morphology viewer and editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
