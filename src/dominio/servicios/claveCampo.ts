/**
 * Slug estable a partir del nombre de un campo, más un sufijo aleatorio corto.
 *
 * Es la clave con la que se guarda el VALOR de un campo personalizado en la
 * ficha de cada paciente, y NO cambia nunca: renombrar "Adherencia" a
 * "Adherencia previa" no puede vaciar el campo en las 300 historias que ya lo
 * tenían cargado.
 *
 * El sufijo evita que dos campos distintos colisionen en la misma clave
 * ("Suplementos" y "suplementos!"), que dejaría a los dos escribiendo sobre el
 * mismo valor.
 *
 * Vive acá, y no en una de las entidades, porque la usan los DOS conjuntos de
 * campos personalizados —los de la historia clínica y los de las evoluciones—
 * y la regla del slug tiene que ser una sola: dos derivaciones distintas darían
 * claves distintas para el mismo nombre, y con eso las lecturas de la IA
 * dejarían de encontrar el campo en uno de los dos lados.
 */
export function derivarClave(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sufijo = crypto.randomUUID().slice(0, 8);
  return `${base || "campo"}-${sufijo}`;
}
