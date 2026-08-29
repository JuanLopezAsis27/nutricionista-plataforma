"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Camera, Info } from "lucide-react";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import type { ResultadoAnalisisComidaDto } from "@/aplicacion/dtos/ia.dto";
import { useIA } from "@/lib/hooks/useIA";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent } from "@/componentes/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { PensandoAnimado } from "@/componentes/ia/PensandoAnimado";

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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" /> Asistente
        </h1>
        <p className="text-sm text-muted-foreground">
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
          <Chat />
        </TabsContent>
        <TabsContent value="comida">
          <AnalizarComida />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Chat() {
  const { misConsultas, preguntar } = useIA();
  const consulta = misConsultas();
  const consultas = consulta.data ?? [];
  const [pregunta, setPregunta] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consultas.length, preguntar.isPending]);

  function enviar() {
    const texto = pregunta.trim();
    if (!texto || preguntar.isPending) return;
    preguntar.mutate({ pregunta: texto });
    setPregunta("");
  }

  return (
    <Card className="flex h-[65vh] flex-col p-3">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {consulta.isLoading ? (
          <Skeleton className="h-10 w-2/3" />
        ) : consultas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Preguntale al asistente sobre tu plan, tus objetivos o hábitos.
          </p>
        ) : (
          consultas.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {item.pregunta}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                  {item.respuesta}
                </div>
              </div>
            </div>
          ))
        )}
        {/* Optimista: el mensaje enviado se muestra al instante + "pensando" animado. */}
        {preguntar.isPending && preguntar.variables && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {preguntar.variables.pregunta}
              </div>
            </div>
            <PensandoAnimado />
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="mt-2 flex items-end gap-2 border-t pt-2">
        <Textarea
          rows={1}
          value={pregunta}
          placeholder="Escribí tu pregunta…"
          className="max-h-32 min-h-10 resize-none"
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <Button
          size="icon"
          onClick={enviar}
          disabled={preguntar.isPending || pregunta.trim().length === 0}
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
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
