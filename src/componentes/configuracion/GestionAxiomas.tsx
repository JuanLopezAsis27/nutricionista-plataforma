"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, BookText } from "lucide-react";
import type { AxiomaSalidaDto } from "@/aplicacion/dtos/axioma.dto";
import { useAxiomas } from "@/lib/hooks/useAxiomas";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent } from "@/componentes/ui/card";
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
  DialogFooter,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

const AMBITOS = [
  { valor: "SUENO", etiqueta: "Sueño" },
  { valor: "HIDRATACION", etiqueta: "Hidratación" },
  { valor: "ACTIVIDAD", etiqueta: "Actividad" },
  { valor: "PESO", etiqueta: "Peso" },
  { valor: "MACRO", etiqueta: "Macros" },
  { valor: "GENERAL", etiqueta: "General" },
] as const;

const OPERADORES = [
  { valor: "MAYOR_IGUAL", etiqueta: "≥ (al menos)" },
  { valor: "MENOR_IGUAL", etiqueta: "≤ (como máximo)" },
  { valor: "ENTRE", etiqueta: "Entre (rango)" },
  { valor: "INFORMATIVO", etiqueta: "Informativo (no se mide)" },
] as const;

const ETIQUETA_AMBITO: Record<string, string> = Object.fromEntries(
  AMBITOS.map((a) => [a.valor, a.etiqueta]),
);

type Ambito = (typeof AMBITOS)[number]["valor"];
type Operador = (typeof OPERADORES)[number]["valor"];

interface Borrador {
  id: string | null;
  ambito: Ambito;
  parametro: string;
  operador: Operador;
  valor: string;
  valorMax: string;
  unidad: string;
  texto: string;
  activo: boolean;
}

function borradorVacio(): Borrador {
  return {
    id: null,
    ambito: "SUENO",
    parametro: "",
    operador: "MAYOR_IGUAL",
    valor: "",
    valorMax: "",
    unidad: "",
    texto: "",
    activo: true,
  };
}

function aBorrador(a: AxiomaSalidaDto): Borrador {
  return {
    id: a.id,
    ambito: a.ambito,
    parametro: a.parametro,
    operador: a.operador,
    valor: a.valor != null ? String(a.valor) : "",
    valorMax: a.valorMax != null ? String(a.valorMax) : "",
    unidad: a.unidad ?? "",
    texto: a.texto,
    activo: a.activo,
  };
}

/** Gestión de la base de conocimiento: lista de axiomas + alta/edición/baja. */
export function GestionAxiomas() {
  const { listar, crear, actualizar, eliminar } = useAxiomas();
  const consulta = listar();
  const axiomas = consulta.data ?? [];

  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aEliminar, setAEliminar] = useState<AxiomaSalidaDto | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reglas sobre el comportamiento óptimo. Miden el progreso del paciente
          y, a futuro, guían a la IA.
        </p>
        <Button size="sm" onClick={() => setBorrador(borradorVacio())}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : axiomas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay axiomas cargados.
        </p>
      ) : (
        <div className="space-y-2">
          {axiomas.map((a) => (
            <Card key={a.id} className={a.activo ? "" : "opacity-60"}>
              <CardContent className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <BookText className="h-3 w-3" />
                      {ETIQUETA_AMBITO[a.ambito] ?? a.ambito}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.parametro}
                      {a.operador !== "INFORMATIVO" && a.valor != null
                        ? ` · ${a.operador === "MENOR_IGUAL" ? "≤" : a.operador === "ENTRE" ? `${a.valor}–${a.valorMax}` : "≥"} ${a.operador === "ENTRE" ? "" : a.valor}${a.unidad ?? ""}`
                        : " · informativo"}
                    </span>
                    {!a.activo && <Badge variant="outline">Inactivo</Badge>}
                  </div>
                  <p className="text-sm leading-snug">{a.texto}</p>
                </div>
                <div className="flex shrink-0 gap-0.5">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DialogoAxioma
        borrador={borrador}
        guardando={crear.isPending || actualizar.isPending}
        onCerrar={() => setBorrador(null)}
        onGuardar={(datos) => {
          const payload = {
            ambito: datos.ambito,
            parametro: datos.parametro.trim(),
            operador: datos.operador,
            valor: datos.valor.trim() === "" ? null : Number(datos.valor),
            valorMax:
              datos.valorMax.trim() === "" ? null : Number(datos.valorMax),
            unidad: datos.unidad.trim() || null,
            texto: datos.texto.trim(),
            activo: datos.activo,
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
        titulo="Eliminar axioma"
        descripcion={`¿Eliminar «${aEliminar?.texto ?? ""}»? Dejará de medir el tracking de los pacientes.`}
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

function DialogoAxioma({
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
            {borrador.id ? "Editar axioma" : "Nuevo axioma"}
          </DialogTitle>
        </DialogHeader>
        <FormularioAxioma
          inicial={borrador}
          guardando={guardando}
          onGuardar={onGuardar}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAxioma({
  inicial,
  guardando,
  onGuardar,
}: {
  inicial: Borrador;
  guardando: boolean;
  onGuardar: (datos: Borrador) => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const numerico = b.operador !== "INFORMATIVO";
  const puedeGuardar =
    b.parametro.trim() !== "" &&
    b.texto.trim() !== "" &&
    (!numerico || b.valor.trim() !== "") &&
    (b.operador !== "ENTRE" || b.valorMax.trim() !== "");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Ámbito</Label>
          <Select
            value={b.ambito}
            onValueChange={(v) => setB({ ...b, ambito: v as Ambito })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMBITOS.map((a) => (
                <SelectItem key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parametro">Parámetro</Label>
          <Input
            id="parametro"
            placeholder="horasSueno, aguaMl, actividadMinutosDia…"
            value={b.parametro}
            onChange={(e) => setB({ ...b, parametro: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Condición</Label>
          <Select
            value={b.operador}
            onValueChange={(v) => setB({ ...b, operador: v as Operador })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERADORES.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unidad">Unidad</Label>
          <Input
            id="unidad"
            placeholder="h, ml, min…"
            value={b.unidad}
            onChange={(e) => setB({ ...b, unidad: e.target.value })}
          />
        </div>
      </div>

      {numerico && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="valor">
              {b.operador === "ENTRE" ? "Mínimo" : "Valor"}
            </Label>
            <Input
              id="valor"
              type="number"
              value={b.valor}
              onChange={(e) => setB({ ...b, valor: e.target.value })}
            />
          </div>
          {b.operador === "ENTRE" && (
            <div className="space-y-1.5">
              <Label htmlFor="valorMax">Máximo</Label>
              <Input
                id="valorMax"
                type="number"
                value={b.valorMax}
                onChange={(e) => setB({ ...b, valorMax: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="texto">Texto / explicación</Label>
        <Textarea
          id="texto"
          rows={2}
          placeholder="Dormir al menos 7 horas favorece la recuperación."
          value={b.texto}
          onChange={(e) => setB({ ...b, texto: e.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={b.activo}
          onChange={(e) => setB({ ...b, activo: e.target.checked })}
        />
        Activo (se tiene en cuenta en el tracking)
      </label>

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
