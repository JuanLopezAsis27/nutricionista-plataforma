"use client";

import {
  Home,
  CalendarDays,
  CalendarRange,
  NotebookPen,
  ClipboardList,
  BookOpen,
  Library,
  Target,
  TrendingUp,
  PersonStanding,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { SidebarNav, type EnlaceNav } from "@/componentes/layout/SidebarNav";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";
import { useMensajeria } from "@/lib/hooks/useMensajeria";

/** Barra lateral del portal del paciente (colapsable, con menú móvil). */
export function BarraLateralPaciente({ email }: { email: string }) {
  const { misNoLeidos } = useMensajeria();
  const sinLeer = misNoLeidos().data ?? 0;

  const enlaces: EnlaceNav[] = [
    { href: "/mi-inicio", etiqueta: "Inicio", icono: Home, exacto: true },
    {
      href: "/mensajes",
      etiqueta: "Mensajes",
      icono: MessageSquare,
      badge: sinLeer,
    },
    { href: "/mi-diario", etiqueta: "Mi diario", icono: NotebookPen },
    { href: "/mi-progreso", etiqueta: "Mi progreso", icono: TrendingUp },
    {
      href: "/mi-composicion",
      etiqueta: "Mi composición",
      icono: PersonStanding,
    },
    { href: "/mi-plan", etiqueta: "Mi plan", icono: ClipboardList },
    { href: "/mi-semana", etiqueta: "Mi semana", icono: CalendarRange },
    { href: "/mis-objetivos", etiqueta: "Mis objetivos", icono: Target },
    { href: "/mis-recetas", etiqueta: "Mis recetas", icono: BookOpen },
    { href: "/mi-material", etiqueta: "Mi material", icono: Library },
    { href: "/mis-turnos", etiqueta: "Mis turnos", icono: CalendarDays },
    { href: "/asistente", etiqueta: "Asistente IA", icono: Sparkles },
  ];

  return (
    <SidebarNav
      marca="Mi portal"
      enlaces={enlaces}
      email={email}
      claveAlmacen="sidebar-paciente-colapsada"
      accionesMovil={<ToggleTema />}
      pie={<ToggleTema />}
    />
  );
}
