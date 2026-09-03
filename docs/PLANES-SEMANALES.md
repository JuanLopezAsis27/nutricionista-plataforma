# Planes semanales de referencia

El menú de una semana completa —siete días × las franjas del consultorio—, con
alternativas por celda, macros calculados y el total de cada día comparado
contra las metas del paciente. Migración 45.

## No es una modalidad más del plan

`PlanNutricional` describe un **día tipo**: franjas con opciones
intercambiables que valen para cualquier día. `PlanSemanal` describe la
**semana**: qué se come el lunes al mediodía, que no es lo del martes.

Son dos cosas y conviven; un paciente puede tener las dos a la vez:

|                        | `PlanNutricional`                | `PlanSemanal`                     |
| ---------------------- | -------------------------------- | --------------------------------- |
| Qué describe           | el día tipo                      | los siete días                    |
| Metas de macros        | sí (`caloriasMeta`, …)           | **no**: usa las del plan asignado |
| Modalidades            | APP / PDF                        | una sola                          |
| Plantillas y carpetas  | sí                               | no                                |
| Historial del paciente | `AsignacionPlan`                 | `AsignacionPlanSemanal`           |

Meterlo como una tercera `ModalidadPlan` habría obligado a que las comidas del
plan tuvieran un día opcional —nulo en APP, obligatorio en semanal— y a que
cada consulta se preguntara cuál de las dos formas está leyendo. Es el mismo
error que ya se corrigió al separar APP de PDF (ver `PLANES.md`), una vuelta
más arriba.

## Qué suma al día, y por qué importa

Una celda (franja × día) puede tener **varias comidas**: la primera es la
**principal** y las que siguen son **alternativas** suyas —«o esto, o esto
otro»—.

**El total del día suma la principal de cada franja, no todas.** Si sumara
todas, un lunes con tres almuerzos posibles daría el triple de calorías que uno
con uno solo, y el semáforo estaría siempre en rojo justo en los planes mejor
armados. En la base, «principal» es `orden = 0` dentro de su `(franjaId, dia)`;
en la UI es la primera de la celda, y «Hacer principal» la mueve ahí.

Los macros de una comida son los de **sus alimentos MÁS la receta vinculada por
sus porciones**: una comida puede ser «la receta X más una fruta» y las dos
partes cuentan.

`null` significa **sin dato**, nunca cero: a un día al que le falta el dato de
proteínas de una comida se le siguen sumando las del resto, pero una columna
que nadie declaró queda en «—». Un cero se leería como «no comió nada de eso».

## Las metas son del plan nutricional, no del plan semanal

El plan fija cuánto tiene que comer por día; el semanal es una manera concreta
de repartirlo. Comparar el reparto contra una meta propia sería compararlo
consigo mismo, así que `ObtenerPlanSemanalDelPaciente` lee **los dos
historiales**: el semanal para el menú y el de planes para la pauta.

Tres estados posibles, y la pantalla los dice con todas las letras:

- el paciente no tiene plan activo → totales sin comparación;
- lo tiene pero sin metas cargadas → se nombra el plan y se aclara que no fija
  macros;
- lo tiene con metas → semáforo por día.

La tolerancia es **±10 % de la meta** (`TOLERANCIA_META`), medida sobre la meta
y no sobre el valor: es la referencia fija, y calcularla sobre el valor haría
que el rango admisible se moviera con el propio menú. Sin tolerancia, un día
que se pasa por 3 kcal saldría «por encima» y el semáforo dejaría de mirarse.

`SIN_META` y `SIN_DATO` son estados distintos a propósito: el primero es «el
paciente no tiene esa meta», el segundo «al menú le faltan los macros».
Colapsarlos haría que un plan incompleto se viera igual que uno que cumple.

## El buscador de alimentos es el mismo del recetario

`componentes/comunes/alimentos/` — el `BuscadorAlimento` y el cálculo de macros
del formulario vivían en `componentes/recetas/formulario/` y se movieron al
crear esta pantalla. Las dos cargan alimentos igual (buscar → gramos → macros
por 100 g) y con dos copias eso dura hasta el primer arreglo que se aplique en
una sola. Es la misma decisión que ya se había tomado con `NavegadorCarpetas`.

En el dominio, la suma «cantidad × macros por 100 g» también es una sola:
`dominio/servicios/macrosAlimentos`, que usan `Receta` y `PlanSemanal`.

## Dos cuentas de la misma regla, y un test que las ata

La grilla suma **mientras se escribe** (la presentación no puede llamar al
dominio) y el servidor vuelve a sumar al guardar:

- dominio → `PlanSemanal.macrosDe` y `PlanSemanal.totalesPorDia`;
- UI → `componentes/planes-semanales/formulario/totales.ts`.

Es deuda conocida, igual que en el recetario. Lo que la hace tolerable es
`totales.test.ts`: arma el mismo plan de las dos formas y compara los siete
días. Si alguien cambia una sola de las dos, ese test falla. Sin él, el
profesional decidiría el menú mirando un número y el paciente recibiría otro,
sin ningún error de por medio.

## Las celdas vacías no se guardan

La grilla manda las 42 celdas siempre; la entidad descarta las que no tienen ni
texto, ni receta, ni alimentos. Guardarlas dejaría decenas de filas fantasma
por plan y ninguna forma de distinguir «no come nada a la tarde» de «todavía no
lo cargué».

## El alto lo pone la grilla, no la ventana

El diálogo de alta y edición **crece con su contenido y scrollea entero**.
Tuvo un alto fijo (92 vh) con la grilla deslizándose adentro, y el resultado
fue el contrario del buscado: en pantallas bajas —y sobre todo en mobile— la
semana quedaba aplastada en una franja de doscientos píxeles. El alto de una
grilla de siete días por seis franjas lo tiene que poner la grilla.

A lo ancho es responsivo: de `lg` para arriba los siete días se reparten el
espacio y entran sin scroll (`lg:table-fixed`); abajo de eso la grilla conserva
su ancho mínimo y se barre de costado. Una semana no entra en 375 px, y fingir
que sí da columnas de 40 px ilegibles.

Tres decisiones más la mantienen compacta, todas con su costo:

- **las franjas se editan plegadas.** Se eligen una vez y quedan;
- **cada comida ocupa una o dos líneas** (`line-clamp-2`). El texto completo
  está en el `title` y en el editor;
- **quitar y «hacer principal» aparecen al pasar por encima**, y la comida
  entera es el botón de editar. Como con hover no alcanza en una pantalla
  táctil, las dos acciones están además adentro del editor.

## La comparativa de macros

Debajo de la grilla, cuando el menú se mira desde la ficha de un paciente, va
la tabla de **las cuatro macros día por día** contra la meta
(`ComparativaSemanal`). La grilla sola pone el semáforo únicamente en las
calorías, y dos menús de 2000 kcal pueden repartir las proteínas de forma muy
distinta: eso es lo que hay que revisar antes de entregar la semana.

El promedio de la semana va **sin semáforo** a propósito: un promedio dentro de
la meta puede estar hecho de días muy por encima y muy por debajo. Lo que se
cumple o no se cumple es el día. Y toma solo los días CON dato —contar los
vacíos como cero mostraría un promedio por debajo de cualquier día real del
menú, que es lo que congela `ComparativaSemanal.test.ts`—.

## Dónde se usa

- **`/dashboard/planes`, pestaña «Planes semanales»**: el listado con alta,
  edición, vista y asignación (`SeccionPlanesSemanales`).
- **Ficha del paciente, pestaña «Planes»**: adentro hay dos secciones, «Plan
  nutricional» y «Plan semanal» (`SeccionPlanesDelPaciente`), navegadas como
  las de Antropometría. Estaban una debajo de la otra y competían por el
  scroll: la de abajo —el menú, que es lo que el paciente mira todos los días—
  quedaba escondida.

No hay carpetas ni plantillas: un plan semanal **ya es** el molde reutilizable
—se asigna a cuantos pacientes haga falta y se edita en un solo lugar—, así que
clonarlo para usarlo sería duplicar por nada.

## Al tocar esto

- Si agregás un filtro al listado, acordate de `ObtenerPlanesSemanalesPaginado`:
  enumera los campos a mano para no arrastrar la paginación al conteo, y lo que
  no esté ahí se descarta en silencio (le pasó a `grupoId` en planes).
- Al sumar un campo a la comida, escribilo en el `create` anidado del
  repositorio **y** en el mapeo de vuelta. Igual que en los planes: el default
  de la base le gana a un valor que nunca se mandó.
- Si cambiás la cuenta de macros, cambiá las DOS —dominio y grilla— o
  `totales.test.ts` te lo dice.
- Los cinco modelos nuevos llevan `nutricionistaId` y están en
  `MODELOS_INQUILINO`. Un modelo nuevo que no esté ahí cruza datos entre
  consultorios sin dar error.
