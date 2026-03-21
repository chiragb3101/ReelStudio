"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "reelstudio-openrouter-key";

export function useApiKey() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  function saveKey(key: string) {
    setApiKey(key);
    localStorage.setItem(STORAGE_KEY, key);
  }

  return { apiKey, saveKey };
}

interface ApiKeyInputProps {
  apiKey: string;
  onChange: (key: string) => void;
}

export function ApiKeyInput({ apiKey, onChange }: ApiKeyInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="glass rounded-xl p-4 border border-border/50 space-y-2">
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Key className="w-3 h-3" />
        OpenRouter API Key
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-or-..."
          className="h-9 rounded-lg bg-background/50 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
