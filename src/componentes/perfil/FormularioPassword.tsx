"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { usePerfil } from "@/lib/hooks/usePerfil";
import {
  cambiarPasswordDto,
  type CambiarPasswordDto,
} from "@/aplicacion/dtos/perfil.dto";
import { LARGO_MINIMO_PASSWORD } from "@/aplicacion/dtos/password";

/** Campo cuyo error de servidor se pinta debajo del input que hay que corregir. */
const CAMPO_POR_MENSAJE: { patron: RegExp; campo: keyof CambiarPasswordDto }[] =
  [{ patron: /contraseña actual/i, campo: "passwordActual" }];

/**
 * Cambiar la propia contraseña: la actual, la nueva y la nueva otra vez.
 *
 * El esquema del formulario ES el DTO del servidor (`cambiarPasswordDto`), no
 * una copia. En esta app los formularios suelen declarar su propio esquema y
 * hay un test —`coherencia-formularios.test.ts`— que existe únicamente para
 * detectar cuándo esas dos escrituras divergen. Acá no hace falta ese test
 * porque no hay dos escrituras: la validación de la confirmación y la de la
 * política de contraseñas viven en el DTO y se ejecutan igual en el navegador y
 * en el servidor.
 *
 * El único error que no se puede anticipar en el cliente es "la contraseña
 * actual no es correcta": eso solo lo sabe quien tiene el hash. Vuelve como
 * error de la mutación y se cuelga del campo correspondiente en vez de salir
 * como un toast, para que se lea donde hay que corregir.
 */
export function FormularioPassword() {
  const { cambiarPassword } = usePerfil();
  const [mostrar, setMostrar] = useState(false);

  const form = useForm<CambiarPasswordDto>({
    resolver: zodResolver(cambiarPasswordDto),
    defaultValues: {
      passwordActual: "",
      passwordNueva: "",
      confirmacion: "",
    },
  });

  async function alEnviar(datos: CambiarPasswordDto) {
    try {
      await cambiarPassword.mutateAsync(datos);
      form.reset();
      toast.success("Listo, tu contraseña quedó actualizada.");
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña.";
      const destino = CAMPO_POR_MENSAJE.find((r) => r.patron.test(mensaje));
      if (destino) {
        form.setError(destino.campo, { message: mensaje });
        form.setFocus(destino.campo);
      } else {
        toast.error(mensaje);
      }
    }
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="passwordActual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña actual</FormLabel>
              <FormControl>
                <Input type={tipo} autoComplete="current-password" {...field} />
              </FormControl>
              <Ayuda>
                La pedimos para confirmar que sos vos quien la está cambiando.
              </Ayuda>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordNueva"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña nueva</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={tipo}
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar((visible) => !visible)}
                    aria-label={
                      mostrar ? "Ocultar contraseñas" : "Mostrar contraseñas"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {mostrar ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <Ayuda>
                Al menos {LARGO_MINIMO_PASSWORD} caracteres. Una frase con
                varias palabras es más segura y más fácil de recordar que una
                palabra con símbolos.
              </Ayuda>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repetir la contraseña nueva</FormLabel>
              <FormControl>
                <Input type={tipo} autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={cambiarPassword.isPending}>
          <KeyRound className="h-4 w-4" />
          {cambiarPassword.isPending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Form>
  );
}

/**
 * Texto de ayuda bajo un campo.
 *
 * `ui/form` no exporta un `FormDescription` (shadcn lo trae, pero acá no se
 * copió), y una nota al pie no justifica sumarlo al primitivo compartido para
 * un solo formulario.
 */
function Ayuda({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
