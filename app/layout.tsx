import type { Metadata } from "next";
import { ConvexClientProvider } from "./convex-client-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sorter",
  description: "Standalone Stremio add-on workspace for Gemini-powered stream ranking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
