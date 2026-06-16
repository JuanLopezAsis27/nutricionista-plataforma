"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useDietas } from "@/lib/hooks/useDietas";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/componentes/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { FormularioPaciente } from "@/componentes/pacientes/FormularioPaciente";
import { VistaDieta } from "@/componentes/dietas/VistaDieta";

export default function PaginaDetallePaciente() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { obtenerPorId } = usePacientes();
  const { porPaciente } = useTurnos();
  const { delPaciente } = useDietas();

  const [editar, setEditar] = useState(false);

  const paciente = obtenerPorId({ id });
  const turnos = porPaciente({ pacienteId: id });
  const dieta = delPaciente({ pacienteId: id });

  if (paciente.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (paciente.isError || !paciente.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No se encontró el paciente.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/pacientes">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  const p = paciente.data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/dashboard/pacientes">
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">
              {p.nombre} {p.apellido}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{p.email}</p>
          </div>
          <Button variant="outline" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Teléfono: </span>
            {p.telefono ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Nacimiento: </span>
            {formatearFecha(p.fechaNacimiento)}
          </p>
          {p.notas && (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Notas: </span>
              {p.notas}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="turnos">
        <TabsList>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="dieta">Dieta actual</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="turnos">
          {turnos.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (turnos.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">El paciente no tiene turnos.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {turnos.data!.map((turno) => (
                <li key={turno.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span>
                    {formatearFecha(turno.fecha)} · {turno.hora} ({turno.duracionMinutos} min)
                  </span>
                  <EstadoBadge estado={turno.estado} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="dieta">
          {dieta.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : dieta.data ? (
            <VistaDieta dieta={dieta.data} />
          ) : (
            <p className="text-sm text-muted-foreground">
              El paciente no tiene una dieta activa asignada.
            </p>
          )}
        </TabsContent>

        <TabsContent value="historial">
          <p className="text-sm text-muted-foreground">
            El historial de dietas anteriores estará disponible próximamente.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
          </DialogHeader>
          <FormularioPaciente pacienteInicial={p} onTerminado={() => setEditar(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
