import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Longitudes válidas de un número E.164 (sin el "+"). */
const MIN_DIGITOS = 8;
const MAX_DIGITOS = 15;

/** Prefijo internacional que se asume cuando la configuración no define otro. */
export const PREFIJO_PAIS_POR_DEFECTO = "54";

/**
 * Normaliza un teléfono de texto libre a E.164 sin "+" (lo que espera wa.me).
 *
 * `Paciente.telefono` se carga a mano y llega en cualquier formato
 * ("011 15 5555-4444", "+54 9 11 5555 4444", "1155554444"), así que hay que
 * limpiarlo antes de armar el enlace.
 *
 * Regla argentina: los celulares necesitan el 9 después del 54 y NO llevan el
 * 15 (que es el prefijo de marcación local). Sin el 9, wa.me abre WhatsApp
 * pero no encuentra el chat, que es el modo silencioso en que esto falla.
 */
export function normalizarTelefonoE164(
  telefono: string | null | undefined,
  prefijoPais: string = PREFIJO_PAIS_POR_DEFECTO,
): string {
  const crudo = (telefono ?? "").trim();
  if (crudo.length === 0) {
    throw new ErrorValidacion("El paciente no tiene teléfono cargado.");
  }

  const prefijo = soloDigitos(prefijoPais) || PREFIJO_PAIS_POR_DEFECTO;
  const internacional = crudo.startsWith("+") || crudo.startsWith("00");
  let digitos = soloDigitos(crudo);
  if (digitos.length === 0) {
    throw new ErrorValidacion(`El teléfono "${crudo}" no tiene dígitos.`);
  }

  let completo: string;
  if (internacional) {
    completo = digitos.startsWith("00") ? digitos.slice(2) : digitos;
  } else {
    // Número local: el 0 inicial es el prefijo de larga distancia, no parte del número.
    digitos = digitos.replace(/^0+/, "");
    completo = digitos.startsWith(prefijo) ? digitos : `${prefijo}${digitos}`;
  }

  if (completo.startsWith("54")) {
    completo = `549${normalizarNacionalArgentino(completo.slice(2))}`;
  }

  if (completo.length < MIN_DIGITOS || completo.length > MAX_DIGITOS) {
    throw new ErrorValidacion(
      `El teléfono "${crudo}" no parece un número válido para WhatsApp.`,
    );
  }
  return completo;
}

/**
 * Deja el número nacional argentino en su forma canónica de 10 dígitos
 * (código de área + abonado), sin el 9 de celular ni el 15 de marcación local.
 */
function normalizarNacionalArgentino(nacional: string): string {
  let n = nacional.startsWith("9") ? nacional.slice(1) : nacional;

  // Con el 15 el número nacional tiene 12 dígitos en vez de 10; el 15 aparece
  // justo después del código de área, que puede ser de 2, 3 o 4 dígitos.
  if (n.length === 12) {
    for (const inicio of [2, 3, 4]) {
      if (n.slice(inicio, inicio + 2) === "15") {
        n = n.slice(0, inicio) + n.slice(inicio + 2);
        break;
      }
    }
  }
  return n;
}

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}
