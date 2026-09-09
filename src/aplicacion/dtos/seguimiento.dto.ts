import { z } from "zod";
import {
  TIPOS_ALERTA_SEGUIMIENTO,
  ESTADOS_ALERTA_SEGUIMIENTO,
} from "@/dominio/entidades/AlertaSeguimiento";
import { CALIDADES_SUENO } from "@/dominio/entidades/RegistroDiario";

/** DTOs de Seguimiento — suplementos, alertas e informes. */

// --- Suplementos -------------------------------------------------------------

const suplementoBase = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(160),
    dosis: z.string().max(120).optional().nullable(),
    frecuencia: z.string().max(200).optional().nullable(),
    desde: z.coerce.date().optional().nullable(),
    hasta: z.coerce.date().optional().nullable(),
    activo: z.boolean().optional(),
    notas: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (datos) => !datos.desde || !datos.hasta || datos.hasta >= datos.desde,
    {
      message: "La fecha de fin no puede ser anterior a la de inicio",
      path: ["hasta"],
    },
  );

export const registrarSuplementoDto = z.intersection(
  suplementoBase,
  z.object({ pacienteId: z.string().min(1) }),
);
export type RegistrarSuplementoDto = z.infer<typeof registrarSuplementoDto>;

export const actualizarSuplementoDto = z.intersection(
  suplementoBase,
  z.object({ id: z.string().min(1) }),
);
export type ActualizarSuplementoDto = z.infer<typeof actualizarSuplementoDto>;

export const idSuplementoDto = z.object({ id: z.string().min(1) });

export const suplementosDePacienteDto = z.object({
  pacienteId: z.string().min(1),
  incluirInactivos: z.boolean().optional(),
});

export const suplementoSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  nombre: z.string(),
  dosis: z.string().nullable(),
  frecuencia: z.string().nullable(),
  desde: z.date().nullable(),
  hasta: z.date().nullable(),
  activo: z.boolean(),
  notas: z.string().nullable(),
  creadoEn: z.date(),
});
export type SuplementoSalidaDto = z.infer<typeof suplementoSalidaDto>;

// --- Alertas -----------------------------------------------------------------

export const resolverAlertaDto = z.object({
  id: z.string().min(1),
  estado: z.enum(
    ESTADOS_ALERTA_SEGUIMIENTO.filter((estado) => estado !== "PENDIENTE") as [
      "RESUELTA",
      "DESCARTADA",
    ],
  ),
});
export type ResolverAlertaDto = z.infer<typeof resolverAlertaDto>;

export const alertaSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  pacienteNombre: z.string().nullable(),
  tipo: z.enum(TIPOS_ALERTA_SEGUIMIENTO),
  estado: z.enum(ESTADOS_ALERTA_SEGUIMIENTO),
  detalle: z.string(),
  referenciaId: z.string().nullable(),
  creadoEn: z.date(),
  resueltaEn: z.date().nullable(),
});
export type AlertaSalidaDto = z.infer<typeof alertaSalidaDto>;

// --- Informes ----------------------------------------------------------------

export const rangoInformeDto = z
  .object({
    pacienteId: z.string().min(1),
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((datos) => datos.hasta >= datos.desde, {
    message: "El rango del informe está invertido",
    path: ["hasta"],
  });
export type RangoInformeDto = z.infer<typeof rangoInformeDto>;

export const informeProgresoSalidaDto = z.object({
  puntos: z.array(
    z.object({
      fecha: z.date(),
      pesoConsulta: z.number().nullable(),
      pesoDiario: z.number().nullable(),
    }),
  ),
  pesoInicial: z.number().nullable(),
  pesoActual: z.number().nullable(),
  variacionKg: z.number().nullable(),
});
export type InformeProgresoSalidaDto = z.infer<typeof informeProgresoSalidaDto>;

export const informeHabitosSalidaDto = z.object({
  diasEnRango: z.number(),
  diasConRegistro: z.number(),
  aguaPromedioMl: z.number().nullable(),
  horasSuenoPromedio: z.number().nullable(),
  calidadSueno: z.record(z.enum(CALIDADES_SUENO), z.number()),
  diasConActividad: z.number(),
  minutosActividadTotal: z.number(),
  comidasRegistradas: z.number(),
});
export type InformeHabitosSalidaDto = z.infer<typeof informeHabitosSalidaDto>;
