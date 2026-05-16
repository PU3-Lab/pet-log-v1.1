import type { Metadata } from "next";
import { PetLogProvider } from "@/components/pet-log-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pet Log",
  description: "AI-first pet care MVP for records, interpretation, and care suggestions.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <PetLogProvider>{children}</PetLogProvider>
      </body>
    </html>
  );
}
