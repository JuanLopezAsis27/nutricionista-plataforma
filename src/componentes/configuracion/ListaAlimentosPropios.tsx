"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { AlimentoPropioSalidaDto } from "@/aplicacion/dtos/alimentoPropio.dto";
import { useAlimentosPropios } from "@/lib/hooks/useAlimentosPropios";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/componentes/ui/dialog";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

const POR_PAGINA = 10;

interface Borrador {
  id: string | null;
  nombre: string;
  marca: string;
  caloriasPor100: string;
  proteinasPor100: string;
  carbohidratosPor100: string;
  grasasPor100: string;
}

function borradorVacio(): Borrador {
  return {
    id: null,
    nombre: "",
    marca: "",
    caloriasPor100: "",
    proteinasPor100: "",
    carbohidratosPor100: "",
    grasasPor100: "",
  };
}

function aBorrador(a: AlimentoPropioSalidaDto): Borrador {
  return {
    id: a.id,
    nombre: a.nombre,
    marca: a.marca ?? "",
    caloriasPor100: a.caloriasPor100 != null ? String(a.caloriasPor100) : "",
    proteinasPor100: a.proteinasPor100 != null ? String(a.proteinasPor100) : "",
    carbohidratosPor100:
      a.carbohidratosPor100 != null ? String(a.carbohidratosPor100) : "",
    grasasPor100: a.grasasPor100 != null ? String(a.grasasPor100) : "",
  };
}

function formatearMacro(valor: number | null): string {
  return valor != null ? String(valor) : "—";
}

/**
 * Gestión manual de la lista de alimentos propios: ver, editar y agregar de a
 * uno. Solo se muestra si ya hay una lista cargada (por Excel), que es cuando
 * tiene sentido revisarla o completarla a mano.
 */
export function ListaAlimentosPropios() {
  const { estado, listar, crear, actualizar, eliminar } = useAlimentosPropios();
  const consultaEstado = estado();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 300);

  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aEliminar, setAEliminar] = useState<AlimentoPropioSalidaDto | null>(
    null,
  );

  const consulta = listar(
    {
      pagina,
      porPagina: POR_PAGINA,
      busqueda: busquedaDebounced || undefined,
    },
    { enabled: consultaEstado.data?.activo === true },
  );

  if (!consultaEstado.data?.activo) {
    return null;
  }

  const columnas: ColumnaTabla<AlimentoPropioSalidaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Nombre",
      render: (a) => <span className="font-medium">{a.nombre}</span>,
    },
    { clave: "marca", encabezado: "Marca", render: (a) => a.marca ?? "—" },
    {
      clave: "caloriasPor100",
      encabezado: "Cal./100 g",
      render: (a) => formatearMacro(a.caloriasPor100),
    },
    {
      clave: "proteinasPor100",
      encabezado: "Prot./100 g",
      render: (a) => formatearMacro(a.proteinasPor100),
    },
    {
      clave: "carbohidratosPor100",
      encabezado: "Carb./100 g",
      render: (a) => formatearMacro(a.carbohidratosPor100),
    },
    {
      clave: "grasasPor100",
      encabezado: "Grasas/100 g",
      render: (a) => formatearMacro(a.grasasPor100),
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Editar"
            onClick={() => setBorrador(aBorrador(a))}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Eliminar"
            onClick={() => setAEliminar(a)}
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
            placeholder="Buscar por nombre…"
            className="pl-9"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <Button size="sm" onClick={() => setBorrador(borradorVacio())}>
          <Plus className="h-4 w-4" /> Agregar alimento
        </Button>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={consulta.data?.alimentos ?? []}
        obtenerClave={(a) => a.id}
        cargando={consulta.isLoading}
        mensajeVacio="No hay alimentos que coincidan con la búsqueda."
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiarPagina={setPagina}
      />

      <DialogoAlimento
        borrador={borrador}
        guardando={crear.isPending || actualizar.isPending}
        onCerrar={() => setBorrador(null)}
        onGuardar={(datos) => {
          const payload = {
            nombre: datos.nombre.trim(),
            marca: datos.marca.trim() || null,
            caloriasPor100:
              datos.caloriasPor100.trim() === ""
                ? null
                : Number(datos.caloriasPor100),
            proteinasPor100:
              datos.proteinasPor100.trim() === ""
                ? null
                : Number(datos.proteinasPor100),
            carbohidratosPor100:
              datos.carbohidratosPor100.trim() === ""
                ? null
                : Number(datos.carbohidratosPor100),
            grasasPor100:
              datos.grasasPor100.trim() === ""
                ? null
                : Number(datos.grasasPor100),
          };
          if (datos.id) {
            actualizar.mutate(
              { id: datos.id, ...payload },
              { onSuccess: () => setBorrador(null) },
            );
          } else {
            crear.mutate(payload, { onSuccess: () => setBorrador(null) });
          }
        }}
      />

      <ModalConfirmacion
        abierto={aEliminar != null}
        titulo="Eliminar alimento"
        descripcion={`¿Eliminar «${aEliminar?.nombre ?? ""}» de tu lista?`}
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() =>
          aEliminar &&
          eliminar.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          )
        }
      />
    </div>
  );
}

function DialogoAlimento({
  borrador,
  guardando,
  onCerrar,
  onGuardar,
}: {
  borrador: Borrador | null;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: Borrador) => void;
}) {
  if (!borrador) return null;
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {borrador.id ? "Editar alimento" : "Nuevo alimento"}
          </DialogTitle>
        </DialogHeader>
        <FormularioAlimento
          inicial={borrador}
          guardando={guardando}
          onGuardar={onGuardar}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAlimento({
  inicial,
  guardando,
  onGuardar,
}: {
  inicial: Borrador;
  guardando: boolean;
  onGuardar: (datos: Borrador) => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const puedeGuardar = b.nombre.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={b.nombre}
            onChange={(e) => setB({ ...b, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="marca">Marca</Label>
          <Input
            id="marca"
            value={b.marca}
            onChange={(e) => setB({ ...b, marca: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="calorias">Calorías (100 g)</Label>
          <Input
            id="calorias"
            type="number"
            value={b.caloriasPor100}
            onChange={(e) => setB({ ...b, caloriasPor100: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proteinas">Proteínas (100 g)</Label>
          <Input
            id="proteinas"
            type="number"
            value={b.proteinasPor100}
            onChange={(e) => setB({ ...b, proteinasPor100: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="carbohidratos">Carbohidratos (100 g)</Label>
          <Input
            id="carbohidratos"
            type="number"
            value={b.carbohidratosPor100}
            onChange={(e) =>
              setB({ ...b, carbohidratosPor100: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grasas">Grasas (100 g)</Label>
          <Input
            id="grasas"
            type="number"
            value={b.grasasPor100}
            onChange={(e) => setB({ ...b, grasasPor100: e.target.value })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          disabled={!puedeGuardar || guardando}
          onClick={() => onGuardar(b)}
        >
          Guardar
        </Button>
      </DialogFooter>
    </div>
  );
}
