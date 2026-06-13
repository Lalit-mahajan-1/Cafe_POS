"use client";

import { AlertCircle, X } from "lucide-react";

type Props = {
  message: string;
  onDismiss: () => void;
};

export default function POSMessage({ message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#DFA18F] bg-[#FFF4F0] px-4 py-3 text-sm text-[#705C53]">
      <AlertCircle className="size-4 text-[#C86446] shrink-0" />
      {message}
      <button
        onClick={onDismiss}
        className="ml-auto text-[#705C53] hover:text-[#000505]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}