"use client";

import { useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Flag,
  Mountain,
  Target,
  ListChecks,
  Utensils,
} from "lucide-react";
import {
  ETIQUETA_MODALIDAD_CARRERA,
  MODALIDADES_CARRERA,
  type ModalidadCarrera,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { BuscadorAlimento } from "@/componentes/comunes/alimentos/BuscadorAlimento";
import { CampoCantidadAlimento } from "@/componentes/comunes/alimentos/CampoCantidadAlimento";
import {
  cantidadDesdeAlimento,
  porCien,
} from "@/componentes/comunes/alimentos/cantidad";
import {
  aNumero,
  calcularTotales,
} from "@/componentes/comunes/alimentos/macros";
import {
  alimentoVacio,
  claveNueva,
  erroresDelFormulario,
  ingestaVacia,
  minutoDeIngesta,
  minutosDesdeTexto,
  paraGuardar,
  textoDeMinutos,
  type AlimentoFormulario,
  type ContenidoParaGuardar,
  type FormularioPlanificacion as Formulario,
  type IngestaFormulario,
} from "./formulario/esquema";
import {
  cafeinaDeIngestaEnFormulario,
  horaDelDia,
  liquidosDeIngestaEnFormulario,
  resumenEnVivo,
} from "./formulario/resumen";
import { TarjetaResumen, numero, textoRitmo } from "./presentacion";

interface Props {
  inicial: Formulario;
  guardando: boolean;
  onGuardar: (contenido: ContenidoParaGuardar) => void;
  onCancelar: () => void;
  /** Arriba de todo: a quién / para qué competencia, cuando se crea desde la ficha. */
  encabezado?: ReactNode;
}

/** Cada cuánto se sugiere la ingesta siguiente al agregar o repetir una. */
const INTERVALO_SUGERIDO_MIN = 30;

/**
 * El editor de una planificación de CARRERA (running y trail, migración 94):
 * los datos de la carrera, los objetivos por hora y la línea de tiempo de
 * ingestas, con los alimentos de la base (incluidos los geles y las bebidas
 * isotónicas, que son categorías de alimentos como cualquier otra).
 *
 * El momento de cada ingesta se escribe como TIEMPO DE CARRERA («0:45»): es
 * lo que el corredor ve en el reloj. Con la hora de largada, al lado aparece
 * la hora del día. Lo de antes de largar se marca aparte y no suma a los
 * valores por hora.
 *
 * El estado es local: es un documento que se arma y se guarda entero, como el
 * plan semanal. El resumen se calcula en vivo con el espejo del dominio
 * (`formulario/resumen.ts`); al guardar, manda el servidor.
 */
export function FormularioPlanificacion({
  inicial,
  guardando,
  onGuardar,
  onCancelar,
  encabezado,
}: Props) {
  const [f, setF] = useState<Formulario>(inicial);
  const [errores, setErrores] = useState<string[]>([]);
  const resumen = resumenEnVivo(f);
  const duracion = minutosDesdeTexto(f.duracion);
  const distancia = aNumero(f.distanciaKm);
  const ritmo =
    duracion != null && distancia != null && distancia > 0
      ? textoRitmo(duracion / distancia)
      : null;

  function cambiar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((actual) => ({ ...actual, [campo]: valor }));
  }

  function cambiarIngesta(clave: string, cambios: Partial<IngestaFormulario>) {
    setF((actual) => ({
      ...actual,
      ingestas: actual.ingestas.map((i) =>
        i.clave === clave ? { ...i, ...cambios } : i,
      ),
    }));
  }

  function agregarIngesta() {
    const minutos = f.ingestas
      .map(minutoDeIngesta)
      .filter((m): m is number => m != null);
    const siguiente =
      minutos.length > 0
        ? Math.max(...minutos) + INTERVALO_SUGERIDO_MIN
        : INTERVALO_SUGERIDO_MIN;
    const tope = duracion ?? siguiente;
    cambiar("ingestas", [
      ...f.ingestas,
      ingestaVacia(Math.min(siguiente, tope)),
    ]);
  }

  /** La misma ingesta, un intervalo después: un gel cada media hora. */
  function repetirIngesta(ingesta: IngestaFormulario) {
    const minuto = minutoDeIngesta(ingesta) ?? 0;
    const siguiente = minuto + INTERVALO_SUGERIDO_MIN;
    const copia: IngestaFormulario = {
      ...ingesta,
      clave: claveNueva(),
      antesDeLargar: siguiente < 0,
      tiempo: textoDeMinutos(Math.abs(siguiente)),
      km: "",
      alimentos: ingesta.alimentos.map((a) => ({ ...a })),
    };
    const indice = f.ingestas.findIndex((i) => i.clave === ingesta.clave);
    const ingestas = [...f.ingestas];
    ingestas.splice(indice + 1, 0, copia);
    cambiar("ingestas", ingestas);
  }

  function quitarIngesta(clave: string) {
    cambiar(
      "ingestas",
      f.ingestas.filter((i) => i.clave !== clave),
    );
  }

  /** Deja la lista en orden de tiempo, como la va a guardar el servidor. */
  function ordenarIngestas() {
    cambiar(
      "ingestas",
      [...f.ingestas].sort(
        (a, b) =>
          (minutoDeIngesta(a) ?? Number.MAX_SAFE_INTEGER) -
          (minutoDeIngesta(b) ?? Number.MAX_SAFE_INTEGER),
      ),
    );
  }

  function guardar() {
    const encontrados = erroresDelFormulario(f);
    setErrores(encontrados);
    if (encontrados.length > 0) return;
    onGuardar(paraGuardar(f));
  }

  return (
    <div className="space-y-4">
      {encabezado}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" /> La carrera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <Campo etiqueta="Nombre de la planificación" id="nombre">
              <Input
                id="nombre"
                maxLength={120}
                placeholder="Maratón de Buenos Aires — 3:30"
                value={f.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Modalidad" id="modalidad">
              <Select
                value={f.modalidad}
                onValueChange={(v) =>
                  cambiar("modalidad", v as ModalidadCarrera)
                }
              >
                <SelectTrigger id="modalidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES_CARRERA.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ETIQUETA_MODALIDAD_CARRERA[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo etiqueta="Distancia (km)" id="distancia">
              <Input
                id="distancia"
                inputMode="decimal"
                placeholder="42,2"
                value={f.distanciaKm}
                onChange={(e) => cambiar("distanciaKm", e.target.value)}
              />
            </Campo>
            <Campo
              etiqueta="Duración estimada (h:mm)"
              id="duracion"
              ayuda={ritmo ? `Ritmo: ${ritmo}` : undefined}
            >
              <Input
                id="duracion"
                placeholder="3:30"
                value={f.duracion}
                onChange={(e) => cambiar("duracion", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Hora de largada" id="largada">
              <Input
                id="largada"
                type="time"
                value={f.horaLargada}
                onChange={(e) => cambiar("horaLargada", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Temperatura (°C)" id="temperatura">
              <Input
                id="temperatura"
                inputMode="decimal"
                placeholder="18"
                value={f.temperaturaEstimadaC}
                onChange={(e) =>
                  cambiar("temperaturaEstimadaC", e.target.value)
                }
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo
              etiqueta="Desnivel positivo (m)"
              id="desnivel-positivo"
              icono={<Mountain className="h-3.5 w-3.5" />}
            >
              <Input
                id="desnivel-positivo"
                inputMode="numeric"
                placeholder={f.modalidad === "TRAIL" ? "1800" : "—"}
                value={f.desnivelPositivoM}
                onChange={(e) => cambiar("desnivelPositivoM", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Desnivel negativo (m)" id="desnivel-negativo">
              <Input
                id="desnivel-negativo"
                inputMode="numeric"
                placeholder={f.modalidad === "TRAIL" ? "1800" : "—"}
                value={f.desnivelNegativoM}
                onChange={(e) => cambiar("desnivelNegativoM", e.target.value)}
              />
            </Campo>
          </div>

          <Campo etiqueta="Descripción (opcional)" id="descripcion">
            <Textarea
              id="descripcion"
              rows={2}
              placeholder="Objetivo de la carrera, cómo viene el entrenamiento, consideraciones generales…"
              value={f.descripcion}
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Objetivos por hora de
            carrera
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Carbohidratos (g/h)" id="obj-carbohidratos">
            <Input
              id="obj-carbohidratos"
              inputMode="decimal"
              placeholder="60"
              value={f.carbohidratosObjetivoGH}
              onChange={(e) =>
                cambiar("carbohidratosObjetivoGH", e.target.value)
              }
            />
          </Campo>
          <Campo etiqueta="Líquidos (ml/h)" id="obj-liquidos">
            <Input
              id="obj-liquidos"
              inputMode="numeric"
              placeholder="500"
              value={f.liquidosObjetivoMlH}
              onChange={(e) => cambiar("liquidosObjetivoMlH", e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Sodio (mg/h)"
            id="obj-sodio"
            ayuda="Informativo: los alimentos no traen sodio."
          >
            <Input
              id="obj-sodio"
              inputMode="numeric"
              placeholder="500"
              value={f.sodioObjetivoMgH}
              onChange={(e) => cambiar("sodioObjetivoMgH", e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Peso del deportista (kg)"
            id="peso"
            ayuda="Para la cafeína en mg/kg."
          >
            <Input
              id="peso"
              inputMode="decimal"
              placeholder="70"
              value={f.pesoReferenciaKg}
              onChange={(e) => cambiar("pesoReferenciaKg", e.target.value)}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-primary" /> Ingestas
          </CardTitle>
          <div className="flex gap-2">
            {f.ingestas.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={ordenarIngestas}
              >
                <ListChecks className="h-4 w-4" /> Ordenar por tiempo
              </Button>
            )}
            <Button type="button" size="sm" onClick={agregarIngesta}>
              <Plus className="h-4 w-4" /> Agregar ingesta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <TarjetaResumen
            resumen={resumen}
            objetivos={{
              carbohidratosGH: aNumero(f.carbohidratosObjetivoGH),
              liquidosMlH: aNumero(f.liquidosObjetivoMlH),
              sodioMgH: aNumero(f.sodioObjetivoMgH),
            }}
            pesoKg={aNumero(f.pesoReferenciaKg)}
          />

          {f.ingestas.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Todavía no hay ingestas. Agregá la primera —un gel a los 0:45, un
              trago de isotónica en el puesto del km 10— y repetila las veces
              que haga falta.
            </p>
          ) : (
            <ol className="space-y-3">
              {f.ingestas.map((ingesta, indice) => (
                <EditorIngesta
                  key={ingesta.clave}
                  numero={indice + 1}
                  ingesta={ingesta}
                  horaLargada={f.horaLargada}
                  duracion={duracion}
                  distancia={distancia}
                  modalidad={f.modalidad}
                  onCambiar={(cambios) =>
                    cambiarIngesta(ingesta.clave, cambios)
                  }
                  onRepetir={() => repetirIngesta(ingesta)}
                  onQuitar={() => quitarIngesta(ingesta.clave)}
                />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Antes y después</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Campo etiqueta="Estrategia previa" id="previa">
            <Textarea
              id="previa"
              rows={3}
              placeholder="Carga de carbohidratos los días previos, cena y desayuno del día de la carrera…"
              value={f.estrategiaPrevia}
              onChange={(e) => cambiar("estrategiaPrevia", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Puestos de abastecimiento" id="puestos">
            <Textarea
              id="puestos"
              rows={2}
              placeholder="Agua cada 5 km; isotónica en los km 15, 25 y 35…"
              value={f.puestosAbastecimiento}
              onChange={(e) => cambiar("puestosAbastecimiento", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Recuperación" id="recuperacion">
            <Textarea
              id="recuperacion"
              rows={2}
              placeholder="Qué tomar y comer después de la llegada…"
              value={f.recuperacion}
              onChange={(e) => cambiar("recuperacion", e.target.value)}
            />
          </Campo>
        </CardContent>
      </Card>

      {errores.length > 0 && (
        <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" disabled={guardando} onClick={guardar}>
          <Save className="h-4 w-4" />
          {guardando ? "Guardando…" : "Guardar planificación"}
        </Button>
      </div>
    </div>
  );
}

function EditorIngesta({
  numero: posicion,
  ingesta,
  horaLargada,
  duracion,
  distancia,
  modalidad,
  onCambiar,
  onRepetir,
  onQuitar,
}: {
  numero: number;
  ingesta: IngestaFormulario;
  horaLargada: string;
  duracion: number | null;
  distancia: number | null;
  modalidad: ModalidadCarrera;
  onCambiar: (cambios: Partial<IngestaFormulario>) => void;
  onRepetir: () => void;
  onQuitar: () => void;
}) {
  const minuto = minutoDeIngesta(ingesta);
  const hora = horaDelDia(horaLargada, minuto);
  const despuesDeLlegar =
    minuto != null && duracion != null && minuto > duracion;
  // A ritmo parejo, en calle: el km aproximado, como guía para el km real.
  const kmEstimado =
    modalidad === "CALLE" &&
    minuto != null &&
    minuto >= 0 &&
    duracion != null &&
    duracion > 0 &&
    distancia != null
      ? Math.round((minuto / duracion) * distancia * 10) / 10
      : null;
  const macros = calcularTotales(ingesta.alimentos);
  const liquidos = liquidosDeIngestaEnFormulario(ingesta);
  const cafeina = cafeinaDeIngestaEnFormulario(ingesta);

  function cambiarAlimento(
    indice: number,
    cambios: Partial<AlimentoFormulario>,
  ) {
    onCambiar({
      alimentos: ingesta.alimentos.map((a, i) =>
        i === indice ? { ...a, ...cambios } : a,
      ),
    });
  }

  return (
    <li className="rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <span className="flex h-9 w-7 items-center justify-center text-sm font-semibold text-muted-foreground">
          {posicion}
        </span>
        <div className="space-y-1">
          <Label htmlFor={`cuando-${ingesta.clave}`} className="text-xs">
            Momento
          </Label>
          <Select
            value={ingesta.antesDeLargar ? "antes" : "durante"}
            onValueChange={(v) => onCambiar({ antesDeLargar: v === "antes" })}
          >
            <SelectTrigger id={`cuando-${ingesta.clave}`} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="durante">De carrera</SelectItem>
              <SelectItem value="antes">Antes de largar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tiempo-${ingesta.clave}`} className="text-xs">
            {ingesta.antesDeLargar ? "Cuánto antes (h:mm)" : "Tiempo (h:mm)"}
          </Label>
          <Input
            id={`tiempo-${ingesta.clave}`}
            className="w-24"
            placeholder="0:45"
            value={ingesta.tiempo}
            onChange={(e) => onCambiar({ tiempo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`km-${ingesta.clave}`} className="text-xs">
            Km (opcional)
          </Label>
          <Input
            id={`km-${ingesta.clave}`}
            className="w-24"
            inputMode="decimal"
            placeholder={kmEstimado != null ? `≈ ${numero(kmEstimado)}` : "—"}
            value={ingesta.km}
            onChange={(e) => onCambiar({ km: e.target.value })}
          />
        </div>
        <div className="pb-2 text-xs text-muted-foreground">
          {minuto == null
            ? "Tiempo inválido"
            : hora
              ? `${hora} h`
              : "Sin hora de largada"}
        </div>
        <div className="ml-auto flex gap-1 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Repetir media hora después"
            aria-label="Repetir media hora después"
            onClick={onRepetir}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Quitar ingesta"
            aria-label="Quitar ingesta"
            onClick={onQuitar}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {despuesDeLlegar && (
        <p className="mt-2 text-xs text-destructive">
          Cae después de la llegada estimada. Lo de después de llegar va en
          «Recuperación».
        </p>
      )}

      <div className="mt-3 space-y-2">
        {ingesta.alimentos.map((alimento, i) => (
          <div key={i} className="rounded-md border border-dashed p-2">
            <div className="flex flex-wrap items-start gap-2">
              <Input
                className="min-w-40 flex-1"
                placeholder="Alimento"
                aria-label="Alimento"
                value={alimento.nombre}
                onChange={(e) => cambiarAlimento(i, { nombre: e.target.value })}
              />
              <CampoCantidadAlimento
                className="w-44 shrink-0 sm:w-52"
                altoCompacto={false}
                valor={alimento}
                unidadEditable={!alimento.alimentoOrigenId}
                onCambiar={(nuevo) => cambiarAlimento(i, nuevo)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar alimento"
                className="shrink-0"
                onClick={() =>
                  onCambiar({
                    alimentos: ingesta.alimentos.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 pr-10 sm:grid-cols-5">
              {(
                [
                  ["caloriasPor100", `kcal/${porCien(alimento.unidadBase)}`],
                  ["proteinasPor100", `P/${porCien(alimento.unidadBase)}`],
                  ["carbohidratosPor100", `C/${porCien(alimento.unidadBase)}`],
                  ["grasasPor100", `G/${porCien(alimento.unidadBase)}`],
                  ["cafeinaPor100", `Caf. mg/${porCien(alimento.unidadBase)}`],
                ] as const
              ).map(([campo, etiqueta]) => (
                <div key={campo} className="space-y-1">
                  <span className="text-[0.65rem] text-muted-foreground">
                    {etiqueta}
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="—"
                    aria-label={etiqueta}
                    className="h-8"
                    value={alimento[campo]}
                    onChange={(e) =>
                      cambiarAlimento(i, { [campo]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <BuscadorAlimento
            textoBoton="Agregar alimento"
            onElegir={(a) =>
              onCambiar({
                alimentos: [
                  ...ingesta.alimentos,
                  {
                    ...alimentoVacio(),
                    nombre: a.marca ? `${a.nombre} (${a.marca})` : a.nombre,
                    ...cantidadDesdeAlimento(a),
                    caloriasPor100: textoDe(a.caloriasPor100),
                    proteinasPor100: textoDe(a.proteinasPor100),
                    carbohidratosPor100: textoDe(a.carbohidratosPor100),
                    grasasPor100: textoDe(a.grasasPor100),
                    cafeinaPor100: textoDe(a.cafeinaPor100),
                    fuente: a.fuente ?? "MANUAL",
                    referenciaExterna: a.referenciaExterna ?? "",
                    alimentoOrigenId: a.id ?? "",
                  },
                ],
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onCambiar({ alimentos: [...ingesta.alimentos, alimentoVacio()] })
            }
          >
            <Plus className="h-4 w-4" /> A mano
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {[
              macros.carbohidratosG != null &&
                `${numero(macros.carbohidratosG)} g C`,
              macros.calorias != null && `${macros.calorias} kcal`,
              liquidos != null && `${liquidos} ml`,
              cafeina != null && `${numero(cafeina)} mg cafeína`,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin macros"}
          </span>
        </div>

        <Input
          placeholder="Indicaciones (opcional): con 150 ml de agua, en el puesto del km 21…"
          aria-label="Indicaciones de la ingesta"
          value={ingesta.notas}
          onChange={(e) => onCambiar({ notas: e.target.value })}
        />
      </div>
    </li>
  );
}

function Campo({
  etiqueta,
  id,
  ayuda,
  icono,
  children,
}: {
  etiqueta: string;
  id: string;
  ayuda?: string;
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1">
        {icono}
        {etiqueta}
      </Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

function textoDe(valor: number | null | undefined): string {
  return valor == null ? "" : String(valor);
}
