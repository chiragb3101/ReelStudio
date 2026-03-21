import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import { PostHogProvider } from "@/providers/posthog-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelStudio — AI-Powered Reel Production",
  description:
    "Create, edit, and schedule Instagram Reels with AI assistance. From idea to published post in one flow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#6366f1" },
      }}
    >
      <html lang="en" className="dark h-full antialiased">
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <Suspense>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
