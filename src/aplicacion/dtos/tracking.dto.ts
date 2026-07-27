import { z } from "zod";

/** DTOs de entrada del Tracking del paciente. La salida es el read-model del
 *  dominio (`TrackingPaciente`), que ya tiene forma primitiva serializable. */

export const rangoTrackingDto = z
  .object({
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((datos) => datos.hasta >= datos.desde, {
    message: "El rango del tracking está invertido",
    path: ["hasta"],
  });
export type RangoTrackingDto = z.infer<typeof rangoTrackingDto>;

export const rangoTrackingPacienteDto = z.intersection(
  rangoTrackingDto,
  z.object({ pacienteId: z.string().min(1) }),
);
export type RangoTrackingPacienteDto = z.infer<typeof rangoTrackingPacienteDto>;
