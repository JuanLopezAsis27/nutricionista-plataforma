"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { IntegracionCredenciales } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
import { Button } from "@/componentes/ui/button";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Baja de una integración: borra TODAS sus credenciales de una vez.
 *
 * Es un componente compartido y no un botón por tarjeta porque cada tarjeta que
 * lo resolvía a mano —mandando cadenas vacías por `guardar`— enumeraba los
 * campos a vaciar y se olvidaba de alguno: WhatsApp no tenía forma de borrarse
 * y la IA solo borraba la clave del proveedor que estuviera seleccionado.
 *
 * Pide confirmación porque el secreto no vuelve: la app nunca lo muestra, así
 * que después de borrarlo hay que ir a buscarlo al portal del proveedor o
 * generarlo de nuevo.
 */
export function EliminarCredenciales({
  integracion,
  nombre,
  consecuencia,
  configurada,
}: {
  integracion: IntegracionCredenciales;
  /** Cómo se llama la integración en la pantalla ("WhatsApp Cloud API"). */
  nombre: string;
  /** Qué deja de funcionar al borrarla, en una oración. */
  consecuencia: string;
  /** Sin nada cargado no hay nada que borrar: el botón no aparece. */
  configurada: boolean;
}) {
  const { eliminar } = useCredenciales();
  const [confirmando, setConfirmando] = useState(false);

  if (!configurada) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={eliminar.isPending}
        onClick={() => setConfirmando(true)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
        Eliminar credenciales
      </Button>

      <ModalConfirmacion
        abierto={confirmando}
        titulo={`Eliminar las credenciales de ${nombre}`}
        descripcion={`Se borran todas las claves de ${nombre} de este consultorio. ${consecuencia} La app nunca muestra un secreto guardado, así que para volver a conectarla vas a tener que cargarlo de nuevo desde el portal del proveedor.`}
        cargando={eliminar.isPending}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() =>
          eliminar.mutate(
            { integracion },
            { onSuccess: () => setConfirmando(false) },
          )
        }
      />
    </>
  );
}
