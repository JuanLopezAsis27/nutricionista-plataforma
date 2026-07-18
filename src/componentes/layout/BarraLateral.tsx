"use client";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Library,
} from "lucide-react";
import { SidebarNav, type EnlaceNav } from "@/componentes/layout/SidebarNav";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";

const ENLACES: EnlaceNav[] = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard, exacto: true },
  { href: "/dashboard/pacientes", etiqueta: "Pacientes", icono: Users },
  { href: "/dashboard/turnos", etiqueta: "Turnos", icono: CalendarDays },
  { href: "/dashboard/planes", etiqueta: "Planes", icono: ClipboardList },
  { href: "/dashboard/recetas", etiqueta: "Recetario", icono: BookOpen },
  { href: "/dashboard/biblioteca", etiqueta: "Biblioteca", icono: Library },
];

/** Barra lateral del panel del nutricionista (colapsable, con menú móvil). */
export function BarraLateral({ email }: { email: string }) {
  return (
    <SidebarNav
      marca="Nutricionista"
      enlaces={ENLACES}
      email={email}
      claveAlmacen="sidebar-nutri-colapsada"
      accionesMovil={<ToggleTema />}
    />
  );
}
