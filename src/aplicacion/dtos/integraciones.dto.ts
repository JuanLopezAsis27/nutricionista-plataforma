import { z } from "zod";

/** DTO de salida del estado de integraciones. */
export const estadoIntegracionesDto = z.object({
  google: z.object({
    /** ¿La app tiene credenciales de Google configuradas (env)? */
    configurado: z.boolean(),
    /** ¿El nutricionista conectó su cuenta? */
    conectado: z.boolean(),
    emailCuenta: z.string().nullable(),
  }),
});
export type EstadoIntegracionesDto = z.infer<typeof estadoIntegracionesDto>;
