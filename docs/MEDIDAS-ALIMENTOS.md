# Medidas de los alimentos (g, ml y medidas caseras)

Migración 90. Hasta acá todo alimento se medía en gramos: macros «por 100 g» y,
donde se usaba, `cantidadGramos`. Pero la leche va en ml, el aceite en
cucharadas y el huevo en unidades. El modelo nuevo es el de FatSecret: una
tabla nutricional por 100 de una unidad, más una lista de porciones con su
equivalencia («1 taza (240 ml)», «1 unidad (50 g)»).

Todo vive en `dominio/entidades/medidasAlimento.ts`.

## El alimento

Cada alimento (propio o de la plataforma) declara dos cosas:

| Campo        | Qué es                                                         |
| ------------ | -------------------------------------------------------------- |
| `unidadBase` | `GRAMO` o `MILILITRO`: sus macros son por 100 g o por 100 ml.  |
| `medidas`    | Sus medidas caseras, `[{ nombre, cantidad }]` = «1 nombre = cantidad g/ml». |

`medidas` es una columna JSON y no una tabla hija: es una lista chica que viaja
entera (se copia completa a cada uso, ver abajo) y nunca se consulta por
dentro. Se lee a la defensiva (`infraestructura/repositorios/base/medidasJson.ts`):
lo que no tiene la forma esperada se descarta en vez de romper un plan.

### Medidas estándar

`MEDIDAS_ESTANDAR` son las que tiene cualquier alimento de esa unidad sin
declararlas:

- **GRAMO**: kg (1000 g).
- **MILILITRO**: litro (1000), cm³ (1), cucharada (15), cucharadita (5),
  taza (250), vaso (200).

**Las de volumen son solo de los líquidos, a propósito.** Una cucharada de
azúcar no son 15 g: depende de qué haya adentro (densidad). Para un alimento en
gramos, «cucharada» existe solo si el alimento la declara («1 cucharada =
12»). Un alimento puede pisar una estándar declarando una propia con el mismo
nombre (su vaso de 250).

## Donde se USA el alimento

La opción del plan, el ingrediente de una receta (propia o de la plataforma) y
la comida del plan semanal copian, además de los macros:

| Campo               | Qué es                                                  |
| ------------------- | ------------------------------------------------------- |
| `cantidadGramos`    | La cantidad **en la unidad base** (g o ml). La única que suma macros. |
| `unidadBase`        | Copiada del alimento.                                   |
| `medidas`           | Copia de las medidas propias del alimento al elegirlo.  |
| `medida`            | La medida elegida («cucharada»), o null si se escribió en g/ml. |
| `cantidadMedida`    | Cuántas («2»).                                          |
| `cantidadPorMedida` | Cuánto es una, copiado al elegirla («15»).              |

Decisiones que conviene no deshacer:

- **`cantidadGramos` no cambió de nombre ni de papel.** Para un líquido son ml,
  y como sus macros son por 100 ml la cuenta es la misma (`sumarPorGramos`).
  Por eso no se tocó ninguna suma, ni las combinaciones del día, ni las metas,
  y todo lo cargado antes quedó igual (GRAMO, sin medida). El nombre quedó
  viejo; renombrarlo eran 130 referencias para no cambiar ningún resultado.
- **Con una medida elegida, los g/ml SALEN de la medida**
  (`normalizarCantidadDeAlimento`): cantidad × equivalencia, y lo que haya
  mandado la pantalla en `cantidadGramos` se descarta. Así las dos nunca dicen
  cosas distintas. Una medida sin equivalencia no se guarda.
- **Todo se copia, igual que los macros** (ver `docs/CATALOGO-BASE.md`): un
  plan entregado es un documento. Si mañana cambia «taza» en las estándar o el
  alimento corrige su «unidad», el plan sigue diciendo lo que se le entregó al
  paciente. Por eso se guardan la equivalencia y la copia de las medidas, y la
  pantalla ofrece la medida guardada aunque ya no exista en ninguna lista.

### Cómo se lee

`describirCantidad` arma el texto: «2 cucharadas (30 ml)», «0,5 taza (120
ml)», «150 g». Lo usan el PDF, el asistente de IA y la descripción de la
opción en el dominio; a las pantallas les llega hecho como `cantidadTexto` en
los DTO de salida (la presentación no puede llamar funciones del dominio). El
plural es solo de la primera palabra y solo si lo que sigue no la califica
(«2 tazas», pero «2 taza grande»); las abreviaturas (kg, cm³) no se
pluralizan.

## La pantalla

- **Alimentos** (alta y edición): «Se mide en» (g o ml) y la lista de medidas
  caseras. La tabla muestra la unidad y las medidas en una columna.
- **Buscador**: dice «por 100 g» o «por 100 ml» y lista las medidas.
- **Los cuatro editores** (receta, opción del plan, plan semanal, receta de la
  plataforma) usan `CampoCantidadAlimento`: el número y, al lado, la unidad o
  una medida. Debajo, cuánto es en g/ml.
  - Un alimento elegido entra en **1 de su primera medida** si tiene (1
    unidad, 1 taza), y si no en 100 g/ml.
  - **Cambiar de medida convierte la cantidad**: 100 g de huevo pasados a
    «unidad (50 g)» son 2 unidades.
  - Un alimento **cargado a mano** (sin `alimentoOrigenId`) puede pasar de g a
    ml; uno de la lista no, porque sus macros son por 100 de SU unidad.
- El estado de la pantalla y su cuenta en vivo viven en
  `componentes/comunes/alimentos/cantidad.ts`, **espejo** de la regla del
  dominio (como `macros.ts`). Al guardar manda el dominio.

## La planilla

Dos columnas opcionales, con la misma tolerancia que la categoría (lo que no
se entiende no rompe la importación):

- **Unidad** (`unidad`, también «Unidad de medida»): g, gr, gramos, ml, cc,
  cm3, mililitros, «100 g». Vacío o desconocido = sin dato.
- **Medidas** (`medidas`, `porción`, `equivalencia`): separadas por `;`, `|` o
  salto de línea. Cada una como `1 taza = 240`, `taza: 240 ml`,
  `1 cucharada (15 ml)` o `2 unidades = 100` (se divide: 1 unidad = 50). El
  número va en la unidad del alimento; la unidad escrita al lado se ignora.
  En un CSV separado por `;` hay que usar `|` entre medidas.

**Reimportar no pierde lo cargado a mano**: si la planilla no trae unidad o
medidas para un alimento que ya estaba, quedan las que tenía (la misma regla
que la imagen y la categoría). La plantilla descargable trae las dos columnas
con ejemplos (leche en ml con taza y vaso, huevo con unidad).

Open Food Facts no informa de forma confiable si un producto es por 100 ml:
sus resultados entran como GRAMO y sin medidas.
