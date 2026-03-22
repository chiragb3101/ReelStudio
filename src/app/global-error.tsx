"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5 border border-red-500/20 rounded-2xl p-10 bg-red-950/10">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Application error</h2>
            <p className="text-sm text-gray-400 mt-2">
              {error.message || "A critical error occurred."}
            </p>
          </div>
          <button
            onClick={reset}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
