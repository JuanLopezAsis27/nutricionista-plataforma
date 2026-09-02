"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, Search, FileUp } from "lucide-react";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPaciente } from "@/componentes/pacientes/FormularioPaciente";
import { AltaPacienteDesdeDocumento } from "@/componentes/pacientes/AltaPacienteDesdeDocumento";

const POR_PAGINA = 10;

export default function PaginaPacientes() {
  const { listar, eliminar } = usePacientes();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 300);

  const [formAbierto, setFormAbierto] = useState(false);
  const [pacienteEditar, setPacienteEditar] =
    useState<PacienteSalidaDto | null>(null);
  const [pacienteEliminar, setPacienteEliminar] =
    useState<PacienteSalidaDto | null>(null);
  const [documentoAbierto, setDocumentoAbierto] = useState(false);

  const consulta = listar({
    pagina,
    porPagina: POR_PAGINA,
    busqueda: busquedaDebounced || undefined,
  });

  function abrirNuevo() {
    setPacienteEditar(null);
    setFormAbierto(true);
  }

  function abrirEditar(paciente: PacienteSalidaDto) {
    setPacienteEditar(paciente);
    setFormAbierto(true);
  }

  const columnas: ColumnaTabla<PacienteSalidaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Nombre",
      render: (p) => (
        <span className="font-medium">
          {p.nombre} {p.apellido}
        </span>
      ),
    },
    { clave: "email", encabezado: "Email", render: (p) => p.email },
    {
      clave: "telefono",
      encabezado: "Teléfono",
      render: (p) => p.telefono ?? "—",
    },
    {
      clave: "fechaNacimiento",
      encabezado: "Nacimiento",
      render: (p) => formatearFecha(p.fechaNacimiento),
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Ver detalle">
            <Link href={`/dashboard/pacientes/${p.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            onClick={() => abrirEditar(p)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            onClick={() => setPacienteEliminar(p)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            className="pl-9"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDocumentoAbierto(true)}>
            <FileUp className="h-4 w-4" />
            Desde documento
          </Button>
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      {consulta.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los pacientes.
        </p>
      ) : (
        <TablaDatos
          columnas={columnas}
          datos={consulta.data?.pacientes ?? []}
          obtenerClave={(p) => p.id}
          cargando={consulta.isLoading}
          mensajeVacio="No hay pacientes que coincidan con la búsqueda."
          pagina={pagina}
          totalPaginas={consulta.data?.paginas ?? 1}
          onCambiarPagina={setPagina}
        />
      )}

      {/* Modal de alta/edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pacienteEditar ? "Editar paciente" : "Nuevo paciente"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPaciente
            pacienteInicial={pacienteEditar}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Alta desde una ficha en PDF, Word o foto */}
      <Dialog open={documentoAbierto} onOpenChange={setDocumentoAbierto}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargar paciente desde un documento</DialogTitle>
          </DialogHeader>
          {/* La clave remonta el componente al cerrar: si no, el documento ya
              leído seguiría precargado la próxima vez que se abra el modal. */}
          <AltaPacienteDesdeDocumento
            key={documentoAbierto ? "abierto" : "cerrado"}
            onTerminado={() => setDocumentoAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={Boolean(pacienteEliminar)}
        titulo="Eliminar paciente"
        descripcion={`¿Seguro que querés eliminar a ${pacienteEliminar?.nombre} ${pacienteEliminar?.apellido}? Esta acción no se puede deshacer.`}
        cargando={eliminar.isPending}
        onCancelar={() => setPacienteEliminar(null)}
        onConfirmar={() => {
          if (!pacienteEliminar) return;
          eliminar.mutate(
            { id: pacienteEliminar.id },
            { onSuccess: () => setPacienteEliminar(null) },
          );
        }}
      />
    </div>
  );
}
