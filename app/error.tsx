"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <BrandLogo className="h-24 w-24" />
      <h1 className="mt-4 font-heading text-4xl text-purple italic">Algo saiu do lugar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não deu para carregar esta página. Vale tentar de novo.
      </p>
      <Button className="mt-6 h-12 rounded-full px-6" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </main>
  );
}
