"use client";

import { useEffect, useState } from "react";
import { CalendarClock, User } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Convierte un valor de input numérico a número (o el fallback si es inválido). */
function aEntero(valor: string, fallback: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** Formulario de preferencias del consultorio: turnos y membrete. */
export function FormularioConfiguracion() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [duracion, setDuracion] = useState(30);
  const [paso, setPaso] = useState(15);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [nombre, setNombre] = useState("");
  const [matricula, setMatricula] = useState("");

  useEffect(() => {
    if (!config) return;
    setDuracion(config.turnoDuracionMinutos);
    setPaso(config.turnoPasoMinutos);
    setDesde(config.atencionHoraDesde ?? "");
    setHasta(config.atencionHoraHasta ?? "");
    setDias(config.diasAtencion);
    setNombre(config.nombreProfesional ?? "");
    setMatricula(config.matricula ?? "");
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-80 w-full" />;
  }

  function alternarDia(d: number) {
    setDias((actuales) =>
      actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d].sort(),
    );
  }

  function onGuardar() {
    guardar.mutate({
      turnoDuracionMinutos: duracion,
      turnoPasoMinutos: paso,
      atencionHoraDesde: desde || null,
      atencionHoraHasta: hasta || null,
      diasAtencion: dias,
      nombreProfesional: nombre.trim() || null,
      matricula: matricula.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5 text-primary" /> Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="duracion">Duración por defecto (min)</Label>
            <Input
              id="duracion"
              type="number"
              min={5}
              max={480}
              value={duracion}
              onChange={(e) => setDuracion(aEntero(e.target.value, duracion))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paso">Paso de la agenda (min)</Label>
            <Input
              id="paso"
              type="number"
              min={5}
              max={480}
              value={paso}
              onChange={(e) => setPaso(aEntero(e.target.value, paso))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desde">Atención desde</Label>
            <Input
              id="desde"
              type="time"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hasta">Atención hasta</Label>
            <Input
              id="hasta"
              type="time"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Días de atención</Label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((etiqueta, indice) => (
                <Button
                  key={etiqueta}
                  type="button"
                  size="sm"
                  variant={dias.includes(indice) ? "default" : "outline"}
                  className="w-14"
                  onClick={() => alternarDia(indice)}
                >
                  {etiqueta}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" /> Membrete del profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre y apellido</Label>
            <Input
              id="nombre"
              placeholder="Lic. López Asis Nicolás"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="matricula">Matrícula</Label>
            <Input
              id="matricula"
              placeholder="M.N. 0000"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Se usa en el membrete del PDF del plan y en la firma de los emails.
          </p>
        </CardContent>
      </Card>

      <div className={cn("flex justify-end")}>
        <Button onClick={onGuardar} disabled={guardar.isPending}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
