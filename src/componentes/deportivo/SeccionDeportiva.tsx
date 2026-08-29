"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trophy,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Dumbbell,
} from "lucide-react";
import type {
  PerfilDeportivoSalidaDto,
  CompetenciaSalidaDto,
} from "@/aplicacion/dtos/deportivo.dto";
import {
  NIVELES_DEPORTIVOS,
  FASES_TEMPORADA,
  type NivelDeportivo,
  type FaseTemporada,
} from "@/dominio/entidades/PerfilDeportivo";
import {
  IMPORTANCIAS_COMPETENCIA,
  type ImportanciaCompetencia,
} from "@/dominio/entidades/Competencia";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/** Etiquetas legibles para los enums. */
const ETIQUETA_NIVEL: Record<NivelDeportivo, string> = {
  RECREATIVO: "Recreativo",
  AMATEUR: "Amateur",
  COMPETITIVO: "Competitivo",
  ELITE: "Élite",
};
const ETIQUETA_FASE: Record<FaseTemporada, string> = {
  PRETEMPORADA: "Pretemporada",
  COMPETENCIA: "Competencia",
  TRANSICION: "Transición",
  DESCANSO: "Descanso",
};
const ETIQUETA_IMPORTANCIA: Record<ImportanciaCompetencia, string> = {
  A: "A · principal",
  B: "B · secundaria",
  C: "C · preparatoria",
};

function aNumero(valor: string): number | null {
  const t = valor.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// --- Perfil ----------------------------------------------------------------
const esquemaPerfil = z.object({
  deporte: z.string().min(1, "Indicá el deporte").max(80),
  disciplina: z.string().max(80),
  nivel: z.enum(NIVELES_DEPORTIVOS),
  fase: z.enum(FASES_TEMPORADA),
  diasEntrenamientoSemana: z.string(),
  horasSemana: z.string(),
  pesoCategoriaKg: z.string(),
  posicion: z.string().max(60),
  objetivo: z.string().max(500),
  notas: z.string().max(1000),
});
type DatosPerfil = z.infer<typeof esquemaPerfil>;

function FormularioPerfil({
  pacienteId,
  perfil,
  onTerminado,
}: {
  pacienteId: string;
  perfil: PerfilDeportivoSalidaDto | null;
  onTerminado: () => void;
}) {
  const { guardarPerfil } = useDeportivo();

  const form = useForm<DatosPerfil>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: {
      deporte: perfil?.deporte ?? "",
      disciplina: perfil?.disciplina ?? "",
      nivel: perfil?.nivel ?? "AMATEUR",
      fase: perfil?.fase ?? "PRETEMPORADA",
      diasEntrenamientoSemana:
        perfil?.diasEntrenamientoSemana?.toString() ?? "",
      horasSemana: perfil?.horasSemana?.toString() ?? "",
      pesoCategoriaKg: perfil?.pesoCategoriaKg?.toString() ?? "",
      posicion: perfil?.posicion ?? "",
      objetivo: perfil?.objetivo ?? "",
      notas: perfil?.notas ?? "",
    },
  });

  function alEnviar(datos: DatosPerfil) {
    guardarPerfil.mutate(
      {
        pacienteId,
        deporte: datos.deporte,
        disciplina: datos.disciplina.trim() || null,
        nivel: datos.nivel,
        fase: datos.fase,
        diasEntrenamientoSemana: aNumero(datos.diasEntrenamientoSemana),
        horasSemana: aNumero(datos.horasSemana),
        pesoCategoriaKg: aNumero(datos.pesoCategoriaKg),
        posicion: datos.posicion.trim() || null,
        objetivo: datos.objetivo.trim() || null,
        notas: datos.notas.trim() || null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="deporte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deporte</FormLabel>
                <FormControl>
                  <Input placeholder="Atletismo, fútbol, boxeo…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="disciplina"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disciplina / prueba</FormLabel>
                <FormControl>
                  <Input placeholder="Maratón, peso welter…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nivel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NIVELES_DEPORTIVOS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {ETIQUETA_NIVEL[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fase de temporada</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FASES_TEMPORADA.map((f) => (
                      <SelectItem key={f} value={f}>
                        {ETIQUETA_FASE[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="diasEntrenamientoSemana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de entrenamiento / semana</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="horasSemana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas / semana</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pesoCategoriaKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso de categoría (kg)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="posicion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición / puesto</FormLabel>
                <FormControl>
                  <Input placeholder="Delantero, base…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="objetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo deportivo</FormLabel>
              <FormControl>
                <Input placeholder="Ej. bajar de 3h30 en maratón" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={guardarPerfil.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={guardarPerfil.isPending}>
            {guardarPerfil.isPending ? "Guardando…" : "Guardar perfil"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// --- Competencias ----------------------------------------------------------
const esquemaCompetencia = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  lugar: z.string().max(160),
  importancia: z.enum(IMPORTANCIAS_COMPETENCIA),
  objetivo: z.string().max(300),
  resultado: z.string().max(300),
  notas: z.string().max(1000),
});
type DatosCompetenciaForm = z.infer<typeof esquemaCompetencia>;

function FormularioCompetencia({
  pacienteId,
  competencia,
  onTerminado,
}: {
  pacienteId: string;
  competencia: CompetenciaSalidaDto | null;
  onTerminado: () => void;
}) {
  const { crearCompetencia, actualizarCompetencia } = useDeportivo();
  const enviando =
    crearCompetencia.isPending || actualizarCompetencia.isPending;

  const form = useForm<DatosCompetenciaForm>({
    resolver: zodResolver(esquemaCompetencia),
    defaultValues: {
      nombre: competencia?.nombre ?? "",
      fecha: competencia?.fecha
        ? new Date(competencia.fecha).toISOString().slice(0, 10)
        : "",
      lugar: competencia?.lugar ?? "",
      importancia: competencia?.importancia ?? "B",
      objetivo: competencia?.objetivo ?? "",
      resultado: competencia?.resultado ?? "",
      notas: competencia?.notas ?? "",
    },
  });

  function alEnviar(datos: DatosCompetenciaForm) {
    const cuerpo = {
      nombre: datos.nombre,
      fecha: new Date(datos.fecha),
      lugar: datos.lugar.trim() || null,
      importancia: datos.importancia,
      objetivo: datos.objetivo.trim() || null,
      resultado: datos.resultado.trim() || null,
      notas: datos.notas.trim() || null,
    };
    if (competencia) {
      actualizarCompetencia.mutate(
        { id: competencia.id, ...cuerpo },
        { onSuccess: onTerminado },
      );
    } else {
      crearCompetencia.mutate(
        { pacienteId, ...cuerpo },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competencia</FormLabel>
              <FormControl>
                <Input placeholder="Maratón de Buenos Aires" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importancia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importancia</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {IMPORTANCIAS_COMPETENCIA.map((i) => (
                      <SelectItem key={i} value={i}>
                        {ETIQUETA_IMPORTANCIA[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="lugar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lugar (opcional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="objetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej. sub 3h30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resultado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resultado (se completa después)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : competencia
                ? "Guardar cambios"
                : "Agregar competencia"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Pestaña Deporte de la ficha: perfil deportivo + calendario de competencias. */
export function SeccionDeportiva({ pacienteId }: { pacienteId: string }) {
  const { obtenerPerfil, listarCompetencias, eliminarCompetencia } =
    useDeportivo();
  const consultaPerfil = obtenerPerfil({ pacienteId });
  const consultaCompetencias = listarCompetencias({ pacienteId });

  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [compAbierta, setCompAbierta] = useState(false);
  const [compEditar, setCompEditar] = useState<CompetenciaSalidaDto | null>(
    null,
  );
  const [compEliminar, setCompEliminar] = useState<CompetenciaSalidaDto | null>(
    null,
  );

  const perfil = consultaPerfil.data ?? null;
  const competencias = consultaCompetencias.data ?? [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-8">
      {/* Perfil deportivo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-4 w-4 text-primary" /> Perfil deportivo
          </h3>
          <Button
            size="sm"
            variant={perfil ? "outline" : "default"}
            onClick={() => setPerfilAbierto(true)}
          >
            <Pencil className="h-4 w-4" />
            {perfil ? "Editar" : "Cargar perfil"}
          </Button>
        </div>

        {consultaPerfil.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !perfil ? (
          <p className="text-sm text-muted-foreground">
            El paciente no tiene perfil deportivo cargado. Cargalo para adaptar
            su plan y el asistente.
          </p>
        ) : (
          <div className="grid gap-2 rounded-md border p-4 text-sm sm:grid-cols-2">
            <Dato etiqueta="Deporte" valor={perfil.deporte} />
            <Dato etiqueta="Disciplina" valor={perfil.disciplina} />
            <Dato etiqueta="Nivel" valor={ETIQUETA_NIVEL[perfil.nivel]} />
            <Dato etiqueta="Fase" valor={ETIQUETA_FASE[perfil.fase]} />
            <Dato
              etiqueta="Entrenamiento"
              valor={
                [
                  perfil.diasEntrenamientoSemana != null &&
                    `${perfil.diasEntrenamientoSemana} días/sem`,
                  perfil.horasSemana != null && `${perfil.horasSemana} h/sem`,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
            <Dato
              etiqueta="Peso de categoría"
              valor={
                perfil.pesoCategoriaKg != null
                  ? `${perfil.pesoCategoriaKg} kg`
                  : null
              }
            />
            <Dato etiqueta="Posición" valor={perfil.posicion} />
            <Dato etiqueta="Objetivo" valor={perfil.objetivo} />
            {perfil.notas && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Notas: </span>
                {perfil.notas}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Competencias */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" /> Calendario de
            competencias
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setCompEditar(null);
              setCompAbierta(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {consultaCompetencias.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : competencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin competencias cargadas.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {competencias.map((comp) => {
              const pasada = new Date(comp.fecha) < hoy;
              return (
                <li
                  key={comp.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <Trophy className="h-4 w-4 text-primary" />
                      {comp.nombre}
                      <Badge
                        variant={
                          comp.importancia === "A" ? "default" : "secondary"
                        }
                      >
                        {comp.importancia}
                      </Badge>
                      {pasada && <Badge variant="outline">Finalizada</Badge>}
                    </p>
                    <p className="text-muted-foreground">
                      {formatearFecha(comp.fecha)}
                      {comp.lugar && ` · ${comp.lugar}`}
                      {comp.objetivo && ` · Objetivo: ${comp.objetivo}`}
                      {comp.resultado && ` · Resultado: ${comp.resultado}`}
                    </p>
                  </div>
                  <span className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => {
                        setCompEditar(comp);
                        setCompAbierta(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => setCompEliminar(comp)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Diálogos */}
      <Dialog open={perfilAbierto} onOpenChange={setPerfilAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {perfil ? "Editar perfil deportivo" : "Cargar perfil deportivo"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPerfil
            pacienteId={pacienteId}
            perfil={perfil}
            onTerminado={() => setPerfilAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={compAbierta} onOpenChange={setCompAbierta}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {compEditar ? "Editar competencia" : "Agregar competencia"}
            </DialogTitle>
          </DialogHeader>
          <FormularioCompetencia
            pacienteId={pacienteId}
            competencia={compEditar}
            onTerminado={() => setCompAbierta(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(compEliminar)}
        titulo="Eliminar competencia"
        descripcion={`¿Eliminar «${compEliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminarCompetencia.isPending}
        onCancelar={() => setCompEliminar(null)}
        onConfirmar={() => {
          if (!compEliminar) return;
          eliminarCompetencia.mutate(
            { id: compEliminar.id },
            { onSuccess: () => setCompEliminar(null) },
          );
        }}
      />
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <p>
      <span className="text-muted-foreground">{etiqueta}: </span>
      {valor ?? "—"}
    </p>
  );
}
