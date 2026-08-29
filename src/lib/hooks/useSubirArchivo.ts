"use client";

import { useState } from "react";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import type { ContextoArchivo } from "@/dominio/entidades/Archivo";

/** Datos opcionales que acompañan la subida. */
export interface DatosSubida {
  contexto: ContextoArchivo;
  titulo?: string;
  categoria?: string;
  /** Vincula el archivo directamente a un paciente (ficha → Archivos). */
  pacienteId?: string;
}

/**
 * Hook para subir archivos al endpoint multipart /api/archivos.
 * (Los archivos nunca viajan por tRPC; ver plan de arquitectura.)
 */
export function useSubirArchivo() {
  const [subiendo, setSubiendo] = useState(false);

  async function subir(
    archivo: File,
    datos: DatosSubida,
  ): Promise<ArchivoSalidaDto> {
    setSubiendo(true);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      formulario.append("contexto", datos.contexto);
      if (datos.titulo) formulario.append("titulo", datos.titulo);
      if (datos.categoria) formulario.append("categoria", datos.categoria);
      if (datos.pacienteId) formulario.append("pacienteId", datos.pacienteId);

      const respuesta = await fetch("/api/archivos", {
        method: "POST",
        body: formulario,
      });

      const cuerpo = (await respuesta.json()) as
        { archivo: ArchivoSalidaDto } | { error: string };

      if (!respuesta.ok || "error" in cuerpo) {
        const mensaje =
          "error" in cuerpo ? cuerpo.error : "No se pudo subir el archivo.";
        throw new Error(mensaje);
      }
      return cuerpo.archivo;
    } finally {
      setSubiendo(false);
    }
  }

  return { subir, subiendo };
}
