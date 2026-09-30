"use client";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Library,
  BarChart3,
  BellRing,
  MessageSquare,
  Sparkles,
  Settings,
  Apple,
} from "lucide-react";
import { SidebarNav, type EnlaceNav } from "@/componentes/layout/SidebarNav";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";
import { BotonInstalarHeader } from "@/componentes/pwa/BotonInstalarHeader";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { NombreNutriOffice } from "@/componentes/marca/MarcaNutriOffice";

/** Barra lateral del panel del nutricionista (colapsable, con menú móvil). */
export function BarraLateral({ email }: { email: string }) {
  const { noLeidos } = useMensajeria();
  const sinLeer = noLeidos().data ?? 0;

  const enlaces: EnlaceNav[] = [
    {
      href: "/dashboard",
      etiqueta: "Dashboard",
      icono: LayoutDashboard,
      exacto: true,
    },
    { href: "/dashboard/pacientes", etiqueta: "Pacientes", icono: Users },
    { href: "/dashboard/turnos", etiqueta: "Turnos", icono: CalendarDays },
    {
      href: "/dashboard/mensajes",
      etiqueta: "Mensajes",
      icono: MessageSquare,
      badge: sinLeer,
    },
    {
      href: "/dashboard/planes",
      etiqueta: "Planes",
      icono: ClipboardList,
      grupo: "Contenido",
    },
    { href: "/dashboard/recetas", etiqueta: "Recetario", icono: BookOpen },
    { href: "/dashboard/alimentos", etiqueta: "Alimentos", icono: Apple },
    { href: "/dashboard/biblioteca", etiqueta: "Biblioteca", icono: Library },
    {
      href: "/dashboard/estadisticas",
      etiqueta: "Estadísticas",
      icono: BarChart3,
      grupo: "Análisis",
    },
    {
      href: "/dashboard/analisis-ia",
      etiqueta: "Análisis IA",
      icono: Sparkles,
    },
    {
      href: "/dashboard/recordatorios",
      etiqueta: "Recordatorios",
      icono: BellRing,
      grupo: "Consultorio",
    },
    // Integraciones es una pestaña de Configuración: son trámites de una sola
    // vez, y con Alimentos la barra había llegado a 14 entradas.
    {
      href: "/dashboard/configuracion",
      etiqueta: "Configuración",
      icono: Settings,
    },
  ];

  return (
    <SidebarNav
      marca={<NombreNutriOffice />}
      enlaces={enlaces}
      email={email}
      claveAlmacen="sidebar-nutri-colapsada"
      // Mi perfil no es una entrada de la lista: se abre desde el email del
      // pie. También está en el menú del avatar, pero la barra superior no se
      // dibuja en móvil, y ahí el pie es la única puerta.
      enlacePerfil="/dashboard/mi-perfil"
      // En escritorio el botón de instalar vive en la BarraSuperior, que en
      // móvil está oculta: acá es el único lugar donde queda a mano.
      accionesMovil={
        <>
          <BotonInstalarHeader />
          <ToggleTema />
        </>
      }
    />
  );
}
