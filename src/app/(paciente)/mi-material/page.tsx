"use client";

import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
import { Skeleton } from "@/componentes/ui/skeleton";
import { FilaMaterial } from "@/componentes/biblioteca/FilaMaterial";

/** Mi material: guías y enlaces que el nutricionista compartió con el paciente. */
export default function PaginaMiMaterial() {
  const { miMaterial } = useBiblioteca();
  const consulta = miMaterial();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi material</h1>
        <p className="text-sm text-muted-foreground">
          Guías, documentos y enlaces que tu nutricionista compartió con vos.
        </p>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (consulta.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tenés material compartido.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {consulta.data!.map((material) => (
            <FilaMaterial key={material.id} material={material} />
          ))}
        </ul>
      )}
    </div>
  );
}
