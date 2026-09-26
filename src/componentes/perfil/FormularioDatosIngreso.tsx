"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PerfilSalidaDto } from "@/aplicacion/dtos/perfil.dto";
import {
  REGLA_NOMBRE_USUARIO,
  esNombreUsuarioValido,
  normalizarNombreUsuario,
} from "@/dominio/servicios/nombreUsuario";
import { usePerfil } from "@/lib/hooks/usePerfil";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";

/**
 * Con qué entra la persona a su cuenta: su email y su nombre de usuario
 * (migración 80).
 *
 * Es, sobre todo, la puerta para que un paciente que entraba solo con usuario
 * agregue un email: sin email no tiene «olvidé mi contraseña». Pide la
 * contraseña actual, como el cambio de contraseña (ver `CambiarMisDatosIngreso`).
 *
 * El profesional no puede quedarse sin email; eso lo rechaza el servidor y se
 * muestra como cualquier otro error.
 */
export function FormularioDatosIngreso({
  perfil,
}: {
  perfil: PerfilSalidaDto;
}) {
  const { cambiarDatosIngreso } = usePerfil();
  const [email, setEmail] = useState(perfil.email ?? "");
  const [nombreUsuario, setNombreUsuario] = useState(
    perfil.nombreUsuario ?? "",
  );
  const [passwordActual, setPasswordActual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sinCambios =
    email.trim().toLowerCase() === (perfil.email ?? "") &&
    normalizarNombreUsuario(nombreUsuario) === (perfil.nombreUsuario ?? "");

  function guardar() {
    const usuario = normalizarNombreUsuario(nombreUsuario);
    if (!email.trim() && !usuario) {
      setError("Tu cuenta necesita un email o un nombre de usuario.");
      return;
    }
    if (usuario && !esNombreUsuarioValido(usuario)) {
      setError(REGLA_NOMBRE_USUARIO);
      return;
    }
    if (!passwordActual) {
      setError("Escribí tu contraseña actual.");
      return;
    }
    setError(null);
    cambiarDatosIngreso.mutate(
      { passwordActual, email: email.trim(), nombreUsuario: usuario },
      {
        onSuccess: () => {
          setPasswordActual("");
          toast.success("Listo: ya podés entrar con tus datos nuevos.");
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="ingreso-email">Email</Label>
        <Input
          id="ingreso-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!perfil.email && (
          <p className="text-xs text-muted-foreground">
            Si agregás un email, vas a poder recuperar tu contraseña sola si la
            olvidás.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="ingreso-usuario">Nombre de usuario</Label>
        <Input
          id="ingreso-usuario"
          autoCapitalize="none"
          autoComplete="username"
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ingreso-password">Tu contraseña actual</Label>
        <Input
          id="ingreso-password"
          type="password"
          autoComplete="current-password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={guardar}
        disabled={sinCambios || cambiarDatosIngreso.isPending}
      >
        {cambiarDatosIngreso.isPending ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
