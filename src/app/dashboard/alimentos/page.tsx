"use client";

import { Apple } from "lucide-react";
import { ImportadorAlimentos } from "@/componentes/alimentos/ImportadorAlimentos";
import { ListaAlimentosPropios } from "@/componentes/alimentos/ListaAlimentosPropios";
import { CriteriosIngredientes } from "@/componentes/alimentos/CriteriosIngredientes";

/**
 * Los alimentos del consultorio: su lista propia, la de la plataforma y los
 * criterios con que se filtra el buscador.
 *
 * Es una sección propia y no una pestaña de Integraciones (donde estuvo) ni
 * del Recetario: es contenido de trabajo como las recetas, pero lo usan
 * también los planes y los planes semanales. Ver `docs/CATALOGO-BASE.md`.
 */
export default function PaginaAlimentos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Apple className="h-6 w-6 text-primary" /> Alimentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Los alimentos que usás en recetas y planes: tu lista y los
          predeterminados de la plataforma.
        </p>
      </div>

      <ImportadorAlimentos />
      <ListaAlimentosPropios />
      {/* Los de la plataforma se USAN (aparecen en el buscador) pero no se
          editan: lo que agrega el profesional va a su propia lista. */}
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Predeterminados de la plataforma</h3>
          <p className="text-sm text-muted-foreground">
            Los ven todos los consultorios en el buscador de alimentos. Si
            querés otros macros para alguno, agregalo a tu lista: el tuyo
            aparece primero.
          </p>
        </div>
        <ListaAlimentosPropios origen="predeterminados" />
      </section>

      <CriteriosIngredientes />
    </div>
  );
}
