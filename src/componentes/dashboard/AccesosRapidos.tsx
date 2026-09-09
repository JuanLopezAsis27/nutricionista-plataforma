import Link from "next/link";
import {
  UserPlus,
  CalendarPlus,
  ClipboardList,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { formatearFechaLarga } from "@/lib/formato";
import { ACENTOS, type ClaveAcento } from "./acentos";

interface Acceso {
  etiqueta: string;
  descripcion: string;
  href: string;
  icono: LucideIcon;
  acento: ClaveAcento;
}

/**
 * Lo que se hace todos los días, a un clic desde el inicio.
 *
 * Las dos primeras son ALTAS y llevan a su formulario; las dos últimas abren el
 * módulo, porque planes y recetas se crean en un diálogo de su propia pantalla
 * y no en una ruta aparte. Se nombran distinto a propósito («Nuevo paciente»
 * contra «Planes»): un botón que promete un alta y deposita en una lista se
 * siente roto.
 */
const ACCESOS: Acceso[] = [
  {
    etiqueta: "Nuevo paciente",
    descripcion: "Dar de alta una ficha",
    href: "/dashboard/pacientes/nuevo",
    icono: UserPlus,
    acento: "verde",
  },
  {
    etiqueta: "Agendar turno",
    descripcion: "Reservar una consulta",
    href: "/dashboard/turnos/nuevo",
    icono: CalendarPlus,
    acento: "azul",
  },
  {
    etiqueta: "Planes",
    descripcion: "Planes y menús semanales",
    href: "/dashboard/planes",
    icono: ClipboardList,
    acento: "violeta",
  },
  {
    etiqueta: "Recetario",
    descripcion: "Recetas del consultorio",
    href: "/dashboard/recetas",
    icono: BookOpen,
    acento: "ambar",
  },
];

/** Fecha de hoy en letras + los cuatro accesos. */
export function AccesosRapidos({ hoy }: { hoy: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm capitalize text-muted-foreground">
        {formatearFechaLarga(hoy)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACCESOS.map((acceso) => {
          const acento = ACENTOS[acceso.acento];
          return (
            <Link
              key={acceso.href}
              href={acceso.href}
              className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/50"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${acento.chip}`}
              >
                <acceso.icono className={`h-5 w-5 ${acento.tinta}`} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {acceso.etiqueta}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {acceso.descripcion}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
