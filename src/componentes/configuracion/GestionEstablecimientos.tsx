"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  Star,
  Archive,
  ArchiveRestore,
  Pencil,
} from "lucide-react";
import { useEstablecimientos } from "@/lib/hooks/useEstablecimientos";
import { diasDeAtencionEnTexto } from "@/lib/agenda";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Convierte un valor de input numérico a número (o el fallback si es inválido). */
function aEntero(valor: string, fallback: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

interface Borrador {
  nombre: string;
  direccion: string;
  telefono: string;
  duracion: number;
  paso: number;
  desde: string;
  hasta: string;
  dias: number[];
}

const BORRADOR_NUEVO: Borrador = {
  nombre: "",
  direccion: "",
  telefono: "",
  duracion: 30,
  paso: 15,
  desde: "",
  hasta: "",
  dias: [1, 2, 3, 4, 5],
};

function aBorrador(sede: EstablecimientoSalidaDto): Borrador {
  return {
    nombre: sede.nombre,
    direccion: sede.direccion ?? "",
    telefono: sede.telefono ?? "",
    duracion: sede.turnoDuracionMinutos,
    paso: sede.turnoPasoMinutos,
    desde: sede.atencionHoraDesde ?? "",
    hasta: sede.atencionHoraHasta ?? "",
    dias: sede.diasAtencion,
  };
}

/**
 * Los lugares donde el profesional atiende, con la agenda de cada uno.
 *
 * Reemplaza a la vieja tarjeta "Turnos" de Configuración, que declaraba días y
 * horarios para todo el consultorio: eso no alcanzaba para "lunes y miércoles
 * en el centro, martes y jueves en el barrio", que es el caso que motivó la
 * feature. El membrete y el PDF siguen siendo del profesional y no se movieron.
 */
export function GestionEstablecimientos() {
  const { listar, crear, actualizar, archivar, restaurar, fijarPrincipal } =
    useEstablecimientos();
  const consulta = listar({ incluirArchivados: true });

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_NUEVO);

  if (consulta.isLoading || !consulta.data) {
    return <Skeleton className="h-80 w-full" />;
  }

  const sedes = consulta.data;
  const vigentes = sedes.filter((s) => !s.archivadoEn);

  function abrirNueva() {
    setBorrador(BORRADOR_NUEVO);
    setEditandoId(null);
    setCreando(true);
  }

  function abrirEdicion(sede: EstablecimientoSalidaDto) {
    setBorrador(aBorrador(sede));
    setCreando(false);
    setEditandoId(sede.id);
  }

  function cerrar() {
    setCreando(false);
    setEditandoId(null);
  }

  function guardar() {
    const datos = {
      nombre: borrador.nombre.trim(),
      direccion: borrador.direccion.trim() || null,
      telefono: borrador.telefono.trim() || null,
      turnoDuracionMinutos: borrador.duracion,
      turnoPasoMinutos: borrador.paso,
      atencionHoraDesde: borrador.desde || null,
      atencionHoraHasta: borrador.hasta || null,
      diasAtencion: borrador.dias,
    };
    if (editandoId) {
      actualizar.mutate(
        { id: editandoId, ...datos },
        { onSuccess: () => cerrar() },
      );
    } else {
      crear.mutate(datos, { onSuccess: () => cerrar() });
    }
  }

  const guardando = crear.isPending || actualizar.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-primary" /> Establecimientos
          </CardTitle>
          <Button size="sm" onClick={abrirNueva}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cada establecimiento tiene su propia agenda: los días y el horario
            que se declaran acá son los que se ofrecen al dar un turno ahí. Los
            pacientes no pertenecen a un establecimiento —pueden atenderse en
            cualquiera—; lo que se agenda en un lugar es el turno.
          </p>

          {sedes.map((sede) => (
            <div
              key={sede.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sede.nombre}</span>
                  {sede.esPrincipal && (
                    <Badge variant="secondary">
                      <Star className="mr-1 h-3 w-3" /> Principal
                    </Badge>
                  )}
                  {sede.archivadoEn && <Badge>Archivado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Atiende {diasDeAtencionEnTexto(sede)}
                  {sede.atencionHoraDesde && sede.atencionHoraHasta
                    ? `, de ${sede.atencionHoraDesde} a ${sede.atencionHoraHasta}`
                    : ", sin horario declarado"}
                  {` · turnos de ${sede.turnoDuracionMinutos} min`}
                </p>
                {sede.direccion && (
                  <p className="text-xs text-muted-foreground">
                    {sede.direccion}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {!sede.archivadoEn && !sede.esPrincipal && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fijarPrincipal.mutate({ id: sede.id })}
                    disabled={fijarPrincipal.isPending}
                  >
                    <Star className="mr-1 h-4 w-4" /> Hacer principal
                  </Button>
                )}
                {!sede.archivadoEn && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirEdicion(sede)}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Editar
                  </Button>
                )}
                {sede.archivadoEn ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restaurar.mutate({ id: sede.id })}
                    disabled={restaurar.isPending}
                  >
                    <ArchiveRestore className="mr-1 h-4 w-4" /> Restaurar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archivar.mutate({ id: sede.id })}
                    // El último vigente no se puede archivar: sin ninguno no se
                    // pueden agendar turnos. El servidor lo rechaza igual.
                    disabled={archivar.isPending || vigentes.length <= 1}
                  >
                    <Archive className="mr-1 h-4 w-4" /> Archivar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(creando || editandoId) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editandoId ? "Editar establecimiento" : "Nuevo establecimiento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="est-nombre">Nombre</Label>
              <Input
                id="est-nombre"
                placeholder="Consultorio centro"
                value={borrador.nombre}
                onChange={(e) =>
                  setBorrador({ ...borrador, nombre: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-direccion">Dirección</Label>
              <Input
                id="est-direccion"
                value={borrador.direccion}
                onChange={(e) =>
                  setBorrador({ ...borrador, direccion: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-telefono">Teléfono</Label>
              <Input
                id="est-telefono"
                value={borrador.telefono}
                onChange={(e) =>
                  setBorrador({ ...borrador, telefono: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-duracion">Duración por defecto (min)</Label>
              <Input
                id="est-duracion"
                type="number"
                min={5}
                max={480}
                value={borrador.duracion}
                onChange={(e) =>
                  setBorrador({
                    ...borrador,
                    duracion: aEntero(e.target.value, borrador.duracion),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-paso">Paso de la agenda (min)</Label>
              <Input
                id="est-paso"
                type="number"
                min={5}
                max={480}
                value={borrador.paso}
                onChange={(e) =>
                  setBorrador({
                    ...borrador,
                    paso: aEntero(e.target.value, borrador.paso),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-desde">Atención desde</Label>
              <Input
                id="est-desde"
                type="time"
                value={borrador.desde}
                onChange={(e) =>
                  setBorrador({ ...borrador, desde: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-hasta">Atención hasta</Label>
              <Input
                id="est-hasta"
                type="time"
                value={borrador.hasta}
                onChange={(e) =>
                  setBorrador({ ...borrador, hasta: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Días de atención</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((etiqueta, indice) => (
                  <Button
                    key={etiqueta}
                    type="button"
                    size="sm"
                    variant={
                      borrador.dias.includes(indice) ? "default" : "outline"
                    }
                    className="w-14"
                    onClick={() =>
                      setBorrador({
                        ...borrador,
                        dias: borrador.dias.includes(indice)
                          ? borrador.dias.filter((d) => d !== indice)
                          : [...borrador.dias, indice].sort(),
                      })
                    }
                  >
                    {etiqueta}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sin ningún día marcado se puede agendar cualquier día: la lista
                vacía significa «sin restricción», no «cerrado».
              </p>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={guardando || !borrador.nombre.trim()}
              >
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
