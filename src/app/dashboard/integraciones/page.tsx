import { CalendarClock, Mail, Lock } from "lucide-react";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

const INTEGRACIONES = [
  {
    icono: CalendarClock,
    nombre: "Google Calendar",
    descripcion:
      "Sincronizá tus turnos con tu calendario de Google en ambos sentidos, para verlos también en tu teléfono.",
  },
  {
    icono: Mail,
    nombre: "Gmail",
    descripcion:
      "Enviá los recordatorios y comunicaciones desde tu propia casilla de Gmail, con tu firma.",
  },
];

/** Pantalla de integraciones externas — todavía en preparación. */
export default function PaginaIntegraciones() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conectá servicios externos para trabajar más cómodo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRACIONES.map((integracion) => (
          <Card key={integracion.nombre}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <integracion.icono className="h-5 w-5 text-primary" />
                  {integracion.nombre}
                </span>
                <Badge variant="secondary">Próximamente</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{integracion.descripcion}</p>
              <Button variant="outline" disabled>
                <Lock className="h-4 w-4" />
                Conectar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Cuando estén disponibles, tus credenciales se guardarán cifradas (AES-256-GCM) y
        nunca en texto plano.
      </p>
    </div>
  );
}
