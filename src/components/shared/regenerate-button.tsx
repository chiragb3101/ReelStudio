"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

export function RegenerateButton({
  onClick,
  isLoading,
  className,
}: RegenerateButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "gap-1.5 rounded-lg border-border/50 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
      Regenerate
    </Button>
  );
}
