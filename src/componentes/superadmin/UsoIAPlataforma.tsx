"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIAPlataforma } from "@/lib/hooks/useIAPlataforma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { estiloTooltip } from "@/componentes/antropometria/paleta";
import { useTemaComposicion } from "@/componentes/antropometria/useTemaComposicion";
import { NOMBRE_PROVEEDOR } from "./ConfiguracionIAPlataforma";

const PERIODOS = [
  { dias: 1, etiqueta: "Últimas 24 h" },
  { dias: 7, etiqueta: "Últimos 7 días" },
  { dias: 30, etiqueta: "Últimos 30 días" },
  { dias: 90, etiqueta: "Últimos 90 días" },
] as const;

const POR_PAGINA = 20;

const numero = new Intl.NumberFormat("es-AR");
const fechaHora = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "medium",
});

function usd(valor: number | null): string {
  return valor === null ? "—" : `US$ ${valor.toFixed(valor < 1 ? 4 : 2)}`;
}

/**
 * Cuánto le queda a cada clave y en qué se está gastando: saldo por
 * proveedor, totales del período, llamadas por día, desgloses y el registro
 * de cada llamada.
 *
 * El costo solo aparece donde el proveedor lo informa (OpenRouter). Para
 * Anthropic y OpenAI se muestran tokens: calcular un costo con una tabla de
 * precios propia daría un número con cara de dato que se desactualiza solo.
 */
export function UsoIAPlataforma() {
  return (
    <div className="space-y-6">
      <Saldos />
      <Estadisticas />
      <Registros />
    </div>
  );
}

function Saldos() {
  const { saldos } = useIAPlataforma();
  // Cada consulta va a los tres proveedores: no se repite sola al enfocar.
  const consulta = saldos(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Saldo de las claves
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={consulta.isFetching}
            onClick={() => void consulta.refetch()}
          >
            <RefreshCw
              className={`h-4 w-4 ${consulta.isFetching ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : consulta.isError ? (
          <p className="text-sm text-destructive">
            No se pudo consultar el saldo.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {(consulta.data ?? []).map((s) => (
              <div key={s.proveedor} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {NOMBRE_PROVEEDOR[s.proveedor]}
                  </span>
                  {s.claveValida === true ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Clave válida
                    </Badge>
                  ) : s.claveValida === false ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Rechazada
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sin verificar</Badge>
                  )}
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {s.saldoUsd !== null ? usd(s.saldoUsd) : "—"}
                </p>
                {s.limiteUsd !== null && (
                  <p className="text-xs text-muted-foreground">
                    Usado {usd(s.usadoUsd)} de {usd(s.limiteUsd)}
                  </p>
                )}
                {s.nota && (
                  <p className="mt-1 text-xs text-muted-foreground">{s.nota}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Estadisticas() {
  const { resumen } = useIAPlataforma();
  const [dias, setDias] = useState<number>(30);
  const consulta = resumen({ dias });
  const r = consulta.data;
  const { tema } = useTemaComposicion();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Uso de la IA</span>
          <Select
            value={String(dias)}
            onValueChange={(v) => setDias(Number(v))}
          >
            <SelectTrigger className="w-44" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.dias} value={String(p.dias)}>
                  {p.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {consulta.isLoading || !r ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Dato
                titulo="Llamadas"
                valor={numero.format(r.totales.llamadas)}
              />
              <Dato
                titulo="Con error"
                valor={numero.format(r.totales.errores)}
                alerta={r.totales.errores > 0}
              />
              <Dato
                titulo="Tokens (entrada / salida)"
                valor={`${numero.format(r.totales.tokensEntrada)} / ${numero.format(r.totales.tokensSalida)}`}
              />
              <Dato
                titulo="Costo informado"
                valor={usd(r.totales.costoUsd)}
                pie="Solo OpenRouter lo informa"
              />
            </div>

            {r.porDia.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Llamadas por día</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={r.porDia}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={tema.grilla}
                      strokeWidth={1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dia"
                      tick={{ fill: tema.tinta, fontSize: 11 }}
                      tickFormatter={(d: string) => d.slice(5)}
                      axisLine={{ stroke: tema.eje }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: tema.tinta, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: tema.grilla, fillOpacity: 0.35 }}
                      contentStyle={estiloTooltip(tema)}
                      labelFormatter={(d) => String(d)}
                      formatter={(valor, _nombre, item) => {
                        const p = item.payload as (typeof r.porDia)[number];
                        return [
                          `${numero.format(Number(valor))} (${p.errores} con error, ${numero.format(p.tokensEntrada + p.tokensSalida)} tokens)`,
                          "Llamadas",
                        ];
                      }}
                    />
                    <Bar
                      dataKey="llamadas"
                      fill={tema.masas.muscular}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hubo llamadas a la IA en este período.
              </p>
            )}

            {r.porProveedor.length > 0 && (
              <Desglose
                titulo="Por proveedor"
                encabezado="Proveedor"
                filas={r.porProveedor.map((f) => ({
                  clave: `${f.proveedor}-${f.capacidad}`,
                  nombre: `${NOMBRE_PROVEEDOR[f.proveedor]} · ${
                    f.capacidad === "LLM" ? "IA" : "Voz a texto"
                  }`,
                  ...f,
                }))}
              />
            )}
            {r.porModelo.length > 0 && (
              <Desglose
                titulo="Por modelo"
                encabezado="Modelo"
                filas={r.porModelo.map((f) => ({
                  clave: `${f.proveedor}-${f.modelo}`,
                  nombre: f.modelo,
                  ...f,
                }))}
              />
            )}
            {r.porConsultorio.length > 0 && (
              <Desglose
                titulo="Por consultorio"
                encabezado="Consultorio"
                filas={r.porConsultorio.map((f) => ({
                  clave: f.nutricionistaId ?? "sin-consultorio",
                  nombre:
                    f.consultorio ??
                    (f.nutricionistaId
                      ? "Cuenta dada de baja"
                      : "Sin consultorio"),
                  ...f,
                }))}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Dato({
  titulo,
  valor,
  pie,
  alerta = false,
}: {
  titulo: string;
  valor: string;
  pie?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 flex items-center gap-1 text-lg font-semibold tabular-nums">
        {alerta && <AlertTriangle className="h-4 w-4 text-destructive" />}
        {valor}
      </p>
      {pie && <p className="text-xs text-muted-foreground">{pie}</p>}
    </div>
  );
}

interface FilaDesglose {
  clave: string;
  nombre: string;
  llamadas: number;
  errores: number;
  tokensEntrada: number;
  tokensSalida: number;
  costoUsd: number | null;
}

function Desglose({
  titulo,
  encabezado,
  filas,
}: {
  titulo: string;
  encabezado: string;
  filas: FilaDesglose[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{titulo}</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{encabezado}</TableHead>
              <TableHead className="text-right">Llamadas</TableHead>
              <TableHead className="text-right">Errores</TableHead>
              <TableHead className="text-right">Tokens entrada</TableHead>
              <TableHead className="text-right">Tokens salida</TableHead>
              <TableHead className="text-right">Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.clave}>
                <TableCell className="max-w-[16rem] truncate font-medium">
                  {f.nombre}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero.format(f.llamadas)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero.format(f.errores)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero.format(f.tokensEntrada)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero.format(f.tokensSalida)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {usd(f.costoUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Registros() {
  const { registros } = useIAPlataforma();
  const [pagina, setPagina] = useState(1);
  const [soloErrores, setSoloErrores] = useState(false);
  const consulta = registros({ pagina, porPagina: POR_PAGINA, soloErrores });
  const total = consulta.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Registro de llamadas</span>
          <label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={soloErrores}
              onChange={(ev) => {
                setSoloErrores(ev.target.checked);
                setPagina(1);
              }}
            />
            Solo con error
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {consulta.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {soloErrores
              ? "No hay llamadas con error."
              : "Todavía no se registró ninguna llamada."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Consultorio</TableHead>
                  <TableHead>Proveedor / modelo</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Duración</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(consulta.data?.registros ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fechaHora.format(r.creadoEn)}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">
                      {r.consultorio ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">
                        {NOMBRE_PROVEEDOR[r.proveedor]}
                      </span>
                      <span className="block text-muted-foreground">
                        {r.modelo}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{r.operacion}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {numero.format(r.tokensEntrada)} /{" "}
                      {numero.format(r.tokensSalida)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {usd(r.costoUsd)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {(r.duracionMs / 1000).toFixed(1)} s
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.exito ? (
                        <span className="flex items-center gap-1 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span
                          className="flex max-w-[16rem] items-start gap-1 text-destructive"
                          title={r.error ?? undefined}
                        >
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">
                            {r.error ?? "Error"}
                          </span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {paginas > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground">
              {pagina} de {paginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
