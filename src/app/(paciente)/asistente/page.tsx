"use client";

import { useState } from "react";
import { Sparkles, Camera, Info } from "lucide-react";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import type { ResultadoAnalisisComidaDto } from "@/aplicacion/dtos/ia.dto";
import { useIA } from "@/lib/hooks/useIA";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent } from "@/componentes/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { AsistentePacienteChat } from "@/componentes/ia/AsistentePacienteChat";

function BannerDemo() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-muted-foreground">
        Función en preparación. Hoy ves una <strong>demostración</strong>:
        cuando la IA esté activa, va a usar tus datos para darte respuestas y
        análisis reales.
      </p>
    </div>
  );
}

export default function PaginaAsistente() {
  const { estado } = useIA();
  const asistenteActivo = estado().data?.asistenteActivo ?? false;

  return (
    <div className="space-y-4">
      {/* La única pantalla del portal sin el encabezado con degradado: acá el
          alto es la función. El chat ocupa lo que queda de la ventana, y un
          encabezado de 7rem se lo come sin dar nada a cambio. */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </span>
          Asistente
        </h1>
        <p className="pt-1.5 text-sm text-muted-foreground">
          Hacé preguntas sobre tu plan o analizá una foto de tu comida.
        </p>
      </div>

      {!asistenteActivo && <BannerDemo />}

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="comida">Analizar comida</TabsTrigger>
        </TabsList>
        <TabsContent value="chat">
          <AsistentePacienteChat />
        </TabsContent>
        <TabsContent value="comida">
          <AnalizarComida />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalizarComida() {
  const { analizarFoto } = useIA();
  const [archivo, setArchivo] = useState<ArchivoSalidaDto | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [resultado, setResultado] = useState<ResultadoAnalisisComidaDto | null>(
    null,
  );

  function analizar() {
    analizarFoto.mutate(
      {
        archivoId: archivo?.id ?? null,
        descripcion: descripcion.trim() || null,
      },
      { onSuccess: (r) => setResultado(r) },
    );
  }

  return (
    <div className="space-y-4">
      <SubidorArchivo
        contexto="foto-comida"
        accept="image/*"
        onSubido={(a) => setArchivo(a)}
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Descripción (opcional)</p>
        <Input
          placeholder="Ej: milanesa con puré y ensalada"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <Button
        onClick={analizar}
        disabled={
          analizarFoto.isPending || (!archivo && descripcion.trim() === "")
        }
      >
        <Camera className="h-4 w-4" />
        {analizarFoto.isPending ? "Analizando…" : "Analizar comida"}
      </Button>

      {resultado && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="font-medium">{resultado.descripcion}</p>
            <p className="text-sm text-muted-foreground">
              Porción estimada: {resultado.porcionEstimada}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Macro etiqueta="Calorías" valor={`${resultado.calorias}`} />
              <Macro etiqueta="Proteínas" valor={`${resultado.proteinasG} g`} />
              <Macro
                etiqueta="Carbohidratos"
                valor={`${resultado.carbohidratosG} g`}
              />
              <Macro etiqueta="Grasas" valor={`${resultado.grasasG} g`} />
            </div>
            <p
              className={cn(
                "flex items-start gap-1.5 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground",
              )}
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Estimado, no exacto.</strong> {resultado.nota}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Macro({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-lg font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  );
}
