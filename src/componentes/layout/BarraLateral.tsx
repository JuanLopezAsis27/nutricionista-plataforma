"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Users, CalendarDays, Salad, LogOut } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

const ENLACES = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard, exacto: true },
  { href: "/dashboard/pacientes", etiqueta: "Pacientes", icono: Users, exacto: false },
  { href: "/dashboard/turnos", etiqueta: "Turnos", icono: CalendarDays, exacto: false },
  { href: "/dashboard/dietas", etiqueta: "Dietas", icono: Salad, exacto: false },
];

/** Barra lateral de navegación del panel del nutricionista. */
export function BarraLateral({ email }: { email: string }) {
  const ruta = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Salad className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Nutricionista</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {ENLACES.map((enlace) => {
          const activo = enlace.exacto ? ruta === enlace.href : ruta.startsWith(enlace.href);
          const Icono = enlace.icono;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icono className="h-4 w-4" />
              {enlace.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="mb-2 truncate px-3 text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
