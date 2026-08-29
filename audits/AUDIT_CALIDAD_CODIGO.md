# Auditoría de Calidad de Código — nutricionista-app

**Fecha:** 2026-08-29
**Rama auditada:** `audit/security` (base `63fad48`)
**Alcance:** `src/` completo (933 archivos `.ts`/`.tsx`), `prisma/`, `vitest.config.ts`,
`tsconfig.json`, `package.json`, `.github/workflows/`.
**Metodología:** priorización por señal de git (archivos más tocados en el
historial completo) + tamaño/complejidad + criticidad de negocio. Se ejecutó la
suite de tests (`vitest run`) y el script de lint (`npm run lint`) contra el
árbol de trabajo actual.

---

## 0. Resumen ejecutivo

**El diseño de este repositorio está por encima del promedio de un proyecto de
este tamaño, y bastante por encima del promedio de un CRM.** Las decisiones
estructurales son correctas y —lo más raro— están _defendidas por tests_:

- Arquitectura hexagonal real, con un test que congela la regla de dependencias
  (`src/arquitectura.test.ts`). Que la regla de capas sea ejecutable en CI y no
  un diagrama en un README es la diferencia entre una arquitectura y una
  intención.
- `tsconfig.json` con `strict` **y** `noUncheckedIndexedAccess` **y**
  `noImplicitOverride`. Es una configuración exigente y el código la sostiene.
- **Dos** usos de `any` en todo `src/` (`PrismaClienteSingleton.ts:113-114`),
  ambos justificados con comentario. Cero `@ts-ignore`. Cero `@ts-expect-error`.
- Cero `TODO`/`FIXME`/`HACK` en el código. No hay deuda _marcada_.
- 722 tests en 165 archivos, verdes, en 9.8 s. Los casos de uso se testean
  contra mocks de las interfaces del dominio, nunca contra Prisma.
- Contenedor de DI perezoso y modularizado en 26 archivos (`contenedor/modulos/`).
- Comentarios que explican **el porqué**, no el qué (`IPlanRepositorio.ts:9-14`,
  `PrismaRepositorioGrupoPlan.ts:47-49`). Esto es infrecuente y hay que
  preservarlo activamente.

**El problema no es el diseño: es que no hay red que impida degradarlo.** El
riesgo se concentra en tres lugares:

1. **No existe linter.** No hay ESLint instalado ni configurado, y el script
   `npm run lint` está **roto** desde la subida a Next 16. Sin embargo hay 11
   directivas `eslint-disable-next-line` en el código, lo que significa que
   reglas que alguna vez atraparon bugs —`react-hooks/exhaustive-deps` entre
   ellas— hoy **no corren en ningún lado**.
2. **La cobertura tiene forma de "L".** El dominio está bien cubierto; la
   infraestructura de repositorios (4.977 líneas, 31 mapeadores entidad↔fila) y
   la totalidad de la UI (≈280 archivos `.tsx`) tienen **cero** tests, y
   `vitest.config.ts:13` los excluye por construcción.
3. **Tres puntos de acoplamiento crecen sin freno**: `ServicioEvaluacion` (20
   dependencias de constructor), `IPlanRepositorio` (17 métodos, dos agregados)
   y `FormularioPlan.tsx` (913 líneas, 451 de JSX en un solo `return`).

| Severidad  | Cantidad |
| ---------- | -------- |
| 🔴 Crítica | 1        |
| 🟠 Alta    | 5        |
| 🟡 Media   | 7        |
| 🔵 Baja    | 5        |

> **Nota de método:** no se reportan cuestiones de formato, orden de imports ni
> preferencias de estilo. Todo hallazgo listado tiene un mecanismo concreto por
> el cual produce un bug o encarece un cambio.

---

## 1. Tabla de hallazgos

| #   | Archivo / módulo                                                                                                                                                   | Problema                                                                                                                                                                                                                                                                                                                                                                                                          | Principio violado                                                                                                                                             | Severidad             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | `package.json:11`, raíz del repo                                                                                                                                   | `"lint": "next lint"` **falla**: Next 16 eliminó el subcomando y el script interpreta `lint` como directorio (`Invalid project directory provided, no such directory: ...\lint`). No hay ESLint ni plugin alguno en `devDependencies`, ni `eslint.config.*`. Coexisten 11 `eslint-disable-next-line` en `src/` (3 sobre `react-hooks/exhaustive-deps`) que hoy no suprimen nada porque no hay regla que suprimir. | Fail-fast / shift-left. Un análisis estático que no corre es peor que no tenerlo: se cree que la red existe.                                                  | 🔴 Crítica            |
| 2   | `vitest.config.ts:13` — `include: ["src/**/*.test.ts"]`                                                                                                            | El patrón excluye `.tsx` por construcción. Los ≈280 componentes de UI —incluidos formularios clínicos con validación Zod propia, como `FormularioMedicion.tsx` (591 ln) y `FormularioPlan.tsx` (913 ln)— no tienen ni **pueden tener** tests con la configuración actual.                                                                                                                                         | Testabilidad / defensa en profundidad. La validación de un plan está duplicada en el DTO y en el esquema del formulario; solo una de las dos está verificada. | 🟠 Alta               |
| 3   | `src/infraestructura/repositorios/*` (4.977 ln, 31 métodos `private mapear`)                                                                                       | Ningún repositorio Prisma tiene test. El mapeo fila→entidad es código imperativo con casts de enum (`fila.ambito as AmbitoAxioma`, `PrismaRepositorioAxioma.ts:95`) que **el compilador no verifica**: un campo mapeado al atributo equivocado, o un enum que dejó de coincidir con el schema, pasa `tsc --noEmit` y llega a producción.                                                                          | Confianza infundada en el sistema de tipos / falta de tests de contorno.                                                                                      | 🟠 Alta               |
| 4   | `.github/workflows/ci.yml`                                                                                                                                         | El pipeline corre typecheck, tests, build, `npm audit`, CodeQL y gitleaks —muy completo en seguridad— pero **no tiene paso de lint ni umbral de cobertura**. Un PR puede fusionar 2.000 líneas sin un solo test y el CI queda verde.                                                                                                                                                                              | Quality gate. Sin umbral, la cobertura solo puede bajar.                                                                                                      | 🟠 Alta               |
| 5   | `src/aplicacion/servicios/ServicioEvaluacion.ts:49-70`                                                                                                             | Constructor con **20 dependencias**. La clase orquesta cuatro subdominios que no comparten estado ni invariantes: historia clínica, antropometría/composición, alertas alimentarias y laboratorios. `ServicioRecordatorios.ts:47` repite el patrón (267 ln).                                                                                                                                                      | **SRP** (cuatro razones para cambiar) e **ISP** (todo consumidor arrastra las 20).                                                                            | 🟠 Alta               |
| 6   | `src/dominio/repositorios/IPlanRepositorio.ts:59-109`                                                                                                              | Un solo puerto con **17 métodos** que cubre dos agregados: `PlanNutricional` y `AsignacionPlan`. La consecuencia directa es `PrismaRepositorioPlan.ts` (529 ln, el archivo de infraestructura más grande) y un mock de test que debe implementar 17 métodos para probar un caso de uso que usa uno.                                                                                                               | **ISP**. El comentario del archivo (`:53-56`) reconoce la mezcla y la justifica por conveniencia: es deuda consciente, pero deuda.                            | 🟠 Alta               |
| 7   | `src/componentes/planes/FormularioPlan.tsx` (913 ln)                                                                                                               | Un `return` de **451 líneas** (`:320-771`). El archivo concentra esquema Zod de 90 líneas, dos sentinelas de Radix, conversión de tipos (`aNumero`), estado de archivos, submit, y tres componentes más al final (`:772`, `:869`, `:884`). Patrón repetido en `DashboardComposicion.tsx` (711 ln), `FormularioReceta.tsx` (701 ln), `SeccionDeportiva.tsx` (673 ln).                                              | **SRP** + **KISS**. Un JSX de 451 líneas no entra en una revisión de código: los diffs sobre él se aprueban por confianza.                                    | 🟠 Alta               |
| 8   | `src/dominio/casos-de-uso/_ayudas-test.ts` (1.294 ln, 77 exports)                                                                                                  | Módulo único con todas las fábricas de mocks del dominio. Es el **2.º archivo más modificado del repositorio** (11 commits, empatado con `schema.prisma`). Cada feature nueva lo toca → conflictos de merge sistemáticos y un punto de serialización entre ramas.                                                                                                                                                 | **SRP** aplicado al código de test. El test-support merece el mismo diseño que el de producción.                                                              | 🟡 Media              |
| 9   | 8 repositorios: `PrismaRepositorioSuplemento.ts:67`, `Competencia.ts:67`, `Turno.ts:129`, más `Antropometria`, `Laboratorio`, `Objetivo`, `Plan`, `RegistroDiario` | `private soloFecha(fecha: Date): Date` **copiado literalmente 8 veces**, idéntico carácter por carácter. Es una regla de negocio ("una medición pertenece a un día, no a un instante") replicada en infraestructura.                                                                                                                                                                                              | **DRY** literal. Si mañana hace falta zona horaria local, hay 8 lugares que cambiar y ninguno tiene test.                                                     | 🟡 Media              |
| 10  | `src/lib/hooks/*.ts` (19 archivos)                                                                                                                                 | El bloque `onSuccess: () => { toast.success(...); invalidar(); }` + `onError: (error) => toast.error(error.message)` aparece **77 veces**. `usePlanes.ts` sola tiene 11 repeticiones.                                                                                                                                                                                                                             | **DRY**. El costo real: cambiar la política de errores de la UI —p. ej. dejar de mostrar mensajes crudos del servidor— hoy son 77 ediciones.                  | 🟡 Media              |
| 11  | 57 de 188 casos de uso sin test                                                                                                                                    | Concentrados en los módulos más recientes: `recordatorios/` (12 sin test, incluido `EnviarRecordatorioWhatsapp.ts`, 285 ln), `whatsapp/` (5), `mensajeria/` (5), `secretaria/` (3), `axiomas/` (4). Son exactamente los módulos con más cambio reciente según git.                                                                                                                                                | Cobertura inversamente proporcional al riesgo: lo más nuevo y volátil es lo menos probado.                                                                    | 🟡 Media              |
| 12  | 16 de 130 tests de caso de uso con un único `it()`                                                                                                                 | Ej.: `ObtenerRecetas.test.ts`, `FijarInclusionDia.test.ts`, `AnalizarFotoDeComida.test.ts`. Verifican solo el camino feliz; sin caso de error, de entidad inexistente ni de permiso denegado.                                                                                                                                                                                                                     | Cobertura de línea sin cobertura de comportamiento. Da una señal verde engañosa.                                                                              | 🟡 Media              |
| 13  | ~39 de 45 entidades del dominio sin test                                                                                                                           | Solo `Antropometria`, `MetricaDispositivo`, `PlantillaAntropometrica`, `PlantillaEmail`, `Receta` y `Paciente.telefono` tienen suite propia. Quedan fuera entidades con invariantes reales: `PlanNutricional.ts` (495 ln), `RecordatorioWhatsapp.ts` (308 ln), `Objetivo.ts`, `ConfiguracionConsultorio.ts`.                                                                                                      | Las reglas de negocio se validan indirectamente, a través de casos de uso que las ejercitan de a una.                                                         | 🟡 Media              |
| 14  | `src/dominio/servicios/composicionCorporal.ts` (984 ln)                                                                                                            | Mezcla tres cosas: tipos del dominio (`:28-291`), **270 líneas de tablas de referencia científicas** (`REFERENCIAS_PHANTOM` `:309-480`, `ETIQUETAS_MEDIDA` `:481-579`) y los algoritmos de cálculo (`:580-984`). Las etiquetas de UI viven en el dominio.                                                                                                                                                         | **SRP**. Está bien testeado, así que el riesgo es de mantenibilidad, no de corrección: editar una etiqueta obliga a abrir el archivo de los algoritmos.       | 🟡 Media              |
| 15  | Repo completo                                                                                                                                                      | No hay Prettier, ni `.editorconfig`, ni hooks de pre-commit (husky/lint-staged). El estilo actual es consistente —está bien sostenido a mano— pero depende enteramente de la disciplina de una sola persona.                                                                                                                                                                                                      | Convención no ejecutable. Escala mal al segundo desarrollador.                                                                                                | 🔵 Baja               |
| 16  | `src/servidor/routers/*.ts` (28 archivos, 1.799 ln)                                                                                                                | Los procedimientos que solo delegan repiten el molde `.input(dto).mutation(({ ctx, input }) => ctx.servicios.X.y(input))` ~150 veces. A diferencia del caso 10, acá la repetición es **deseable**: cada línea es un contrato público explícito y abstraerla ocultaría el nivel de permiso del procedimiento.                                                                                                      | Ninguno — se documenta para que no se "refactorice" por error.                                                                                                | 🔵 Baja (informativo) |
| 17  | 35 repositorios con `nutricionistaId: inquilinoActual()` en `crear`                                                                                                | La extensión de Prisma (`PrismaClienteSingleton.ts:117-119`) ya inyecta el campo. La duplicación es **deliberada y está documentada** (`inquilino.ts:5-15`): la FK `NOT NULL` obliga al tipo y cubre escrituras anidadas que la extensión no alcanza.                                                                                                                                                             | Ninguno. Se lista porque es candidato natural a absorberse en la base genérica de §4.                                                                         | 🔵 Baja (informativo) |
| 18  | `src/infraestructura/contenedor/nucleo.ts` (447 ln) + `contenedor.ts` (365 ln)                                                                                     | ~90 imports concretos en dos archivos. `contenedor.ts` es el archivo **más modificado del repo** (12 commits). Es inherente a un contenedor manual y ya está mitigado con `modulos/` y getters perezosos.                                                                                                                                                                                                         | Ninguno grave. Punto caliente a vigilar: si supera ~600 ln conviene registro por módulo.                                                                      | 🔵 Baja               |

---

## 2. Refactors propuestos — antes / después

> Código real del repositorio. **No se aplicó ningún cambio**, según lo pedido.

### 2.1 · Reinstalar el análisis estático (hallazgo #1) — 🔴 Crítico

Es el hallazgo con mejor relación costo/beneficio del informe: son unas horas de
trabajo y devuelve una red que hoy no existe.

**Antes** — `package.json:11`

```json
"lint": "next lint",
```

```console
$ npm run lint
> next lint
Invalid project directory provided, no such directory: ...\nutricionista-app\lint
```

Y en `src/componentes/turnos/FormularioTurno.tsx:146`:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
```

Esa directiva silencia la regla que detecta _stale closures_ en efectos. Hoy no
silencia nada, porque la regla no corre — y tampoco corre sobre los demás
`useEffect` del proyecto, que **no** tienen la directiva.

**Después** — `eslint.config.mjs` (flat config, Next 16 + TypeScript)

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "android/**",
      "nutricion-servicio/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { "@next/next": next, "react-hooks": reactHooks },
    rules: {
      ...next.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // --- Reglas que atrapan bugs, no estilo -------------------------------
      // Un floating promise en un caso de uso = escritura que nunca ocurrió y
      // error que nunca se ve. Es EL bug silencioso de este stack.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // El repo ya tiene solo 2 `any` justificados: fijar el techo.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
```

```jsonc
// package.json
"lint": "eslint .",
"formato": "prettier --check .",
```

**Principio:** _shift-left / fail-fast_. `no-floating-promises` es la regla de
mayor rendimiento en una base async como esta: `tsc` acepta sin chistar un
`repositorio.eliminar(id)` sin `await`, y el efecto es una operación que a veces
ocurre y a veces no. Ninguna otra herramienta del pipeline lo detecta —ni el
typecheck, ni los tests con mocks, ni CodeQL.

> **Advertencia de ejecución:** activar el linter sobre 933 archivos va a
> producir un volumen inicial de avisos. Corresponde correrlo una vez, arreglar
> lo que salga como `error`, y **recién ahí** agregar el gate al CI. Nunca al
> revés: un gate que falla el día uno se termina desactivando.

---

### 2.2 · `ServicioEvaluacion`: partir el servicio de 20 dependencias (hallazgo #5) — 🟠 Alta

**Antes** — `src/aplicacion/servicios/ServicioEvaluacion.ts:49-70`

```ts
export class ServicioEvaluacion {
  constructor(
    private readonly guardarHistoriaUC: GuardarHistoriaClinica,
    private readonly obtenerHistoriaUC: ObtenerHistoriaClinica,
    private readonly registrarAntropometriaUC: RegistrarAntropometria,
    private readonly actualizarAntropometriaUC: ActualizarAntropometria,
    private readonly eliminarAntropometriaUC: EliminarAntropometria,
    private readonly obtenerEvolucionUC: ObtenerEvolucionAntropometrica,
    private readonly obtenerComposicionUC: ObtenerComposicionCorporal,
    private readonly guardarObjetivoComposicionUC: GuardarObjetivoComposicion,
    private readonly eliminarObjetivoComposicionUC: EliminarObjetivoComposicion,
    private readonly guardarPlantillaUC: GuardarPlantillaAntropometrica,
    private readonly eliminarPlantillaUC: EliminarPlantillaAntropometrica,
    private readonly obtenerPlantillasUC: ObtenerPlantillasAntropometricas,
    private readonly registrarAlertaUC: RegistrarAlertaAlimentaria,
    private readonly actualizarAlertaUC: ActualizarAlertaAlimentaria,
    private readonly eliminarAlertaUC: EliminarAlertaAlimentaria,
    private readonly obtenerAlertasUC: ObtenerAlertasAlimentarias,
    private readonly registrarLaboratorioUC: RegistrarLaboratorio,
    private readonly actualizarLaboratorioUC: ActualizarLaboratorio,
    private readonly eliminarLaboratorioUC: EliminarLaboratorio,
    private readonly obtenerLaboratoriosUC: ObtenerLaboratorios,
  ) {}
  // ... 216 líneas de métodos agrupados por comentarios de sección
}
```

Los comentarios de sección del propio archivo (`// --- Historia clínica ---`,
`// --- Antropometría ---`, ...) están señalando las costuras: el autor ya
identificó cuatro módulos y los separó _visualmente_ porque no podía separarlos
_estructuralmente_.

**Después** — cuatro servicios cohesivos + una fachada que preserva la API del router

```ts
// src/aplicacion/servicios/evaluacion/ServicioHistoriaClinica.ts
export class ServicioHistoriaClinica {
  constructor(
    private readonly guardarUC: GuardarHistoriaClinica,
    private readonly obtenerUC: ObtenerHistoriaClinica,
  ) {}

  async guardar(
    datos: GuardarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaSalidaDto> {
    return (await this.guardarUC.ejecutar(datos)).aPrimitivos();
  }

  async obtener(pacienteId: string): Promise<HistoriaClinicaSalidaDto | null> {
    const historia = await this.obtenerUC.ejecutar(pacienteId);
    return historia ? historia.aPrimitivos() : null;
  }
}

// src/aplicacion/servicios/evaluacion/ServicioAntropometria.ts        (7 UC)
// src/aplicacion/servicios/evaluacion/ServicioAlertasAlimentarias.ts  (4 UC)
// src/aplicacion/servicios/evaluacion/ServicioLaboratorios.ts         (4 UC)
```

```ts
// src/aplicacion/servicios/ServicioEvaluacion.ts — fachada delgada

/**
 * Fachada de Evaluación Integral. NO tiene lógica: agrupa los cuatro servicios
 * del módulo para que el router siga viendo un único punto de entrada.
 * Cada sub-servicio se testea y evoluciona por separado.
 */
export class ServicioEvaluacion {
  constructor(
    readonly historiaClinica: ServicioHistoriaClinica,
    readonly antropometria: ServicioAntropometria,
    readonly alertasAlimentarias: ServicioAlertasAlimentarias,
    readonly laboratorios: ServicioLaboratorios,
  ) {}
}
```

```ts
// src/servidor/routers/evaluacion.ts — el cambio en el borde es mecánico
obtenerHistoria: nutricionistaProcedimiento
  .input(idPacienteEvaluacionDto)
  .query(({ ctx, input }) =>
    ctx.servicios.evaluacion.historiaClinica.obtener(input.pacienteId),
  ),
```

**Principios ganados:**

- **SRP** — hoy la clase tiene cuatro razones para cambiar: si cambia el
  protocolo de laboratorios hay que tocar el archivo donde vive la antropometría.
- **ISP** — un test de historia clínica hoy necesita construir o mockear 20
  colaboradores; después, 2.
- **OCP** — sumar un quinto subdominio (p. ej. ecografías) es un archivo nuevo y
  una línea en la fachada, no una edición de un constructor que ya tiene 20
  parámetros posicionales, donde invertir dos del mismo tipo es un bug silencioso.

**Riesgo del refactor:** bajo y mecánico. El compilador marca todos los sitios de
llamada y `src/arquitectura.test.ts` sigue garantizando que nada cruce capas.
Aplica igual a `ServicioRecordatorios.ts` (envío / plantillas / configuración).

---

### 2.3 · `FormularioPlan.tsx`: partir el JSX de 451 líneas (hallazgo #7) — 🟠 Alta

**Antes** — `src/componentes/planes/FormularioPlan.tsx`

```
  1-183   imports, sentinelas, esquema Zod (90 ln), helper aNumero
185-318   componente: hooks, estado de archivos, submit
320-771   return( ... )   <-- 451 líneas de JSX en una sola expresión
772-912   OpcionesDeComida, aFichaArchivo, FilaArchivo
```

```tsx
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-6">
        {/* Datos generales */}
        <div className="grid gap-4 sm:grid-cols-2"> ...70 líneas... </div>
        {/* Metas de macros */}
        <fieldset ...>                              ...60 líneas... </fieldset>
        {/* Comidas */}                             ...140 líneas...
        {/* Equivalencias */}                       ...60 líneas...
        {/* Recomendaciones */}                     ...50 líneas...
        {/* Archivos */}                            ...70 líneas...
      </form>
    </Form>
  );
```

**Después** — un archivo por sección, coordinados por el `Control` de react-hook-form

```
src/componentes/planes/formulario/
├── FormularioPlan.tsx         <- ~150 ln: hooks, submit, composición
├── esquema.ts                 <- el Zod + tipos + aNumero + sentinelas
├── SeccionDatosGenerales.tsx
├── SeccionMetasMacros.tsx
├── SeccionComidas.tsx         <- absorbe OpcionesDeComida
├── SeccionEquivalencias.tsx
├── SeccionRecomendaciones.tsx
└── SeccionArchivos.tsx        <- absorbe aFichaArchivo y FilaArchivo
```

```tsx
// SeccionMetasMacros.tsx — la sección no sabe nada del resto del formulario
const METAS = [
  ["caloriasMeta", "Calorías (kcal)"],
  ["proteinasMetaG", "Proteínas (g)"],
  ["carbohidratosMetaG", "Carbohidratos (g)"],
  ["grasasMetaG", "Grasas (g)"],
] as const;

export function SeccionMetasMacros({
  control,
}: {
  control: Control<DatosFormulario>;
}) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">
        Metas diarias (opcionales)
      </legend>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METAS.map(([nombre, etiqueta]) => (
          <FormField
            key={nombre}
            control={control}
            name={nombre}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{etiqueta}</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
```

```tsx
// FormularioPlan.tsx — el return completo entra en una pantalla
return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-6">
      <SeccionDatosGenerales
        control={form.control}
        grupos={grupos.data ?? []}
      />
      <SeccionMetasMacros control={form.control} />
      <SeccionComidas control={form.control} recetas={recetas.data ?? []} />
      <SeccionEquivalencias control={form.control} />
      <SeccionRecomendaciones control={form.control} />
      <SeccionArchivos
        principal={principal}
        adjuntos={adjuntos}
        alCambiarPrincipal={setPrincipal}
        alCambiarAdjuntos={setAdjuntos}
      />
      <BotonesFormulario enviando={enviando} alCancelar={alCancelar} />
    </form>
  </Form>
);
```

**Principios ganados:**

- **SRP** — cada sección tiene una razón para cambiar. "Agregar un campo a
  metas" toca un archivo de 40 líneas, no uno de 913.
- **KISS** — un diff sobre una sección de 40 líneas se revisa de verdad; sobre
  un JSX de 451, se aprueba por confianza.
- **Habilita el test que hoy no existe.** `SeccionMetasMacros` es testeable en
  aislamiento con `@testing-library/react` en cuanto se sume `.tsx` al `include`
  de vitest (hallazgo #2). El monolito de 913 líneas no lo es.

**Bonus estructural:** extraer `esquema.ts` deja a la vista que el esquema Zod
del formulario y `plan.dto.ts` (314 ln) validan las mismas reglas por duplicado.
Con el esquema en su propio archivo, unificarlos pasa a ser un refactor visible
en vez de un descubrimiento arqueológico.

---

## 3. Recomendaciones de proceso

### 3.1 Linter y formateador — semana 1, esfuerzo bajo, impacto alto

```bash
npm i -D eslint @eslint/js typescript-eslint @next/eslint-plugin-next \
         eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier
```

1. Crear `eslint.config.mjs` con la base de §2.1.
2. Correr `npx eslint . --fix` una vez; revisar y corregir a mano lo que quede
   como `error`.
3. Agregar `.prettierrc` + `.editorconfig`. El estilo actual del repo ya es
   consistente, así que el diff inicial debería ser mínimo — verificarlo con
   `prettier --check .` **antes** de escribir nada.
4. Recién entonces sumar el gate al CI (§3.3).

**Regla imprescindible:** `@typescript-eslint/no-floating-promises`. En una base
donde casi todo método de repositorio y caso de uso es `async`, un `await`
olvidado es un bug de datos silencioso que ningún test unitario con mocks
detecta.

### 3.2 Cobertura: qué medir y qué exigir

Habilitar el reporte y **medir antes de exigir**:

```ts
// vitest.config.ts
test: {
  globals: true,
  environment: "node",
  include: ["src/**/*.test.ts", "src/**/*.test.tsx"],   // <- suma la UI
  coverage: {
    provider: "v8",
    reporter: ["text", "lcov"],
    include: ["src/dominio/**", "src/aplicacion/**", "src/infraestructura/**"],
    exclude: ["**/*.test.ts", "**/_ayudas-test.ts", "src/dominio/**/I*.ts"],
    thresholds: {
      // Umbral por capa: el dominio es el activo, no se negocia.
      "src/dominio/**":         { lines: 85, functions: 85, branches: 75 },
      "src/aplicacion/**":      { lines: 70, functions: 70 },
      "src/infraestructura/**": { lines: 50, functions: 50 },
    },
  },
}
```

> Fijar los umbrales en el valor **actual medido**, no en un aspiracional. Un
> umbral que falla el día uno se termina bajando o borrando; uno que congela el
> statu quo impide la regresión desde el primer PR y se sube de a 5 puntos.

Para los componentes: `npm i -D @testing-library/react jsdom` y declarar
`// @vitest-environment jsdom` por archivo, para no pagar el costo de jsdom en
los 165 archivos de dominio que hoy corren en 9.8 s.

**Orden de ataque de la deuda de tests**, por riesgo descendente:

1. **Mapeadores de repositorio** (hallazgo #3). No hacen falta tests de
   integración con base real: los 31 `mapear` son funciones puras `fila →
entidad`. Extraerlos a `mapeadores/` y testearlos con una fila literal cubre
   el riesgo más alto del informe a costo casi nulo.
2. **Los 57 casos de uso sin test** (#11), empezando por `recordatorios/` y
   `whatsapp/` — son los que envían mensajes reales a pacientes.
3. **Entidades con invariantes** (#13): `PlanNutricional`, `RecordatorioWhatsapp`,
   `Objetivo`.
4. **Los 16 tests de un solo `it()`** (#12): sumar a cada uno el caso de error y
   el de entidad inexistente.

### 3.3 Gates de CI

Sumar al job `app` de `.github/workflows/ci.yml`, **después** de `npm ci` y antes
del typecheck:

```yaml
- name: Lint
  run: npm run lint

- name: Formato
  run: npx prettier --check .
```

y reemplazar el paso de tests por:

```yaml
- name: Tests + cobertura
  run: npx vitest run --coverage
```

Configuración del repositorio en GitHub (no es código, pero es el gate que de
verdad funciona):

- Branch protection en `main`: exigir los checks `App (typecheck · tests ·
build)`, `CodeQL (SAST)` y `Escaneo de secretos`.
- Exigir PR con al menos 1 aprobación y ramas actualizadas antes de fusionar.
- Prohibir push directo a `main`. El historial muestra que hoy se trabaja con
  PRs — conviene volverlo obligatorio **antes** de que entre un segundo
  desarrollador, no después.

### 3.4 Code review — checklist específica de este repo

El repositorio ya tiene virtudes raras que hay que proteger explícitamente,
porque se pierden en un solo PR distraído:

- [ ] ¿El comentario explica **por qué**, no **qué**? Es el estándar vigente:
      `IPlanRepositorio.ts:9-14`, `PrismaRepositorioGrupoPlan.ts:47-49`.
- [ ] ¿El caso de uso nuevo trae test con al menos un camino de error?
- [ ] ¿Se agregó un `any`? El repo tiene **dos** y ambos justificados. El techo
      es ese número.
- [ ] ¿Un componente nuevo pasa de ~250 líneas? Partirlo antes de fusionar, no
      después.
- [ ] ¿Un servicio de aplicación pasa de ~8 dependencias de constructor? Es la
      señal de que hay dos servicios adentro.
- [ ] ¿El modelo nuevo de Prisma tiene `nutricionistaId` **y** está en
      `MODELOS_INQUILINO` (`PrismaClienteSingleton.ts:30`)? Olvidarlo es una fuga
      de datos entre consultorios, no un problema de calidad.
- [ ] ¿`src/arquitectura.test.ts` sigue verde? Si falló, la respuesta correcta
      casi nunca es relajar el test.

### 3.5 Vigilancia de puntos calientes

Los tres archivos más modificados del historial —`contenedor.ts` (12),
`_ayudas-test.ts` (11), `schema.prisma` (11)— son los que más conflictos de merge
van a producir. Para `_ayudas-test.ts` (hallazgo #8) la partición es directa y
puramente mecánica:

```
src/dominio/casos-de-uso/_ayudas/
├── indice.ts          <- re-exporta todo: los 130 tests actuales no cambian
├── pacientes.ts       <- mocks de IPacienteRepositorio, ITurnoRepositorio...
├── planes.ts
├── evaluacion.ts
├── recordatorios.ts
└── servicios.ts       <- IRelojFecha, IColaTrabajos, IServicioEmail...
```

Con `indice.ts` re-exportando, el refactor no toca ni uno de los 165 archivos de
test: es un movimiento de código con riesgo cero y beneficio inmediato en
conflictos de merge.

---

## 4. Consulta: ¿conviene un repositorio genérico del que hereden los demás?

**Respuesta corta: sí, pero mucho más acotado de lo que parece a primera vista.**
La versión ambiciosa —una base genérica que absorba el CRUD completo— tiene en
este repositorio un costo mayor que el beneficio. La versión acotada —una base
que absorba solo lo que es _literalmente_ idéntico— es claramente positiva y de
riesgo casi nulo.

### 4.1 Qué es realmente duplicado y qué solo lo parece

Medido sobre los 38 repositorios Prisma (4.977 líneas):

| Método                                                                                              | ¿Idéntico entre repos?                                                        | ¿Absorbible?   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| `eliminar(id)`                                                                                      | **Sí**, carácter por carácter en 31 repos                                     | ✅ Sí          |
| `obtenerPorId(id)`                                                                                  | **Sí** salvo el nombre del delegate y del mapeador                            | ✅ Sí          |
| `soloFecha(fecha)`                                                                                  | **Sí**, copiado 8 veces (hallazgo #9)                                         | ✅ Sí          |
| `.map(f => this.mapear(f))`                                                                         | Sí como patrón                                                                | ✅ Sí (helper) |
| `nutricionistaId: inquilinoActual()`                                                                | Sí, en 35 `crear`                                                             | ⚠️ Parcial     |
| `crear(entidad)`                                                                                    | **No.** Cada uno enumera sus campos                                           | ❌ No          |
| `actualizar(entidad)`                                                                               | **No.** Además el subconjunto de campos actualizables difiere de los creables | ❌ No          |
| `mapear(fila)`                                                                                      | **No.** Casts de enum y `reconstruir()` propios                               | ❌ No          |
| Consultas del dominio (`listarPorPaciente`, `existeNombre`, `listarAsignacionesActivasVencidas`...) | No                                                                            | ❌ No          |

**Ese reparto es la clave de toda la decisión.** Mirá `PrismaRepositorioAxioma.ts`:
de sus 97 líneas, `eliminar` + `obtenerPorId` son **8**. El resto —`crear` (30),
`actualizar` (25), `mapear` (18)— es específico e irreductible. La base genérica
ahorra alrededor de **8 a 12 líneas por repositorio**, no 60.

Vale la pena decirlo sin adornos: **la mitad del valor del refactor no está en la
herencia, sino en sacar `soloFecha` de los 8 archivos donde está copiado.** Eso
se puede hacer hoy, en 20 minutos, sin tocar ninguna jerarquía de clases.

### 4.2 Los tres riesgos concretos de hacerlo mal

1. **Pérdida de type-safety de Prisma.** La implementación ingenua es
   `class RepositorioBase<T> { protected modelo: any }`. Eso convierte el activo
   más valioso de este repo —`strict` + `noUncheckedIndexedAccess` con dos `any`
   en 933 archivos— en un agujero replicado 31 veces. Sería un retroceso neto,
   no un refactor.

2. **Herencia como acoplamiento (LSP).** Si la base expone `eliminar(id)` y luego
   un repositorio necesita borrado lógico (`archivado = true`), o borrado en
   cascada dentro de una transacción, se ve forzado a _sobrescribir para
   contradecir_ la base. Es el síntoma clásico de una jerarquía equivocada, y
   este repo **ya tiene el caso**: `PrismaRepositorioPlan.eliminar` convive con
   `marcarArchivado`, y `PrismaRepositorioPaciente` tiene archivado/reactivación.

3. **Abstracción prematura sobre un puerto que ya está bien.** El dominio no
   define hoy una `IRepositorioBase<T>`, y eso es **correcto**:
   `IAxiomaRepositorio` expone `listarActivos()` porque el dominio necesita
   axiomas activos, no porque sea CRUD. Si la base genérica se filtra a
   `src/dominio/repositorios/`, los puertos pasan a describir _la base de datos_
   en lugar de _lo que el negocio necesita_ — que es exactamente lo que la
   arquitectura hexagonal de este proyecto hoy evita con éxito.

> **Regla que se desprende:** la clase base va en **infraestructura**, nunca en
> dominio. Es un detalle de implementación de Prisma compartido, no un contrato.
> Los puertos siguen siendo específicos por agregado.

### 4.3 Diseño recomendado — base tipada y acotada

La pieza que resuelve el riesgo #1 es declarar la forma mínima del delegate en
vez de usar `any`. Los delegates de Prisma la satisfacen estructuralmente, y el
único cast del sistema queda encapsulado en un solo lugar.

```ts
// src/infraestructura/repositorios/base/DelegadoPrisma.ts

/**
 * Forma mínima de un delegate de Prisma para las operaciones por id.
 *
 * Se declara a mano en vez de usar `any`: los delegates generados por Prisma
 * son estructuralmente compatibles con esta interfaz, así que el tipado de
 * `Fila` se conserva de punta a punta y el único cast del sistema vive en el
 * constructor de RepositorioPrismaBase, no replicado en 31 archivos.
 */
export interface DelegadoPrisma<Fila> {
  findUnique(args: { where: { id: string } }): Promise<Fila | null>;
  findMany(args?: { where?: unknown; orderBy?: unknown }): Promise<Fila[]>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  count(args?: { where?: unknown }): Promise<number>;
}
```

```ts
// src/infraestructura/repositorios/base/RepositorioPrismaBase.ts

/**
 * Base de los repositorios Prisma: SOLO lo que es idéntico en todos.
 *
 * Deliberadamente NO incluye `crear` ni `actualizar`: cada agregado enumera sus
 * propios campos, y generalizarlos exigiría perder el tipado de Prisma —que es
 * justamente lo que evita que un campo mal escrito llegue a producción—.
 *
 * `mapear` queda abstracto: es lo único que cada subclase DEBE aportar.
 */
export abstract class RepositorioPrismaBase<Fila, Entidad> {
  protected constructor(protected readonly delegado: DelegadoPrisma<Fila>) {}

  /** Fila de la base -> entidad del dominio. Único método obligatorio. */
  protected abstract mapear(fila: Fila): Entidad;

  async obtenerPorId(id: string): Promise<Entidad | null> {
    const fila = await this.delegado.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async eliminar(id: string): Promise<void> {
    await this.delegado.delete({ where: { id } });
  }

  /** Mapea una lista completa. Evita repetir `.map(f => this.mapear(f))`. */
  protected mapearTodas(filas: Fila[]): Entidad[] {
    return filas.map((fila) => this.mapear(fila));
  }
}
```

```ts
// src/infraestructura/repositorios/base/fechas.ts

/**
 * Normaliza a medianoche UTC: una medición pertenece a un DÍA, no a un
 * instante. Estaba copiado carácter por carácter en 8 repositorios.
 */
export function soloFecha(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}
```

**Antes** — `PrismaRepositorioSuplemento.ts` (87 ln)

```ts
export class PrismaRepositorioSuplemento implements ISuplementoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(suplemento: Suplemento): Promise<Suplemento> {
    /* ... */
  }
  async actualizar(suplemento: Suplemento): Promise<Suplemento> {
    /* ... */
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.suplemento.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Suplemento | null> {
    const fila = await this.prisma.suplemento.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(
    pacienteId: string,
    incluirInactivos = false,
  ): Promise<Suplemento[]> {
    const filas = await this.prisma.suplemento.findMany({
      where: { pacienteId, ...(incluirInactivos ? {} : { activo: true }) },
      orderBy: [{ activo: "desc" }, { creadoEn: "desc" }],
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: SuplementoFila): Suplemento {
    /* ... */
  }
}
```

**Después** (~73 ln — y `soloFecha` deja de existir en 8 archivos)

```ts
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import { soloFecha } from "./base/fechas";

export class PrismaRepositorioSuplemento
  extends RepositorioPrismaBase<SuplementoFila, Suplemento>
  implements ISuplementoRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.suplemento);
  }

  // crear / actualizar quedan como están: son específicos por diseño.
  async crear(suplemento: Suplemento): Promise<Suplemento> {
    /* ... */
  }
  async actualizar(suplemento: Suplemento): Promise<Suplemento> {
    /* ... */
  }

  // obtenerPorId y eliminar: heredados. Ya no se escriben.

  async listarPorPaciente(
    pacienteId: string,
    incluirInactivos = false,
  ): Promise<Suplemento[]> {
    return this.mapearTodas(
      await this.prisma.suplemento.findMany({
        where: { pacienteId, ...(incluirInactivos ? {} : { activo: true }) },
        orderBy: [{ activo: "desc" }, { creadoEn: "desc" }],
      }),
    );
  }

  protected override mapear(fila: SuplementoFila): Suplemento {
    /* ... */
  }
}
```

**Principios ganados:** **DRY** sobre lo genuinamente idéntico (`soloFecha` × 8,
`eliminar` × 31); **DIP** intacto (el puerto del dominio no cambia, la base vive
en infraestructura); **OCP** (un repositorio nuevo arranca con menos ceremonia);
y **LSP respetado**, porque la base solo promete lo que toda subclase cumple de
verdad.

> **Alternativa por composición.** Si preferís evitar herencia por completo —una
> postura defendible— la misma ganancia se obtiene con una función
> `crearOperacionesBase(delegado, mapear)` que devuelve `{ obtenerPorId,
eliminar, mapearTodas }` y se esparce en el repositorio. Menos idiomático en
> TypeScript con clases, pero inmune al riesgo #2. La recomendación de herencia
> vale por consistencia con el estilo actual del repo (clases con constructor
> inyectado); si el equipo crece, revisá la decisión.

### 4.4 Cuándo **no** heredar

Regla explícita, para que la base no se vuelva una obligación:

| Repositorio                                                                                                                                     | ¿Hereda?               | Motivo                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los ~28 repos con CRUD estándar (`Axioma`, `Suplemento`, `Competencia`, `Material`, `Objetivo`, `Laboratorio`, `Antropometria`, `GrupoPlan`...) | ✅ Sí                  | El contrato coincide exactamente.                                                                                                                                   |
| `PrismaRepositorioPlan` (529 ln)                                                                                                                | ⚠️ Solo `obtenerPorId` | `eliminar` convive con `marcarArchivado`; el agregado tiene hijos que se reemplazan en transacción. Heredar `eliminar` invitaría a confundir borrado con archivado. |
| `PrismaRepositorioPaciente`                                                                                                                     | ⚠️ Parcial             | Mismo caso: archivar/reactivar es el flujo real, borrar es la excepción.                                                                                            |
| `PrismaRepositorioEstadisticas` (199 ln)                                                                                                        | ❌ No                  | No es un repositorio de agregado: son consultas de agregación. No tiene entidad ni `mapear`.                                                                        |
| `PrismaRepositorioUsuario`, `PrismaRepositorioNutricionista`, `PrismaRepositorioTokenRecuperacion`                                              | ❌ No                  | Fuera de `MODELOS_INQUILINO`; semántica de identidad y sesión distinta.                                                                                             |

**Si tuvieras que forzar una subclase a sobrescribir un método de la base para
contradecirlo, ese repositorio no pertenece a la jerarquía.** Es la prueba de
Liskov en su forma más práctica.

### 4.5 Plan de implementación

**Precondición:** hacerlo **después** de §3.1 (linter) y de los tests de
mapeadores (§3.2, punto 1). Refactorizar 31 archivos sin test de mapeo es
exactamente el escenario donde un campo cruzado pasa desapercibido. Con los
mapeadores testeados, el refactor es verificable.

| Fase  | Qué                                                                                                               | Alcance           | Riesgo | Verificación                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------------- | ------ | -------------------------------------------------- |
| **0** | Tests de los `mapear` actuales (extraerlos a funciones puras y cubrirlos)                                         | 31 archivos       | Nulo   | Suite nueva en verde                               |
| **1** | Crear `base/DelegadoPrisma.ts`, `base/RepositorioPrismaBase.ts`, `base/fechas.ts`                                 | 3 archivos nuevos | Nulo   | `tsc --noEmit`                                     |
| **2** | Piloto: migrar **2** repositorios (`Suplemento` y `Competencia` — los más representativos, ambos con `soloFecha`) | 2 archivos        | Bajo   | `tsc` + suite completa + revisión del diff         |
| **3** | Si el piloto convence, migrar los ~26 restantes de CRUD estándar, en tandas de 5-6 por PR                         | 26 archivos       | Bajo   | Un PR por tanda, `tsc` + tests por PR              |
| **4** | Eliminar los 8 `private soloFecha` y apuntar todo a `base/fechas.ts`                                              | 8 archivos        | Bajo   | Los tests de fase 0 lo cubren                      |
| **5** | Test de arquitectura nuevo que congele la decisión                                                                | 1 archivo         | Nulo   | Igual que `arquitectura.test.ts` congela las capas |

La fase 5 es la que hace que el refactor no se deshaga solo. Este repositorio ya
demostró que sabe usar ese patrón; conviene aplicarlo a la regla nueva:

```ts
// añadir a src/arquitectura.test.ts
it("la base de repositorios no se filtra al dominio", () => {
  const encontradas = violaciones("dominio", (e) =>
    e.includes("infraestructura/repositorios/base"),
  );
  expect(
    encontradas,
    mensaje(
      "La base de Prisma es un detalle de infraestructura, no un contrato",
      encontradas,
    ),
  ).toEqual([]);
});
```

### 4.6 Veredicto

**Hacelo, en la versión acotada de §4.3.** Ahorra entre 250 y 400 líneas reales,
elimina una duplicación literal de 8 copias (hallazgo #9) y baja el costo de
crear un repositorio nuevo. Pero **no** esperes que absorba `crear`, `actualizar`
ni `mapear`: ahí está el 80 % del código de la capa, y es específico por una
buena razón. Una base que intentara absorberlos tendría que renunciar al tipado
de Prisma, que es hoy la principal defensa de este proyecto contra los bugs de
persistencia.

Prioridad relativa: **por debajo** del linter (§3.1) y de los tests de mapeadores
(§3.2). Es una mejora de mantenibilidad sobre código que hoy funciona; los otros
dos son redes que hoy directamente no existen.

---

## 5. Hoja de ruta sugerida

| Orden | Acción                                                                          | Hallazgos | Esfuerzo | Riesgo si se posterga                                        |
| ----- | ------------------------------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------ |
| 1     | ESLint + Prettier + arreglar `npm run lint`                                     | #1, #15   | 0.5 día  | Alto — hoy no hay ningún análisis estático más allá de `tsc` |
| 2     | Gates de lint y cobertura en CI + branch protection                             | #4        | 0.5 día  | Alto — la calidad solo puede bajar                           |
| 3     | Tests de los 31 mapeadores de repositorio                                       | #3        | 2 días   | Alto — bug silencioso sobre datos clínicos                   |
| 4     | `.tsx` en el `include` de vitest + primeros tests de formularios                | #2        | 1 día    | Medio                                                        |
| 5     | Tests de los 57 casos de uso sin cubrir (empezando por recordatorios/whatsapp)  | #11, #12  | 4 días   | Medio-alto                                                   |
| 6     | Partir `ServicioEvaluacion` y `ServicioRecordatorios`                           | #5        | 1 día    | Medio                                                        |
| 7     | Partir `FormularioPlan.tsx` y luego los otros 3 componentes > 650 ln            | #7        | 2 días   | Medio                                                        |
| 8     | Base genérica de repositorios (§4)                                              | #9, #17   | 2 días   | Bajo                                                         |
| 9     | Partir `_ayudas-test.ts` y `composicionCorporal.ts`                             | #8, #14   | 1 día    | Bajo                                                         |
| 10    | Separar `IPlanRepositorio` en `IPlanRepositorio` + `IAsignacionPlanRepositorio` | #6        | 1 día    | Bajo                                                         |

---

## 6. Qué queda fuera de esta auditoría

- **Rendimiento en runtime.** No se perfiló nada. Se detectó un `find()` dentro
  de un `map()` en `PrismaRepositorioGrupoPlan.listar()` (`:60-64`) —O(n·m) sobre
  carpetas de planes— pero con el volumen esperado de un consultorio es
  irrelevante, y el comentario del autor explica por qué evitó el N+1, que era el
  problema real.
- **Accesibilidad de la UI.** Requiere herramienta específica
  (`eslint-plugin-jsx-a11y` o axe); el plugin ya está incluido en el `npm i` de
  §3.1, pero sus reglas no se evaluaron acá.
- **Calidad del schema de Prisma.** Cubierta en `audits/AUDIT_MODELO_DATOS.md`.
- **Seguridad.** Cubierta en `audits/AUDIT_SEGURIDAD.md`. Los hallazgos de este
  informe son de mantenibilidad; ninguno es una vulnerabilidad.
