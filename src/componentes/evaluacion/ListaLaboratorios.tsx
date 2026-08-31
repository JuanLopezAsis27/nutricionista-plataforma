"use client";

import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { LaboratorioSalidaDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import {
  formatearFecha,
  formatearTamano,
  aFechaISO,
  hoyISO,
} from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

/** Laboratorios del paciente: lista con adjuntos + alta/edición/baja. */
export function ListaLaboratorios({ pacienteId }: { pacienteId: string }) {
  const {
    obtenerLaboratorios,
    registrarLaboratorio,
    actualizarLaboratorio,
    eliminarLaboratorio,
  } = useEvaluacion();
  const laboratorios = obtenerLaboratorios({ pacienteId });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<LaboratorioSalidaDto | null>(null);
  const [eliminando, setEliminando] = useState<LaboratorioSalidaDto | null>(
    null,
  );

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [archivosNuevos, setArchivosNuevos] = useState<ArchivoSalidaDto[]>([]);

  function abrirNuevo() {
    setEditando(null);
    setTitulo("");
    setFecha(hoyISO());
    setNotas("");
    setArchivosNuevos([]);
    setAbierto(true);
  }

  function abrirEdicion(laboratorio: LaboratorioSalidaDto) {
    setEditando(laboratorio);
    setTitulo(laboratorio.titulo);
    setFecha(aFechaISO(laboratorio.fecha));
    setNotas(laboratorio.notas ?? "");
    setArchivosNuevos([]);
    setAbierto(true);
  }

  function guardar() {
    const base = {
      titulo,
      fecha: new Date(fecha),
      notas: notas.trim() ? notas : null,
    };
    if (editando) {
      actualizarLaboratorio.mutate(
        {
          id: editando.id,
          ...base,
          archivoIdsNuevos: archivosNuevos.map((a) => a.id),
        },
        { onSuccess: () => setAbierto(false) },
      );
    } else {
      registrarLaboratorio.mutate(
        { pacienteId, ...base, archivoIds: archivosNuevos.map((a) => a.id) },
        { onSuccess: () => setAbierto(false) },
      );
    }
  }

  const enviando =
    registrarLaboratorio.isPending || actualizarLaboratorio.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Laboratorios</h3>
        <Button size="sm" variant="outline" onClick={abrirNuevo}>
          <Plus className="h-4 w-4" />
          Registrar estudio
        </Button>
      </div>

      {(laboratorios.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin laboratorios cargados. Registrá estudios con sus PDF o imágenes
          adjuntas para tenerlos siempre a mano en la consulta.
        </p>
      ) : (
        <ul className="space-y-2">
          {laboratorios.data!.map((laboratorio) => (
            <li key={laboratorio.id} className="rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{laboratorio.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(laboratorio.fecha)}
                    {laboratorio.notas ? ` · ${laboratorio.notas}` : ""}
                  </p>
                </div>
                <span className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar laboratorio"
                    onClick={() => abrirEdicion(laboratorio)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar laboratorio"
                    onClick={() => setEliminando(laboratorio)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </span>
              </div>

              {laboratorio.adjuntos.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {laboratorio.adjuntos.map((adjunto) => (
                    <li key={adjunto.id}>
                      <a
                        href={`/api/archivos/${adjunto.id}/ver`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {adjunto.nombreOriginal}
                        <span className="text-muted-foreground">
                          ({formatearTamano(adjunto.tamanoBytes)})
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar laboratorio" : "Registrar laboratorio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Perfil lipídico"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Adjuntos {editando ? "nuevos" : ""} (PDF o imagen)</Label>
              <SubidorArchivo
                contexto="laboratorio"
                accept="application/pdf,image/*"
                onSubido={(archivo) =>
                  setArchivosNuevos((previos) => [...previos, archivo])
                }
              />
              {archivosNuevos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {archivosNuevos.length} archivo(s) listo(s) para vincular:{" "}
                  {archivosNuevos.map((a) => a.nombreOriginal).join(", ")}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAbierto(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={enviando || !titulo.trim()}>
                {enviando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar laboratorio"
        descripcion={`¿Eliminar "${eliminando?.titulo}" y sus adjuntos? Esta acción no se puede deshacer.`}
        cargando={eliminarLaboratorio.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarLaboratorio.mutate(
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
