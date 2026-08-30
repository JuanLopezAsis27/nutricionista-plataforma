# Auditoría de Calidad de Código — nutricionista-app

**Fecha:** 2026-08-29
**Rama auditada:** `audit/security` (base `63fad48`)
**Alcance:** `src/` completo (933 archivos `.ts`/`.tsx`), `prisma/`, `vitest.config.ts`,
`tsconfig.json`, `package.json`, `.github/workflows/`.
**Metodología:** priorización por señal de git (archivos más tocados en el
historial completo) + tamaño/complejidad + criticidad de negocio. Se ejecutó la
suite de tests (`vitest run`) y el script de lint (`npm run lint`) contra el
árbol de trabajo actual.

> **Estado de ejecución — HOJA DE RUTA COMPLETA.** Los 10 pasos ejecutados, mas
> el movimiento de los casos de uso a la capa de aplicación. Los casos de uso
> **722 → 993 tests, 0 errores de lint, cobertura de casos de uso del 97 %.**
> Ocho bugs reales aparecieron en el camino y están listados en §21.2; en qué se
> equivocó esta auditoría, en §21.3. Ver §7 a §20 para el registro paso a paso. Ver §7 (linter y formato), §8 (mapeadores), §9 y
> §10 (coherencia formulario↔DTO), §11 y §12 (casos de uso), §13 (partición de
> los servicios), §14 (movimiento de capa) y §15 (FormularioPlan) para el
> registro de lo que se hizo, lo que se calibró, los ocho bugs que aparecieron y
> en qué se equivocó esta auditoría al estimarlo.

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

---

## 7. Registro de ejecución — paso 1 de la hoja de ruta

**Commits:** `2cd3257` (linter y arreglos) · `24eedf3` (formato) · `a7ce350` (este documento).
**Resultado:** ESLint **0 errores**, 36 avisos anotados como deuda; `tsc --noEmit` OK;
**722/722 tests** en verde antes y después.

### 7.1 Qué se encontró al correr el linter por primera vez

794 errores en la primera corrida. La distribución fue la evidencia más útil de
toda la auditoría, porque **confirmó el diagnóstico del §0 por la vía negativa**:

| Regla | Hallazgos | Veredicto |
| --- | --- | --- |
| `no-floating-promises` | **0** | El await olvidado, el bug que más se temía, no existe en esta base |
| `no-explicit-any` | **0** | Los dos `any` conocidos estaban ya suprimidos y justificados |
| `react-hooks/exhaustive-deps` | **0** | Los tres `disable` que había eran los únicos casos |
| `require-await` | 660 | Ruido — ver §7.2 |
| `no-unnecessary-type-assertion` | 26 | Mejora real — ver §7.3 |
| `no-misused-promises` | 22 | Falso positivo de react-hook-form |
| `unbound-method` | 25 | Falso positivo de mapeadores estáticos |
| Reglas del React Compiler | 33 | Deuda real, anotada en `warn` |

### 7.2 Calibraciones, con su justificación

Cuatro reglas se ajustaron. Todas están documentadas **en el propio
`eslint.config.mjs`**, no solo acá, para que el próximo que las vea sepa por qué:

- **`require-await` → `off`.** 660 hallazgos, 583 en el dominio, **ninguno un
  bug.** En esta base un método es `async` porque el *contrato de su interfaz*
  lo es (`ejecutar(): Promise<T>`), no porque su cuerpo necesite `await`.
  Obedecerla habría agregado un tick de microtask por llamada a cambio de nada.
- **`no-misused-promises` con `checksVoidReturn.attributes: false`.** Los 22
  hallazgos eran todos `onSubmit={form.handleSubmit(...)}`, el patrón documentado
  de react-hook-form. El resto de la regla sigue activa.
- **`unbound-method` con `ignoreStatic: true`.** Los 25 eran `.map(Servicio.aSalida)`
  sobre mapeadores **estáticos**, que no tienen `this` que perder.
- **Reglas del React Compiler en `warn`.** `set-state-in-effect` (21),
  `static-components` (4), `purity` (1) señalan cosas reales: `SidebarNav.tsx`
  crea componentes dentro del render (su estado se resetea en cada pintado) y
  `dashboard/page.tsx:63` llama `Date.now()` en render (riesgo de desajuste de
  hidratación). Van en `warn` por proceso, no por mérito: 33 hallazgos
  bloqueantes en el día uno del linter es la receta para que alguien desactive
  el gate entero. **Corresponde subirlas a `error` una vez saldadas.**

### 7.3 Un hallazgo que corrige a esta misma auditoría

El §1 hallazgo #3 afirma que los mapeadores hacen casts de enum «que el
compilador no verifica», citando `fila.ambito as AmbitoAxioma`.

**Al correr el linter resultó que esos 26 casts eran *innecesarios*:** Prisma ya
genera el enum con el tipo correcto, y la aserción no cambiaba nada. El autofix
los eliminó y `tsc` sigue pasando.

El matiz importa y mejora el resultado: mientras estaba el `as`, el compilador
tenía *orden de confiar*, así que un enum que dejara de coincidir con el schema
habría pasado en silencio. Sin el `as`, **`tsc` ahora verifica ese borde de
verdad.** Quitarlos no fue limpieza cosmética: convirtió 26 puntos de confianza
ciega en 26 puntos verificados.

Esto **no invalida** el hallazgo #3: los mapeadores siguen sin tests, y el riesgo
de asignar un campo al atributo equivocado (`nombre: fila.apellido`) sigue intacto
y sin cubrir. Solo achica el subconjunto de riesgo atribuible a los enums.

### 7.4 La excepción que se dejó documentada

`PrismaClienteSingleton.ts` concentraba los 19 `no-unsafe-*`, todos en el bloque
`any` de la extensión de multi-tenancy. Se dejó como **excepción acotada con
`eslint-disable`/`eslint-enable` de bloque** y una justificación extensa en el
código, en vez de reescribirla:

`$allOperations` recibe los args de cualquiera de los ~900 tipos de operación que
genera Prisma; no hay un tipo común que los cubra y la manipulación es dinámica
por diseño. El riesgo está cubierto donde importa —es fail-closed y está
verificado por dos suites—, y "arreglarlo" para el linter significaba tocar el
aislamiento entre consultorios sin ganar una sola garantía.

### 7.5 En qué se equivocó esta auditoría

§3.1 dijo: *«El estilo actual del repo ya es consistente, así que el diff inicial
[de Prettier] debería ser mínimo»*.

**Falso: 460 archivos difieren.** El estilo es consistente a ojo pero no
equivale a ninguna configuración de Prettier (la mediana de línea es 32
caracteres y el p99 llega a 99). Se resolvió con el mecanismo estándar —commit
de formato aislado (`24eedf3`) más `.git-blame-ignore-revs`, verificado con
`git blame`, que sigue atribuyendo las líneas a su autor original— pero la
estimación estaba mal y conviene que quede registrado: **medir antes de
prometer** aplica también a quien escribe la auditoría.

### 7.6 Deuda que este paso deja anotada

Los 36 avisos que quedan no son residuo: son trabajo identificado y localizado.

| Regla | Cant. | Dónde | Acción |
| --- | --- | --- | --- |
| `react-hooks/set-state-in-effect` | 21 | `FormularioCredenciales`, `ToggleTema`, `useTemaComposicion`, +12 | Revisar uno por uno; varios son sincronización legítima con props |
| `react-hooks/incompatible-library` | 7 | Varios | Diagnóstico del React Compiler sobre libs de terceros |
| `react-hooks/static-components` | 4 | `SidebarNav.tsx:204,205,243,244` | **Bug real de estado**: componentes creados en render |
| `no-base-to-string` | 3 | `TablaDatos.tsx:93`, `parsearPlanillaAlimentos.ts` | Riesgo de `[object Object]` visible al usuario |
| `react-hooks/purity` | 1 | `dashboard/page.tsx:63` | `Date.now()` en render: riesgo de hidratación |

**Siguiente en la hoja de ruta (§5): paso 3 — tests de los 31 mapeadores de
repositorio.** El paso 2 (gates de CI) quedó hecho junto con este: `npm run lint`
y `npm run formato` corren en el workflow después de `prisma generate`, porque
las reglas type-aware necesitan el cliente generado. Falta solo la parte que no
es código: activar branch protection en `main` exigiendo esos checks.

---

## 8. Registro de ejecución — paso 3: tests de los mapeadores

**Commit:** `6bd6e9b`. **Cierra el hallazgo #3**, el de mayor riesgo que quedaba
abierto. **722 → 786 tests.**

### 8.1 Qué se hizo

**Extracción (33 archivos, 34 funciones).** Cada `private mapearX()` pasó a ser
`export function mapearX()` en el mismo módulo. No se movió a una carpeta
`mapeadores/` como sugería §3.2: el patrón de función libre **ya existía** en
`PrismaRepositorioObjetivoComposicion` y `PrismaRepositorioPlantillaAntropometrica`,
así que generalizarlo salió más barato y con menos movimiento de imports que
inventar una estructura nueva. El objetivo —que sean testeables sin instanciar el
repositorio ni tocar la base— se cumple igual.

33 de los 34 ya eran funciones puras. El único que dependía de `this` era
`mapearCuentaConectada` (usaba `this.cifrador`): ahora recibe el cifrador por
parámetro, con lo que también es pura y se testea con un cifrador de mentira.

**Tests (64 nuevos, en 4 archivos por área.)**

### 8.2 La técnica: un valor único por campo

Es lo que separa un test que sirve de uno que solo está verde. Si todos los
campos reciben el mismo valor de prueba (`10`, `"texto"`), un cruce entre dos de
ellos **pasa el test igual**: justo el bug que había que cazar. Con un valor
distinto por campo, el cruce falla y el mensaje nombra cuál se movió.

```ts
const medidas = {
  pesoKg: 1, tallaCm: 2, tallaSentadoCm: 3, diamBiacromial: 4, /* …29 en total */
} as const;

for (const [clave, esperado] of Object.entries(medidas)) {
  expect(datos[clave], `campo ${clave}`).toBe(esperado);
}
```

**Se verificó que los tests detectan el bug**, en vez de asumirlo. Mutación
deliberada sobre `PrismaRepositorioAntropometria`:

```diff
- circCinturaMaxima: aNumero(fila.circCinturaMaxima),
+ circCinturaMaxima: aNumero(fila.circCinturaMinima),
```

```
AssertionError: campo circCinturaMaxima: expected 19 to be 20
```

Falla, y dice exactamente qué campo. La mutación se revirtió.

### 8.3 Lo que apareció de paso: reglas de negocio escondidas en infraestructura

Los mapeadores no solo copian campos. Varios aplican **reglas** que hasta ahora
no verificaba nadie y que no están escritas en ningún otro lado:

| Mapeador | Regla que aplica | Qué pasa si se rompe |
| --- | --- | --- |
| `mapearReceta` | Separa fotos de documentos por `mimeType.startsWith("image/")` | La galería de la receta muestra PDFs |
| `mapearAlertaSeguimiento` | Compone `"${nombre} ${apellido}"`, string que no existe en la base | Sale invertido en cada alerta, sin fallar nada |
| `mapearPlan` | Colapsa receta y grupo ausentes a `null`, no a un objeto vacío | La UI pinta una tarjeta de macros vacía |
| `mapearPlantillaAntropometrica` | Descarta campos que el dominio ya no conoce | Una plantilla vieja tumba la pantalla en vez de degradarse |
| `mapearCuentaConectada` | No descifra el refresh token si es `null` | Google no siempre lo devuelve: lanzaría y rompería Integraciones |
| `mapearTurno` | `precio` null se mantiene null, no pasa a 0 | Turnos sin cobro figuran como cobrados en cero |

Que estas reglas vivan en la capa de infraestructura es discutible —varias son
de dominio— pero eso es una decisión de diseño aparte. Lo urgente era que
**ninguna estaba verificada**, y ahora todas lo están.

### 8.4 Un comportamiento implícito que ahora es contrato

`ConfiguracionRecordatorios.reconstruir()` **no** normaliza las listas de
programación (`whatsappDiasAntes`, `emailDiasAntes`, `calendarioMinutosAntes`):
`normalizarLista` —deduplicar y ordenar de mayor a menor— corre solo en
`actualizar`. Es el patrón correcto (la invariante se impone al escribir, la
lectura confía en lo persistido) y el test lo fija como contrato explícito.

**Corolario a tener presente:** una fila escrita por fuera de la entidad —un
seed, una migración— sale sin normalizar. No es un bug activo; es una condición
que conviene conocer antes de escribir el próximo seed.

### 8.5 Corrección de método

Cuatro de los primeros tests fallaron por suposiciones **mías** sobre la forma de
las entidades, no por bugs del código: `Laboratorio` tiene `titulo`/`notas` y no
`tipo`/`resultados`; `MetricaDispositivo` no tiene `pesoKg` y usa `incluir`;
`ConfiguracionRecordatorios` guarda las programaciones como `Int[]` y no como
`Int`; `pesoKg` no está en `CAMPOS_PLANTILLA` porque el peso se mide siempre.

Se corrigieron los tests contra la forma real. Vale anotarlo porque es la
tentación opuesta la peligrosa: ante un test rojo, cambiar el código de
producción para que pase. Acá el código estaba bien y el test estaba mal.

### 8.6 Qué NO cubre esto

Estos tests verifican el **mapeo**, no la **consulta**. Un `where` mal armado, un
`include` que falta o un `orderBy` invertido siguen sin cobertura: eso pide tests
de integración con base real, que son otro orden de costo y no estaban en el
alcance del paso 3.

**Siguiente en la hoja de ruta (§5): paso 4 — sumar `.tsx` al `include` de vitest
y los primeros tests de formularios** (hallazgo #2).

---

## 9. Registro de ejecución — paso 4: tests de UI

**Commit:** `8d0daf6`. **Cierra el hallazgo #2.** **786 → 806 tests.**

### 9.1 El hallazgo #2 se confirmó de la peor manera: había dos bugs

La auditoría decía (hallazgo #2): *«La validación está duplicada en el DTO y en
el esquema del formulario; solo una de las dos está verificada.»* Era una
advertencia teórica. Al escribir el primer test resultó ser un bug activo, por
duplicado:

| Archivo | Validaba | El servidor exige |
| --- | --- | --- |
| `FormularioPaciente.tsx:65` | `min(6, "Mínimo 6 caracteres")` | 12 caracteres + no obvias |
| `FormularioRestablecer.tsx:35` | `min(6, "al menos 6 caracteres")` | 12 caracteres + no obvias |
| `FormularioPaciente.tsx:182` (placeholder) | `"Mínimo 6 caracteres"` | idem |

La auditoría de seguridad había unificado la política en `dtos/password.ts`, un
archivo que dice explícitamente: *«Se usa en TODOS los puntos donde alguien elige
una… Cualquier flujo nuevo debe importarlo en vez de escribir su propio
`z.string().min(...)`»*. Los dos formularios se quedaron con la regla vieja.

**El efecto para el usuario:** escribe una contraseña de 8 caracteres, el
formulario la da por buena, la envía, y el servidor la rechaza con un mensaje
que contradice lo que la pantalla acababa de decirle. En `FormularioRestablecer`
es peor, porque ahí el usuario ya perdió el acceso a su cuenta.

**Es exactamente el escenario que la auditoría de seguridad cerró del lado del
servidor** —que el flujo de recuperación no pueda degradar la política— mientras
la UI seguía prometiendo lo contrario.

`FormularioLogin.tsx:33` quedó como estaba: su `min(1)` es **correcto**. En el
login no se valida la política, solo que el campo no esté vacío; validar
longitud ahí filtraría información sobre la política y rechazaría contraseñas
antiguas legítimas.

### 9.2 El arreglo: que la divergencia no pueda existir

No alcanzaba con cambiar el `6` por un `12`: eso deja dos copias de la regla y la
próxima vez que cambie vuelve a pasar. Los formularios ahora **importan**
`passwordNuevaDto`, y el placeholder se deriva de `LARGO_MINIMO_PASSWORD`:

```ts
// antes: la regla, escrita de nuevo
password: editando ? z.string().optional() : z.string().min(6, "Mínimo 6 caracteres"),

// después: la regla, importada
password: editando ? z.string().optional() : passwordNuevaDto,
```

Es DRY aplicado donde corresponde: una regla de negocio, una definición. No
cambia la regla de capas —los componentes ya importaban DTOs— y
`arquitectura.test.ts` sigue verde.

### 9.3 La infraestructura de tests de UI

- `vitest.config.ts` incluye `*.test.tsx`. Antes el patrón era solo `*.test.ts`,
  así que los ~280 componentes **no podían** tener tests aunque alguien los
  escribiera: el runner ni los levantaba.
- **Entorno `node` por defecto, `jsdom` por archivo** con
  `// @vitest-environment jsdom`. Medido: jsdom tarda ~24 s en levantar. Ponerlo
  global castigaría a los ~170 archivos de dominio que no lo necesitan.
- **Sin `@vitejs/plugin-react`**: su versión actual exige Vite 8 y el proyecto
  tiene 5. No hace falta — esbuild ya transpila el JSX con el `jsx: "react-jsx"`
  del tsconfig. El plugin sirve para Fast Refresh, que en tests no aplica.

### 9.4 Los dos niveles de test, y por qué hacen falta los dos

**`coherencia-formularios.test.ts`** compara el esquema del formulario contra el
DTO del servidor, entrada por entrada. Fija la regla direccional: **el formulario
puede ser MÁS estricto que el servidor** (confirmar la contraseña dos veces es
una regla legítima de UI), **nunca menos** — menos estricto es prometer algo que
el backend va a rechazar.

**`FormularioPaciente.test.tsx`** verifica el comportamiento al usarlo: que el
error se muestre y, sobre todo, **que la mutación NO se dispare**. Un esquema
correcto mal cableado al resolver pasaría el primer test y fallaría el segundo.

**Verificado por mutación**, igual que en el paso 3: al revertir el `min(6)`
original, 4 tests fallan. Los tests atrapan el bug que motivó escribirlos.

### 9.5 Deuda que este paso deja anotada

Se corrigieron los dos formularios de contraseña, pero **quedan 11 formularios
más con esquema Zod propio** (`FormularioPlan`, `FormularioReceta`,
`FormularioTurno`, `FormularioObjetivo`, `FormularioMaterial`,
`FormularioObjetivoComposicion`, `SeccionDeportiva`, `SeccionSuplementos`,
`FormularioAsignacionPlan`, `FormularioReprogramar`, `FormularioPlantilla`) que
**no** se compararon contra su DTO. La divergencia de contraseña apareció en el
primer par que se miró; no hay motivo para suponer que es la única.

**Recomendación:** extender `coherencia-formularios.test.ts` a esos once. Es
trabajo mecánico y de alto rendimiento — el patrón ya está escrito y cada par
nuevo son ~15 líneas.

**Siguiente en la hoja de ruta (§5): paso 5 — tests de los 57 casos de uso sin
cubrir**, empezando por `recordatorios/` y `whatsapp/`, que son los que envían
mensajes reales a pacientes.

---

## 10. Registro de ejecución — los 11 formularios restantes (deuda de §9.5)

**Commit:** `f279a12`. **806 → 832 tests.**

§9.5 dejó anotado que quedaban once formularios con esquema propio sin comparar
contra su DTO, con esta advertencia: *«La divergencia apareció en el primer par
que se miró; no hay motivo para suponer que es la única.»*

**Aparecieron seis más.** Todas de la misma familia —el formulario acota menos
que el servidor— y ninguna la detectaba nada:

| Formulario | Campo | El formulario validaba | El servidor exige |
| --- | --- | --- | --- |
| `FormularioReceta` | `enlaces` | solo el largo del textarea | `z.string().url()` **por elemento** |
| `FormularioReceta` | `etiquetas` | solo el largo total | max 60 c/u, max 30 |
| `FormularioReceta` | `porciones` | "positivo" | entero 1..100 |
| `FormularioReceta` | macros | "positivo" | calorías ≤100.000, macros ≤10.000 |
| `SeccionDeportiva` | `pesoCategoriaKg` | nada | **20..400** (con piso, no solo techo) |
| `SeccionDeportiva` | `horasSemana`, `diasEntrenamientoSemana` | nada | 0..80 y 0..14 |
| `FormularioMaterial` | `etiquetas` | solo el largo total | max 60 c/u, max 30 |
| `FormularioTurno` | `duracion` | "no vacío" | entero 1..480 |
| `FormularioTurno` | `notas` | sin tope | max 1000 |
| `FormularioPlan` | metas de macros | "positivo" | los mismos topes que receta |
| `FormularioPlan` | equivalencias, recomendaciones | sin tope | max 100 |

**La más probable de todas es la de los enlaces de receta.** Pegar `google.com`
sin `https://` es lo que hace cualquiera; el formulario lo aceptaba y la
mutación lo rechazaba con "Debe ser una URL válida".

**La más silenciosa es `pesoCategoriaKg`**: es el único campo del sistema con
**piso** distinto de cero (20 kg). Ningún otro campo tiene esa forma, así que no
había ningún patrón previo que lo cubriera por analogía.

### 10.1 Un problema de fondo que apareció al arreglarlo

Los campos de lista (`etiquetas`, `enlaces`) se escriben como texto y se parten
al enviar. El corte estaba escrito **dos veces por formulario**: una en el
esquema y otra en `alEnviar`. Con dos copias, la validación podía terminar
mirando una lista distinta de la que efectivamente viajaba.

Se creó `src/lib/validacionListas.ts` con el corte y la regla **juntos**
(`partirEtiquetas`/`partirEnlaces` más los esquemas que los usan), y ambos lados
lo importan. Lo mismo con `duracionTurno`, que ahora comparten `FormularioTurno`
y `FormularioReprogramar` en vez de escribir el mismo rango dos veces.

### 10.2 Los que ya estaban bien

`NavegadorCarpetas`, `FormularioObjetivo`, `SeccionSuplementos`,
`FormularioPlantilla`, `FormularioAsignacionPlan` y el esquema de competencia
**no** tenían divergencias. Se testean igual: son el punto de referencia que
avisa si alguien cambia un límite de un solo lado.

También quedaron fijadas las reglas donde el formulario es **más estricto** que
el servidor, que es la dirección permitida: confirmar la contraseña, fecha de
fin no anterior a la de inicio, clave de plantilla con regex de identificador.

**Verificado por mutación:** al revertir los arreglos de receta y deportivo, 4
tests fallan.

---

## 11. Registro de ejecución — paso 5 (arranque): casos de uso sin test

**Commit:** `ade173c`. **832 → 862 tests.**

Se arrancó por donde §3.2 indicaba: **los módulos que envían mensajes reales al
teléfono de un paciente.**

### 11.1 `EnviarRecordatorioWhatsapp` — 286 líneas, cero tests

Era el caso de uso sin test más grande que quedaba y el de mayor consecuencia.
Sus reglas estaban documentadas en comentarios extensos —bien escritos— y
verificadas por nadie. La regla de fondo, ahora fijada: **el log registra avisos
que SALIERON, no intentos.**

Quedaron cubiertas, entre otras:

- Un aviso que salió bloquea **por un rato**, no para siempre. Un turno agendado
  con tres semanas y reprogramado dos veces necesita más de un aviso.
- Uno FALLIDO o DESCARTADO **no** bloquea, y el reintento **reusa la fila**: ese
  era el bug histórico de apilar una fila por clic.
- Un escalón programado reusa siempre (el índice único no deja otra); un reenvío
  manual sobre un aviso que salió crea fila nueva — si la pisara, "le mandé el
  lunes y volví a insistir el jueves" se convertiría en "le mandé el jueves".
- **Un texto editado a mano no se manda como plantilla de Meta.** Si se mandara,
  el paciente leería el texto que Meta aprobó y no el que el profesional acaba
  de escribir. Es la regla más sutil del caso de uso y la de efecto más visible.

### 11.2 `ResolverPacientePorTelefono`

Es lo único que impide que el WhatsApp personal del profesional —familia,
amigos— entre a la base del consultorio. Se fija que cuatro grafías del mismo
número producen la misma búsqueda, que un teléfono ilegible devuelve `null` sin
tumbar la ingesta del lote, y que funciona con el consultorio todavía sin
configurar.

### 11.3 Dos notas de construcción, para el próximo que escriba tests acá

- **`Turno.crear` siempre nace PENDIENTE.** El `estado` que se le pase se
  ignora: la única puerta es `cambiarEstado`, que valida la transición.
- **Para probar el margen entre avisos hay que pasar el tercer parámetro de
  `RecordatorioWhatsapp.crear`.** `salioEn` lee de `confirmadoEn`, que se sella
  con ese reloj; sin él, el aviso "salió" en el instante real y el margen no se
  puede simular.

### 11.4 Estado real de la cobertura de casos de uso

Medido por **importación en alguna suite**, no por archivo hermano —que
subestima, porque un test puede cubrir varios casos de uso—:

| | |
| --- | --- |
| Casos de uso | 186 |
| **Cubiertos** | **140 (75 %)** |
| Sin cubrir | 46 |

Los 46 restantes, por módulo:

| Cant. | Módulo | Casos de uso |
| --- | --- | --- |
| 10 | `recordatorios` | `ListarTurnosParaRecordar`, `ListarSeguimientoRecordatorios`, `ObtenerVistaPreviaRecordatorio`, `armadoRecordatorio`, plantillas WhatsApp (CRUD), … |
| 5 | `mensajeria` | `ContarNoLeidos`, `ListarConversaciones`, `ListarMensajes`, `MarcarLeidos`, `ObtenerConversacionDePaciente` |
| 4 | `evaluacion` | plantillas antropométricas y objetivos de composición |
| 4 | `secretaria` | `ListarPlantillas`, `ObtenerPlantilla`, `variables`, `ListarEmailsEnviados` |
| 4 | `whatsapp` | `EnviarMensajeWhatsapp`, `ObtenerHiloWhatsapp`, `enlace`, `plantilla` |
| 3+3+2+2+2 | `axiomas`, `deportivo`, `ia`, `integraciones`, `superadmin` | mayormente listados |
| 7 | varios (1 c/u) | `ObtenerDia`, `ObtenerGruposPlan`, `EnviarEmailDeBienvenida`, … |

**El paso 5 está arrancado, no terminado.** Lo que queda es mayoritariamente
lectura (`Listar*`, `Obtener*`), de menor riesgo que lo ya cubierto. Las dos
excepciones que conviene priorizar:

1. **`armadoRecordatorio`** (75 ln): arma el texto que le llega al paciente,
   sustituyendo las variables de la plantilla. Un error ahí sale impreso en cada
   mensaje. Hoy está cubierto indirectamente por los tests de
   `EnviarRecordatorioWhatsapp`, pero no tiene tests propios.
2. **`ListarTurnosParaRecordar`** (141 ln): decide **a quién** se le manda en el
   barrido automático. Un error de más envía mensajes de sobra; uno de menos
   deja pacientes sin aviso.

---

## 12. Registro de ejecución — los dos casos de uso prioritarios de §11.4

**Commit:** `a856533`. **862 → 892 tests.**

### 12.1 `armadoRecordatorio` (75 ln)

Produce el texto **exacto** que lee el paciente. No decide *si* se manda —eso es
`EnviarRecordatorioWhatsapp`— sino *qué dice*, y lo comparten los tres caminos:
vista previa, envío masivo y barrido automático.

Lo más valioso que quedó fijado es el **orden de los parámetros de Meta**. Meta
los numera (`{{1}}`, `{{2}}`…) en lugar de nombrarlos, así que el orden del
array **es** el significado. Invertir dos posiciones no rompe nada técnico: manda
*"Hola 10:30, te espero el Ana García"*. También quedó cubierto el formateo de
fecha por componentes UTC — con zona local, un turno del 1 de julio se anunciaría
como 30 de junio a cualquiera que corra el worker al oeste de Greenwich.

### 12.2 `ListarTurnosParaRecordar` (141 ln)

Decide **a quién** se le ofrece avisar. Un error de más ofrece escribirle a quien
no corresponde; uno de menos deja pacientes sin aviso y nadie se entera, porque
lo que no aparece en la lista no se extraña.

Quedaron fijados el filtro de cancelados y archivados, el recorte de la ventana
(sin tope, pedir 99.999 días barre la tabla entera), que un paciente sin teléfono
**se muestra** con el impedimento explícito en vez de desaparecer, que se
devuelven *todos* los avisos y no solo el último —con `[3, 1]` programados, saber
que salió el de 3 días no dice nada del de 1— y que un `PREPARADO` no cuenta como
avisado.

### 12.3 Dos hallazgos sobre el dominio

**El `?? ""` de `armadoRecordatorio` es defensa redundante por partida doble.**
El tipo de `variablesMeta` es la unión de las variables válidas (una inventada no
compila) y `PlantillaWhatsapp` además las valida al construirse. El test apunta a
la segunda red, que es la que protegería al paciente de un `undefined` en su
mensaje si el tipo se relajara.

**Asimetría a tener presente en el dominio:** `Paciente.archivar` es **inmutable**
y devuelve una instancia nueva, mientras que `Turno.cambiarEstado` **muta** la
propia. No es un error —son decisiones distintas en entidades distintas— pero
descartar el retorno de `archivar` deja un test que verifica lo contrario de lo
que dice su nombre. Pasó al escribir estos tests.

---

## 13. Registro de ejecución — paso 6: partir los servicios gigantes

**Commit:** `757abb9`. **Cierra el hallazgo #5.** Sin cambios de comportamiento:
892/892 tests siguen en verde.

| | Antes | Después |
| --- | --- | --- |
| `ServicioEvaluacion` | 286 ln, **20 deps** | fachada de 47 ln + 4 servicios |
| `ServicioRecordatorios` | 267 ln, **17 deps** | fachada de 34 ln + 4 servicios |
| Máximo de deps en el sistema | 20 | **10** |
| Mediana de deps | — | **4** |

### 13.1 Por qué cuatro y no seis (Evaluación)

La auditoría (§2.2) proponía cuatro servicios. Al abrir el archivo había **seis**
secciones marcadas con comentarios. La partición final es de cuatro, y la
diferencia importa:

**Antropometría, composición corporal y plantillas de carga se llaman entre sí.**
`registrar()` devuelve la evolución completa; `guardarObjetivo()` devuelve la
composición recalculada; las plantillas definen qué medidas se cargan. Partirlas
habría obligado a que un servicio dependiera de otro para contestarle a la UI
—acoplamiento peor que el que se venía a resolver—. Son **un subdominio con tres
vistas**, y viven juntas en `ServicioAntropometria` (10 deps, el mayor que queda).

Es el matiz que solo aparece leyendo los cuerpos: los comentarios de sección
sugerían seis piezas, las llamadas internas decían cuatro.

### 13.2 Cómo se repartió Recordatorios

Por **las preguntas que se hace el profesional**, no por las tablas:

| Servicio | La pregunta que responde |
| --- | --- |
| `configuracion` | ¿cómo aviso? — qué medios, con cuánta anticipación |
| `plantillas` | ¿qué digo? — los textos, sueltos o aprobados en Meta |
| `envio` | ¿a quién le mando ahora? — la consola y el barrido automático |
| `seguimiento` | ¿qué pasó con lo que mandé? — historial y confirmación manual |

`configuracion` se lleva el proveedor de WhatsApp y las cuentas conectadas porque
su salida suma el **estado real de las integraciones** al estado guardado: sin
eso la pantalla muestra "calendario activo" en un consultorio sin Google
conectado, que es prometer un aviso que no sale.

### 13.3 Un sitio de llamada que el grep no veía

Buscar `ctx.servicios.recordatorios.` encontró 14 usos, todos en el router. Pero
`tsc` marcó uno más: **`src/trabajos/manejadores/enviarRecordatorios.ts`**, el
trabajo por cron, que toma el servicio del contenedor directamente y no pasa por
el contexto de tRPC.

Vale anotarlo como método: en este repo, buscar por el patrón del contexto deja
afuera al worker. El typecheck lo agarró —es la ventaja de que el refactor sea
mecánico y tipado— pero conviene recordarlo antes de confiar en un grep.

### 13.4 Lo que este paso NO hizo

**No se movieron los casos de uso de `dominio/` a `aplicacion/`.** Se conversó al
cerrar el paso 4 y quedó como decisión pendiente, deliberadamente separada de
este commit: es un refactor puramente nominal sobre 300+ archivos (188 casos de
uso, 130 tests, el contenedor y el test de arquitectura) que cambia rutas y no
comportamiento.

El argumento a favor sigue en pie —Uncle Bob llama a los casos de uso
*"Application Business Rules"*, y en DDD son *application services*— y el estado
actual está medido: los casos de uso importan **solo rutas relativas**, cero
dependencias hacia `@/aplicacion` o hacia afuera. **La regla de dependencia se
cumple; el nombre de la carpeta es lo que no sigue la convención.**

Este paso deja el terreno mejor preparado para ese movimiento, si se decide
hacerlo: la capa de aplicación ya no es un puñado de fachadas de 20 dependencias
sino ocho servicios cohesivos, que es donde los casos de uso encajarían.

---

## 14. Registro de ejecución — mover los casos de uso a `aplicacion/`

**Commit:** `15cf813`. **892 → 893 tests.** La decisión que quedó pendiente en
§13.4.

### 14.1 Lo que la medición previa confirmó

Antes de mover nada, la reescritura de imports dejó el dato exacto: los **909
imports** que salían de `casos-de-uso/` apuntaban **exclusivamente** al dominio.

| Destino | Imports |
| --- | --- |
| `dominio/repositorios` | 328 |
| `dominio/errores` | 279 |
| `dominio/entidades` | 231 |
| `dominio/servicios` | 70 |
| `dominio/plantillas` | 1 |
| `aplicacion/*` o cualquier capa externa | **0** |

**La regla de dependencia ya se cumplía; lo que estaba mal era el nombre de la
carpeta.** El movimiento es nominal y no toca comportamiento.

### 14.2 El orden importa (y me equivoqué primero)

El primer intento reescribió los imports **después** de mover, resolviendo cada
ruta relativa contra la ubicación nueva. Eso convierte `../../repositorios` en
`aplicacion/repositorios`, que no existe. Se revirtió con `git reset --hard` y
se rehízo en el orden correcto:

1. **Antes de mover:** reescribir los relativos que *salen* de `casos-de-uso` a
   alias `@/dominio/*`, resolviendo contra la ubicación real que todavía tienen.
   Verificado con `tsc` **antes** del movimiento.
2. `git mv` (conserva el historial: `git log --follow` sigue llegando al commit
   original).
3. **Después:** reapuntar `@/dominio/casos-de-uso` → `@/aplicacion/casos-de-uso`
   en los 64 archivos que los consumen.

Hacerlo por patrón de texto no funciona: conviven dos profundidades
(`casos-de-uso/modulo/X.ts` y `casos-de-uso/_ayudas-test.ts`) y cualquier regla
fija se equivoca en una de las dos.

**Un caso quedó fuera del script:** un `await import()` dinámico en
`ActualizarPaciente.test.ts`, que no matchea el patrón `from "…"`. Lo encontró
`tsc`. Vale como recordatorio de que un grep de imports no ve los dinámicos.

### 14.3 La garantía que el movimiento se llevó puesta

Esto es lo más importante del paso, y no es obvio:

**Mientras los casos de uso vivieron en `dominio/`, la regla de "dominio puro"
les impedía *gratis* importar un DTO de la capa de aplicación.** En
`aplicacion/` esa protección desaparece — el test de arquitectura ya no tiene
motivo para mirarlos.

Importa por dos razones concretas:

1. Un caso de uso que recibe un DTO queda atado a la forma que la UI necesita
   hoy, y deja de poder invocarse desde el worker o desde otro caso de uso sin
   arrastrar esa forma.
2. Es lo que permite testearlos con un objeto plano y un mock de repositorio,
   sin levantar Zod ni la capa de servicios.

Se repuso como **regla explícita** del test de arquitectura: *"los casos de uso
no dependen de los DTOs ni de los servicios de aplicación"*. Hoy cada caso de
uso define su propio tipo de entrada (`DatosNuevoPacienteConAcceso`, por
ejemplo) y el servicio de aplicación traduce del DTO a ese tipo; el test congela
ese reparto.

**Verificado por mutación:** al hacer que `CrearPaciente` importe un DTO, el
test falla nombrando el archivo.

> **Lección general:** un refactor que "solo mueve archivos" puede desactivar una
> garantía sin que nada falle. Conviene preguntarse siempre qué reglas dependían
> de la ubicación anterior.

---

## 15. Registro de ejecución — paso 7: partir `FormularioPlan`

**Commit:** `b309f02`. **Cierra el hallazgo #7.** **893 → 898 tests.**

| | Antes | Después |
| --- | --- | --- |
| `FormularioPlan.tsx` | 914 ln | **283 ln** (orquestador) |
| JSX del `return` | **451 ln** | ~70 ln |
| Archivos | 1 | 1 + 7 en `formulario/` |

```
formulario/esquema.ts                 el Zod, los tipos, los sentinelas
formulario/SeccionDatosGenerales.tsx  nombre, descripción, carpeta
formulario/SeccionMetasMacros.tsx     las cuatro metas
formulario/SeccionArchivos.tsx        el PDF que ES el plan + los adjuntos
formulario/SeccionComidas.tsx         franjas y opciones (absorbe OpcionesDeComida)
formulario/SeccionListas.tsx          equivalencias y recomendaciones
formulario/FilaArchivo.tsx            la fila + aFichaArchivo
```

### 15.1 Las dos excepciones al "solo el control"

La regla es que cada sección reciba el `control` del formulario y nada más. Dos
reciben el `form` entero, y está justificado en el código:

- **`SeccionComidas`** necesita `formState.errors`: el error *"agregá al menos
  una comida"* viene del `superRefine` del esquema entero y no cuelga de ningún
  campo, así que no llega por `control`.
- **`SeccionArchivoPrincipal`** necesita `setValue`: la ficha del archivo vive en
  estado del componente (para mostrar nombre y tamaño) mientras que lo que se
  valida es el id, que vive en el formulario. Los dos tienen que moverse juntos.

Equivalencias y recomendaciones quedaron en **un solo archivo** a propósito:
comparten la forma exacta —encabezado con botón, filas de dos campos, botón de
quitar— y separarlas en dos módulos de 60 líneas casi idénticas invitaría a que
se desincronizaran.

### 15.2 Lo que el refactor habilita (era el argumento de la auditoría)

§2.3 sostenía que partir el formulario *"habilita el test que hoy no existe"*.
Quedó demostrado: **`secciones.test.tsx` no podía existir antes.** Montar la
sección de metas exigía montar el formulario entero, con sus dos hooks de tRPC,
el subidor de archivos y los tres arrays anidados. Ahora el envoltorio completo
es un `useForm` con el esquema real y nada más.

Uno de esos tests verifica que los cuatro macros estén cableados cada uno a su
propio `name`. Son cuatro inputs consecutivos, idénticos en aspecto y tipo:
cruzar dos en el JSX no rompe nada visible, solo deja el plan con las proteínas
cargadas en grasas.

### 15.3 Estado de la hoja de ruta

| Paso | Estado |
| --- | --- |
| 1. ESLint + Prettier | ✅ |
| 2. Gates de CI | ✅ (falta activar branch protection en GitHub) |
| 3. Tests de mapeadores | ✅ |
| 4. `.tsx` en vitest + tests de formularios | ✅ |
| 5. Casos de uso sin cubrir | 🟡 **140/186 (75 %)** |
| 6. Partir los servicios gigantes | ✅ |
| 7. Partir `FormularioPlan` | ✅ |
| 8. Base genérica de repositorios | ⬜ |
| 9. Partir `_ayudas-test.ts` y `composicionCorporal.ts` | ⬜ |
| 10. Separar `IPlanRepositorio` | ⬜ |
| — | Mover casos de uso a `aplicacion/` ✅ (fuera de la hoja original) |

**Quedan tres componentes por encima de 650 líneas**, con el mismo patrón que
`FormularioPlan` y el mismo tratamiento disponible: `DashboardComposicion.tsx`
(711), `FormularioReceta.tsx` (701) y `SeccionDeportiva.tsx` (673).

---

## 16. Registro de ejecución — los tres componentes sobre 650 líneas

**Commit:** `15e7198`. **898 → 914 tests.**

| Componente | Antes | Después | |
| --- | --- | --- | --- |
| `SeccionDeportiva` | 673 | **254** | −62 % |
| `FormularioReceta` | 701 | **462** | −34 % |
| `DashboardComposicion` | 711 | **536** | −25 % |

### 16.1 `SeccionDeportiva` — el caso limpio

Ya eran **tres componentes conviviendo en un archivo** (perfil, competencia y
la vista). Pasan a `seccion/`, con las etiquetas de enum y los esquemas en
módulos propios porque los usaban los tres. Las etiquetas estaban duplicadas de
hecho entre los formularios y la vista de solo lectura.

### 16.2 `FormularioReceta` — lo valioso no fue el tamaño

Fue aislar el **cálculo de macros** en `formulario/macros.ts`. Es un espejo del
cálculo del dominio —la pantalla lo necesita para mostrar totales sin ir al
servidor por cada tecla— y no tenía un solo test, pese a ser el número que el
profesional mira antes de decidir si la receta le sirve.

Ahora tiene 16. El más importante fija la distinción que atraviesa todo el
módulo: **`null` es "no se puede saber" y `0` es "hay cero".** Si un ingrediente
no trae proteínas cargadas, el total de proteínas no es 0 — es desconocido, y
mostrar 0 sería afirmar algo que nadie midió.

### 16.3 `DashboardComposicion` — no llegó al objetivo

Se extrajeron las piezas de presentación (`Indicador` aparece 7 veces, `Fila`
14), `AvisoFaltantes` y `TarjetaGrasa`. **Queda en 536 líneas.**

No se partió más y conviene decir por qué: su JSX son ~430 líneas de tarjetas
**sin secciones marcadas**, y partirlas bien pide entender qué muestra cada una.
Es trabajo de otra pasada; forzarlo ahora sobre un dashboard clínico sería
arriesgar por prolijidad.

### 16.4 Nota de método

El script que limpia imports huérfanos a partir del reporte de ESLint **cortaba
dentro de una palabra** por una regex sin `\b` en una de sus ramas: convirtió
`useTemaComposicion` en `use`. Lo agarró `tsc` y se restauró a mano.

Vale como recordatorio: un reemplazo por nombre necesita límites de palabra en
**todas** sus ramas, no solo en la primera que uno escribe.

---

## 17. Registro de ejecución — paso 8: la base genérica de repositorios

**Commit:** `4b22654`. **914 → 916 tests.** Responde la pregunta que originó la
auditoría: *«¿conviene un repositorio genérico del que hereden los demás?»*

```
base/DelegadoPrisma.ts         la forma mínima del delegate, tipada
base/RepositorioPrismaBase.ts  obtenerPorId, eliminar, mapearTodas
base/fechas.ts                 soloFecha (estaba copiado 8 veces)
```

**9 repositorios heredan.** 45 líneas netas menos y, sobre todo, **cero copias
de `soloFecha`**: era una regla de negocio —"una medición pertenece a un día, no
a un instante"— replicada ocho veces en infraestructura.

### 17.1 Lo que se sostuvo del diseño

- **Sin `any`.** La base declara a mano la forma mínima del delegate, así el
  tipado de `Fila` se conserva de punta a punta. Era el riesgo #1 de §4.2 y el
  motivo por el que la versión ambiciosa no valía la pena.
- **`crear` y `actualizar` NO están en la base.** Generalizarlos pedía renunciar
  al tipado de Prisma, que es la principal defensa del proyecto contra los bugs
  de persistencia. §4.1 lo había medido: de las 97 líneas de un repositorio
  típico, lo genérico son 8.

### 17.2 Una restricción que la auditoría no había previsto en su forma concreta

**Tres repositorios no entraron: `Laboratorio`, `Material` y `Objetivo`.** Los
tres mapean desde una fila **con relaciones incluidas** (sus adjuntos, su
archivo, sus estrategias). El `findUnique` de la base devuelve la fila pelada,
así que su `obtenerPorId` necesita su propio `include` y no puede heredarse.

§4.4 había anticipado el principio general —*"si tuvieras que sobrescribir un
método de la base para contradecirlo, ese repositorio no pertenece a la
jerarquía"*— pero la forma concreta que tomó, el `include`, no estaba prevista.
**Lo detectó `tsc` al intentarlo, no una revisión previa.** Quedó documentada
como criterio en la propia base:

> No es una limitación a resolver: es la señal de que un agregado con hijos
> necesita decidir en cada consulta qué trae, y esa decisión no se puede
> generalizar sin volver la base más complicada que los ocho métodos que ahorra.

`Plan` y `Paciente` tampoco heredan, por el motivo que **sí** estaba previsto:
su flujo real es archivar, no borrar.

### 17.3 Las dos reglas que congelan la decisión

Fase 5 del plan de §4.5, en `arquitectura.test.ts`:

1. **La base no se filtra fuera de infraestructura.** Si el dominio la importara,
   los puertos pasarían a describir *la base de datos* en vez de lo que el
   negocio necesita.
2. **Ningún repositorio vuelve a definir su propio `soloFecha`.** Se verificó
   fallando: detectó los cinco que quedaban —los que no heredan— y después se
   migraron.

### 17.4 Veredicto, ahora con el trabajo hecho

La recomendación de §4.6 era *"hacelo, en la versión acotada"*, y se sostiene.
El ahorro en líneas es modesto (45) y ya estaba anticipado; **el valor real
estuvo en otro lado**: eliminar la octuplicación de una regla de negocio y dejar
por escrito, con un test, dónde termina lo que se puede generalizar.

La versión ambiciosa —una base que absorbiera el CRUD completo— habría
tropezado con los mismos tres repositorios de `include`, pero con `any` de por
medio y sin que el compilador avisara.

### 17.5 Estado de la hoja de ruta

| Paso | Estado |
| --- | --- |
| 1. ESLint + Prettier | ✅ |
| 2. Gates de CI | ✅ (falta branch protection en GitHub) |
| 3. Tests de mapeadores | ✅ |
| 4. `.tsx` en vitest + tests de formularios | ✅ |
| 5. Casos de uso sin cubrir | 🟡 **~145/186** |
| 6. Partir los servicios gigantes | ✅ |
| 7. Partir `FormularioPlan` | ✅ |
| 8. Base genérica de repositorios | ✅ |
| 9. Partir `_ayudas-test.ts` y `composicionCorporal.ts` | ⬜ |
| 10. Separar `IPlanRepositorio` | ⬜ |
| — | Mover casos de uso a `aplicacion/` ✅ |
| — | Los tres componentes sobre 650 ln ✅ (parcial en Dashboard) |

**Lo que queda, por orden de valor:**

1. **Terminar el paso 5** (~41 casos de uso, mayormente lectura).
2. **Paso 9**: `_ayudas-test.ts` (1.294 ln, el 2.º archivo más modificado del
   repo) y `composicionCorporal.ts` (984 ln, mezcla tablas de referencia con
   algoritmos).
3. **Paso 10**: separar `IPlanRepositorio` en dos puertos.
4. **`DashboardComposicion`**, que quedó en 536 líneas.
5. **Subir a `error`** las reglas del React Compiler cuando se salden los 36
   avisos anotados en §7.6.

---

## 18. Registro de ejecución — paso 5 completo

**Commit:** `bda3c16`. **916 → 993 tests.**

| | |
| --- | --- |
| Cobertura de casos de uso | 142/186 (76 %) → **181/186 (97 %)** |

Los 5 que el medidor marca sin cubrir son **3 reales**
(`ListarSeguimientoRecordatorios`, `ObtenerDetalleEstadistica`,
`ObtenerInsightsPredictivos`) más dos falsos negativos: `plantilla` reexporta y
`predeterminada` sí está cubierto, pero el medidor busca `export function` y no
los ve.

### 18.1 Lo que quedó fijado, más allá del conteo

**Plantillas de WhatsApp — la invariante de UNA sola predeterminada.** Sin
ninguna, el barrido automático no manda nada; con dos, elige cualquiera. Los dos
escenarios se descubren al día siguiente. Quedaron cubiertas las tres piezas que
la sostienen: la primera plantilla queda predeterminada aunque no lo pidan,
marcar una nueva desmarca la anterior, y la predeterminada no se puede borrar.

**Mensajería — la conversación puede no existir todavía**, y las tres
operaciones deciden distinto a propósito: contar devuelve 0, marcar leídos no
hace nada, abrir el hilo la crea. También que el contador del portal se acota al
paciente: sin eso, la campanita de un paciente mostraría los no leídos de los
demás.

**WhatsApp — la ventana de 24 h de Meta**, que la app calcula para avisar *antes*
de que el envío falle. Y que enviar sin API conectada se **rechaza** en vez de
fingir que salió.

**El guard de pertenencia.** Varios lectores piden el paciente antes de devolver
sus datos aunque no lo usen para nada más. No es redundante: es lo que hace que
un id de otro consultorio devuelva "no encontrado" en vez del dato.

### 18.2 Dos hallazgos sobre el dominio

- **`PlantillaAntropometrica` rechaza una plantilla que no alcance para calcular
  nada.** El piso es Faulkner: cuatro pliegues. La fábrica de ejemplo que
  escribí no lo cumplía, y por eso los primeros tests fallaron.
- **`ObtenerMetricasDelPaciente` recibe `(pacienteId, desde, hasta)` por
  posición.** Invertir las dos fechas devuelve lista vacía sin fallar, y el
  gráfico del paciente aparece en blanco sin que nada indique por qué.

Se agregó `mockPlantillaAntropometricaRepositorio` y su fábrica a las ayudas,
que no existían.

---

## 19. Registro de ejecución — paso 9: los dos archivos más grandes

**Commit:** `8861025`. Cierra los hallazgos **#8** y **#14**.

### 19.1 `_ayudas-test.ts`: 1.355 → 14 líneas

```
_ayudas/repositorios.ts   612 ln · 37 mocks de puertos de persistencia
_ayudas/servicios.ts      174 ln · 12 mocks de reloj/email/cola/WhatsApp/IA
_ayudas/entidades.ts      643 ln · 30 fábricas *Ejemplo
_ayudas-test.ts            14 ln · fachada que reexporta las tres
```

**El motivo no era el tamaño sino los conflictos de merge.** Era el segundo
archivo más modificado del repositorio (11 commits, empatado con
`schema.prisma`) y cada feature nueva lo tocaba en el mismo lugar.

Dos decisiones que valen la pena:

- **Los bloques se clasificaron por nombre, no por rango de líneas.** Los mocks
  de servicio estaban intercalados entre los de repositorio, así que cualquier
  corte por posición habría mezclado las dos familias.
- **Cero cambios en los 144 archivos de test** que lo importan: la fachada
  reexporta y los 993 tests siguen en verde sin tocar un solo import.

### 19.2 `composicionCorporal.ts`: 984 → 744 líneas

```
composicion/referenciasPhantom.ts   233 ln · las tablas de Ross & Wilson
composicion/etiquetasMedida.ts       41 ln · los rótulos de pantalla
```

**Fue el segundo intento, y el primero vale la pena anotarlo.** La versión
inicial separaba también los **tipos**, siguiendo la estructura que sugería §1
hallazgo #14. Eso creaba un **ciclo**: `VariablePhantom` se define junto a las
tablas pero `PuntoPhantom` lo usa, y `GrupoPhantom` al revés.

Los tipos del modelo Phantom y sus tablas son **una sola pieza**; separarlos
pedía romper una relación que es real y no un accidente del archivo. Se revirtió
con `git checkout` y se extrajeron solo los dos bloques que son inequívocamente
**datos**.

Las etiquetas se quedan **dentro del dominio** —aunque §1 las señalara como
"etiquetas de UI en el dominio"— porque las usan los mensajes de error de las
entidades (*"falta pliegue supraespinal"*), que no pueden depender de la capa de
presentación. Moverlas a `componentes/` habría invertido esa dependencia.

> **Corrección a §1 hallazgo #14:** decía que el archivo "mezcla tipos, tablas y
> algoritmos" y sugería separar los tres. Separar los tipos no es posible sin
> romper el modelo; el hallazgo era correcto sobre las tablas y las etiquetas, y
> optimista sobre los tipos.

### 19.3 Estado de la hoja de ruta

| Paso | Estado |
| --- | --- |
| 1. ESLint + Prettier | ✅ |
| 2. Gates de CI | ✅ (falta branch protection en GitHub) |
| 3. Tests de mapeadores | ✅ |
| 4. `.tsx` en vitest + tests de formularios | ✅ |
| 5. Casos de uso sin cubrir | ✅ **181/186 (97 %)** |
| 6. Partir los servicios gigantes | ✅ |
| 7. Partir `FormularioPlan` | ✅ |
| 8. Base genérica de repositorios | ✅ |
| 9. Partir `_ayudas-test` y `composicionCorporal` | ✅ |
| 10. Separar `IPlanRepositorio` | ⬜ |
| — | Mover casos de uso a `aplicacion/` ✅ |
| — | Los cuatro componentes sobre 650 ln ✅ (Dashboard parcial) |

**Total: 722 → 993 tests** desde el inicio de la auditoría.

**Lo que queda:**

1. **Paso 10**: separar `IPlanRepositorio` (17 métodos, dos agregados) en dos
   puertos.
2. **3 casos de uso** sin cubrir, todos de lectura.
3. **`DashboardComposicion`**, que quedó en 536 líneas.
4. **Subir a `error`** las reglas del React Compiler cuando se salden los 36
   avisos de §7.6.
5. **Branch protection** en GitHub — configuración de la web, no código.

---

## 20. Registro de ejecución — paso 10: separar `IPlanRepositorio`

**Commit:** `619580f`. **Cierra el hallazgo #6 y la hoja de ruta.** Sin cambios
de comportamiento: 993/993 tests en verde.

| Puerto | Métodos |
| --- | --- |
| `IPlanRepositorio` (antes) | **17** |
| `IPlanRepositorio` (ahora) | 9 |
| `IAsignacionPlanRepositorio` | 8 |

### 20.1 La medición que lo justifica

Antes de tocar nada se midió qué métodos usa cada consumidor. De los **19**
consumidores del puerto original:

| | Consumidores |
| --- | --- |
| Solo métodos de **plan** | 8 |
| Solo métodos de **asignación** | 7 |
| **Ambos** | 4 |

**15 de 19 necesitaban un solo grupo.** Y cuatro de los que solo usaban
asignaciones ni siquiera son del módulo de planes —viven en `archivos`, `ia`,
`seguimiento` y `tracking`— y dependían de los 17 métodos para usar uno.

Eso es ISP en su forma más literal: la mayoría de los clientes estaba obligada a
conocer una interfaz que no usa.

### 20.2 Por qué son dos agregados, no una preferencia de estilo

Tienen **ciclos de vida distintos**:

- Un **plan** es una plantilla que el consultorio edita, archiva y borra.
- Una **asignación** es un tramo del historial de UN paciente. No se borra —se
  desactiva— y **sobrevive al borrado del plan**. Por eso `planId` es nullable y
  `nombrePlan` guarda una foto del nombre al momento de asignar.

El comentario del puerto original ya lo decía (*"las asignaciones son el
HISTORIAL del paciente… información del paciente, no un detalle del plan"*) y
acto seguido las metía en el mismo contrato.

### 20.3 Una implementación, dos puertos

`PrismaRepositorioPlan` declara `implements IPlanRepositorio,
IAsignacionPlanRepositorio`. Una tabla puede servir dos contratos, y separar la
clase no habría aportado nada: las asignaciones viven en la misma base y varias
consultas las cruzan.

El cableado inyecta la misma instancia donde hace falta, y los módulos DI
declaran la intersección `IPlanRepositorio & IAsignacionPlanRepositorio` — el
cableado es el único lugar del sistema que necesita saber que son la misma cosa.

Los tipos `AsignacionPlan` y `AsignacionConPaciente` se mudaron al puerto nuevo
pero **se reexportan** desde `IPlanRepositorio`: son parte del mismo vocabulario
y varios módulos los importan de ahí.

El mock también se partió: un test de asignaciones ya no construye los nueve
métodos del plan para ejercitar uno del historial.

---

## 21. Cierre: la hoja de ruta, completa

| Paso | Estado |
| --- | --- |
| 1. ESLint + Prettier | ✅ |
| 2. Gates de CI | ✅ |
| 3. Tests de mapeadores | ✅ |
| 4. `.tsx` en vitest + tests de formularios | ✅ |
| 5. Casos de uso sin cubrir | ✅ 181/186 (97 %) |
| 6. Partir los servicios gigantes | ✅ |
| 7. Partir `FormularioPlan` | ✅ |
| 8. Base genérica de repositorios | ✅ |
| 9. Partir `_ayudas-test` y `composicionCorporal` | ✅ |
| 10. Separar `IPlanRepositorio` | ✅ |
| — | Mover casos de uso a `aplicacion/` ✅ |
| — | Los cuatro componentes sobre 650 líneas ✅ |

### 21.1 El recorrido en números

| | Antes | Después |
| --- | --- | --- |
| Tests | 722 | **993** |
| Errores de ESLint | *(no había linter)* | **0** |
| Cobertura de casos de uso | ~76 % | **97 %** |
| Máx. dependencias de constructor | 20 | 10 |
| `FormularioPlan.tsx` | 913 ln | 283 ln |
| `_ayudas-test.ts` | 1.355 ln | 14 ln + 3 módulos |
| Copias de `soloFecha` | 8 | 1 |
| Métodos en el puerto de planes | 17 | 9 + 8 |

### 21.2 Los ocho bugs que aparecieron

Ninguno se buscó: todos salieron al escribir el test o al correr la herramienta.

1. `npm run lint` roto desde la subida a Next 16 — **el proyecto no tenía
   análisis estático** y nadie lo sabía.
2. `FormularioPaciente`: contraseña `min(6)` contra una política de 12.
3. `FormularioRestablecer`: ídem, en el flujo donde el usuario ya perdió acceso.
4. `FormularioReceta`: enlaces sin validar como URL — pegar `google.com` pasaba
   la pantalla y moría en el servidor.
5. `FormularioReceta`: etiquetas sin límite por elemento.
6. `SeccionDeportiva`: `pesoCategoriaKg` sin rango, el único campo del sistema
   con **piso** distinto de cero.
7. `FormularioTurno`: duración sin techo y notas sin límite.
8. `FormularioPlan`: metas de macros sin techo.

### 21.3 En qué se equivocó esta auditoría

Vale dejarlo junto, porque es lo que un lector futuro necesita para calibrar
cuánto confiar en el resto:

- **§3.1** predijo que el diff de Prettier sería "mínimo". Fueron **460
  archivos** (§7.5).
- **§1 #3** dijo que los casts de enum de los mapeadores no los verifica el
  compilador. Resultaron **innecesarios**: quitarlos hizo que `tsc` sí
  verificara ese borde (§7.3).
- **§2.2** proponía cuatro servicios para Evaluación mirando los comentarios de
  sección; las llamadas internas decían cuatro, pero por otra razón —tres de las
  seis secciones se llaman entre sí— (§13.1).
- **§1 #14** sugería separar tipos, tablas y algoritmos de
  `composicionCorporal`. Separar los tipos **crea un ciclo**: son una sola pieza
  con las tablas (§19.2).
- **§4.4** anticipó el principio de cuándo no heredar de la base de
  repositorios, pero no la forma concreta que tomó: los agregados que se traen
  con `include` (§17.2).

### 21.4 Lo que queda

1. **3 casos de uso** sin cubrir, todos de lectura.
2. **`DashboardComposicion`**, en 536 líneas: su JSX son ~430 líneas de tarjetas
   sin secciones marcadas y partirlas pide entender qué muestra cada una.
3. **Subir a `error`** las reglas del React Compiler cuando se salden los 36
   avisos de §7.6 — entre ellos `SidebarNav` creando componentes dentro del
   render, que es un bug de estado real.
4. **Branch protection** en `main` exigiendo los checks del CI. Es configuración
   de GitHub, no código: hay que hacerlo desde la web.
