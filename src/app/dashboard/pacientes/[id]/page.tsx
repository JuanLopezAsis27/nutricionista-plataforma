"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, FileDown, UserPlus, CircleOff } from "lucide-react";
import Link from "next/link";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/componentes/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPaciente } from "@/componentes/pacientes/FormularioPaciente";
import { VistaPlan } from "@/componentes/planes/VistaPlan";
import { BadgesAlertas, GestionAlertas } from "@/componentes/evaluacion/AlertasPaciente";
import { FormularioHistoriaClinica } from "@/componentes/evaluacion/FormularioHistoriaClinica";
import { SeccionAntropometria } from "@/componentes/evaluacion/SeccionAntropometria";
import { ListaLaboratorios } from "@/componentes/evaluacion/ListaLaboratorios";
import { ArchivosPaciente } from "@/componentes/evaluacion/ArchivosPaciente";
import { DiarioPacienteVista } from "@/componentes/diario/DiarioPacienteVista";
import { SeccionInformes } from "@/componentes/seguimiento/SeccionInformes";
import { SeccionSuplementos } from "@/componentes/seguimiento/SeccionSuplementos";
import { ObjetivosPaciente } from "@/componentes/objetivos/ObjetivosPaciente";

export default function PaginaDetallePaciente() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { obtenerPorId } = usePacientes();
  const { porPaciente } = useTurnos();
  const { delPaciente, desasignar } = usePlanes();

  const [editar, setEditar] = useState(false);
  const [confirmarDesasignar, setConfirmarDesasignar] = useState(false);

  const paciente = obtenerPorId({ id });
  const turnos = porPaciente({ pacienteId: id });
  const plan = delPaciente({ pacienteId: id });

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
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {p.nombre} {p.apellido}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{p.email}</p>
            {/* Alergias e intolerancias: visibles SIEMPRE, en cualquier pestaña. */}
            <BadgesAlertas pacienteId={id} />
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

      <Tabs defaultValue="evaluacion">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
          <TabsTrigger value="informes">Informes</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="diario">Diario</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="plan">Plan actual</TabsTrigger>
          <TabsTrigger value="suplementos">Suplementos</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluacion" className="space-y-8">
          <SeccionAntropometria pacienteId={id} />
          <GestionAlertas pacienteId={id} />
          <FormularioHistoriaClinica pacienteId={id} />
          <ListaLaboratorios pacienteId={id} />
          <ArchivosPaciente pacienteId={id} />
        </TabsContent>

        <TabsContent value="informes">
          <SeccionInformes pacienteId={id} />
        </TabsContent>

        <TabsContent value="objetivos">
          <ObjetivosPaciente pacienteId={id} />
        </TabsContent>

        <TabsContent value="suplementos">
          <SeccionSuplementos pacienteId={id} />
        </TabsContent>

        <TabsContent value="diario">
          <DiarioPacienteVista pacienteId={id} />
        </TabsContent>

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

        <TabsContent value="plan" className="space-y-4">
          {plan.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : plan.data ? (
            <>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/planes/${plan.data.id}/pdf?paciente=${id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmarDesasignar(true)}
                >
                  <CircleOff className="h-4 w-4" />
                  Finalizar plan
                </Button>
              </div>
              <VistaPlan plan={plan.data} />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                El paciente no tiene un plan activo asignado.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/planes">
                  <UserPlus className="h-4 w-4" />
                  Ir a planes para asignarle uno
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ModalConfirmacion
        abierto={confirmarDesasignar}
        titulo="Finalizar plan"
        descripcion={`¿Finalizar el plan activo de ${p.nombre}? El paciente quedará sin plan asignado.`}
        cargando={desasignar.isPending}
        onCancelar={() => setConfirmarDesasignar(false)}
        onConfirmar={() =>
          desasignar.mutate(
            { pacienteId: id },
            { onSuccess: () => setConfirmarDesasignar(false) },
          )
        }
      />

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
