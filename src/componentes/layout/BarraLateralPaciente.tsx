"use client";

import {
  CalendarDays,
  NotebookPen,
  ClipboardList,
  BookOpen,
  Library,
} from "lucide-react";
import { SidebarNav, type EnlaceNav } from "@/componentes/layout/SidebarNav";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";

const ENLACES: EnlaceNav[] = [
  { href: "/mi-diario", etiqueta: "Mi diario", icono: NotebookPen },
  { href: "/mi-plan", etiqueta: "Mi plan", icono: ClipboardList },
  { href: "/mis-recetas", etiqueta: "Mis recetas", icono: BookOpen },
  { href: "/mi-material", etiqueta: "Mi material", icono: Library },
  { href: "/mis-turnos", etiqueta: "Mis turnos", icono: CalendarDays },
];

/** Barra lateral del portal del paciente (colapsable, con menú móvil). */
export function BarraLateralPaciente({ email }: { email: string }) {
  return (
    <SidebarNav
      marca="Mi portal"
      enlaces={ENLACES}
      email={email}
      claveAlmacen="sidebar-paciente-colapsada"
      accionesMovil={<ToggleTema />}
      pie={<ToggleTema />}
    />
  );
}
