"use client";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Library,
  BarChart3,
  Mail,
  Plug,
  MessageSquare,
  Sparkles,
  Settings,
} from "lucide-react";
import { SidebarNav, type EnlaceNav } from "@/componentes/layout/SidebarNav";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";
import { useMensajeria } from "@/lib/hooks/useMensajeria";

/** Barra lateral del panel del nutricionista (colapsable, con menú móvil). */
export function BarraLateral({ email }: { email: string }) {
  const { noLeidos } = useMensajeria();
  const sinLeer = noLeidos().data ?? 0;

  const enlaces: EnlaceNav[] = [
    { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard, exacto: true },
    { href: "/dashboard/pacientes", etiqueta: "Pacientes", icono: Users },
    { href: "/dashboard/turnos", etiqueta: "Turnos", icono: CalendarDays },
    { href: "/dashboard/mensajes", etiqueta: "Mensajes", icono: MessageSquare, badge: sinLeer },
    { href: "/dashboard/planes", etiqueta: "Planes", icono: ClipboardList },
    { href: "/dashboard/recetas", etiqueta: "Recetario", icono: BookOpen },
    { href: "/dashboard/biblioteca", etiqueta: "Biblioteca", icono: Library },
    { href: "/dashboard/estadisticas", etiqueta: "Estadísticas", icono: BarChart3 },
    { href: "/dashboard/analisis-ia", etiqueta: "Análisis IA", icono: Sparkles },
    { href: "/dashboard/plantillas", etiqueta: "Secretaría", icono: Mail },
    { href: "/dashboard/integraciones", etiqueta: "Integraciones", icono: Plug },
    { href: "/dashboard/configuracion", etiqueta: "Configuración", icono: Settings },
  ];

  return (
    <SidebarNav
      marca="Lic. López Asis"
      enlaces={enlaces}
      email={email}
      claveAlmacen="sidebar-nutri-colapsada"
      accionesMovil={<ToggleTema />}
    />
  );
}
