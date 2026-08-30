"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Salad,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

export interface EnlaceNav {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  exacto?: boolean;
  /** Contador (ej. mensajes no leídos); se muestra como badge si es > 0. */
  badge?: number;
}

interface PropsSidebarNav {
  /** Nombre mostrado junto al logo. */
  marca: string;
  enlaces: EnlaceNav[];
  email: string;
  /** Clave de localStorage donde se recuerda si está colapsada. */
  claveAlmacen: string;
  /** Acciones extra en la barra superior móvil (ej: ToggleTema). */
  accionesMovil?: ReactNode;
  /** Contenido extra en el pie del sidebar (ej: ToggleTema). */
  pie?: ReactNode;
}

/**
 * Sidebar de navegación compartida (panel del nutricionista y portal del
 * paciente).
 *
 * - Escritorio (md+): barra lateral fija, colapsable a un riel de íconos con
 *   el botón del encabezado; la preferencia se recuerda en localStorage.
 * - Móvil: barra superior con hamburguesa que abre el menú como panel
 *   deslizante (off-canvas); se cierra al navegar o tocar el fondo.
 */
export function SidebarNav({
  marca,
  enlaces,
  email,
  claveAlmacen,
  accionesMovil,
  pie,
}: PropsSidebarNav) {
  const ruta = usePathname();
  const [colapsada, setColapsada] = useState(false);
  const [abiertaMovil, setAbiertaMovil] = useState(false);

  // La preferencia se lee tras montar (evita desajustes de hidratación).
  useEffect(() => {
    setColapsada(localStorage.getItem(claveAlmacen) === "1");
  }, [claveAlmacen]);

  // Navegar cierra el panel móvil.
  useEffect(() => {
    setAbiertaMovil(false);
  }, [ruta]);

  function alternarColapsada() {
    setColapsada((previa) => {
      localStorage.setItem(claveAlmacen, previa ? "0" : "1");
      return !previa;
    });
  }

  const esActivo = (enlace: EnlaceNav): boolean =>
    enlace.exacto ? ruta === enlace.href : ruta.startsWith(enlace.href);

  return (
    <>
      {/* ---- Móvil: barra superior con hamburguesa ---- */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-3 md:hidden">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            onClick={() => setAbiertaMovil(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="flex items-center gap-2 font-bold">
            <Salad className="h-5 w-5 text-primary" />
            {marca}
          </span>
        </div>
        <div className="flex items-center gap-1">{accionesMovil}</div>
      </header>

      {/* ---- Móvil: panel deslizante ---- */}
      {abiertaMovil && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/50"
            onClick={() => setAbiertaMovil(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="flex items-center gap-2 font-bold">
                <Salad className="h-5 w-5 text-primary" />
                {marca}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar menú"
                onClick={() => setAbiertaMovil(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Enlaces conEtiquetas enlaces={enlaces} esActivo={esActivo} />
            <Pie conEtiquetas email={email} pie={pie} />
          </aside>
        </div>
      )}

      {/* ---- Escritorio: sidebar colapsable ---- */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r bg-background transition-[width] duration-200 md:flex",
          colapsada ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b",
            colapsada ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {!colapsada && (
            <span className="flex items-center gap-2 text-lg font-bold">
              <Salad className="h-6 w-6 text-primary" />
              {marca}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={colapsada ? "Desplegar menú" : "Esconder menú"}
            title={colapsada ? "Desplegar menú" : "Esconder menú"}
            onClick={alternarColapsada}
          >
            {colapsada ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>
        <Enlaces
          conEtiquetas={!colapsada}
          enlaces={enlaces}
          esActivo={esActivo}
        />
        <Pie conEtiquetas={!colapsada} email={email} pie={pie} />
      </aside>
    </>
  );
}

/**
 * La lista de enlaces.
 *
 * Vive FUERA de `SidebarNav` a propósito. Definida adentro era una función
 * nueva en cada render, así que React la trataba como otro tipo de componente
 * y desmontaba el subárbol entero: perdía el foco y reiniciaba cualquier
 * animación en curso, y habría descartado el estado interno el día que alguien
 * le agregara alguno.
 */
function Enlaces({
  conEtiquetas,
  enlaces,
  esActivo,
}: {
  conEtiquetas: boolean;
  enlaces: EnlaceNav[];
  esActivo: (enlace: EnlaceNav) => boolean;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {enlaces.map((enlace) => {
        const Icono = enlace.icono;
        const activo = esActivo(enlace);
        const tieneBadge = Boolean(enlace.badge && enlace.badge > 0);
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            title={enlace.etiqueta}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              !conEtiquetas && "justify-center px-2",
              activo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icono className="h-4 w-4 shrink-0" />
            {conEtiquetas && (
              <span className="flex-1 truncate">{enlace.etiqueta}</span>
            )}
            {tieneBadge &&
              (conEtiquetas ? (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    activo
                      ? "bg-background text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {enlace.badge! > 9 ? "9+" : enlace.badge}
                </span>
              ) : (
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 h-2 w-2 rounded-full",
                    activo ? "bg-background" : "bg-primary",
                  )}
                />
              ))}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pie del sidebar: email, acciones extra y cerrar sesión. */
function Pie({
  conEtiquetas,
  email,
  pie,
}: {
  conEtiquetas: boolean;
  email: string;
  pie?: ReactNode;
}) {
  return (
    <div className={cn("space-y-2 border-t p-3", !conEtiquetas && "px-2")}>
      {conEtiquetas && (
        <p
          className="truncate px-3 text-xs text-muted-foreground"
          title={email}
        >
          {email}
        </p>
      )}
      <div
        className={cn(
          "flex items-center gap-1",
          conEtiquetas ? "justify-between" : "flex-col justify-center",
        )}
      >
        {pie}
        <Button
          variant="ghost"
          size={conEtiquetas ? "sm" : "icon"}
          className="text-muted-foreground"
          title="Cerrar sesión"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          {conEtiquetas && "Salir"}
        </Button>
      </div>
    </div>
  );
}
