"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Loader2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utilidades";
import { IsotipoNutriOffice } from "@/componentes/marca/MarcaNutriOffice";
import { Button } from "@/componentes/ui/button";

export interface EnlaceNav {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  exacto?: boolean;
  /** Contador (ej. mensajes no leídos); se muestra como badge si es > 0. */
  badge?: number;
  /**
   * Título del grupo que ABRE este enlace: los que siguen, hasta el próximo
   * con `grupo`, quedan debajo. Con la barra plegada el título es una línea.
   */
  grupo?: string;
}

interface PropsSidebarNav {
  /** Lo que se muestra junto al logo (un texto o la marca con sus colores). */
  marca: ReactNode;
  enlaces: EnlaceNav[];
  email: string;
  /** Clave de localStorage donde se recuerda si está colapsada. */
  claveAlmacen: string;
  /** Acciones extra en la barra superior móvil (ej: ToggleTema). */
  accionesMovil?: ReactNode;
  /** Contenido extra en el pie del sidebar (ej: ToggleTema). */
  pie?: ReactNode;
  /**
   * Si está, el email del pie es un enlace a esta ruta (el perfil): la cuenta
   * no ocupa una entrada de la lista, y se llega igual desde el celular,
   * donde la barra superior con el menú del avatar no se dibuja.
   */
  enlacePerfil?: string;
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
  enlacePerfil,
}: PropsSidebarNav) {
  const ruta = usePathname();
  const [colapsada, setColapsada] = useState(false);
  const [abiertaMovil, setAbiertaMovil] = useState(false);

  // La preferencia se lee tras montar (evita desajustes de hidratación).
  useEffect(() => {
    setColapsada(localStorage.getItem(claveAlmacen) === "1");
  }, [claveAlmacen]);

  // Navegar cierra el panel móvil. Además se cierra al TOCAR el enlace (ver
  // `alNavegar` en `Enlaces`): esperar al cambio de ruta dejaba el panel
  // abierto y quieto mientras el servidor respondía, y no se distinguía un
  // toque que no entró de una pantalla que está cargando.
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
  const perfilActivo =
    enlacePerfil !== undefined && ruta.startsWith(enlacePerfil);

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
            <IsotipoNutriOffice className="h-8 w-8" />
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
                <IsotipoNutriOffice className="h-8 w-8" />
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
            <Enlaces
              conEtiquetas
              enlaces={enlaces}
              esActivo={esActivo}
              alNavegar={() => setAbiertaMovil(false)}
            />
            <Pie
              conEtiquetas
              email={email}
              pie={pie}
              enlacePerfil={enlacePerfil}
              perfilActivo={perfilActivo}
              alNavegar={() => setAbiertaMovil(false)}
            />
          </aside>
        </div>
      )}

      {/* ---- Escritorio: sidebar colapsable ---- */}
      <aside
        className={cn(
          "hidden h-dvh shrink-0 flex-col border-r bg-background transition-[width] duration-200 md:flex",
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
              <IsotipoNutriOffice className="h-[38px] w-[38px]" />
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
        <Pie
          conEtiquetas={!colapsada}
          email={email}
          pie={pie}
          enlacePerfil={enlacePerfil}
          perfilActivo={perfilActivo}
        />
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
  alNavegar,
}: {
  conEtiquetas: boolean;
  enlaces: EnlaceNav[];
  esActivo: (enlace: EnlaceNav) => boolean;
  alNavegar?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {enlaces.map((enlace) => {
        const Icono = enlace.icono;
        const activo = esActivo(enlace);
        const tieneBadge = Boolean(enlace.badge && enlace.badge > 0);
        return (
          <Fragment key={enlace.href}>
            {enlace.grupo &&
              (conEtiquetas ? (
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground/70">
                  {enlace.grupo}
                </p>
              ) : (
                <hr className="mx-2 my-1.5 border-border" />
              ))}
            <Link
              href={enlace.href}
              title={enlace.etiqueta}
              onClick={alNavegar}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                !conEtiquetas && "justify-center px-2",
                activo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <IconoEnlace icono={Icono} />
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
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * El ícono del enlace, que gira mientras su navegación está pendiente.
 *
 * Tiene que ser un componente hijo del `Link`: `useLinkStatus` lee el estado
 * del `Link` más cercano hacia arriba. El reemplazo tiene el mismo tamaño que
 * el ícono, así que no corre nada de lugar.
 */
function IconoEnlace({ icono: Icono }: { icono: LucideIcon }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
  ) : (
    <Icono className="h-4 w-4 shrink-0" />
  );
}

/** Pie del sidebar: email (o enlace al perfil), acciones extra y cerrar sesión. */
function Pie({
  conEtiquetas,
  email,
  pie,
  enlacePerfil,
  perfilActivo,
  alNavegar,
}: {
  conEtiquetas: boolean;
  email: string;
  pie?: ReactNode;
  enlacePerfil?: string;
  perfilActivo: boolean;
  alNavegar?: () => void;
}) {
  const salir = (
    <Button
      variant="ghost"
      size={conEtiquetas && !enlacePerfil ? "sm" : "icon"}
      className="shrink-0 text-muted-foreground"
      title="Cerrar sesión"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" />
      {conEtiquetas && !enlacePerfil && "Salir"}
    </Button>
  );

  // Con enlace al perfil, perfil y salir van en UNA fila: la barra se quedó
  // sin la entrada «Mi perfil» para ganar alto, y una fila más en el pie se
  // lo devolvía.
  if (enlacePerfil) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 border-t p-3",
          !conEtiquetas && "flex-col px-2",
        )}
      >
        <Link
          href={enlacePerfil}
          title={`Mi perfil (${email})`}
          onClick={alNavegar}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors",
            !conEtiquetas && "w-full flex-none justify-center px-2",
            perfilActivo
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <IconoEnlace icono={UserRound} />
          {conEtiquetas && <span className="truncate">{email}</span>}
        </Link>
        {pie}
        {salir}
      </div>
    );
  }

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
        {salir}
      </div>
    </div>
  );
}
