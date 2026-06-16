"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useDietas } from "@/lib/hooks/useDietas";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { VistaDieta } from "@/componentes/dietas/VistaDieta";
import { FormularioAsignacion } from "@/componentes/dietas/FormularioAsignacion";

export default function PaginaDetalleDieta() {
  const params = useParams<{ id: string }>();
  const { obtenerPorId } = useDietas();
  const [asignar, setAsignar] = useState(false);

  const dieta = obtenerPorId({ id: params.id });

  if (dieta.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (dieta.isError || !dieta.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No se encontró la dieta.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/dietas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/dietas">
            <ArrowLeft className="h-4 w-4" />
            Volver a dietas
          </Link>
        </Button>
        <Button onClick={() => setAsignar(true)}>
          <UserPlus className="h-4 w-4" />
          Asignar a paciente
        </Button>
      </div>

      <VistaDieta dieta={dieta.data} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pacientes con esta dieta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El listado de pacientes con esta dieta asignada estará disponible próximamente.
          </p>
        </CardContent>
      </Card>

      <Dialog open={asignar} onOpenChange={setAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{dieta.data.nombre}»</DialogTitle>
          </DialogHeader>
          <FormularioAsignacion dietaId={dieta.data.id} onTerminado={() => setAsignar(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
