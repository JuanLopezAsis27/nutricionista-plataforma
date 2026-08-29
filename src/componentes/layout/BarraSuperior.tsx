"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/componentes/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/componentes/ui/dropdown-menu";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";
import { CampanaNotificaciones } from "@/componentes/notificaciones/CampanaNotificaciones";

/** Asocia el prefijo de ruta con el título de la página. */
const TITULOS: { prefijo: string; titulo: string; exacto?: boolean }[] = [
  { prefijo: "/dashboard/pacientes", titulo: "Pacientes" },
  { prefijo: "/dashboard/turnos", titulo: "Turnos" },
  { prefijo: "/dashboard/planes", titulo: "Planes nutricionales" },
  { prefijo: "/dashboard/recetas", titulo: "Recetario" },
  { prefijo: "/dashboard/biblioteca", titulo: "Biblioteca" },
  { prefijo: "/dashboard", titulo: "Panel principal", exacto: true },
];

function tituloDeRuta(ruta: string): string {
  const encontrado = TITULOS.find((t) =>
    t.exacto ? ruta === t.prefijo : ruta.startsWith(t.prefijo),
  );
  return encontrado?.titulo ?? "Nutricionista";
}

/** Barra superior con el título de la página y el menú del usuario. */
export function BarraSuperior({ email }: { email: string }) {
  const ruta = usePathname();
  const inicial = email.charAt(0).toUpperCase();

  return (
    // En móvil la barra del menú (SidebarNav) ya ocupa el tope; esta solo en md+.
    <header className="hidden h-16 items-center justify-between border-b bg-background px-6 md:flex">
      <h1 className="text-xl font-semibold">{tituloDeRuta(ruta)}</h1>

      <div className="flex items-center gap-2">
        <CampanaNotificaciones />
        <ToggleTema />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus:ring-2 focus:ring-ring">
            <Avatar>
              <AvatarFallback>{inicial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4" />
              Ver perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
