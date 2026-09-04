"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  CampoEvolucionSalidaDto,
  CampoPersonalizadoEvolucionDto,
  EvolucionSalidaDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import {
  CAMPOS_EVOLUCION,
  ETIQUETAS_EVOLUCION,
} from "@/dominio/entidades/Evolucion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";

/** Prefijo de la clave de un campo suelto, cargado solo en esta evolución. */
const PREFIJO_SUELTO = "suelto-";

/** Pistas de qué se anota en cada campo, tomadas de la planilla del profesional. */
const EJEMPLOS: Record<(typeof CAMPOS_EVOLUCION)[number], string> = {
  cumplimientoDieta: "50%. 10 días no respetó por viaje.",
  entrenamiento: "3 veces pesas. Mejoró las cargas.",
  deposiciones: "normales o constipada.",
  orina: "clarito. Sí toma agua, pero podría mejorar. No tiene calambres.",
  descanso: "7 hs.",
  indispuesta: "no.",
  sePercibe: "igual. No tomó nada nuevo.",
};

interface Props {
  pacienteId: string;
  /** La evolución a editar, o null para dar de alta una nueva. */
  evolucion: EvolucionSalidaDto | null;
  /** Campos que el consultorio agregó a todas las evoluciones. */
  camposDefinidos: CampoEvolucionSalidaDto[];
  onTerminado: () => void;
}

/**
 * Alta y edición de una evolución de control.
 *
 * Todos los campos son texto libre y ninguno es obligatorio por separado: lo
 * único que la entidad exige es que al menos uno tenga contenido. Es como se
 * anota en la consulta —«50%, 10 días no respetó por viaje»—, donde el motivo
 * es la mitad del dato y un porcentaje solo lo perdería.
 *
 * Los campos personalizados son de dos clases, igual que en la historia
 * clínica: los **del consultorio** (Configuración → Evoluciones) aparecen en
 * todas, y los **sueltos** se agregan acá y valen solo para esta consulta.
 */
export function FormularioEvolucion({
  pacienteId,
  evolucion,
  camposDefinidos,
  onTerminado,
}: Props) {
  const { registrarEvolucion, actualizarEvolucion } = useEvaluacion();

  const [fecha, setFecha] = useState(
    evolucion ? aFechaISO(evolucion.fecha) : hoyISO(),
  );
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CAMPOS_EVOLUCION.map((campo) => [campo, evolucion?.[campo] ?? ""]),
    ),
  );

  // Los personalizados ya guardados que el consultorio no define (o ya no
  // define) se muestran igual: es información clínica escrita y no puede
  // desaparecer porque alguien reordenó un formulario en Configuración.
  const clavesDefinidas = new Set(camposDefinidos.map((campo) => campo.clave));
  const [sueltos, setSueltos] = useState<{ clave: string; etiqueta: string }[]>(
    () =>
      (evolucion?.camposPersonalizados ?? [])
        .filter((campo) => !clavesDefinidas.has(campo.clave))
        .map((campo) => ({ clave: campo.clave, etiqueta: campo.etiqueta })),
  );
  const [personalizados, setPersonalizados] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (evolucion?.camposPersonalizados ?? []).map((campo) => [
          campo.clave,
          campo.valor,
        ]),
      ),
  );
  const [etiquetaNueva, setEtiquetaNueva] = useState("");

  const enviando =
    registrarEvolucion.isPending || actualizarEvolucion.isPending;
  const [error, setError] = useState<string | null>(null);

  function agregarSuelto() {
    const etiqueta = etiquetaNueva.trim();
    if (!etiqueta) return;
    setSueltos((previos) => [
      ...previos,
      {
        clave: `${PREFIJO_SUELTO}${crypto.randomUUID().slice(0, 8)}`,
        etiqueta,
      },
    ]);
    setEtiquetaNueva("");
  }

  function quitarSuelto(clave: string) {
    setSueltos((previos) => previos.filter((campo) => campo.clave !== clave));
    setPersonalizados((previos) => {
      const copia = { ...previos };
      delete copia[clave];
      return copia;
    });
  }

  function alEnviar(evento: React.FormEvent) {
    evento.preventDefault();

    const camposPersonalizados: CampoPersonalizadoEvolucionDto[] = [
      ...camposDefinidos.map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.nombre,
        valor: (personalizados[campo.clave] ?? "").trim(),
      })),
      ...sueltos.map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        valor: (personalizados[campo.clave] ?? "").trim(),
      })),
    ].filter((campo) => campo.valor.length > 0);

    const fijos = Object.fromEntries(
      CAMPOS_EVOLUCION.map((campo) => [campo, valores[campo]?.trim() || null]),
    );

    // El mismo invariante que la entidad, adelantado a la pantalla: una
    // evolución vacía no dice nada y el servidor la rechazaría igual.
    const vacia =
      Object.values(fijos).every((valor) => valor === null) &&
      camposPersonalizados.length === 0;
    if (vacia) {
      setError("Completá al menos un campo de la evolución.");
      return;
    }
    setError(null);

    const base = { ...fijos, camposPersonalizados };
    if (evolucion) {
      actualizarEvolucion.mutate(
        {
          id: evolucion.id,
          fecha: new Date(`${fecha}T00:00:00.000Z`),
          ...base,
        },
        { onSuccess: onTerminado },
      );
    } else {
      registrarEvolucion.mutate(
        {
          pacienteId,
          fecha: new Date(`${fecha}T00:00:00.000Z`),
          ...base,
        },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="evolucion-fecha" className="text-xs">
          Fecha de la consulta
        </Label>
        <Input
          id="evolucion-fecha"
          type="date"
          className="w-44"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      </div>

      {CAMPOS_EVOLUCION.map((campo) => (
        <div key={campo} className="space-y-1">
          <Label htmlFor={`evolucion-${campo}`} className="text-xs">
            {ETIQUETAS_EVOLUCION[campo]}
          </Label>
          <Textarea
            id={`evolucion-${campo}`}
            rows={2}
            maxLength={2000}
            placeholder={EJEMPLOS[campo]}
            value={valores[campo] ?? ""}
            onChange={(evento) =>
              setValores((previos) => ({
                ...previos,
                [campo]: evento.target.value,
              }))
            }
          />
        </div>
      ))}

      {(camposDefinidos.length > 0 || sueltos.length > 0) && (
        <fieldset className="space-y-3 rounded-md border p-3">
          <legend className="px-1 text-xs font-semibold">
            Campos propios del consultorio
          </legend>
          {camposDefinidos.map((campo) => (
            <div key={campo.clave} className="space-y-1">
              <Label htmlFor={`evolucion-${campo.clave}`} className="text-xs">
                {campo.nombre}
              </Label>
              <Textarea
                id={`evolucion-${campo.clave}`}
                rows={2}
                maxLength={2000}
                placeholder={campo.descripcion ?? undefined}
                value={personalizados[campo.clave] ?? ""}
                onChange={(evento) =>
                  setPersonalizados((previos) => ({
                    ...previos,
                    [campo.clave]: evento.target.value,
                  }))
                }
              />
            </div>
          ))}

          {sueltos.map((campo) => (
            <div key={campo.clave} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`evolucion-${campo.clave}`} className="text-xs">
                  {campo.etiqueta}
                  <span className="ml-2 font-normal text-muted-foreground">
                    solo en esta evolución
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Quitar ${campo.etiqueta}`}
                  onClick={() => quitarSuelto(campo.clave)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <Textarea
                id={`evolucion-${campo.clave}`}
                rows={2}
                maxLength={2000}
                value={personalizados[campo.clave] ?? ""}
                onChange={(evento) =>
                  setPersonalizados((previos) => ({
                    ...previos,
                    [campo.clave]: evento.target.value,
                  }))
                }
              />
            </div>
          ))}
        </fieldset>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="evolucion-campo-nuevo" className="text-xs">
            Agregar un campo solo para esta evolución
          </Label>
          <Input
            id="evolucion-campo-nuevo"
            value={etiquetaNueva}
            maxLength={80}
            placeholder="Cómo se llama el campo"
            onChange={(evento) => setEtiquetaNueva(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                // Sin esto, Enter en este input ENVÍA el formulario y la
                // evolución se guarda sin el campo que se estaba agregando.
                evento.preventDefault();
                agregarSuelto();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={agregarSuelto}
          disabled={!etiquetaNueva.trim()}
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onTerminado}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar evolución"}
        </Button>
      </div>
    </form>
  );
}
