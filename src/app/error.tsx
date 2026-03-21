"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-5 border border-destructive/20">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {error.message || "An unexpected error occurred."}
          </p>
        </div>
        <Button onClick={reset} className="rounded-xl">
          Try again
        </Button>
      </div>
    </div>
  );
}
