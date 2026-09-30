"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ImagePlus } from "lucide-react";
import type { AlimentoPropioSalidaDto } from "@/aplicacion/dtos/alimentoPropio.dto";
import {
  CATEGORIAS_ALIMENTO,
  NOMBRES_CATEGORIA_ALIMENTO,
  type CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";
import {
  useAlimentosPropios,
  FUENTE_DE_ORIGEN,
  type OrigenAlimentos,
} from "@/lib/hooks/useAlimentosPropios";
import { mensajeDeError } from "@/lib/errores";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  ImagenAlimento,
  urlImagenAlimento,
} from "@/componentes/comunes/alimentos/ImagenAlimento";

/** Sentinela de «sin categoría» / «todas» (Radix Select no admite value=""). */
const SIN_CATEGORIA = "__ninguna__";

const POR_PAGINA = 10;

interface Borrador {
  id: string | null;
  nombre: string;
  marca: string;
  caloriasPor100: string;
  proteinasPor100: string;
  carbohidratosPor100: string;
  grasasPor100: string;
  /** Una de CATEGORIAS_ALIMENTO, o SIN_CATEGORIA. */
  categoria: string;
  imagenVersion: string | null;
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
    categoria: SIN_CATEGORIA,
    imagenVersion: null,
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
    categoria: a.categoria ?? SIN_CATEGORIA,
    imagenVersion: a.imagenVersion,
  };
}

function formatearMacro(valor: number | null): string {
  return valor != null ? String(valor) : "—";
}

/**
 * Gestión manual de una lista de alimentos: ver, editar y agregar de a uno.
 *
 * Sirve a las tres listas (ver `OrigenAlimentos`): la del consultorio, la
 * predeterminada que gestiona el SUPERADMIN y esa misma vista desde un
 * consultorio, que es de solo lectura —lo que el profesional agrega va a su
 * lista, no a la de todos—.
 *
 * Se muestra aunque la lista esté vacía: agregar de a uno es una forma tan
 * válida de armarla como subir un Excel, y el profesional tiene que poder
 * sumar sus alimentos a los predeterminados sin armar una planilla.
 */
export function ListaAlimentosPropios({
  origen = "consultorio",
}: {
  origen?: OrigenAlimentos;
}) {
  const {
    listar,
    crear,
    actualizar,
    eliminar,
    cambiarImagen,
    usos,
    coincidenciaEnCatalogo,
  } = useAlimentosPropios(origen);
  const soloLectura = origen === "predeterminados";
  const fuente = FUENTE_DE_ORIGEN[origen];
  const [categoria, setCategoria] = useState<string>(SIN_CATEGORIA);

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 300);

  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aEliminar, setAEliminar] = useState<AlimentoPropioSalidaDto | null>(
    null,
  );
  // Dónde se usa el que se va a borrar o editar. Solo informa: los planes y
  // recetas copiaron sus macros y no cambian (migración 85).
  const usosAEliminar = usos(
    { id: aEliminar?.id ?? "" },
    { enabled: aEliminar != null && !soloLectura },
  );
  const usosDelEditado = usos(
    { id: borrador?.id ?? "" },
    { enabled: borrador?.id != null && !soloLectura },
  );

  const consulta = listar({
    pagina,
    porPagina: POR_PAGINA,
    busqueda: busquedaDebounced || undefined,
    categoria:
      categoria === SIN_CATEGORIA
        ? undefined
        : (categoria as CategoriaAlimento),
  });

  const columnasDeDatos: ColumnaTabla<AlimentoPropioSalidaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Nombre",
      render: (a) => (
        <span className="flex items-center gap-2">
          <ImagenAlimento
            url={urlImagenAlimento({ ...a, fuente })}
            nombre={a.nombre}
            className="h-8 w-8"
          />
          <span className="font-medium">{a.nombre}</span>
        </span>
      ),
    },
    {
      clave: "categoria",
      encabezado: "Categoría",
      render: (a) =>
        a.categoria ? NOMBRES_CATEGORIA_ALIMENTO[a.categoria] : "—",
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
  ];
  const columnaAcciones: ColumnaTabla<AlimentoPropioSalidaDto> = {
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
  };
  const columnas = soloLectura
    ? columnasDeDatos
    : [...columnasDeDatos, columnaAcciones];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <Select
          value={categoria}
          onValueChange={(valor) => {
            setCategoria(valor);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_CATEGORIA}>Todas las categorías</SelectItem>
            {CATEGORIAS_ALIMENTO.map((c) => (
              <SelectItem key={c} value={c}>
                {NOMBRES_CATEGORIA_ALIMENTO[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!soloLectura && (
          <Button size="sm" onClick={() => setBorrador(borradorVacio())}>
            <Plus className="h-4 w-4" /> Agregar alimento
          </Button>
        )}
      </div>

      <TablaDatos
        columnas={columnas}
        datos={consulta.data?.alimentos ?? []}
        obtenerClave={(a) => a.id}
        cargando={consulta.isLoading}
        mensajeVacio={
          busquedaDebounced || categoria !== SIN_CATEGORIA
            ? "No hay alimentos que coincidan con la búsqueda."
            : soloLectura
              ? "La plataforma todavía no cargó alimentos predeterminados."
              : "Todavía no hay alimentos. Agregalos de a uno o subí un Excel."
        }
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiarPagina={setPagina}
      />

      <DialogoAlimento
        borrador={borrador}
        guardando={crear.isPending || actualizar.isPending}
        fuente={fuente}
        cambiarImagen={cambiarImagen}
        textoUsos={
          borrador?.id
            ? textoUsos(usosDelEditado.data, origen === "plataforma")
            : null
        }
        buscarCoincidencia={coincidenciaEnCatalogo}
        avisarCoincidencia={origen === "consultorio"}
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
            categoria:
              datos.categoria === SIN_CATEGORIA
                ? null
                : (datos.categoria as CategoriaAlimento),
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
        descripcion={[
          origen === "plataforma"
            ? `¿Eliminar «${aEliminar?.nombre ?? ""}» del catálogo?`
            : `¿Eliminar «${aEliminar?.nombre ?? ""}» de tu lista?`,
          textoUsos(usosAEliminar.data, origen === "plataforma"),
          "Los planes y recetas que ya lo usan no cambian: guardaron una copia de sus macros.",
        ]
          .filter(Boolean)
          .join(" ")}
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

/**
 * «Se usa en 2 planes y 1 receta (de 3 consultorios).», o null si no figura
 * en ninguno. Cuenta solo lo cargado desde la migración 85: antes no se
 * guardaba de qué alimento salía cada copia.
 */
function textoUsos(
  usos:
    | {
        planes: number;
        recetas: number;
        planesSemanales: number;
        recetasPlataforma: number;
        consultorios: number;
      }
    | undefined,
  global: boolean,
): string | null {
  if (!usos) return null;
  const plural = (n: number, uno: string, varios: string) =>
    `${n} ${n === 1 ? uno : varios}`;
  const partes = [
    usos.planes > 0 && plural(usos.planes, "plan", "planes"),
    usos.recetas > 0 && plural(usos.recetas, "receta", "recetas"),
    usos.planesSemanales > 0 &&
      plural(usos.planesSemanales, "plan semanal", "planes semanales"),
    usos.recetasPlataforma > 0 &&
      plural(
        usos.recetasPlataforma,
        "receta de la plataforma",
        "recetas de la plataforma",
      ),
  ].filter((p): p is string => Boolean(p));
  if (partes.length === 0) return null;
  const lista =
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
  const donde =
    global && usos.consultorios > 0
      ? ` (${plural(usos.consultorios, "consultorio", "consultorios")})`
      : "";
  return `Se usa en ${lista}${donde}.`;
}

type BuscarCoincidencia = ReturnType<
  typeof useAlimentosPropios
>["coincidenciaEnCatalogo"];

type CambiarImagen = (
  id: string,
  archivo: File | null,
) => Promise<string | null>;

function DialogoAlimento({
  borrador,
  guardando,
  fuente,
  cambiarImagen,
  textoUsos: usosDelAlimento,
  buscarCoincidencia,
  avisarCoincidencia,
  onCerrar,
  onGuardar,
}: {
  borrador: Borrador | null;
  guardando: boolean;
  fuente: "PROPIO" | "BASE";
  cambiarImagen: CambiarImagen;
  textoUsos: string | null;
  buscarCoincidencia: BuscarCoincidencia;
  avisarCoincidencia: boolean;
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
        {borrador.id ? (
          <ImagenDelAlimento
            id={borrador.id}
            nombre={borrador.nombre}
            fuente={fuente}
            versionInicial={borrador.imagenVersion}
            cambiarImagen={cambiarImagen}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Guardá el alimento para agregarle una imagen.
          </p>
        )}
        {usosDelAlimento && (
          <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
            {usosDelAlimento} Si cambiás los macros, esos planes y recetas
            siguen con los anteriores: guardaron una copia.
          </p>
        )}
        <FormularioAlimento
          buscarCoincidencia={buscarCoincidencia}
          avisarCoincidencia={avisarCoincidencia}
          inicial={borrador}
          guardando={guardando}
          onGuardar={onGuardar}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * La imagen del alimento, que se guarda APARTE del formulario: se sube en el
 * momento (no con «Guardar») porque va por su propia ruta multipart y un
 * alimento nuevo todavía no tiene id. Por eso solo aparece al editar.
 *
 * La versión se lleva en estado local y se actualiza con la respuesta: el
 * borrador del diálogo es una copia congelada y no se enteraría de la imagen
 * nueva (ver «Ojo con las copias congeladas» en AGENTS.md).
 */
function ImagenDelAlimento({
  id,
  nombre,
  fuente,
  versionInicial,
  cambiarImagen,
}: {
  id: string;
  nombre: string;
  fuente: "PROPIO" | "BASE";
  versionInicial: string | null;
  cambiarImagen: CambiarImagen;
}) {
  const [version, setVersion] = useState(versionInicial);
  const [subiendo, setSubiendo] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function cambiar(archivo: File | null) {
    setSubiendo(true);
    try {
      setVersion(await cambiarImagen(id, archivo));
      toast.success(archivo ? "Imagen guardada." : "Imagen quitada.");
    } catch (error) {
      toast.error(mensajeDeError(error, "No se pudo guardar la imagen."));
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <ImagenAlimento
        url={urlImagenAlimento({ id, fuente, imagenVersion: version })}
        nombre={nombre}
        className="h-16 w-16"
      />
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void cambiar(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={subiendo}
          onClick={() => entrada.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {subiendo
            ? "Subiendo…"
            : version
              ? "Cambiar imagen"
              : "Agregar imagen"}
        </Button>
        {version && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={subiendo}
            onClick={() => void cambiar(null)}
          >
            Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG o WebP, hasta 2 MB.
      </p>
    </div>
  );
}

function FormularioAlimento({
  inicial,
  guardando,
  onGuardar,
  buscarCoincidencia,
  avisarCoincidencia,
}: {
  inicial: Borrador;
  guardando: boolean;
  onGuardar: (datos: Borrador) => void;
  buscarCoincidencia: BuscarCoincidencia;
  avisarCoincidencia: boolean;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const puedeGuardar = b.nombre.trim() !== "";

  // En la lista del consultorio: si lo que escribe ya está en la plataforma.
  // Es un aviso y no un bloqueo: su versión, con otros macros, es legítima.
  const nombreRetrasado = useDebounce(b.nombre.trim(), 400);
  const marcaRetrasada = useDebounce(b.marca.trim(), 400);
  const coincidencia = buscarCoincidencia(
    { nombre: nombreRetrasado, marca: marcaRetrasada || null },
    { enabled: avisarCoincidencia && nombreRetrasado.length >= 2 },
  );

  return (
    <div className="space-y-4">
      {coincidencia.data && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
          «{coincidencia.data.etiqueta}» ya está en los alimentos de la
          plataforma. Podés cargar tu propia versión (por ejemplo, con otros
          macros): en tu buscador va a aparecer la tuya en lugar de esa. Si los
          datos son los mismos, no hace falta.
        </p>
      )}
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

      <div className="space-y-1.5">
        <Label htmlFor="categoria">Categoría</Label>
        <Select
          value={b.categoria}
          onValueChange={(valor) => setB({ ...b, categoria: valor })}
        >
          <SelectTrigger id="categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
            {CATEGORIAS_ALIMENTO.map((c) => (
              <SelectItem key={c} value={c}>
                {NOMBRES_CATEGORIA_ALIMENTO[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
