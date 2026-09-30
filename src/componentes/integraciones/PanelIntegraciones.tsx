"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { RUTA_INTEGRACIONES } from "@/lib/rutas";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentes/ui/tabs";
import { TarjetaGoogle } from "@/componentes/integraciones/TarjetaGoogle";
import { FormularioWhatsappApi } from "@/componentes/configuracion/FormularioWhatsappApi";
import { FormularioCredenciales } from "@/componentes/configuracion/FormularioCredenciales";

const MENSAJES_ERROR: Record<string, string> = {
  "no-configurado": "La integración con Google todavía no está configurada.",
  "no-disponible": "La integración con Google no está disponible.",
  estado:
    "No se pudo validar la conexión (token de seguridad). Probá de nuevo.",
  denegado: "Cancelaste el permiso en Google.",
  fallo: "No se pudo conectar con Google. Probá de nuevo.",
};

/**
 * Servicios externos que el consultorio conecta. Es la pestaña
 * «Integraciones» de Configuración: fue una sección propia de la barra
 * lateral hasta que la barra tuvo demasiadas entradas, y son trámites que se
 * hacen una vez, no algo que se visita a diario.
 *
 * Una pestaña por servicio, y no todo apilado en una sola pantalla: cada uno
 * es un trámite independiente —con su alta, sus credenciales y sus pasos— que
 * se hace una vez y no se vuelve a tocar. Verlos todos juntos hacía que la
 * pantalla pareciera una lista de tareas pendientes.
 *
 * WhatsApp vive acá y no en Configuración porque conectar la Cloud API es
 * exactamente eso: dar de alta un servicio externo con sus credenciales, igual
 * que Google. Lo que quedó en Configuración es lo que sí es del
 * consultorio: cómo se normalizan los teléfonos de los pacientes.
 *
 * Los alimentos estuvieron acá mientras eran una base externa que se
 * consultaba; desde el catálogo de la plataforma y las listas propias son
 * contenido de trabajo, como las recetas, y tienen su sección
 * (`/dashboard/alimentos`).
 */
export function PanelIntegraciones() {
  // Feedback del flujo OAuth (?conectado / ?error) sin useSearchParams (evita Suspense).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("conectado")) toast.success("¡Google conectado!");
    const error = params.get("error");
    if (error)
      toast.error(MENSAJES_ERROR[error] ?? "Ocurrió un error con Google.");
    if (params.get("conectado") || error) {
      window.history.replaceState({}, "", RUTA_INTEGRACIONES);
    }
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Servicios externos que conectás al consultorio. Tus claves se guardan
        cifradas y nunca vuelven al navegador.
      </p>

      <Tabs defaultValue="google">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="ia">IA</TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="mt-4">
          <TarjetaGoogle />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <FormularioWhatsappApi />
        </TabsContent>

        <TabsContent value="ia" className="mt-4">
          <FormularioCredenciales />
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Tus credenciales se guardan cifradas (AES-256-GCM) y nunca en texto
        plano.
      </p>
    </div>
  );
}
