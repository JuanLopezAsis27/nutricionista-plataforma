"use client";

import { useRouter } from "next/navigation";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Skeleton } from "@/componentes/ui/skeleton";
import { TarjetaReceta } from "@/componentes/recetas/TarjetaReceta";

/** Mis recetas: las recetas que el nutricionista compartió con el paciente. */
export default function PaginaMisRecetas() {
  const { misRecetas } = useRecetas();
  const router = useRouter();
  const consulta = misRecetas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis recetas</h1>
        <p className="text-sm text-muted-foreground">
          Recetas que tu nutricionista compartió con vos.
        </p>
      </div>

      {consulta.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <Skeleton key={indice} className="h-52 w-full" />
          ))}
        </div>
      ) : (consulta.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tenés recetas compartidas.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {consulta.data!.map((receta) => (
            <TarjetaReceta
              key={receta.id}
              receta={receta}
              // La receta se abre en su propia pantalla: el documento que
              // pueda traer necesita el ancho completo.
              onVer={() => router.push(`/mis-recetas/${receta.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
