import type { RolUsuario } from "@/dominio/entidades/Usuario";
// Importar el módulo carga su declaración original para poder aumentarla.
import type {} from "next-auth/jwt";

/**
 * Aumento de tipos de Auth.js (module augmentation).
 *
 * Extiende la sesión, el usuario y el token JWT para incluir el rol y el
 * pacienteId, de modo que estén disponibles de forma tipada en el contexto
 * de tRPC y en el middleware.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      rol: RolUsuario;
      pacienteId: string | null;
    };
  }

  interface User {
    rol: RolUsuario;
    pacienteId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: RolUsuario;
    pacienteId: string | null;
  }
}
