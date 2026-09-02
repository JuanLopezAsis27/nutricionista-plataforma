"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileDown,
  UserPlus,
  CircleOff,
  CalendarPlus,
  Mic,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPaciente } from "@/componentes/pacientes/FormularioPaciente";
import { VistaPlan } from "@/componentes/planes/VistaPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";
import { HistorialDePlanes } from "@/componentes/planes/HistorialDePlanes";
import { FormularioTurno } from "@/componentes/turnos/FormularioTurno";
import { GrabacionesConsulta } from "@/componentes/turnos/GrabacionesConsulta";
import {
  BadgesAlertas,
  GestionAlertas,
} from "@/componentes/evaluacion/AlertasPaciente";
import { FormularioHistoriaClinica } from "@/componentes/evaluacion/FormularioHistoriaClinica";
import { ListaLaboratorios } from "@/componentes/evaluacion/ListaLaboratorios";
import { ArchivosPaciente } from "@/componentes/evaluacion/ArchivosPaciente";
import { DiarioPacienteVista } from "@/componentes/diario/DiarioPacienteVista";
import { SeccionTracking } from "@/componentes/tracking/SeccionTracking";
import { SeccionComposicionCorporal } from "@/componentes/antropometria/SeccionComposicionCorporal";
import { SeccionSuplementos } from "@/componentes/seguimiento/SeccionSuplementos";
import { SeccionDeportiva } from "@/componentes/deportivo/SeccionDeportiva";
import { ObjetivosPaciente } from "@/componentes/objetivos/ObjetivosPaciente";
import { MensajesDePaciente } from "@/componentes/mensajeria/MensajesDePaciente";

export default function PaginaDetallePaciente() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  // La pestaña de antropometría manda acá con ?editar=1 cuando falta el sexo
  // biológico del paciente: abrir la ficha ya editando ahorra un clic ciego.
  const buscar = useSearchParams();
  const router = useRouter();

  const { obtenerPorId } = usePacientes();
  const { porPaciente } = useTurnos();
  const { delPaciente, desasignar } = usePlanes();

  /**
   * El diálogo de edición se lee de la URL, NO de un `useState` inicializado
   * con ella.
   *
   * "Completar ficha" (pestaña Antropometría) es un Link a ESTA MISMA ruta con
   * ?editar=1. Next no remonta la página al cambiar solo la query, así que el
   * inicializador de `useState` no vuelve a correr nunca: el botón cambiaba la
   * URL y no abría nada. Derivándolo de `useSearchParams` —que sí re-renderiza
   * al cambiar la query— el enlace funciona, y de paso el diálogo abierto queda
   * en el historial.
   */
  const editar = buscar.get("editar") === "1";
  const setEditar = useCallback(
    (abierto: boolean) => {
      router.replace(
        abierto
          ? `/dashboard/pacientes/${id}?editar=1`
          : `/dashboard/pacientes/${id}`,
        // Sin esto, cerrar el diálogo saltaría al tope de la ficha.
        { scroll: false },
      );
    },
    [router, id],
  );
  const [confirmarDesasignar, setConfirmarDesasignar] = useState(false);
  // Turno y plan se resuelven DESDE la ficha: son las dos cosas que se deciden
  // con el paciente delante, y mandarlas a otra pantalla obligaba a volver a
  // buscarlo ahí.
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [asignarAbierto, setAsignarAbierto] = useState(false);
  const [turnoGrabar, setTurnoGrabar] = useState<string | null>(null);

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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
      >
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
          <TabsTrigger value="antropometria">Antropometría</TabsTrigger>
          <TabsTrigger value="progreso">Progreso</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="diario">Diario</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="plan">Plan actual</TabsTrigger>
          <TabsTrigger value="suplementos">Suplementos</TabsTrigger>
          <TabsTrigger value="deporte">Deporte</TabsTrigger>
          <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
        </TabsList>

        {/* Evaluación: lo clínico que NO son medidas corporales. La
            antropometría tiene su propia pestaña desde que pasó a calcular
            composición corporal. */}
        <TabsContent value="evaluacion" className="space-y-8">
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/pacientes/${id}/evaluacion-pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <FileDown className="h-4 w-4" />
                PDF de la evaluación
              </a>
            </Button>
          </div>
          <GestionAlertas pacienteId={id} />
          <FormularioHistoriaClinica pacienteId={id} />
          <ListaLaboratorios pacienteId={id} />
          <ArchivosPaciente pacienteId={id} />
        </TabsContent>

        <TabsContent value="antropometria">
          <SeccionComposicionCorporal pacienteId={id} />
        </TabsContent>

        {/* Progreso absorbió a «Informes»: mostraban los mismos hábitos y la
            misma curva de peso del diario, con distinto formato. */}
        <TabsContent value="progreso">
          <SeccionTracking pacienteId={id} />
        </TabsContent>

        <TabsContent value="objetivos">
          <ObjetivosPaciente pacienteId={id} />
        </TabsContent>

        <TabsContent value="suplementos">
          <SeccionSuplementos pacienteId={id} />
        </TabsContent>

        <TabsContent value="deporte">
          <SeccionDeportiva pacienteId={id} />
        </TabsContent>

        <TabsContent value="mensajes">
          <MensajesDePaciente pacienteId={id} />
        </TabsContent>

        <TabsContent value="diario">
          <DiarioPacienteVista pacienteId={id} />
        </TabsContent>

        <TabsContent value="turnos" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAgendarAbierto(true)}>
              <CalendarPlus className="h-4 w-4" />
              Nuevo turno
            </Button>
          </div>
          {turnos.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (turnos.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El paciente no tiene turnos.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {turnos.data!.map((turno) => (
                <li
                  key={turno.id}
                  className="flex items-center justify-between gap-4 p-3 text-sm"
                >
                  <span>
                    {formatearFecha(turno.fecha)} · {turno.hora} (
                    {turno.duracionMinutos} min)
                  </span>
                  <div className="flex items-center gap-2">
                    <EstadoBadge estado={turno.estado} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Grabación y resumen de la consulta"
                      aria-label="Grabación y resumen de la consulta"
                      onClick={() => setTurnoGrabar(turno.id)}
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                {/* El PDF generado arma el plan CARGADO con el membrete. Un
                    plan que YA es un PDF no tiene nada que generar: el suyo se
                    abre desde el visor. */}
                {plan.data.modalidad === "APP" && (
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
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAsignarAbierto(true)}
                >
                  <Repeat className="h-4 w-4" />
                  Cambiar plan
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
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setAsignarAbierto(true)}>
                  <UserPlus className="h-4 w-4" />
                  Asignar plan
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/planes">Ver planes</Link>
                </Button>
              </div>
            </div>
          )}

          <HistorialDePlanes pacienteId={id} />
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

      <Dialog
        open={Boolean(turnoGrabar)}
        onOpenChange={(abierto) => !abierto && setTurnoGrabar(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grabación de la consulta</DialogTitle>
          </DialogHeader>
          {turnoGrabar && (
            <GrabacionesConsulta key={turnoGrabar} turnoId={turnoGrabar} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={agendarAbierto} onOpenChange={setAgendarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nuevo turno para {p.nombre} {p.apellido}
            </DialogTitle>
          </DialogHeader>
          <FormularioTurno
            pacienteIdInicial={id}
            pacienteFijo
            onTerminado={() => setAgendarAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={asignarAbierto} onOpenChange={setAsignarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Asignar plan a {p.nombre} {p.apellido}
            </DialogTitle>
          </DialogHeader>
          <FormularioAsignacionPlan
            pacienteIdFijo={id}
            onTerminado={() => setAsignarAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
          </DialogHeader>
          <FormularioPaciente
            pacienteInicial={p}
            onTerminado={() => setEditar(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
