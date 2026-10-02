"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir los datos de la página cada cierto tiempo (pantalla de avance). */
export function AutoRefresco({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => router.refresh(), segundos * 1000);
    return () => window.clearInterval(t);
  }, [router, segundos]);
  return null;
}
