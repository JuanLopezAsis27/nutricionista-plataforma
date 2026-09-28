/**
 * Clases del diálogo que contiene el formulario de plan.
 *
 * En el celular ocupa la pantalla entera y con menos padding: centrado al 90 %
 * del alto y con p-6, al formulario le quedaba una columna angosta y el
 * teclado tapaba la mitad. Desde `sm` vuelve a ser un diálogo centrado.
 *
 * Lo usan las tres pantallas que abren el formulario (planes, edición de un
 * plan y la ficha del paciente); con tres copias de la clase, la próxima
 * corrección de mobile se aplicaba en una sola. El `p-4` es el que compensa
 * la barra de botones fija de `FormularioPlan` (`-mx-4 -mb-4`).
 */
export const CLASES_DIALOGO_PLAN =
  "h-[100dvh] max-h-[100dvh] max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-lg sm:p-6";
