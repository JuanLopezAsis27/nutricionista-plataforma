"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

/**
 * Membrete del profesional.
 *
 * Los días y horarios de atención ya no están acá: se fueron a
 * Establecimientos, porque son del LUGAR y un consultorio puede tener varios
 * con agendas distintas. Lo que queda describe al profesional, que es uno solo.
 */
export function FormularioConfiguracion() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [nombre, setNombre] = useState("");
  const [matricula, setMatricula] = useState("");

  useEffect(() => {
    if (!config) return;
    setNombre(config.nombreProfesional ?? "");
    setMatricula(config.matricula ?? "");
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-48 w-full" />;
  }

  // El nombre se puede cambiar pero no vaciar: firma los emails y es el
  // {{profesional}} de los recordatorios.
  const sinNombre = nombre.trim() === "";

  function onGuardar() {
    if (sinNombre) return;
    guardar.mutate({
      nombreProfesional: nombre.trim(),
      matricula: matricula.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
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
              placeholder="Lic. Ana Gómez"
              value={nombre}
              aria-invalid={sinNombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            {sinNombre && (
              <p className="text-xs text-destructive">
                El nombre es obligatorio.
              </p>
            )}
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
            El nombre firma los emails, reemplaza a {"{{profesional}}"} en los
            recordatorios y es el título del encabezado de los PDF descargables.
          </p>
        </CardContent>
      </Card>

      <div className={cn("flex justify-end")}>
        <Button onClick={onGuardar} disabled={guardar.isPending || sinNombre}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
