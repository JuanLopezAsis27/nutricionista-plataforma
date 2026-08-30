"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PerfilDeportivoSalidaDto } from "@/aplicacion/dtos/deportivo.dto";
import {
  NIVELES_DEPORTIVOS,
  FASES_TEMPORADA,
} from "@/dominio/entidades/PerfilDeportivo";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { ETIQUETA_NIVEL, ETIQUETA_FASE, aNumero } from "./comun";
import { esquemaPerfil, type DatosPerfil } from "./esquemas";

/** Alta y edición del perfil deportivo del paciente. */
export function FormularioPerfil({
  pacienteId,
  perfil,
  onTerminado,
}: {
  pacienteId: string;
  perfil: PerfilDeportivoSalidaDto | null;
  onTerminado: () => void;
}) {
  const { guardarPerfil } = useDeportivo();

  const form = useForm<DatosPerfil>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: {
      deporte: perfil?.deporte ?? "",
      disciplina: perfil?.disciplina ?? "",
      nivel: perfil?.nivel ?? "AMATEUR",
      fase: perfil?.fase ?? "PRETEMPORADA",
      diasEntrenamientoSemana:
        perfil?.diasEntrenamientoSemana?.toString() ?? "",
      horasSemana: perfil?.horasSemana?.toString() ?? "",
      pesoCategoriaKg: perfil?.pesoCategoriaKg?.toString() ?? "",
      posicion: perfil?.posicion ?? "",
      objetivo: perfil?.objetivo ?? "",
      notas: perfil?.notas ?? "",
    },
  });

  function alEnviar(datos: DatosPerfil) {
    guardarPerfil.mutate(
      {
        pacienteId,
        deporte: datos.deporte,
        disciplina: datos.disciplina.trim() || null,
        nivel: datos.nivel,
        fase: datos.fase,
        diasEntrenamientoSemana: aNumero(datos.diasEntrenamientoSemana),
        horasSemana: aNumero(datos.horasSemana),
        pesoCategoriaKg: aNumero(datos.pesoCategoriaKg),
        posicion: datos.posicion.trim() || null,
        objetivo: datos.objetivo.trim() || null,
        notas: datos.notas.trim() || null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="deporte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deporte</FormLabel>
                <FormControl>
                  <Input placeholder="Atletismo, fútbol, boxeo…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="disciplina"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disciplina / prueba</FormLabel>
                <FormControl>
                  <Input placeholder="Maratón, peso welter…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nivel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NIVELES_DEPORTIVOS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {ETIQUETA_NIVEL[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fase de temporada</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FASES_TEMPORADA.map((f) => (
                      <SelectItem key={f} value={f}>
                        {ETIQUETA_FASE[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="diasEntrenamientoSemana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de entrenamiento / semana</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="horasSemana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas / semana</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pesoCategoriaKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso de categoría (kg)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="posicion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición / puesto</FormLabel>
                <FormControl>
                  <Input placeholder="Delantero, base…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="objetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo deportivo</FormLabel>
              <FormControl>
                <Input placeholder="Ej. bajar de 3h30 en maratón" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={guardarPerfil.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={guardarPerfil.isPending}>
            {guardarPerfil.isPending ? "Guardando…" : "Guardar perfil"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// --- Competencias ----------------------------------------------------------
