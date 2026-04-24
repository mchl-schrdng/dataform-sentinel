"use client";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const refresh = () => {
    setSpinning(true);
    start(() => {
      router.refresh();
    });
    setTimeout(() => setSpinning(false), 600);
  };
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Refresh"
      onClick={refresh}
      className={cn(className)}
    >
      <RefreshCw className={cn("h-4 w-4", (pending || spinning) && "animate-spin")} />
    </Button>
  );
}
