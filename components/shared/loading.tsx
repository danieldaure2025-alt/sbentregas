'use client';

import { Loader2 } from 'lucide-react';

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export function LoadingButton({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      {children}
    </>
  );
}
