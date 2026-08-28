"use client";

import { useForm } from "react-hook-form";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  NIVELES_ACTIVIDAD,
  REFERENCIAS_PHANTOM,
  TALLA_PHANTOM,
  type NivelActividad,
  type VariablePhantom,
} from "@/dominio/servicios/composicionCorporal";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "@/dominio/servicios/grasaPorPliegues";
import {
  PROTOCOLOS_COMPOSICION,
  type ProtocoloComposicion,
} from "@/dominio/entidades/Antropometria";
import type { CampoPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, hoyISO, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/**
 * Grupos de medidas en el ORDEN DEL PROTOCOLO ISAK: así se carga siguiendo la
 * planilla de papel de la consulta, tabulando de un campo al siguiente sin
 * saltar de sección.
 *
 * `paraMasas` marca las medidas que el fraccionamiento en 5 masas necesita sí
 * o sí. En el protocolo de 2 componentes esas marcas no se muestran: no
 * aplican, y señalar como "falta" algo que no hace falta es ruido.
 */
const GRUPOS = [
  {
    titulo: "Pliegues cutáneos (mm)",
    columnas: "sm:grid-cols-4",
    campos: [
      { nombre: "pliegueTricipital", etiqueta: "Tricipital", paraMasas: true },
      {
        nombre: "pliegueSubescapular",
        etiqueta: "Subescapular",
        paraMasas: true,
      },
      {
        nombre: "pliegueSupraespinal",
        etiqueta: "Supraespinal",
        paraMasas: true,
      },
      { nombre: "pliegueAbdominal", etiqueta: "Abdominal", paraMasas: true },
      { nombre: "pliegueMuslo", etiqueta: "Muslo", paraMasas: true },
      {
        nombre: "plieguePantorrilla",
        etiqueta: "Pantorrilla",
        paraMasas: true,
      },
      { nombre: "pliegueBicipital", etiqueta: "Bicipital", paraMasas: false },
      {
        nombre: "pliegueCrestaIliaca",
        etiqueta: "Cresta ilíaca",
        paraMasas: false,
      },
    ],
  },
  {
    titulo: "Perímetros (cm)",
    columnas: "sm:grid-cols-3",
    campos: [
      { nombre: "circCabeza", etiqueta: "Cabeza", paraMasas: true },
      { nombre: "circBrazo", etiqueta: "Brazo relajado", paraMasas: true },
      {
        nombre: "circBrazoContraido",
        etiqueta: "Brazo flexionado",
        paraMasas: false,
      },
      { nombre: "circAntebrazo", etiqueta: "Antebrazo", paraMasas: true },
      { nombre: "circTorax", etiqueta: "Tórax mesoesternal", paraMasas: true },
      {
        nombre: "circCinturaMinima",
        etiqueta: "Cintura mínima",
        paraMasas: true,
      },
      {
        nombre: "circCinturaMaxima",
        etiqueta: "Cintura máxima",
        paraMasas: false,
      },
      { nombre: "circCadera", etiqueta: "Cadera", paraMasas: false },
      { nombre: "circMusloMaximo", etiqueta: "Muslo máximo", paraMasas: true },
      { nombre: "circMusloMedial", etiqueta: "Muslo medial", paraMasas: false },
      { nombre: "circPantorrilla", etiqueta: "Pantorrilla", paraMasas: true },
    ],
  },
  {
    titulo: "Diámetros óseos (cm)",
    columnas: "sm:grid-cols-3",
    campos: [
      { nombre: "diamBiacromial", etiqueta: "Biacromial", paraMasas: true },
      {
        nombre: "diamToraxTransverso",
        etiqueta: "Tórax transverso",
        paraMasas: true,
      },
      {
        nombre: "diamToraxAnteroposterior",
        etiqueta: "Tórax anteropost.",
        paraMasas: true,
      },
      {
        nombre: "diamBiiliocrestideo",
        etiqueta: "Bi-iliocrestídeo",
        paraMasas: true,
      },
      { nombre: "diamHumeral", etiqueta: "Humeral", paraMasas: true },
      { nombre: "diamFemoral", etiqueta: "Femoral", paraMasas: true },
    ],
  },
] as const;

const ETIQUETAS_ACTIVIDAD: Record<NivelActividad, string> = {
  SEDENTARIA: "Sedentaria",
  LIVIANA: "Liviana",
  MODERADA: "Moderada",
  INTENSA: "Intensa",
  EXTREMADA: "Extremada",
};

const ETIQUETAS_PROTOCOLO: Record<
  ProtocoloComposicion,
  { titulo: string; detalle: string }
> = {
  DOS_COMPONENTES: {
    titulo: "2 componentes (grasa / masa magra)",
    detalle: "Sale con los 6 pliegues. Es el protocolo habitual de consulta.",
  },
  CINCO_COMPONENTES: {
    titulo: "5 componentes (Kerr)",
    detalle: "Perfil ISAK completo: pliegues, perímetros y diámetros.",
  },
};

/** Valor del select cuando el campo quedó sin especificar. */
const SIN_DATO = "SIN_DATO";

const CAMPOS_NUMERICOS = [
  "pesoKg",
  "tallaCm",
  "tallaSentadoCm",
  "kgGrasa",
  ...GRUPOS.flatMap((grupo) => grupo.campos.map((campo) => campo.nombre)),
] as const;

type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number];

type DatosFormulario = Record<CampoNumerico, string> & {
  fecha: string;
  protocolo: ProtocoloComposicion;
  metodoGrasa: MetodoGrasa | typeof SIN_DATO;
  nivelActividad: NivelActividad | typeof SIN_DATO;
  observaciones: string;
};

interface Props {
  pacienteId: string;
  medicionInicial?: MedicionComposicionDto | null;
  /**
   * Campos a mostrar. Null = todos (el perfil completo). Una medición que ya
   * tiene un campo cargado lo muestra aunque la plantilla no lo incluya: si no,
   * editar con otra plantilla escondería un dato sin avisar.
   */
  camposVisibles?: readonly CampoPlantilla[] | null;
  onTerminado: () => void;
}

/**
 * Alta y edición de una medición antropométrica.
 *
 * Solo el peso es obligatorio: lo que quede vacío no rompe nada, el dashboard
 * calcula los bloques que puede e informa qué falta. El protocolo elegido
 * ordena el formulario (en 2 componentes los pliegues van primero y los
 * diámetros quedan plegados), pero NO limita lo que se guarda ni lo que se
 * calcula después.
 */
export function FormularioMedicion({
  pacienteId,
  medicionInicial,
  camposVisibles = null,
  onTerminado,
}: Props) {
  const { registrarAntropometria, actualizarAntropometria } = useEvaluacion();
  const editando = Boolean(medicionInicial);
  const medidas = medicionInicial?.medidas;

  const form = useForm<DatosFormulario>({
    defaultValues: {
      fecha: medicionInicial ? aFechaISO(medicionInicial.fecha) : hoyISO(),
      protocolo: medicionInicial?.protocolo ?? "DOS_COMPONENTES",
      metodoGrasa: medicionInicial?.metodoGrasa ?? SIN_DATO,
      nivelActividad: medicionInicial?.nivelActividad ?? SIN_DATO,
      observaciones: medicionInicial?.observaciones ?? "",
      ...(Object.fromEntries(
        CAMPOS_NUMERICOS.map((campo) => [campo, aTexto(medidas?.[campo])]),
      ) as Record<CampoNumerico, string>),
    },
  });

  const protocolo = form.watch("protocolo");
  const tallaCm = aNumeroONull(form.watch("tallaCm"));

  /**
   * ¿Se muestra este campo? Lo decide la plantilla, salvo que la medición que
   * se está editando ya lo tenga cargado: esconder un valor existente sería
   * perderlo de vista sin que nadie lo haya borrado.
   */
  const visible = (campo: CampoNumerico): boolean => {
    if (camposVisibles == null) return true;
    if (medidas?.[campo] != null) return true;
    return (camposVisibles as readonly string[]).includes(campo);
  };
  const enviando =
    registrarAntropometria.isPending || actualizarAntropometria.isPending;

  function alEnviar(datos: DatosFormulario) {
    const peso = aNumeroONull(datos.pesoKg);
    if (peso == null) {
      form.setError("pesoKg", { message: "El peso es obligatorio" });
      return;
    }

    const numericos = Object.fromEntries(
      CAMPOS_NUMERICOS.filter((campo) => campo !== "pesoKg").map((campo) => [
        campo,
        aNumeroONull(datos[campo]),
      ]),
    );

    const base = {
      fecha: new Date(datos.fecha),
      pesoKg: peso,
      protocolo: datos.protocolo,
      metodoGrasa: datos.metodoGrasa === SIN_DATO ? null : datos.metodoGrasa,
      nivelActividad:
        datos.nivelActividad === SIN_DATO ? null : datos.nivelActividad,
      observaciones: datos.observaciones.trim() || null,
      ...numericos,
    };

    if (medicionInicial) {
      actualizarAntropometria.mutate(
        { id: medicionInicial.id, ...base },
        { onSuccess: onTerminado },
      );
    } else {
      registrarAntropometria.mutate(
        { pacienteId, ...base },
        { onSuccess: onTerminado },
      );
    }
  }

  const campoNumerico = (
    nombre: CampoNumerico,
    etiqueta: string,
    paraMasas = false,
  ) =>
    !visible(nombre) ? null : (
    <CampoMedida
      key={nombre}
      nombre={nombre}
      etiqueta={etiqueta}
      // La marca de "necesaria para las 5 masas" solo tiene sentido en ese
      // protocolo; en 2 componentes sería una exigencia inventada.
      marcada={paraMasas && protocolo === "CINCO_COMPONENTES"}
      valor={form.watch(nombre)}
      tallaCm={tallaCm}
      registro={form.register(nombre)}
    />
    );

  // En 2 componentes los diámetros no participan de ningún cálculo: se
  // muestran al final y con el aviso, para no estorbar la carga habitual.
  const gruposOrdenados = (
    protocolo === "CINCO_COMPONENTES" ? [...GRUPOS].reverse() : GRUPOS
  )
    // Un grupo cuyos campos quedaron todos fuera de la plantilla no se dibuja:
    // un encabezado sin campos debajo solo ocupa lugar.
    .map((grupo) => ({
      ...grupo,
      campos: grupo.campos.filter((campo) => visible(campo.nombre)),
    }))
    .filter((grupo) => grupo.campos.length > 0);

  return (
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Protocolo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROTOCOLOS_COMPOSICION.map((opcion) => {
            const activo = protocolo === opcion;
            return (
              <button
                key={opcion}
                type="button"
                onClick={() => form.setValue("protocolo", opcion)}
                aria-pressed={activo}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  activo ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <p className="text-sm font-medium">
                  {ETIQUETAS_PROTOCOLO[opcion].titulo}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ETIQUETAS_PROTOCOLO[opcion].detalle}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Elegir uno no descarta el otro: se guarda todo lo que cargues y se
          calcula todo lo que las medidas permitan. El protocolo define qué se
          muestra primero en el dashboard.
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Datos básicos</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="fecha" className="text-xs">
              Fecha de consulta
            </Label>
            <Input id="fecha" type="date" {...form.register("fecha")} />
          </div>
          {campoNumerico("pesoKg", "Peso (kg) *")}
          {campoNumerico("tallaCm", "Talla (cm)", true)}
          {campoNumerico("tallaSentadoCm", "Talla sentado (cm)", true)}
        </div>
        {form.formState.errors.pesoKg && (
          <p className="text-sm text-destructive">
            {form.formState.errors.pesoKg.message}
          </p>
        )}
        {tallaCm == null && (
          <p className="text-[11px] text-muted-foreground">
            Cargá la talla y cada medida va a mostrar su Score-Z contra el
            humano de referencia Phantom mientras la escribís.
          </p>
        )}
      </fieldset>

      {gruposOrdenados.map((grupo) => (
        <fieldset key={grupo.titulo} className="space-y-2">
          <legend className="text-sm font-semibold">
            {grupo.titulo}
            {protocolo === "DOS_COMPONENTES" &&
              grupo.titulo.startsWith("Diámetros") && (
                <span className="ml-2 font-normal text-muted-foreground">
                  — solo para el fraccionamiento en 5 masas
                </span>
              )}
          </legend>
          <div className={`grid grid-cols-2 gap-3 ${grupo.columnas}`}>
            {grupo.campos.map((campo) =>
              campoNumerico(campo.nombre, campo.etiqueta, campo.paraMasas),
            )}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Contexto y método</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Ecuación de grasa a destacar</Label>
            <Select
              value={form.watch("metodoGrasa")}
              onValueChange={(valor) =>
                form.setValue(
                  "metodoGrasa",
                  valor as MetodoGrasa | typeof SIN_DATO,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_DATO}>
                  Automática (la primera disponible)
                </SelectItem>
                {METODOS_GRASA.map((metodo) => (
                  <SelectItem key={metodo} value={metodo}>
                    {DEFINICIONES_METODO[metodo].etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {form.watch("metodoGrasa") === SIN_DATO
                ? "Se calculan todas igual; esta solo elige cuál va grande en el dashboard."
                : DEFINICIONES_METODO[form.watch("metodoGrasa") as MetodoGrasa]
                    .poblacion}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nivel de actividad física</Label>
            <Select
              value={form.watch("nivelActividad")}
              onValueChange={(valor) =>
                form.setValue(
                  "nivelActividad",
                  valor as NivelActividad | typeof SIN_DATO,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_DATO}>Sin especificar</SelectItem>
                {NIVELES_ACTIVIDAD.map((nivel) => (
                  <SelectItem key={nivel} value={nivel}>
                    {ETIQUETAS_ACTIVIDAD[nivel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Multiplica el metabolismo basal para el gasto energético total.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {campoNumerico("kgGrasa", "Kg grasa (fórmula propia)")}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="observaciones" className="text-xs">
          Observaciones
        </Label>
        <Textarea
          id="observaciones"
          rows={2}
          {...form.register("observaciones")}
        />
      </div>

      {protocolo === "CINCO_COMPONENTES" && (
        <p className="text-xs text-muted-foreground">
          Las medidas marcadas con «·» son las que necesita el fraccionamiento
          en 5 masas.
        </p>
      )}

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
            : editando
              ? "Guardar cambios"
              : "Registrar medición"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Un campo de medida con su Score-Z en vivo.
 *
 * El Z se calcula acá y no en el dominio a propósito: la presentación no
 * importa funciones de dominio. Lo que sí viene del dominio es la TABLA de
 * referencia (media y desvío del Phantom) y la talla de referencia, que son
 * constantes — vocabulario compartido. La cuenta es la del modelo: llevar la
 * medida a 170,18 cm y expresarla en desvíos.
 */
function CampoMedida({
  nombre,
  etiqueta,
  marcada,
  valor,
  tallaCm,
  registro,
}: {
  nombre: string;
  etiqueta: string;
  marcada: boolean;
  valor: string;
  tallaCm: number | null;
  registro: ReturnType<ReturnType<typeof useForm<DatosFormulario>>["register"]>;
}) {
  const scoreZ = calcularScoreZ(nombre, valor, tallaCm);

  return (
    <div className="space-y-1">
      <Label htmlFor={nombre} className="flex items-baseline gap-1 text-xs">
        <span className="truncate">{etiqueta}</span>
        {marcada && (
          <span
            className="text-muted-foreground"
            title="Necesaria para el fraccionamiento en 5 masas"
          >
            ·
          </span>
        )}
      </Label>
      <Input id={nombre} inputMode="decimal" placeholder="—" {...registro} />
      <p
        className={cn(
          "h-4 text-[11px] tabular-nums",
          scoreZ == null
            ? "text-transparent"
            : Math.abs(scoreZ) >= 2
              ? "font-medium text-foreground"
              : "text-muted-foreground",
        )}
      >
        {scoreZ == null
          ? "·"
          : `Z ${scoreZ > 0 ? "+" : ""}${formatearNumero(scoreZ)}${
              Math.abs(scoreZ) >= 2 ? " ⚑" : ""
            }`}
      </p>
    </div>
  );
}

/**
 * Score-Z Phantom de una medida: cuántos desvíos estándar la separan del
 * humano de referencia una vez escalada a 170,18 cm. Null si la variable no
 * tiene referencia, si falta la talla o si el valor todavía no es un número.
 */
function calcularScoreZ(
  nombre: string,
  valor: string,
  tallaCm: number | null,
): number | null {
  if (tallaCm == null || tallaCm <= 0) return null;
  const referencia = REFERENCIAS_PHANTOM[nombre as VariablePhantom];
  if (referencia == null) return null;

  const medida = aNumeroONull(valor);
  if (medida == null || medida <= 0) return null;

  const k = TALLA_PHANTOM / tallaCm;
  const factor =
    referencia.escala === "cubica"
      ? k ** 3
      : referencia.escala === "cabeza"
        ? 1
        : k;
  const z = (medida * factor - referencia.media) / referencia.desvio;
  return Math.round(z * 100) / 100;
}

function aTexto(valor: number | null | undefined): string {
  return valor == null ? "" : String(valor);
}

/** "" → null; "12,5" o "12.5" → 12,5 (acepta coma decimal, como la planilla). */
function aNumeroONull(valor: string | null | undefined): number | null {
  const limpio = (valor ?? "").trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}
