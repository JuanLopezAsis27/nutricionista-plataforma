"use client";

import { UserRound } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { usePerfil } from "@/lib/hooks/usePerfil";
import { FotoDePerfil } from "./FotoDePerfil";
import { FormularioPassword } from "./FormularioPassword";

/**
 * "Mi perfil": la cuenta propia. Es EL MISMO componente para el nutricionista y
 * para el paciente.
 *
 * Las dos rutas (`/dashboard/mi-perfil` y `/mi-perfil`) existen porque cada rol
 * vive bajo su propio layout —barra lateral, guardas de sesión— pero lo que la
 * pantalla hace no depende del rol: la foto y la contraseña son de la cuenta, y
 * la cuenta es la misma tabla. Duplicar la pantalla habría duplicado también el
 * formulario de contraseña, que es la parte que no conviene tener dos veces.
 *
 * Lo que NO se edita acá es el nombre: el del paciente vive en su ficha (la
 * carga el profesional) y el del profesional en Configuración. Se muestra para
 * que se vea de quién es la cuenta, pero abrir una segunda puerta al mismo dato
 * termina en dos nombres distintos según dónde se lo mire.
 */
export function MiPerfil() {
  const { mio } = usePerfil();
  const consulta = mio();
  const perfil = consulta.data;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserRound className="h-6 w-6 text-primary" /> Mi perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu foto y tu contraseña.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>
            {perfil ? (
              <>
                {perfil.nombre} · {perfil.email}
              </>
            ) : (
              "Cargando tus datos…"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consulta.isLoading || !perfil ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-9 w-40" />
            </div>
          ) : (
            <FotoDePerfil
              nombre={perfil.nombre}
              fotoArchivoId={perfil.fotoArchivoId}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Escribí la que usás hoy y elegí una nueva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioPassword />
        </CardContent>
      </Card>
    </div>
  );
}
