"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClipUploadProps {
  onUpload: (file: File) => void;
  className?: string;
}

export function ClipUpload({ onUpload, className }: ClipUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className={`gap-1.5 rounded-lg border-border/50 ${className}`}
      >
        <Upload className="w-3.5 h-3.5" />
        Upload
      </Button>
    </>
  );
}
