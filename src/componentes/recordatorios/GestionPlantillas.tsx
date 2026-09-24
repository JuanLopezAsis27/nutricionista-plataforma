"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  BadgeCheck,
  CircleAlert,
  Clock,
  XCircle,
  PauseCircle,
  Ban,
  RefreshCw,
  Link2,
  Reply,
  X,
} from "lucide-react";
import type {
  BotonPlantillaDto,
  PlantillaWhatsappSalidaDto,
} from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
import { useNombreProfesional } from "@/lib/hooks/useNombreProfesional";
import {
  VARIABLES_RECORDATORIO,
  MAX_LARGO_CUERPO_PLANTILLA,
  CUERPO_RECORDATORIO_POR_DEFECTO,
  MAX_BOTONES_PLANTILLA,
  MAX_BOTONES_URL,
  MAX_LARGO_TEXTO_BOTON,
  type VariableRecordatorio,
  type CategoriaMeta,
  type AccionRespuestaRapida,
  type DestinoBotonUrl,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { renderizarPlantilla } from "@/aplicacion/casos-de-uso/whatsapp/plantilla";
import { variablesEjemplo } from "@/aplicacion/casos-de-uso/secretaria/variables";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { DIAS_OFRECIDOS, etiquetaDiasAntes } from "./ConfiguracionMedios";

/** Valor del selector de día: el Select de shadcn no admite `null` como value. */
const SIN_DIA = "sin-dia";

/**
 * Cómo se relaciona la plantilla con Meta, desde el formulario:
 *   - NINGUNO: solo texto (vista previa y enlace wa.me).
 *   - CREAR: la app la da de alta en Meta y la manda a revisión.
 *   - VINCULAR: ya existe en Meta, creada a mano; se anota su nombre.
 *   - ADMINISTRADA: ya la dio de alta la app; se edita y se reenvía sola.
 */
type ModoMeta = "NINGUNO" | "CREAR" | "VINCULAR" | "ADMINISTRADA";

const ETIQUETA_ACCION: Record<AccionRespuestaRapida, string> = {
  CONFIRMAR_TURNO: "Confirma el turno",
  PEDIR_REPROGRAMACION: "Pide reprogramar (te avisa)",
  NINGUNA: "Solo responde (no hace nada)",
};

const ETIQUETA_DESTINO: Record<DestinoBotonUrl, string> = {
  CONFIRMACION_TURNO: "Enlace para confirmar el turno",
  FIJA: "Un enlace fijo",
};

/** Plantillas del recordatorio por WhatsApp. */
export function GestionPlantillas() {
  const {
    plantillas,
    eliminarPlantilla,
    actualizarPlantilla,
    sincronizarPlantillasMeta,
  } = useRecordatorios();
  const { estado } = useCredenciales();
  const credenciales = estado();
  const consulta = plantillas();
  const [editando, setEditando] = useState<PlantillaWhatsappSalidaDto | null>(
    null,
  );
  const [formAbierto, setFormAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<PlantillaWhatsappSalidaDto | null>(
    null,
  );

  const lista = consulta.data ?? [];
  const plantillasListas = credenciales.data?.whatsappPlantillasListas ?? false;
  const hayDeMeta = lista.some((p) => p.claveMeta != null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          El texto con el que sale el recordatorio. Cada una puede asignarse a
          un día de anticipación —para decir algo distinto "3 días antes" que "1
          día antes"—; la predeterminada es la que usa el envío automático en
          los días sin una propia, y siempre los envíos manuales.
        </p>
        <div className="flex flex-wrap gap-2">
          {plantillasListas && hayDeMeta && (
            <Button
              variant="outline"
              disabled={sincronizarPlantillasMeta.isPending}
              onClick={() => sincronizarPlantillasMeta.mutate()}
            >
              <RefreshCw
                className={`h-4 w-4 ${sincronizarPlantillasMeta.isPending ? "animate-spin" : ""}`}
              />
              Actualizar estado
            </Button>
          )}
          <Button
            onClick={() => {
              setEditando(null);
              setFormAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva plantilla
          </Button>
        </div>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : lista.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay plantillas. Sin una predeterminada, el envío automático
          no manda nada.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {plantilla.nombre}
                  {plantilla.diasAntes != null && (
                    <Badge variant="secondary">
                      {etiquetaDiasAntes(plantilla.diasAntes)}
                    </Badge>
                  )}
                  {plantilla.predeterminada && (
                    <Badge>
                      <Star className="mr-1 h-3 w-3" /> Predeterminada
                    </Badge>
                  )}
                  {!plantilla.activa && (
                    <Badge variant="outline">Desactivada</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <VistaMensaje
                  texto={plantilla.cuerpo}
                  botones={plantilla.botones}
                />

                <EstadoEnMeta plantilla={plantilla} />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditando(plantilla);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  {!plantilla.predeterminada && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          actualizarPlantilla.mutate({
                            id: plantilla.id,
                            predeterminada: true,
                          })
                        }
                      >
                        <Star className="h-4 w-4" /> Usar por defecto
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setAEliminar(plantilla)}
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPlantillaWhatsapp
            // Se remonta por plantilla: el estado inicial sale del modo que
            // corresponde a cada una.
            key={editando?.id ?? "nueva"}
            inicial={editando}
            plantillasListas={plantillasListas}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(aEliminar)}
        titulo="Eliminar plantilla"
        descripcion={
          aEliminar?.enviadaAMeta
            ? `¿Eliminar «${aEliminar.nombre}»? También se borra de tu cuenta de WhatsApp Business, y Meta no deja reusar ese nombre por 30 días. Los recordatorios ya enviados conservan su texto.`
            : `¿Eliminar «${aEliminar?.nombre}»? Los recordatorios ya enviados conservan su texto.`
        }
        cargando={eliminarPlantilla.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminarPlantilla.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </div>
  );
}

/** El mensaje como lo ve el paciente: el texto y, debajo, los botones. */
function VistaMensaje({
  texto,
  botones,
}: {
  texto: string;
  botones: BotonPlantillaDto[];
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-muted/40 text-sm">
      <p className="whitespace-pre-wrap p-3">{texto}</p>
      {botones.length > 0 && (
        <div className="divide-y border-t">
          {botones.map((b) => (
            <p
              key={`${b.tipo}-${b.texto}`}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary"
            >
              {b.tipo === "URL" ? (
                <Link2 className="h-3.5 w-3.5" />
              ) : (
                <Reply className="h-3.5 w-3.5" />
              )}
              {b.texto}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Qué pasa con la plantilla en Meta, dicho para decidir qué hacer. */
function EstadoEnMeta({
  plantilla,
}: {
  plantilla: PlantillaWhatsappSalidaDto;
}) {
  if (!plantilla.claveMeta) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Sin plantilla de Meta: sirve para el enlace wa.me, pero la API no la
        deja salir fuera de las 24 h desde el último mensaje del paciente —que
        es casi siempre, tratándose de un recordatorio—.
      </p>
    );
  }

  const nombre = (
    <>
      <code className="rounded bg-muted px-1">{plantilla.claveMeta}</code> (
      {plantilla.idiomaMeta})
    </>
  );
  const motivo = plantilla.motivoEstadoMeta && (
    <span className="block text-muted-foreground">
      Meta dijo: {plantilla.motivoEstadoMeta}
    </span>
  );

  switch (plantilla.estadoMeta) {
    case null:
      return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          Vinculada a Meta como {nombre}
        </p>
      );
    case "APROBADA":
      return (
        <p className="flex items-start gap-1.5 text-xs">
          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <Badge className="mr-1.5 h-5">Aprobada</Badge>
            en Meta como {nombre}
            {motivo}
          </span>
        </p>
      );
    case "EN_REVISION":
      return (
        <p className="flex items-start gap-1.5 text-xs">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            <Badge variant="outline" className="mr-1.5 h-5 border-amber-500/60">
              En revisión
            </Badge>
            {nombre}. Meta suele resolverla en minutos, aunque puede tardar
            hasta 24 h. Mientras tanto no se puede enviar.
          </span>
        </p>
      );
    case "RECHAZADA":
      return (
        <p className="flex items-start gap-1.5 text-xs">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <span>
            <Badge variant="destructive" className="mr-1.5 h-5">
              Rechazada
            </Badge>
            {nombre}.{motivo}
            {plantilla.enviadaAMeta && (
              <span className="block text-muted-foreground">
                Editala y guardá: se vuelve a mandar a revisión.
              </span>
            )}
          </span>
        </p>
      );
    case "PAUSADA":
      return (
        <p className="flex items-start gap-1.5 text-xs">
          <PauseCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            <Badge variant="outline" className="mr-1.5 h-5">
              Pausada
            </Badge>
            {nombre}: Meta la frenó por quejas o baja calidad.
            {motivo}
          </span>
        </p>
      );
    case "DESHABILITADA":
      return (
        <p className="flex items-start gap-1.5 text-xs">
          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <span>
            <Badge variant="outline" className="mr-1.5 h-5">
              Deshabilitada
            </Badge>
            {nombre}: ya no se puede enviar.
            {motivo}
          </span>
        </p>
      );
  }
}

/** Nombre en Meta a partir del nombre visible: minúsculas, dígitos y guión bajo. */
function aClaveMeta(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function modoInicial(
  inicial: PlantillaWhatsappSalidaDto | null,
  plantillasListas: boolean,
): ModoMeta {
  if (!inicial) return plantillasListas ? "CREAR" : "NINGUNO";
  if (inicial.enviadaAMeta) return "ADMINISTRADA";
  return inicial.claveMeta ? "VINCULAR" : "NINGUNO";
}

function FormularioPlantillaWhatsapp({
  inicial,
  plantillasListas,
  onTerminado,
}: {
  inicial: PlantillaWhatsappSalidaDto | null;
  plantillasListas: boolean;
  onTerminado: () => void;
}) {
  const { crearPlantilla, actualizarPlantilla } = useRecordatorios();

  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [cuerpo, setCuerpo] = useState(
    inicial?.cuerpo ?? CUERPO_RECORDATORIO_POR_DEFECTO,
  );
  const [modo, setModo] = useState<ModoMeta>(
    modoInicial(inicial, plantillasListas),
  );
  const [claveMeta, setClaveMeta] = useState(inicial?.claveMeta ?? "");
  // Mientras no la toque a mano, el nombre en Meta sigue al nombre visible.
  const [claveTocada, setClaveTocada] = useState(Boolean(inicial?.claveMeta));
  const [idiomaMeta, setIdiomaMeta] = useState(inicial?.idiomaMeta ?? "es_AR");
  const [categoria, setCategoria] = useState<CategoriaMeta>(
    inicial?.categoriaMeta ?? "UTILITY",
  );
  const [variables, setVariables] = useState<VariableRecordatorio[]>(
    inicial?.variablesMeta ?? [...VARIABLES_RECORDATORIO],
  );
  const [botones, setBotones] = useState<BotonPlantillaDto[]>(
    inicial?.botones ?? [],
  );
  const [diasAntes, setDiasAntes] = useState<number | null>(
    inicial?.diasAntes ?? null,
  );
  const [predeterminada, setPredeterminada] = useState(
    inicial?.predeterminada ?? false,
  );
  const [activa, setActiva] = useState(inicial?.activa ?? true);

  const claveEfectiva =
    modo === "CREAR" && !claveTocada ? aClaveMeta(nombre) : claveMeta;

  // {{profesional}} es el nombre de ESTE consultorio (`nutricionistas.nombre`),
  // el mismo que va a llevar el envío real.
  const nombreProfesional = useNombreProfesional();
  const vistaPrevia = renderizarPlantilla(
    cuerpo,
    variablesEjemplo(nombreProfesional ?? "tu nutricionista", new Date()),
  );
  const guardando = crearPlantilla.isPending || actualizarPlantilla.isPending;
  const conBotones = modo === "CREAR" || modo === "ADMINISTRADA";
  // Regla de Meta, avisada antes de que la rechace.
  const variableEnBorde =
    conBotones &&
    (/^\s*{{[^}]+}}/.test(cuerpo) || /{{[^}]+}}\s*$/.test(cuerpo));

  function guardar() {
    const comunes = {
      nombre,
      cuerpo,
      diasAntes,
      predeterminada,
      activa,
    };
    const deMeta =
      modo === "NINGUNO"
        ? { claveMeta: null, botones: [] }
        : modo === "VINCULAR"
          ? {
              claveMeta: claveEfectiva.trim() || null,
              idiomaMeta,
              variablesMeta: variables,
              botones: [],
            }
          : modo === "CREAR"
            ? {
                claveMeta: claveEfectiva.trim() || null,
                idiomaMeta,
                categoriaMeta: categoria,
                botones,
                enviarAMeta: true,
              }
            : // ADMINISTRADA: el nombre y el idioma en Meta no cambian.
              { categoriaMeta: categoria, botones };

    if (inicial) {
      actualizarPlantilla.mutate(
        { id: inicial.id, ...comunes, ...deMeta },
        { onSuccess: onTerminado },
      );
    } else {
      crearPlantilla.mutate(
        { ...comunes, ...deMeta },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pl-nombre">Nombre</Label>
        <Input
          id="pl-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Recordatorio de turno"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pl-cuerpo">Mensaje</Label>
        <Textarea
          id="pl-cuerpo"
          rows={5}
          maxLength={MAX_LARGO_CUERPO_PLANTILLA}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Datos que podés insertar:{" "}
          {VARIABLES_RECORDATORIO.map((v) => (
            <code
              key={v}
              className="mr-1.5 rounded bg-muted px-1"
            >{`{{${v}}}`}</code>
          ))}
        </p>
        {variableEnBorde && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-500">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Meta no acepta un mensaje que empiece o termine con un dato
            variable. Agregale texto antes o después (aunque sea un punto).
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Vista previa</Label>
        <VistaMensaje texto={vistaPrevia} botones={conBotones ? botones : []} />
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Plantilla de WhatsApp Business</p>
        <p className="text-xs text-muted-foreground">
          Fuera de las 24 h desde el último mensaje del paciente, WhatsApp solo
          acepta plantillas aprobadas por Meta. Un recordatorio de turno casi
          siempre cae fuera de esa ventana, así que sin esto el envío automático
          no va a salir por la API.
        </p>

        {modo === "ADMINISTRADA" ? (
          <p className="rounded-md bg-muted/50 p-2 text-xs">
            Creada desde la app en Meta como{" "}
            <code className="rounded bg-muted px-1">{inicial?.claveMeta}</code>{" "}
            ({inicial?.idiomaMeta}). Si cambiás el mensaje, los botones o la
            categoría, se vuelve a mandar a revisión y no se puede enviar hasta
            que Meta la apruebe.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <OpcionModo
              activa={modo === "CREAR"}
              deshabilitada={!plantillasListas}
              titulo="Crear en Meta"
              detalle={
                plantillasListas
                  ? "La app la manda a revisión y sigue su estado."
                  : "Cargá el ID de la cuenta de WhatsApp Business en Integraciones."
              }
              onElegir={() => setModo("CREAR")}
            />
            <OpcionModo
              activa={modo === "VINCULAR"}
              titulo="Ya existe en Meta"
              detalle="La creaste a mano en el Administrador de WhatsApp."
              onElegir={() => setModo("VINCULAR")}
            />
            <OpcionModo
              activa={modo === "NINGUNO"}
              titulo="Sin Meta"
              detalle="Solo para el enlace wa.me."
              onElegir={() => setModo("NINGUNO")}
            />
          </div>
        )}

        {(modo === "CREAR" || modo === "VINCULAR") && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pl-meta">Nombre en Meta</Label>
              <Input
                id="pl-meta"
                value={claveEfectiva}
                onChange={(e) => {
                  setClaveTocada(true);
                  setClaveMeta(e.target.value.toLowerCase());
                }}
                placeholder="recordatorio_turno"
              />
              {modo === "CREAR" && (
                <p className="text-xs text-muted-foreground">
                  Minúsculas, números y guión bajo. No se puede cambiar después.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-idioma">Idioma</Label>
              <Input
                id="pl-idioma"
                value={idiomaMeta}
                onChange={(e) => setIdiomaMeta(e.target.value)}
                placeholder="es_AR"
              />
            </div>
          </div>
        )}

        {conBotones && (
          <>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={categoria}
                onValueChange={(v) => setCategoria(v as CategoriaMeta)}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">
                    Utilidad (avisos y recordatorios)
                  </SelectItem>
                  <SelectItem value="MARKETING">
                    Marketing (promociones)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <EditorBotones botones={botones} onCambiar={setBotones} />
          </>
        )}

        {modo === "VINCULAR" && claveEfectiva.trim().length > 0 && (
          <div className="space-y-1.5">
            <Label>Orden de los parámetros</Label>
            <p className="text-xs text-muted-foreground">
              Meta numera los parámetros del cuerpo aprobado ({"{{1}}"},{" "}
              {"{{2}}"}…) en vez de nombrarlos. Este es el orden en que se
              completan: si no coincide con el de la plantilla aprobada, al
              paciente le llega la fecha donde va el nombre.
            </p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, indice) => (
                <Badge key={variable} variant="secondary">
                  {indice + 1}. {variable}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {VARIABLES_RECORDATORIO.map((variable) => {
                const usada = variables.includes(variable);
                return (
                  <button
                    key={variable}
                    type="button"
                    onClick={() =>
                      setVariables(
                        usada
                          ? variables.filter((v) => v !== variable)
                          : [...variables, variable],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs ${
                      usada
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {variable}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Día asignado</Label>
        <Select
          value={diasAntes == null ? SIN_DIA : String(diasAntes)}
          onValueChange={(v) => setDiasAntes(v === SIN_DIA ? null : Number(v))}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_DIA}>
              Sin día (predeterminada / manual)
            </SelectItem>
            {DIAS_OFRECIDOS.map((dias) => (
              <SelectItem key={dias} value={String(dias)}>
                {etiquetaDiasAntes(dias)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          El barrido automático usa esta plantilla para ese escalón. Asignarla
          se la saca a cualquier otra que la tuviera.
        </p>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={predeterminada}
            onChange={(e) => setPredeterminada(e.target.checked)}
          />
          Usar por defecto
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
          />
          Activa
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onTerminado}>
          Cancelar
        </Button>
        <Button
          disabled={guardando || !nombre.trim() || !cuerpo.trim()}
          onClick={guardar}
        >
          {guardando
            ? "Guardando…"
            : modo === "CREAR" && !inicial?.enviadaAMeta
              ? "Guardar y enviar a Meta"
              : "Guardar plantilla"}
        </Button>
      </div>
    </div>
  );
}

function OpcionModo({
  activa,
  deshabilitada = false,
  titulo,
  detalle,
  onElegir,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  titulo: string;
  detalle: string;
  onElegir: () => void;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitada}
      onClick={onElegir}
      className={`rounded-md border p-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        activa ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
      }`}
    >
      <span className="block text-sm font-medium">{titulo}</span>
      <span className="text-muted-foreground">{detalle}</span>
    </button>
  );
}

/**
 * Los botones de la plantilla. Las respuestas rápidas y los enlaces se
 * muestran en grupos porque Meta los exige así (y así los guarda la app).
 */
function EditorBotones({
  botones,
  onCambiar,
}: {
  botones: BotonPlantillaDto[];
  onCambiar: (botones: BotonPlantillaDto[]) => void;
}) {
  const enlaces = botones.filter((b) => b.tipo === "URL").length;
  const lleno = botones.length >= MAX_BOTONES_PLANTILLA;

  function cambiar(indice: number, boton: BotonPlantillaDto) {
    onCambiar(botones.map((b, i) => (i === indice ? boton : b)));
  }

  return (
    <div className="space-y-2">
      <Label>Botones (opcional)</Label>
      <p className="text-xs text-muted-foreground">
        Las respuestas rápidas le mandan al chat el texto del botón; las que
        confirman o piden reprogramar además actúan sobre el turno del aviso.
      </p>

      {botones.map((boton, indice) => (
        <div
          key={indice}
          className="flex flex-wrap items-start gap-2 rounded-md border p-2"
        >
          <span className="mt-2 text-muted-foreground">
            {boton.tipo === "URL" ? (
              <Link2 className="h-4 w-4" />
            ) : (
              <Reply className="h-4 w-4" />
            )}
          </span>
          <Input
            className="h-9 w-40"
            maxLength={MAX_LARGO_TEXTO_BOTON}
            placeholder="Texto del botón"
            value={boton.texto}
            onChange={(e) =>
              cambiar(indice, { ...boton, texto: e.target.value })
            }
          />
          {boton.tipo === "RESPUESTA_RAPIDA" ? (
            <Select
              value={boton.accion}
              onValueChange={(v) =>
                cambiar(indice, {
                  ...boton,
                  accion: v as AccionRespuestaRapida,
                })
              }
            >
              <SelectTrigger className="h-9 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ETIQUETA_ACCION).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Select
                value={boton.destino}
                onValueChange={(v) =>
                  cambiar(indice, {
                    ...boton,
                    destino: v as DestinoBotonUrl,
                    url: v === "FIJA" ? boton.url : null,
                  })
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETIQUETA_DESTINO).map(([valor, etiqueta]) => (
                    <SelectItem key={valor} value={valor}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boton.destino === "FIJA" && (
                <Input
                  className="h-9"
                  placeholder="https://…"
                  value={boton.url ?? ""}
                  onChange={(e) =>
                    cambiar(indice, { ...boton, url: e.target.value })
                  }
                />
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-9 w-9"
            aria-label="Quitar botón"
            onClick={() => onCambiar(botones.filter((_, i) => i !== indice))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={lleno}
          onClick={() =>
            onCambiar([
              ...botones,
              {
                tipo: "RESPUESTA_RAPIDA",
                texto: "",
                accion: botones.some(
                  (b) =>
                    b.tipo === "RESPUESTA_RAPIDA" &&
                    b.accion === "CONFIRMAR_TURNO",
                )
                  ? "NINGUNA"
                  : "CONFIRMAR_TURNO",
              },
            ])
          }
        >
          <Reply className="h-4 w-4" /> Respuesta rápida
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={lleno || enlaces >= MAX_BOTONES_URL}
          onClick={() =>
            onCambiar([
              ...botones,
              {
                tipo: "URL",
                texto: "",
                destino: "CONFIRMACION_TURNO",
                url: null,
              },
            ])
          }
        >
          <Link2 className="h-4 w-4" /> Enlace
        </Button>
      </div>
    </div>
  );
}
