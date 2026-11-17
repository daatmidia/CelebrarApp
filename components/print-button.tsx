"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button type="button" className="no-print h-12 rounded-full px-6" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
