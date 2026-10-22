# Planes semanales de referencia

El menú de una semana completa —siete días × las franjas del consultorio—, con
alternativas por celda, macros calculados y el total de cada día comparado
contra las metas DEL PLAN SEMANAL. Migración 45; metas propias, migración 91.

## No es una modalidad más del plan

`PlanNutricional` describe un **día tipo**: franjas con opciones
intercambiables que valen para cualquier día. `PlanSemanal` describe la
**semana**: qué se come el lunes al mediodía, que no es lo del martes.

Son dos cosas y conviven; un paciente puede tener las dos a la vez:

|                        | `PlanNutricional`                | `PlanSemanal`                     |
| ---------------------- | -------------------------------- | --------------------------------- |
| Qué describe           | el día tipo                      | los siete días                    |
| Metas de macros        | sí, las mismas todos los días    | sí, **propias** (migración 91): las mismas o unas por día |
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

## Las metas son del plan semanal (migración 91)

Hasta la migración 91 el plan semanal no tenía metas: cada día se comparaba
contra las del PLAN NUTRICIONAL asignado al paciente. La idea era que el plan
fija la pauta y el semanal la reparte. Se rompió con la migración 69, cuando
un paciente pasó a poder tener **varios** planes asignados: las metas salían
del primero que declarara macros, y la semana se juzgaba con una pauta elegida
por orden de llegada. Además, un plan semanal sin asignar no tenía contra qué
compararse, justo mientras se lo armaba.

Ahora cada plan semanal declara las suyas, de dos maneras (`ModoMetasSemana`):

| Modo      | Qué guarda                                   | Para qué |
| --------- | -------------------------------------------- | -------- |
| `GENERAL` | cuatro valores, los mismos para los 7 días    | la semana pareja, como un plan |
| `POR_DIA` | cuatro valores por día; un día vacío no tiene meta | el sábado con más calorías, los días de entrenamiento con más carbohidratos |

- **El TIPO es uno por macro en los dos modos** (aproximada, como mínimo, como
  máximo; ver `comparacionMacros`): la proteína es un piso toda la semana
  aunque cada día pida otra cantidad. Cuatro columnas `…MetaTipo`.
- **Dónde vive**: el modo, las generales y los tipos en columnas de
  `planes_semanales` (como en `planes_nutricionales`); las de cada día en la
  tabla hija `metas_dia_plan_semanal` (`MetaDiaPlanSemanal`, migración 92),
  una fila por día con metas. Ver «Por qué tabla y no JSON» abajo.
- **Se guarda solo el juego del modo elegido** (`normalizarMetas`). Si se
  guardaran los dos, el que no se ve volvería a regir con solo cambiar el
  modo. El formulario sí tiene los dos mientras se edita —cambiar de modo y
  volver no borra lo escrito— y, al pasar a «por día» con la semana vacía,
  cada día arranca con las generales (lo normal es retocar dos días, no
  escribir 28 números). «Copiar el lunes al resto» hace lo mismo desde un día.
- **Un juego con las cuatro vacías es «sin metas»** (null), y las calorías se
  redondean: son enteras en todo el sistema.
- **La comparación es de la entidad**: `PlanSemanal.metasDelDia(dia)` dice qué
  meta rige ese día y `comparacionPorDia()` compara los siete. Viaja en el DTO
  del plan (`metas` y `dias`), así que la grilla, la tabla, la ficha del
  paciente y el portal muestran el mismo semáforo, y la página del plan lo
  muestra aunque no esté asignado a nadie.
- **Los planes que ya existían quedaron SIN metas**: no había de dónde
  sacarlas sin elegir uno de los planes del paciente, que es lo que se vino a
  evitar. Muestran totales sin semáforo hasta que se les carguen.

### Por qué tabla y no JSON (migración 92)

En la migración 91 las metas de cada día se guardaron como JSON
(`planes_semanales.metasPorDia`). Funcionaba, pero para la base era un texto
con forma: aceptaba un día que no existe, el mismo día dos veces o un número
negativo, y la única defensa era la entidad. Son datos de forma FIJA —cuatro
números por día—, que es justo lo que las columnas y las restricciones de una
base relacional protegen mejor. La 92 las pasó a tabla, copió lo que había (y
descartó lo que no tenía la forma esperada) y borró la columna.

Qué garantiza la base desde entonces:

| Regla | Cómo |
| --- | --- |
| El día existe | columna `dia` del enum `DiaSemana` |
| Un juego por día | único `(planSemanalId, dia)` |
| Ningún valor negativo | CHECK `…_no_negativas`, en la tabla y en las generales del plan |
| Una fila tiene alguna meta | CHECK `…_con_alguna_meta` (un día sin metas va sin fila) |
| Con POR_DIA, las generales vacías | CHECK `planes_semanales_metas_segun_modo` |
| Borrar el plan se lleva sus metas | FK en cascada |

Lo único que no garantiza es la regla entre las dos tablas —con GENERAL no
hay filas por día—: haría falta un trigger. La cumple el repositorio, que
borra las filas del plan y las vuelve a crear en la MISMA transacción que lo
actualiza (y con GENERAL no crea ninguna). Los topes de cada valor (100.000
kcal, 10.000 g) no están en la base: son un control de carga del DTO, no una
regla del dominio.

Alternativas que se descartaron: una sola tabla para todas las metas con el
día vacío como «general» (la unicidad con NULL pide `NULLS NOT DISTINCT`, que
el schema de Prisma no puede expresar) y 28 columnas en el plan (rígido y
repetitivo).

La pantalla dice siempre contra qué compara (`descripcionDeMetas`): sin metas,
«los totales van sin comparar»; con las mismas todos los días, cuáles son; con
unas por día, cuántos días las tienen. En la vista del paciente, la del día que
está mirando.

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

El diálogo de alta y edición **crece con su contenido y scrollea entero**
(`CLASES_DIALOGO_PLAN_SEMANAL`, el mismo en el listado y en la página).
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

Debajo de la grilla va siempre la tabla de **las cuatro macros día por día**
contra la meta (`ComparativaSemanal`): en la página del plan, en la ficha del
paciente y en la semana completa del portal. La grilla sola pone el semáforo
únicamente en las calorías, y dos menús de 2000 kcal pueden repartir las
proteínas de forma muy distinta: eso es lo que hay que revisar antes de
entregar la semana.

Con las mismas metas toda la semana, van en una fila «Meta diaria» arriba; con
unas por día, cada celda dice la suya debajo del valor («meta ≥ 120 g»). Un
piso se escribe «≥» y un techo «≤» (`valorDeMeta`, en
`componentes/planes-semanales/metas.ts`, que comparten las tres vistas).

El promedio de la semana va **sin semáforo** a propósito: un promedio dentro de
la meta puede estar hecho de días muy por encima y muy por debajo. Lo que se
cumple o no se cumple es el día. Y toma solo los días CON dato —contar los
vacíos como cero mostraría un promedio por debajo de cualquier día real del
menú, que es lo que congela `ComparativaSemanal.test.ts`—.

## Dónde se usa

- **`/dashboard/planes`, pestaña «Planes semanales»**: el listado con alta,
  edición y asignación (`SeccionPlanesSemanales`). Se llega directo a la
  pestaña con `?pestana=semanales` (`RUTA_PLANES_SEMANALES`).
- **`/dashboard/planes/semanales/[id]`**: la PÁGINA del plan, como la de un
  plan nutricional. «Ver» y el nombre del listado llevan ahí. Muestra la grilla
  con la comparación, quién lo tiene (`PacientesDelPlanSemanal`, vigentes
  primero y con «Finalizar») y las acciones: editar (diálogo, como en los
  planes), asignar y eliminar. Antes la vista era un diálogo, y una semana con
  su tabla de macros no entraba; con URL propia, además, se llega desde la
  ficha del paciente («Abrir plan semanal»). Lee el plan de su query por id,
  así que al editarlo se refresca solo.
- **Ficha del paciente, pestaña «Planes»**: adentro hay dos secciones, «Plan
  nutricional» y «Plan semanal» (`SeccionPlanesDelPaciente`), navegadas como
  las de Antropometría. Estaban una debajo de la otra y competían por el
  scroll: la de abajo —el menú, que es lo que el paciente mira todos los días—
  quedaba escondida.
- **Portal del paciente, `/mi-semana`**: su propio menú, en modo lectura.

## El paciente lo lee de otra forma: un día por vez

`obtenerMiPlanSemanal` devuelve exactamente lo mismo que `obtenerDelPaciente`
—el menú, que trae adentro sus metas y la comparación de cada día—; lo único
que cambia es de dónde sale el paciente: de la sesión (`pacienteDeSesion`) y no de un
`pacienteId` de entrada. Va como procedimiento aparte y no como un parámetro
opcional porque acá no hay nada que elegir, y es justo eso lo que impide que un
paciente pida el menú de otro.

Lo que sí cambia es la pantalla. La grilla de siete columnas
(`VistaPlanSemanal`) es la del consultorio: el profesional arma la semana
entera y necesita verla junta para repartir los macros. El paciente abre la app
para saber qué come hoy, y una tabla de 42 celdas que en un teléfono se barre
de costado es lo contrario de esa pregunta. Por eso el portal usa
`VistaSemanaPaciente`: **un día por vez**, elegido con un selector que arranca
en hoy, y cada franja como una tarjeta con su comida principal.

Las **alternativas van plegadas**. Son intercambiables entre sí —«o esto, o
esto otro»—, así que mostrarlas abiertas haría que un día con opciones
pareciera un día con el triple de comida, que es el mismo malentendido que evita
el total del día al sumar solo la principal.

De `lg` para arriba la pantalla ofrece además la grilla completa, porque ahí
entra. Abajo de eso el selector no existe: no es una preferencia que convenga
dejar elegir cuando una de las dos opciones no se puede leer.

`textoDeComida` —qué se lee de una comida: su texto, o la receta, o sus
alimentos— vive en `componentes/planes-semanales/textoComida.ts` y lo usan las
dos vistas. Con una copia por vista, la que se agregue tercera va a decir algo
distinto de la misma comida.

`diaSemanaDe` (en la entidad) es lo único que cruza el calendario con el enum:
`getDay()` cuenta desde el domingo y `DIAS_SEMANA` desde el lunes, y repetir ese
corrimiento en cada pantalla termina mostrando el menú del día equivocado. Está
congelado en `PlanSemanal.test.ts`.

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
- Las metas se escriben en el `create` Y en el `update` del repositorio
  (`columnasDeMetas` y `metasDiaParaPrisma`), y el `deleteMany` de las metas
  por día va adentro de la transacción del `update`, como el de las franjas. Y no las vuelvas a sacar de un plan nutricional
  asignado: con varios no hay cuál elegir.
- Los cinco modelos de la migración 45 y `MetaDiaPlanSemanal` (92) llevan
  `nutricionistaId` y están en `MODELOS_INQUILINO`. Un modelo nuevo que no esté ahí cruza datos entre
  consultorios sin dar error.
