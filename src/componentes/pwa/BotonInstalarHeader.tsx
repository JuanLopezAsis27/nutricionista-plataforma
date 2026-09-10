"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import {
  INSTRUCCION_IOS,
  instalar,
  useInstalacionPwa,
} from "@/componentes/pwa/instalacion";

/**
 * Botón de «instalar la app» para las barras de navegación.
 *
 * Es la puerta permanente: el cartel (`BotonInstalarApp`) aparece una vez por
 * visita y se va solo, así que sin esto quien lo dejara pasar se quedaba sin
 * forma de instalar desde la interfaz.
 *
 * **Se dibuja solo si hay algo para ofrecer**, y eso ya resuelve el «solo en la
 * versión de navegador»: cuando la app corre instalada —ventana propia, iOS con
 * `navigator.standalone`, o el WebView de Capacitor— el estado dice que no se
 * puede instalar y el componente devuelve `null`. Chrome tampoco entrega el
 * evento si la app ya está instalada, aunque se la esté mirando desde una
 * pestaña común, así que el botón desaparece también ahí, que es lo correcto:
 * no hay nada que instalar dos veces.
 */
export function BotonInstalarHeader() {
  const { sePuedeInstalar, esIos } = useInstalacionPwa();

  if (!sePuedeInstalar) return null;

  async function alHacerClic() {
    // En iOS no hay diálogo posible: Safari no implementa el evento y la única
    // vía es Compartir → «Agregar a inicio». Se explica en un toast en lugar de
    // esconder el botón, porque si no el iPhone se queda sin ninguna pista.
    if (esIos) {
      toast.info("Instalar la app", { description: INSTRUCCION_IOS });
      return;
    }

    const resultado = await instalar();
    if (resultado === "no-disponible") {
      toast.info("Instalar la app", {
        description:
          "Buscá «Instalar» en el menú de tu navegador para agregarla como aplicación.",
      });
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Instalar la app"
      aria-label="Instalar la app"
      onClick={alHacerClic}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
