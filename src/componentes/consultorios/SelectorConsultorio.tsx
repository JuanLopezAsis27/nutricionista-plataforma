"use client";

import Link from "next/link";
import { Building2, Check, Loader2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/componentes/ui/dropdown-menu";
import { useConsultorios } from "@/lib/hooks/useConsultorios";

/**
 * El selector de consultorio del portal: para quien se atiende con más de un
 * profesional (migración 78).
 *
 * Es un botón de ícono y no una tarjeta porque vive en el pie de la barra
 * lateral, que se colapsa a un riel de íconos, y en la barra móvil. Con un
 * solo consultorio no se dibuja: no hay nada que elegir, y un control que no
 * hace nada es ruido para el 99 % de los pacientes.
 */
export function SelectorConsultorio() {
  const { misConsultorios, cambiar, cambiando } = useConsultorios();
  const { data: consultorios = [] } = misConsultorios();

  if (consultorios.length < 2) return null;

  const activo = consultorios.find((c) => c.activo);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cambiar de consultorio"
          title={
            activo
              ? `Consultorio: ${activo.nombreProfesional}`
              : "Elegí un consultorio"
          }
        >
          <Building2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Tus consultorios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {consultorios.map((c) => (
          <DropdownMenuItem
            key={c.pacienteId}
            disabled={c.activo || cambiando !== null}
            onSelect={() => void cambiar(c.pacienteId)}
          >
            <span className="flex-1 truncate">{c.nombreProfesional}</span>
            {c.activo && <Check className="h-4 w-4" />}
            {cambiando === c.pacienteId && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/mis-consultorios">Ver todos</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
