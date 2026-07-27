"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Shield, Plus, LogOut, UserCheck, UserX } from "lucide-react";
import { useSuperAdmin } from "@/lib/hooks/useSuperAdmin";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { ToggleTema } from "@/componentes/comunes/ToggleTema";

/** Panel del SUPERADMIN: alta y gestión de cuentas de nutricionista. */
export default function PaginaAdmin() {
  const { listarNutricionistas, crearNutricionista, cambiarEstado } = useSuperAdmin();
  const consulta = listarNutricionistas();
  const nutris = consulta.data ?? [];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function crear() {
    crearNutricionista.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          setEmail("");
          setPassword("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6 text-primary" /> Administración
          </h1>
          <p className="text-sm text-muted-foreground">
            Cuentas de nutricionista (cada una es un espacio aislado con sus pacientes).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleTema />
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-primary" /> Nueva cuenta de nutricionista
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nutri@consultorio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña inicial</Label>
            <Input
              id="password"
              type="text"
              placeholder="mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={crear}
            disabled={crearNutricionista.isPending || !email.trim() || password.length < 8}
          >
            Crear cuenta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nutricionistas</CardTitle>
        </CardHeader>
        <CardContent>
          {consulta.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : nutris.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay cuentas de nutricionista.
            </p>
          ) : (
            <ul className="divide-y">
              {nutris.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{n.email}</span>
                      {n.activo ? (
                        <Badge variant="secondary">Activa</Badge>
                      ) : (
                        <Badge variant="outline">Inactiva</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Alta: {formatearFecha(n.creadoEn)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cambiarEstado.isPending}
                    onClick={() => cambiarEstado.mutate({ id: n.id, activo: !n.activo })}
                  >
                    {n.activo ? (
                      <>
                        <UserX className="h-4 w-4" /> Desactivar
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" /> Activar
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
