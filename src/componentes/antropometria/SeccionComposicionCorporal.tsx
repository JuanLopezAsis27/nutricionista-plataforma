"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  FileSpreadsheet,
  LayoutTemplate,
  Plus,
  Settings2,
  UserCog,
} from "lucide-react";
import type {
  MedicionComposicionDto,
  PlantillaAntropometricaDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import {
  PROTOCOLOS_COMPOSICION,
  type ProtocoloComposicion,
} from "@/dominio/entidades/Antropometria";
import type { CampoPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";
import {
  ETIQUETAS_PROTOCOLO,
  protocolosQueAdmite,
} from "@/dominio/entidades/protocolosMedicion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
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
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/componentes/ui/select";
import { Label } from "@/componentes/ui/label";
import { DashboardComposicion } from "./DashboardComposicion";
import { FormularioMedicion } from "./FormularioMedicion";
import { ImportadorMediciones } from "./ImportadorMediciones";
import { ObjetivosComposicion } from "./ObjetivosComposicion";
import { TarjetasMediciones } from "./TarjetasMediciones";

/**
 * El valor del selector cuando no hay plantilla propia elegida: se cargan los
 * campos del protocolo, tal como el consultorio los configuró.
 *
 * No hay opción de «perfil completo»: los dos protocolos SON las plantillas
 * principales, y uno de ellos ya es el perfil entero si así se lo configura.
 * Ofrecer una tercera lista fija al lado dejaba a la configuración de los
 * protocolos sin efecto justo en la pantalla donde se carga.
 */
const SEGUIR_PROTOCOLO = "PROTOCOLO";

/** El renglón de ayuda de cada protocolo; el nombre sale del dominio. */
const DETALLE_PROTOCOLO: Record<ProtocoloComposicion, string> = {
  DOS_COMPONENTES:
    "Sale con los pliegues. Es el protocolo habitual de consulta.",
  CINCO_COMPONENTES:
    "Perfil ISAK: pliegues, perímetros y diámetros para el fraccionamiento.",
};

/**
 * ¿Esta plantilla propia se puede usar con este protocolo? La regla es del
 * dominio y es la MISMA que valida la personalización del protocolo: si una
 * lista de campos no sirve para configurarlo, tampoco sirve para cargar con él.
 */
function admite(
  plantilla: PlantillaAntropometricaDto,
  protocolo: ProtocoloComposicion,
): boolean {
  return protocolosQueAdmite(plantilla.campos).includes(protocolo);
}

/**
 * Pestaña de Antropometría del paciente: la única sección donde se cargan y
 * se leen medidas corporales.
 *
 * Tres vistas del mismo dato: el dashboard (qué dicen las medidas), las
 * mediciones —una tarjeta por consulta, con su planilla adentro— y los
 * objetivos (a dónde va). La evolución del peso
 * en el diario del paciente vive en «Progreso», que es otra fuente: ahí es el
 * paciente el que se pesa en casa, acá es el profesional en consulta.
 */
export function SeccionComposicionCorporal({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { obtenerComposicion, eliminarAntropometria, obtenerPlantillas } =
    useEvaluacion();
  const composicion = obtenerComposicion({ pacienteId });
  const plantillas = obtenerPlantillas();
  // Protocolo y plantilla se eligen juntos, arriba del formulario: son las dos
  // cosas que deciden qué se pide, y la segunda depende de la primera.
  const [protocolo, setProtocolo] =
    useState<ProtocoloComposicion>("DOS_COMPONENTES");
  const [plantillaId, setPlantillaId] = useState<string>(SEGUIR_PROTOCOLO);

  const [abierto, setAbierto] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState<MedicionComposicionDto | null>(null);
  const [eliminando, setEliminando] = useState<MedicionComposicionDto | null>(
    null,
  );

  if (composicion.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (composicion.isError || !composicion.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la composición corporal del paciente.
      </p>
    );
  }

  const { mediciones, objetivos, sexo, valoresActuales } = composicion.data;

  const abrirNueva = () => {
    setEditando(null);
    setProtocolo("DOS_COMPONENTES");
    setPlantillaId(SEGUIR_PROTOCOLO);
    setAbierto(true);
  };

  const abrirEdicion = (medicion: MedicionComposicionDto) => {
    setEditando(medicion);
    // La medición ya declaró su protocolo: editarla con el de la última carga
    // podría reordenar la planilla y esconder medidas que sí tiene.
    setProtocolo(medicion.protocolo);
    setPlantillaId(SEGUIR_PROTOCOLO);
    setAbierto(true);
  };

  const listaPlantillas = plantillas.data ?? [];
  const plantillaElegida =
    listaPlantillas.find((p) => p.id === plantillaId) ?? null;
  // Null deja que el formulario pida los campos del protocolo elegido.
  const camposVisibles: readonly CampoPlantilla[] | null =
    plantillaElegida?.campos ?? null;

  /**
   * Cambiar de protocolo puede dejar huérfana a la plantilla elegida: la de 6
   * pliegues no sirve para 5 componentes. Se vuelve al protocolo solo, que es
   * lo único que siempre sirve; dejarla puesta cargaría una medición sin el
   * fraccionamiento bajo el protocolo que lo promete.
   */
  const cambiarProtocolo = (nuevo: ProtocoloComposicion) => {
    setProtocolo(nuevo);
    if (plantillaElegida && !admite(plantillaElegida, nuevo)) {
      setPlantillaId(SEGUIR_PROTOCOLO);
    }
  };

  return (
    <div className="space-y-4">
      {sexo == null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
          <p className="flex items-start gap-2">
            <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Falta el <span className="font-medium">sexo biológico</span> del
              paciente. Sin él no se pueden fraccionar las masas ni estimar el
              metabolismo: son constantes distintas por sexo.
            </span>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/pacientes/${pacienteId}?editar=1`}>
              Completar ficha
            </Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="dashboard">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mediciones">
              Mediciones
              {mediciones.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {mediciones.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="objetivos">
              Objetivos
              {objetivos.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {objetivos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportando(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar planilla
            </Button>
            <Button size="sm" onClick={abrirNueva}>
              <Plus className="h-4 w-4" />
              Nueva medición
            </Button>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardComposicion
            pacienteId={pacienteId}
            mediciones={mediciones}
          />
        </TabsContent>

        <TabsContent value="mediciones" className="mt-4 space-y-3">
          {mediciones.length > 0 && (
            <div className="flex justify-end">
              <Button asChild size="sm" variant="outline">
                <a href={`/api/pacientes/${pacienteId}/mediciones-excel`}>
                  <Download className="h-4 w-4" />
                  Descargar Excel
                </a>
              </Button>
            </div>
          )}
          <TarjetasMediciones
            pacienteId={pacienteId}
            mediciones={mediciones}
            onEditar={abrirEdicion}
            onEliminar={setEliminando}
          />
        </TabsContent>

        <TabsContent value="objetivos" className="mt-4">
          <ObjetivosComposicion
            pacienteId={pacienteId}
            objetivos={objetivos}
            valoresActuales={valoresActuales}
            ultimaMedicion={mediciones[mediciones.length - 1] ?? null}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar medición del ${formatearFecha(editando.fecha)}`
                : "Nueva medición antropométrica"}
            </DialogTitle>
          </DialogHeader>
          {/* Protocolo y plantilla van juntos, ARRIBA del formulario: los dos
              deciden qué campos se van a pedir, y elegirlos después de empezar
              a cargar es volver a mirar la planilla desde el principio. La
              plantilla se ofrece debajo del protocolo porque depende de él:
              una propia solo se puede usar con los protocolos que admite. */}
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Protocolo de la medición
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROTOCOLOS_COMPOSICION.map((opcion) => {
                  const activo = protocolo === opcion;
                  return (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => cambiarProtocolo(opcion)}
                      aria-pressed={activo}
                      className={cn(
                        "rounded-md border bg-background p-3 text-left transition-colors",
                        activo
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <p className="text-sm font-medium">
                        {ETIQUETAS_PROTOCOLO[opcion]}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {DETALLE_PROTOCOLO[opcion]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label
                htmlFor="plantilla-carga"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Plantilla de carga
              </Label>
              <Select value={plantillaId} onValueChange={setPlantillaId}>
                <SelectTrigger id="plantilla-carga" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEGUIR_PROTOCOLO}>
                    Los campos del protocolo
                  </SelectItem>
                  {listaPlantillas.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Mis plantillas</SelectLabel>
                      {listaPlantillas.map((plantilla) => {
                        // Las que no le sirven a este protocolo se muestran
                        // DESHABILITADAS y con el motivo, no se esconden:
                        // desaparecer de la lista al cambiar de protocolo se
                        // lee como que la plantilla se borró.
                        const sirve = admite(plantilla, protocolo);
                        return (
                          <SelectItem
                            key={plantilla.id}
                            value={plantilla.id}
                            disabled={!sirve}
                          >
                            {plantilla.nombre} · {plantilla.campos.length}{" "}
                            campos
                            {!sirve && " — no alcanza para este protocolo"}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Los protocolos y tus plantillas se arman en{" "}
                  <Link
                    href="/dashboard/configuracion"
                    className="underline underline-offset-2"
                  >
                    Configuración → Antropometría
                  </Link>
                  .
                </span>
              </p>
            </div>
          </div>
          <FormularioMedicion
            pacienteId={pacienteId}
            medicionInicial={editando}
            protocolo={protocolo}
            camposVisibles={camposVisibles}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={importando} onOpenChange={setImportando}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar mediciones desde una planilla</DialogTitle>
          </DialogHeader>
          {/* Se desmonta al cerrar: si el importador quedara montado, volver a
              abrirlo mostraría la revisión de la planilla anterior, ya
              importada, en vez del subidor vacío. */}
          {importando && (
            <ImportadorMediciones
              pacienteId={pacienteId}
              onTerminado={() => setImportando(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar medición"
        descripcion={`¿Eliminar la medición del ${formatearFecha(eliminando?.fecha)}? Se pierden todas las medidas de esa consulta.`}
        cargando={eliminarAntropometria.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarAntropometria.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}
