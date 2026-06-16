"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { RouterApp } from "@/servidor/raiz";

/**
 * Cliente tRPC para componentes de cliente (hooks de React Query).
 * Tipado de extremo a extremo a partir del router raíz del servidor.
 */
export const trpc = createTRPCReact<RouterApp>();
