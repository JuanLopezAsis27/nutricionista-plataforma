# Antropometría — modelos, ecuaciones y distribución

Detalle del módulo de composición corporal. El resumen conceptual —los dos
modelos que conviven y por qué no se mezclan— está en `AGENTS.md`.

## Los tres bloques que produce una medición

| Bloque                | Qué contesta           | Dónde vive                              |
| --------------------- | ---------------------- | --------------------------------------- |
| Fraccionamiento Kerr  | Cuánto hay, anatómico  | `composicionCorporal.ts`                |
| Grasa por pliegues    | Cuánto hay, por regresión | `grasaPorPliegues.ts`                |
| Distribución          | **Dónde** está         | `composicion/distribucion.ts`           |

Ninguno se persiste: todo se recalcula de las medidas crudas en cada lectura.

## Ecuaciones del modelo de 2 componentes

Nueve, y cada una con su población de validación y su juego de sitios. La UI
muestra, para cada una, **qué sitios sumó y cuánto dio esa Σ**: sin eso, cargar
un pliegue que solo entra en una ecuación parecía no servir para nada.

| Ecuación                   | Sitios | Población                       | Devuelve   |
| -------------------------- | ------ | ------------------------------- | ---------- |
| Yuhasz / Carter            | 6      | Deportistas                     | % directo  |
| Yuhasz / Carter — Kerr     | 6      | Sedentarios (×1,17)             | % directo  |
| Faulkner                   | 4      | Deportistas                     | % directo  |
| Faulkner — Kerr            | 4      | Sedentarios (×1,14)             | % directo  |
| Withers                    | 7 (M) / 4 (F) | Atletas                  | densidad   |
| Durnin & Womersley         | 4      | Población general, 16–72        | densidad   |
| Jackson & Pollock          | 7      | Población general, 18–61        | densidad   |
| Jackson & Pollock          | 4      | Población general (abreviada)   | **% directo** |
| Parrillo                   | 9      | Fisicoculturismo y fuerza       | % directo  |

Las que devuelven densidad convierten con Siri (1961). **Jackson & Pollock de
4 sitios devuelve el porcentaje DIRECTO**: es el error clásico al
transcribirla, porque el mismo autor publicó ecuaciones de densidad para otros
juegos de pliegues, y aplicarle Siri encima da disparates. Hay un test que lo
congela.

Parrillo es la única que depende del **peso**, y su coeficiente (27) está en
unidades imperiales: se convierte el peso a libras en vez de reexpresar la
constante, para que el 27 siga siendo verificable de un vistazo contra la
publicación.

### Los tres sitios que el perfil ISAK no tiene

Migración 39. Jackson & Pollock de 7 pide **pectoral** y **axilar medio**;
Parrillo pide **pectoral** y **lumbar**. No son sinónimos de ninguno de los
ocho del ISAK: el pectoral va en la diagonal entre axila y pezón, el axilar
medio sobre la línea axilar media a la altura del xifoides y el lumbar sobre
los erectores, a la altura de la cresta ilíaca.

La plantilla de fábrica «Jackson & Pollock + Parrillo (11 pliegues)» los suma a
los ocho del ISAK y habilita todas las ecuaciones.

### El sitio «suprailíaco»

**Decisión declarada, revisable en una línea** (`PLIEGUE_SUPRAILIACO` en
`grasaPorPliegues.ts`): el suprailíaco de Jackson & Pollock y de Parrillo se
toma como la **cresta ilíaca** del ISAK.

Ninguna de las dos familias se escribió pensando en la distinción que el ISAK
hace entre cresta ilíaca (línea axilar media) y supraespinal (línea
ilioespinal). Se elige cresta ilíaca por coherencia con Durnin & Womersley,
que ya usaba ese sitio para su propio suprailíaco: si dos ecuaciones tomaran
sitios distintos bajo el mismo nombre, cambiar de ecuación en la serie de un
paciente movería el número por dos motivos a la vez.

## Distribución adiposa y muscular

Otra pregunta, no otra versión de la misma. El fraccionamiento y las
ecuaciones dan **totales**; dos personas con el mismo total pueden tener toda
la grasa en el tronco o repartida en las extremidades, y eso cambia tanto el
riesgo cardiometabólico como la lectura del entrenamiento.

Son **tres zonas adiposas y tres segmentos musculares**, que es la partición de
la planilla del profesional.

### Adiposa: superior, central, inferior

Los pliegues se agrupan por altura anatómica y cada zona vale lo que su Σ
aporta a la Σ total de los pliegues medidos.

| Zona     | Sitios ISAK                | Sitios de fuera del ISAK   |
| -------- | -------------------------- | -------------------------- |
| Superior | tricipital, subescapular   | bicipital, pectoral, axilar medio |
| Central  | supraespinal, abdominal    | cresta ilíaca, lumbar      |
| Inferior | muslo, pantorrilla         | —                          |

Con el perfil ISAK de 6 pliegues las tres zonas caen en tres pares, que es lo
que hace la lectura comparable entre consultas aunque el perfil crezca.

**El subescapular es SUPERIOR, no central.** La zona central es la *cintura*
—lo que se mira por riesgo cardiometabólico—; el tronco alto se mueve con el
tren superior. Meterlo en central movería las dos zonas a la vez y dejaría la
única que se lee clínicamente contaminada con espalda.

Los tres sitios de fuera del ISAK entran igual: la zona es anatómica, no
depende de qué protocolo nombre el sitio.

Con **una sola zona medida no hay distribución**: el reparto daría 100 % y eso
no es un reparto, es el único pliegue que se tomó.

### Muscular: brazo, muslo, pierna

Cada segmento es un perímetro con el pliegue del mismo segmento descontado
(`perímetro − 3,141 · pliegue / 10`), que es exactamente la corrección del
fraccionamiento de Kerr — si acá se corrigiera distinto, dos partes de la misma
pantalla dirían cosas distintas sobre el mismo brazo. Un segmento con perímetro
pero **sin** su pliegue no entra a medias: llevaría el tejido adiposo adentro y
abultaría su parte del reparto.

El muslo va por el perímetro **máximo** y no por el medial, aunque el pliegue se
tome a media altura: la referencia Phantom del muslo corregido está definida
sobre el máximo. Calcular el valor del paciente sobre un sitio para compararlo
contra otro daría un Score-Z que mide la diferencia entre dos protocolos.

### El Score-Z del segmento

El porcentaje dice cómo se reparte el músculo entre los tres segmentos; **no**
dice si el segmento es grande o chico. Tres segmentos flacos por igual dan el
mismo reparto que tres grandes por igual. Por eso cada uno lleva además su
Score-Z contra el Phantom, con la medida escalada a 170,18 cm como el resto del
perfil de proporcionalidad. Sin talla no hay Z —un Z sin escalar mediría el
tamaño de la persona, no su proporción—, pero el reparto se muestra igual.

La **media** de la referencia no se escribe a mano: se deriva aplicándole al
Phantom la misma corrección que al paciente, y da exactamente los valores
publicados (brazo 22,05; muslo 47,34; pierna 30,22). Derivarla es lo que
garantiza que las dos puntas de la resta usen la misma constante para siempre,
y hay un test que lo fija: un sujeto con las medidas medias del Phantom tiene
que dar Z = 0 en los tres segmentos.

El **desvío** sí es un dato publicado (Ross & Marfell-Jones: 1,91 / 3,59 / 1,97)
y no se puede derivar: el perímetro y el pliegue del mismo segmento están
correlacionados, y propagarlos como independientes lo sobreestimaría — los
corregidos dispersan *menos* que sus perímetros crudos, no más.

Las bandas del color son por **valor absoluto** (< 1 DE, 1–2 DE, ≥ 2 DE): un Z
de −2,5 se aparta de la referencia tanto como uno de +2,5, y en
proporcionalidad eso es lo que se mira. El color nunca va solo: el número está
escrito adentro de la pastilla y el `title` dice la banda.

### Cómo se dibuja

Tres piezas que dicen cosas distintas y no se reemplazan:

- **Las barras** comparan cada perímetro con su corregido en una escala única
  que arranca en cero. Lo que se lee es la *caída* entre los dos —el tejido
  adiposo que envuelve el segmento—, y esa caída es la única parte del cuadro
  que se ve como una diferencia y no como un número. Con un eje por segmento, o
  empezando en el mínimo, se vería del mismo tamaño en un brazo y en un muslo.
- **La figura** es una silueta partida al medio, adiposo a la izquierda y
  muscular a la derecha, con los porcentajes de cada tejido de su lado. Hace de
  leyenda: evita traducir «superior» o «pierna» a un lugar del cuerpo. No lleva
  marcas por sitio —las zonas son regiones, no puntos, y un punto prometería una
  precisión de palpación que este reparto no tiene—.
- **Las tablas** dan el número exacto. La adiposa lista de qué pliegues está
  hecha cada zona: sin eso, «Central 35,87 %» no se puede auditar contra la
  planilla.

Los colores de los dos tejidos son los del resto del dashboard
(`TEMAS_COMPOSICION.masas`), no una paleta propia de esta tarjeta: la masa
adiposa no puede ser de un color en el donut y de otro tres tarjetas más abajo.

## Objetivos: uno por FORMA DE MEDIR

El módulo mide lo mismo de tres maneras, y la meta se plantea sobre una de
ellas. El selector de variable está agrupado por esas tres —`origenDeVariable`
en `ObjetivoComposicion.ts`— porque en una lista plana de diecisiete, «masa
adiposa» (Kerr, anatómico) y «masa grasa» (regresión contra densitometría) se
eligen a ciegas, y son números de modelos distintos que no se comparan entre sí.

- **Fraccionamiento en 5 masas**: las cinco, en kg y en porcentaje. Hasta la
  migración 40 solo la adiposa y la muscular eran objetivables; las otras tres
  se calculaban y se dibujaban en el donut sin poder plantearse como meta.
- **Grasa por pliegues**: `PORCENTAJE_GRASA` y `MASA_GRASA_KG`, cada una atada
  a UNA ecuación.
- **Básicos e índices**: peso, IMC, cintura, Σ6. No dependen de ningún modelo.

**La unicidad es por (paciente, variable, ecuación)**, no por variable. Seguir
el % graso por Yuhasz y por Durnin & Womersley son dos metas sobre dos formas
de medir, no una contradicción; antes, plantear la segunda pisaba la primera.
Una variable de grasa se agota en el selector recién cuando todas sus
ecuaciones tienen meta.

Son **dos índices únicos** y no uno (migración 40), por la misma particularidad
de Postgres que ya mordió en los recordatorios: los NULL no colisionan entre
sí. El compuesto cubre las metas con ecuación; un índice **parcial**
(`WHERE metodoGrasa IS NULL`) cubre las que no la llevan. Sin el segundo se
podrían cargar diez metas de peso para el mismo paciente y nada fallaría hasta
que el dashboard tuviera que elegir cuál dibujar.

Por eso el `guardar` del repositorio es un upsert **por id** y no por la clave
de negocio: Prisma no admite null en una clave compuesta única. Quién decide si
la meta se replantea o se crea es el caso de uso, que busca la combinación
primero.

## Σ 6 y Σ 8

`sumatoria6Pliegues` es la de la planilla habitual. `sumatoria8Pliegues` suma
el bicipital y la cresta ilíaca: existe porque esos dos sitios, cuando se
miden, no aparecían en **ningún** número de la pantalla —los usan Withers y
Durnin & Womersley por dentro, pero eso no se veía— y parecía que cargarlos no
servía para nada.

## La pestaña de mediciones

Una **tarjeta por consulta**, no una columna por consulta. La planilla de
columnas mostraba las ~40 filas de todas las mediciones a la vez y crecía hacia
el costado: a partir de la cuarta consulta había que hacer scroll horizontal
para llegar a la última, que es la que se mira. Y la unidad de trabajo del
profesional es LA CONSULTA —qué se midió ese día y cómo quedó—, no la fila
«peso a lo largo del tiempo», que para eso están los gráficos de evolución.

La tarjeta muestra cuatro cifras (peso con su delta, grasa de la ecuación
destacada, IMC y Σ6) y la ficha completa se abre al clickearla, con la
diferencia contra la consulta anterior al lado de cada medida. La definición de
las filas vive en `filasMedicion.ts` y la leen las dos vistas: mientras estuvo
adentro del componente de la tabla, agregar una medida al formulario podía
dejar a una de las dos sin mostrarla, en silencio.

## Layout del dashboard

El perfil Phantom crece con la cantidad de medidas cargadas y con el ISAK
completo es la pieza más alta de la pantalla. Va **solo en su columna**, con la
somatocarta, los índices y la energía apilados al lado; `xl:items-start` impide
que la columna corta se estire hasta igualar a la larga. Cuando la somatocarta
compartía fila solo con el Phantom, quedaba con media pantalla de blanco
debajo.

## Al tocar esto

- Una ecuación nueva se suma en `METODOS_GRASA`, `DEFINICIONES_METODO` y
  `porcentajeDe`, **y además** en `REQUISITOS_RESULTADO`
  (`PlantillaAntropometrica.ts`): sin lo último, la plantilla no la promete y
  el test de coherencia con el cálculo real no la cubre.
- Un sitio nuevo toca schema + migración, `MedidasComposicion`,
  `ETIQUETAS_MEDIDA`, la entidad, `CAMPOS_PLANTILLA`, los DTOs, el mapeador de
  Prisma, `GRUPOS` del formulario y `filasMedicion.ts`. El test de mapeadores
  (`mapeadores.evaluacion.test.ts`) da a cada medida un valor único justamente
  para cazar un cruce entre campos vecinos.
- Una serie histórica **nunca** cambia de modelo ni de ecuación. Por eso los
  valores del enum `MetodoGrasa` solo se agregan, nunca se renombran ni se
  reordenan. Lo mismo vale para `VariableComposicion`: el orden de un enum de
  Postgres es su orden de comparación y las metas ya cargadas lo usan.
- Una variable objetivable nueva va en `VARIABLES_COMPOSICION`,
  `RANGOS_VARIABLE`, `ORIGEN_DE_VARIABLE`, el `switch` de `valorDeVariable` y
  —si apunta a una de las cinco masas— en `MASA_DE_VARIABLE` de
  `TortaMasasConObjetivos`. Las tres primeras rompen la compilación si se
  olvidan; las dos últimas no.
