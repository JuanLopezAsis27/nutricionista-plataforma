"use client";

import { useState } from "react";
import { useDiario } from "@/lib/hooks/useDiario";
import { hoyLocalISO } from "@/lib/formato";
import { CalendarioDiario } from "@/componentes/diario/CalendarioDiario";
import { HojaDia } from "@/componentes/diario/HojaDia";

/**
 * Mi diario: calendario mensual con indicadores + hoja del día seleccionado.
 * El "hoy" es el del huso horario del paciente (reloj del navegador).
 */
export default function PaginaMiDiario() {
  const hoy = hoyLocalISO();
  const [seleccionada, setSeleccionada] = useState(hoy);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const { miCalendario } = useDiario();
  const calendario = miCalendario({ anio, mes });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi diario</h1>
        <p className="text-sm text-muted-foreground">
          Registrá tu peso, agua, sueño, comidas y actividad de cada día.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
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
