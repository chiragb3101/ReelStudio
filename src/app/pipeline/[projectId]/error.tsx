"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ProjectPipelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-5 border border-destructive/20">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Stage error</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {error.message || "Something went wrong in this stage."}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="rounded-xl">
            Back to Dashboard
          </Button>
          <Button onClick={reset} className="rounded-xl">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
