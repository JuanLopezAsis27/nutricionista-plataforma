"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarDays, Salad, LogOut } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

const ENLACES = [
  { href: "/mis-turnos", etiqueta: "Mis turnos", icono: CalendarDays },
  { href: "/mi-dieta", etiqueta: "Mi dieta", icono: Salad },
];

/** Navegación superior simple del portal del paciente. */
export function NavPaciente({ email }: { email: string }) {
  const ruta = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-bold">
            <Salad className="h-5 w-5 text-primary" />
            Mi portal
          </span>
          <nav className="flex gap-1">
            {ENLACES.map((enlace) => {
              const activo = ruta.startsWith(enlace.href);
              const Icono = enlace.icono;
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activo
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icono className="h-4 w-4" />
                  {enlace.etiqueta}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
