"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";

const esquemaLogin = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
type DatosLogin = z.infer<typeof esquemaLogin>;

/** Formulario de inicio de sesión (email + password). */
export function FormularioLogin() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", password: "" },
  });

  async function alEnviar(datos: DatosLogin) {
    setEnviando(true);
    const resultado = await signIn("credentials", {
      email: datos.email,
      password: datos.password,
      redirect: false,
    });

    if (!resultado || resultado.error) {
      toast.error("Email o contraseña incorrectos.");
      setEnviando(false);
      return;
    }

    // Rutea según el rol del usuario autenticado.
    const sesion = await getSession();
    const destino = sesion?.user.rol === "NUTRICIONISTA" ? "/dashboard" : "/mis-turnos";
    router.replace(destino);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vos@ejemplo.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
