"use client";

import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import { Button } from "@/componentes/ui/button";
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
import { FormularioDatosIngreso } from "./FormularioDatosIngreso";

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
          Tu foto, con qué entrás y tu contraseña.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>
            {perfil ? (
              <>
                {perfil.nombre} ·{" "}
                {[perfil.email, perfil.nombreUsuario]
                  .filter(Boolean)
                  .join(" · ")}
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
          <CardTitle>Con qué entrás</CardTitle>
          <CardDescription>
            Tu email y tu nombre de usuario: podés entrar con cualquiera de los
            dos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perfil ? (
            <FormularioDatosIngreso
              // Se remonta si cambian desde afuera, para no editar valores viejos.
              key={`${perfil.email}|${perfil.nombreUsuario}`}
              perfil={perfil}
            />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Escribí la que usás hoy y elegí una nueva.
            {perfil?.passwordProvisional && (
              <>
                {" "}
                La que tenés ahora la eligió tu nutricionista: te recomendamos
                cambiarla por una que solo sepas vos.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioPassword />
        </CardContent>
      </Card>

      {/* Sumar un consultorio con un código (migración 80). Con uno solo, el
          selector de la barra no se dibuja: esta es la puerta para llegar. */}
      {perfil?.rol === "PACIENTE" && (
        <Card>
          <CardHeader>
            <CardTitle>¿Te atendés con otro profesional?</CardTitle>
            <CardDescription>
              Si te dio un código de invitación, sumalo a esta misma cuenta: vas
              a entrar a los dos consultorios con el mismo usuario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/mis-consultorios">
                <Building2 className="h-4 w-4" />
                Mis consultorios
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
