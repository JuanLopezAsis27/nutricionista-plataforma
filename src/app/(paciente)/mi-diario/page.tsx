"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { useDiario } from "@/lib/hooks/useDiario";
import { hoyLocalISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { CalendarioDiario } from "@/componentes/diario/CalendarioDiario";
import { HojaDia } from "@/componentes/diario/HojaDia";

/**
 * Mi diario: calendario mensual con indicadores + hoja del día seleccionado.
 * El "hoy" es el del huso horario del paciente (reloj del navegador).
 *
 * El calendario va arriba en mobile y a la izquierda en pantallas anchas, pero
 * el que manda es el día: es lo que se viene a cargar, y el calendario está
 * para elegir cuál —por eso el botón de volver a hoy vive en el encabezado y
 * no adentro de la grilla—.
 */
export default function PaginaMiDiario() {
  const hoy = hoyLocalISO();
  const [seleccionada, setSeleccionada] = useState(hoy);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const { miCalendario } = useDiario();
  const calendario = miCalendario({ anio, mes });

  function volverAHoy() {
    setSeleccionada(hoy);
    setAnio(Number(hoy.slice(0, 4)));
    setMes(Number(hoy.slice(5, 7)));
  }

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={NotebookPen}
        titulo="Mi diario"
        descripcion="Tu peso, el agua, el sueño, las comidas y la actividad de cada día. Es lo que después mira tu nutricionista para ajustar el plan."
        acciones={
          seleccionada !== hoy && (
            <Button variant="outline" size="sm" onClick={volverAHoy}>
              Volver a hoy
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <CalendarioDiario
          anio={anio}
          mes={mes}
          dias={calendario.data ?? []}
          seleccionada={seleccionada}
          hoy={hoy}
          onSeleccionar={setSeleccionada}
          onCambiarMes={(nuevoAnio, nuevoMes) => {
            setAnio(nuevoAnio);
            setMes(nuevoMes);
          }}
        />
        <HojaDia fechaISO={seleccionada} />
      </div>
    </div>
  );
}
