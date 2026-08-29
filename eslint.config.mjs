// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

/**
 * Configuración de ESLint (flat config).
 *
 * Reemplaza al script `next lint`, que Next 16 eliminó: el `npm run lint`
 * anterior fallaba con "Invalid project directory ... \lint", así que desde la
 * subida a Next 16 el proyecto no tenía NINGÚN análisis estático más allá de
 * `tsc`. Los `eslint-disable-next-line` que ya había en el código (varios sobre
 * `react-hooks/exhaustive-deps`) no suprimían nada porque no había regla que
 * suprimir.
 *
 * Criterio de selección de reglas: **solo lo que atrapa bugs**. El formato lo
 * resuelve Prettier y no se duplica acá. Las reglas type-aware están acotadas a
 * `src/` (lo que se despliega); los archivos de configuración usan el conjunto
 * sin tipos para no arrastrarlos al programa de TypeScript.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "public/**",
      "respaldos/**",
      "docs/**",
      "audits/**",
      "next-env.d.ts",
    ],
  },

  // --- Base para todo el repositorio ----------------------------------------
  js.configs.recommended,

  // --- TypeScript de la aplicación (con información de tipos) ---------------
  {
    files: ["src/**/*.{ts,tsx}", "prisma/**/*.ts"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // --- Promesas: el bug silencioso de este stack -------------------------
      //
      // `tsc` acepta sin chistar `repositorio.eliminar(id)` sin await. El efecto
      // es una escritura que a veces ocurre y a veces no, y un error que nunca
      // se ve. Ningún test con mocks lo detecta, ni CodeQL, ni el typecheck.
      // Es la regla de mayor rendimiento en una base donde casi todo es async.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // `checksVoidReturn.attributes` apagado: los 22 hallazgos que producía
      // eran TODOS `onSubmit={form.handleSubmit(...)}`, el patrón documentado
      // de react-hook-form. Marcarlos empujaría a envolver cada submit en un
      // wrapper vacío sin ganar nada. El resto de la regla —pasar una función
      // async donde se espera void en lógica, no en JSX— sigue activa.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // `require-await` queda APAGADA a propósito. Producía 660 hallazgos, 583
      // de ellos en el dominio, y ninguno era un bug: en esta base un método es
      // `async` porque el CONTRATO de su interfaz lo es (`ejecutar(): Promise<T>`),
      // no porque su cuerpo necesite await. Forzar `await` sobre un `return`
      // directo agregaría un tick de microtask por llamada a cambio de nada.
      "@typescript-eslint/require-await": "off",

      // `ignoreStatic`: los 25 hallazgos eran referencias a mapeadores
      // estáticos (`.map(ServicioAxiomas.aSalida)`), que no tienen `this` que
      // perder. El caso real que la regla protege —desprender un método de
      // instancia— sigue marcado.
      "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],

      // --- Techo de `any` ----------------------------------------------------
      //
      // Al escribir esto el repo tenía DOS `any` en 933 archivos, ambos
      // justificados con comentario (PrismaClienteSingleton). El valor de la
      // regla no es limpiar: es que el tercero requiera una decisión explícita.
      "@typescript-eslint/no-explicit-any": "error",

      // Variables sin usar: `_` al frente es la vía de escape deliberada.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Deuda anotada, no bloqueante: 3 lugares donde un objeto puede terminar
      // renderizado como "[object Object]" (TablaDatos con columnas sin
      // `render`, y celdas de fórmula de exceljs). Son riesgos reales pero
      // acotados, y arreglarlos pide una decisión de diseño, no un fix mecánico.
      "@typescript-eslint/no-base-to-string": "warn",
    },
  },

  // --- React / Next.js ------------------------------------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": next,
      "react-hooks": reactHooks,
      "jsx-a11y": a11y,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      ...reactHooks.configs["recommended-latest"].rules,
      ...a11y.flatConfigs.recommended.rules,

      // La regla que detecta stale closures en efectos. Había tres
      // `eslint-disable-next-line` apuntándole en el código sin que corriera.
      "react-hooks/exhaustive-deps": "error",

      // El repo usa `<label><input/><span>Texto<span>Ayuda</span></span></label>`,
      // que es accesible pero deja el texto a tres niveles del label. Con la
      // profundidad por defecto (2) la regla lo daba por vacío.
      "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }],

      // --- Reglas del React Compiler: en `warn`, con fecha de vencimiento ----
      //
      // Llegan con eslint-plugin-react-hooks 7 y señalan cosas REALES (crear
      // componentes dentro del render en SidebarNav resetea su estado en cada
      // pintado; `Date.now()` en render puede desincronizar la hidratación).
      // Van en `warn` y no en `error` por una razón de proceso, no de mérito:
      // son 33 hallazgos sobre patrones que hoy funcionan, y meterlos como
      // bloqueante en el primer día del linter garantiza que alguien termine
      // desactivando el gate entero. Están anotadas como deuda en la auditoría
      // de calidad (§3) y corresponde subirlas a "error" una vez saldadas.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },

  // --- Excepciones de accesibilidad, acotadas por archivo -------------------
  //
  // Van acá y no como `eslint-disable-next-line` en el código por una razón
  // práctica: el formateador del repo reacomoda el JSX y desprende la directiva
  // de la línea que apunta, dejándola sin efecto y sin que nadie lo note.
  {
    files: ["src/componentes/ui/**"],
    rules: {
      // Primitivos de shadcn/ui: `<h3 {...props} />` recibe el texto por
      // `children` dentro del spread, y la regla no puede verlo. El contenido
      // real lo ponen los llamadores, que sí quedan cubiertos por la regla.
      "jsx-a11y/heading-has-content": "off",
    },
  },
  {
    files: ["src/componentes/pacientes/SelectorPaciente.tsx"],
    rules: {
      // El `autoFocus` está en el campo de búsqueda DENTRO de un popover que el
      // usuario acaba de abrir con esa intención: no roba el foco al cargar la
      // página, que es el daño que la regla previene.
      "jsx-a11y/no-autofocus": "off",
    },
  },

  // --- Tests ----------------------------------------------------------------
  {
    files: [
      "src/**/*.test.{ts,tsx}",
      "src/**/_ayudas-test.ts",
      "src/**/_ayudas/**",
    ],
    rules: {
      // Los mocks de test asignan y comparan valores deliberadamente laxos;
      // exigirles el mismo rigor de tipos que al código de producción produce
      // ruido sin atrapar un solo bug real.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // --- Archivos de configuración y scripts (sin información de tipos) -------
  {
    files: ["*.{js,mjs,cjs}", "scripts/**/*.mjs", "postcss.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
