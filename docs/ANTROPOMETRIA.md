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

**Adiposa**: cada pliegue medido con lo que aporta a la Σ, etiquetado como
tronco o extremidades. Los tres sitios de fuera del ISAK también entran: la
región es anatómica, no depende de qué protocolo nombre el sitio.

**Muscular**: perímetros con el pliegue del mismo segmento descontado
(`perímetro − 3,141 · pliegue / 10`), que es exactamente la corrección del
fraccionamiento de Kerr — si acá se corrigiera distinto, dos partes de la misma
pantalla dirían cosas distintas sobre el mismo brazo. El antebrazo va sin
corregir porque el protocolo no tiene un pliegue de antebrazo; Kerr hace lo
mismo. Un segmento con perímetro pero **sin** su pliegue no entra a medias:
llevaría el tejido adiposo adentro y abultaría su parte del reparto.

### Por qué el reparto crudo no alcanza

El pliegue abdominal es más grueso que el tricipital en casi todo el mundo, así
que «el abdomen aporta más» no dice nada por sí solo. Lo que se interpreta es
la razón tronco/extremidades del paciente contra **la misma razón en el humano
de referencia Phantom, calculada sobre los mismos sitios que se midieron**. Así
un perfil de 4 pliegues y uno de 8 se leen cada uno contra su propia
referencia, en vez de contra una constante que solo valdría para el perfil
completo.

Un sitio **sin** media Phantom —bicipital, cresta ilíaca y los tres de fuera
del ISAK no la tienen— entra en el reparto pero se excluye de las dos sumas de
la razón. Dejarlo solo en el numerador del paciente compararía contra una
referencia que no lo incluye, que es peor que no comparar: medir un sitio más
cambiaría el patrón sin que la persona haya cambiado.

El margen para «equilibrado» es del **15 %**, deliberadamente ancho: el error
técnico de medición de un pliegue es del orden del 5 % y la razón combina
varios; un umbral estrecho haría cambiar de patrón entre dos consultas por
ruido de medición.

### La figura del cuerpo

Junto a las barras va una silueta con cada sitio medido marcado encima. Dicen
lo mismo y no se reemplazan: las barras dan el número, la figura contesta
«dónde» sin obligar a traducir «subescapular» o «cresta ilíaca» a un lugar del
cuerpo. También hace de control de carga —un sitio no medido no tiene punto, y
deja de parecerse a uno medido que da poco—.

El **área** del punto (no el radio) es proporcional al aporte del sitio al
total: el ojo compara áreas, y escalar el radio exagera las diferencias al
cuadrado. El color es la región, el mismo de la leyenda.

Se dibujan **dos vistas** cuando hacen falta: el subescapular y el lumbar son
de espalda, el pectoral y el abdominal de frente, y el tricipital y el
bicipital están en caras opuestas del mismo brazo. Con una sola vista, la mitad
de los puntos se amontonaría contra un borde sin decir de qué lado está. La
distribución muscular, cuyos segmentos son todos de frente, dibuja una sola: la
segunda silueta ocuparía la mitad del ancho para no decir nada.

Las coordenadas (`PUNTOS_CUERPO`) son **aproximadas a propósito**: ubican el
sitio en la cara y a la altura correctas, no en el punto exacto del protocolo.
Es un mapa para leer un reparto, no una guía de palpación.

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
