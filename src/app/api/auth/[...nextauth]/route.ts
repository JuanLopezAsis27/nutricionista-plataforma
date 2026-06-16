/**
 * Route handler de Auth.js v5.
 * Expone los endpoints de autenticación en /api/auth/*.
 */
import { handlers } from "@/lib/autenticacion/auth";

export const { GET, POST } = handlers;
