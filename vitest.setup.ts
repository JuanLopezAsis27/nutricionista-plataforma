/**
 * Setup global de Vitest.
 *
 * Solo agrega los matchers de jest-dom (`toBeInTheDocument`, `toBeDisabled`,
 * `toHaveValue`...). Es barato y no toca los tests de dominio, que corren en
 * entorno `node` y simplemente no los usan.
 */
import "@testing-library/jest-dom/vitest";
