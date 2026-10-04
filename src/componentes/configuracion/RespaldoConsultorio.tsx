import { ArchiveRestore, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";

/**
 * Descarga del respaldo completo del consultorio (`/api/respaldo`).
 *
 * Es un enlace y no una mutación: el ZIP se arma mientras se baja, y así el
 * navegador muestra el progreso y lo guarda directo en disco, sin pasar el
 * archivo entero por la memoria de la pestaña.
 */
export function RespaldoConsultorio() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArchiveRestore className="h-5 w-5 text-primary" /> Respaldo del
          consultorio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Descargá todos tus datos y archivos en un ZIP ordenado: una carpeta
          por paciente —con su evaluación, sus mediciones, su diario con las
          fotos, sus planes, laboratorios, grabaciones y archivos— y una carpeta
          «Sin paciente» con las recetas, la biblioteca y el resto. Los
          pacientes archivados también se incluyen.
        </p>
        <p className="text-xs text-muted-foreground">
          Con muchos archivos puede tardar varios minutos; el archivo se va
          descargando mientras se arma. Guardalo en un lugar seguro: tiene
          información clínica de tus pacientes.
        </p>
        <div className="flex justify-end">
          <Button asChild>
            <a href="/api/respaldo" download>
              <Download className="h-4 w-4" />
              Descargar respaldo
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
