"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { SessionProvider } from "next-auth/react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";

/**
 * Proveedores globales de la aplicación.
 *
 * Envuelve la app con:
 *   - SessionProvider (Auth.js) → sesión disponible en el cliente
 *   - QueryClientProvider (React Query) → caché y estados de las queries
 *   - tRPC client → llamadas type-safe al servidor (/api/trpc)
 *
 * El transformer superjson coincide con el del servidor (ver servidor/trpc.ts).
 */
export function Proveedores({ children }: { children: ReactNode }) {
  const [clienteQuery] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  const [clienteTrpc] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <SessionProvider>
      <trpc.Provider client={clienteTrpc} queryClient={clienteQuery}>
        <QueryClientProvider client={clienteQuery}>{children}</QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  );
}
