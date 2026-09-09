"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { TODAS_LAS_SEDES, type SedeElegida } from "@/lib/sedes";

const CLAVE = "nutricrm:sedeActiva";

interface ContextoSedeActiva {
  sedeActiva: SedeElegida;
  elegirSede: (sede: SedeElegida) => void;
  /** El id concreto, o null cuando se están mirando todas juntas. */
  sedeActivaId: string | null;
}

const Contexto = createContext<ContextoSedeActiva | null>(null);

/** Lee la preferencia guardada sin romper si el navegador no deja. */
function leerGuardada(): SedeElegida {
  try {
    return localStorage.getItem(CLAVE) ?? TODAS_LAS_SEDES;
  } catch {
    return TODAS_LAS_SEDES;
  }
}

/**
 * Qué establecimiento está mirando el profesional.
 *
 * Es una preferencia de VISTA y no un límite de acceso: recorta la agenda al
 * lugar donde está trabajando y precarga el alta de turnos, nada más. El
 * aislamiento sigue siendo `nutricionistaId` y nada lo acompaña — los
 * pacientes, planes y recetas son del consultorio entero, y filtrarlos por sede
 * escondería la ficha de alguien por haber cambiado el selector.
 *
 * Por eso vive en `localStorage` y no en la sesión ni en la base: es de este
 * navegador, no del usuario. Arranca en TODAS —el calendario unificado— porque
 * el profesional es uno solo y su semana es una: mirar un lugar a la vez es lo
 * excepcional, no lo normal.
 */
export function ProveedorSedeActiva({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inicializador perezoso: `localStorage` no existe en el render del servidor,
  // y leerlo en un efecto haría parpadear la vista de TODAS a la guardada.
  const [sedeActiva, setSedeActiva] = useState<SedeElegida>(() =>
    typeof window === "undefined" ? TODAS_LAS_SEDES : leerGuardada(),
  );

  const elegirSede = useCallback((sede: SedeElegida) => {
    setSedeActiva(sede);
    try {
      localStorage.setItem(CLAVE, sede);
    } catch {
      // Modo privado o almacenamiento bloqueado: la elección vale para esta
      // sesión igual. No es un dato que se pueda perder.
    }
  }, []);

  return (
    <Contexto.Provider
      value={{
        sedeActiva,
        elegirSede,
        sedeActivaId: sedeActiva === TODAS_LAS_SEDES ? null : sedeActiva,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSedeActiva(): ContextoSedeActiva {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error(
      "useSedeActiva necesita estar dentro de <ProveedorSedeActiva>.",
    );
  }
  return contexto;
}
