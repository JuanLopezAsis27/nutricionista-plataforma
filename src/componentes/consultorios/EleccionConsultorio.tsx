"use client";

import { signOut } from "next-auth/react";
import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import { LogoConsultorio } from "@/componentes/marca/LogoConsultorio";
import { AvatarPerfil } from "@/componentes/comunes/AvatarPerfil";
import { useConsultorios } from "@/lib/hooks/useConsultorios";

/**
 * «Elegí tu consultorio»: la pantalla que ve, después del login, quien se
 * atiende con más de un profesional y todavía no eligió en este dispositivo
 * (migración 78).
 *
 * La foto de cada profesional puede no cargar —la autorización de archivos
 * mira el consultorio de la sesión, y acá todavía no hay ninguno—: el avatar
 * cae solo a las iniciales, que es lo que se ve la mayoría de las veces.
 */
export function EleccionConsultorio() {
  const { misConsultorios, cambiar, cambiando } = useConsultorios();
  const { data: consultorios, isLoading } = misConsultorios();

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Elegí tu consultorio</CardTitle>
          <CardDescription>
            Te atendés con más de un profesional. Elegí con cuál querés trabajar
            ahora; después podés cambiar desde el menú.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {consultorios?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tu cuenta no tiene ningún consultorio activo. Consultá con tu
              nutricionista.
            </p>
          )}
          {consultorios?.map((c) => (
            <button
              key={c.pacienteId}
              type="button"
              disabled={cambiando !== null}
              onClick={() => void cambiar(c.pacienteId)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <AvatarPerfil
                nombre={c.nombreProfesional}
                fotoArchivoId={c.fotoProfesionalId}
                className="h-10 w-10"
              />
              <span className="flex-1 truncate font-medium">
                {c.nombreProfesional}
              </span>
              {cambiando === c.pacienteId ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
