"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";

/**
 * Proveedores globales de la aplicación.
 *
 * Envuelve la app con:
 *   - SessionProvider (Auth.js) → sesión disponible en el cliente
 *   - ThemeProvider (next-themes) → modo claro/oscuro/sistema (clase en <html>)
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
        // Las subscriptions (tiempo real) van por SSE; el resto por batch HTTP.
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({ url: "/api/trpc", transformer: superjson }),
          false: httpBatchLink({ url: "/api/trpc", transformer: superjson }),
        }),
      ],
    }),
  );

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <trpc.Provider client={clienteTrpc} queryClient={clienteQuery}>
          <QueryClientProvider client={clienteQuery}>{children}</QueryClientProvider>
        </trpc.Provider>
      </ThemeProvider>
    </SessionProvider>
  );
}
