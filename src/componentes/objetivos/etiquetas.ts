import type {
  PrioridadObjetivo,
  EstadoObjetivo,
  EstadoEstrategia,
  TipoEventoObjetivo,
} from "@/dominio/entidades/Objetivo";

/** Etiquetas legibles del módulo de objetivos. */

export const ETIQUETAS_PRIORIDAD: Record<PrioridadObjetivo, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export const ETIQUETAS_ESTADO_OBJETIVO: Record<EstadoObjetivo, string> = {
  EN_CURSO: "En curso",
  CUMPLIDO: "Cumplido",
  ABANDONADO: "Abandonado",
};

export const ETIQUETAS_ESTADO_ESTRATEGIA: Record<EstadoEstrategia, string> = {
  ACTIVA: "Activa",
  LOGRADA: "Lograda",
  DESCARTADA: "Descartada",
};

export const ETIQUETAS_EVENTO: Record<TipoEventoObjetivo, string> = {
  CREACION: "Creación",
  ACTUALIZACION: "Actualización",
  CAMBIO_ESTADO: "Cambio de estado",
  ESTRATEGIA_AGREGADA: "Estrategia agregada",
  ESTRATEGIA_CAMBIO_ESTADO: "Estrategia: cambio de estado",
  ESTRATEGIA_ELIMINADA: "Estrategia eliminada",
};

/** Clases de color del badge de prioridad (ambos temas). */
export const COLOR_PRIORIDAD: Record<PrioridadObjetivo, string> = {
  ALTA: "bg-primary text-primary-foreground",
  MEDIA: "bg-secondary text-secondary-foreground",
  BAJA: "border text-muted-foreground",
};
