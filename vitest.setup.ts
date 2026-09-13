/**
 * Setup global de Vitest.
 *
 * Agrega los matchers de jest-dom (`toBeInTheDocument`, `toBeDisabled`,
 * `toHaveValue`...). Es barato y no toca los tests de dominio, que corren en
 * entorno `node` y simplemente no los usan.
 */
import "@testing-library/jest-dom/vitest";

/**
 * Relleno de las APIs de puntero que jsdom no implementa.
 *
 * Los `Select` de Radix las llaman al abrirse. jsdom no tiene ninguna, así que
 * sin esto el primer clic sobre un desplegable revienta con
 * «target.hasPointerCapture is not a function» y el menú nunca se abre: la
 * opción no existe en el DOM y el test falla diciendo que no encuentra el
 * elemento, que es un síntoma que no se parece en nada a la causa.
 *
 * Va en el setup global y no en un test porque es una carencia del ENTORNO, no
 * de un caso: le pasa a cualquier prueba que abra un desplegable.
 *
 * `globalThis.Element` solo existe en el entorno jsdom; en los tests de dominio
 * (entorno `node`) este bloque no hace nada.
 */
if (typeof globalThis.Element !== "undefined") {
  const prototipo = globalThis.Element.prototype as unknown as Record<
    string,
    unknown
  >;

  prototipo.hasPointerCapture ??= () => false;
  prototipo.setPointerCapture ??= () => {};
  prototipo.releasePointerCapture ??= () => {};
  // Radix la usa para decidir si desplazar la opción activa a la vista.
  prototipo.scrollIntoView ??= () => {};
}
