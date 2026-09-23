# Las instrucciones de la IA: siete prompts, uno por funcionalidad

La app usa un LLM en **siete** lugares distintos, y cada uno le habla al modelo
con su propio *system prompt*: el texto que le dice qué papel cumple, con qué
tono responde y qué no puede hacer. Hasta la migración 62 esos textos vivían
escritos adentro de su adaptador, y eso los volvía intocables: el consultorio
que quería sus propios títulos en el resumen de la ficha, o que la lectura de
planillas conociera la jerga de sus rótulos, no tenía dónde decirlo.

Ahora se editan desde **Integraciones → IA e ingredientes → Instrucciones de la
IA**.

## Las siete funcionalidades

| Clave                 | Qué hace                                          | Quién lee la salida         |
| --------------------- | ------------------------------------------------- | --------------------------- |
| `ASISTENTE_ANALITICO` | El chat del profesional sobre sus datos           | El profesional              |
| `ASISTENTE_PACIENTE`  | El chat del paciente sobre su plan                | **El paciente**             |
| `ANALISIS_COMIDA`     | Porción y macros a partir de la foto de un plato  | El paciente                 |
| `RESUMEN_CONSULTA`    | Resumen en Markdown de la consulta grabada        | El profesional (se GUARDA)  |
| `FICHA_PACIENTE`      | Alta de un paciente leyendo su ficha de papel     | El profesional (precarga)   |
| `HISTORIA_CLINICA`    | Historia clínica + evoluciones de un documento    | El profesional (sugerencia) |
| `MEDICIONES`          | Serie antropométrica desde una planilla           | El profesional (importa)    |

Los cuatro últimos y el análisis de comida devuelven **JSON con forma fija**: la
app valida la estructura contra su esquema, así que el prompt puede cambiar el
criterio pero no los nombres de los campos.

El más delicado es `ASISTENTE_PACIENTE`: es el único cuya salida lee alguien que
no es el profesional, y sus reglas de conducta —no diagnosticar, no medicar, no
cambiar el plan, no violar una alergia— son lo único que acota lo que la IA le
puede llegar a decir a un paciente sin que nadie mire. Por eso el router es
`nutricionistaProcedimiento`: quien edita esas reglas tiene que ser quien
responde por ellas.

## Dónde vive cada cosa

```
dominio/servicios/promptsIA.ts          catálogo: claves, explicación, TEXTO DE FÁBRICA,
                                        aplicarVariables(), puerto IPromptsIA
dominio/repositorios/IPromptIARepositorio.ts
infraestructura/ia/ResolvedorPromptsIA.ts   implementa el puerto contra la base
infraestructura/repositorios/PrismaRepositorioPromptIA.ts
aplicacion/servicios/ServicioPromptsIA.ts   lo que consume la pantalla
componentes/configuracion/PromptsIA.tsx     la lista plegable y el modal
```

El catálogo es la **única** fuente de verdad de los textos por defecto: los
adaptadores ya no los llevan adentro, los piden por `IPromptsIA.obtener(clave,
variables)`.

## Solo se guarda lo reescrito

La tabla `prompts_ia` tiene a lo sumo una fila por funcionalidad
**personalizada**. Sin fila, la app usa el texto de fábrica.

No se copia el texto de fábrica al dar de alta un consultorio, y no es una
optimización de espacio: si se copiara, mejorar la redacción de un prompt en una
versión nueva de la app no le llegaría a nadie — cada consultorio quedaría
clavado en el texto del día que se registró. Por el mismo motivo,
`ServicioPromptsIA.guardar` detecta que el texto enviado es idéntico al de
fábrica y **borra la fila** en vez de guardar una copia congelada.

`clave` es texto y no un enum de Postgres: la lista de funcionalidades la manda
el catálogo del código, y sumar una no debería exigir una migración.

## Los `{{marcadores}}`

Casi ningún prompt es texto fijo: el asistente del paciente necesita saber sus
alergias, el analítico qué día es hoy, las lecturas qué campos propios tiene el
consultorio. Esos datos entran por marcadores que la app reemplaza en cada
llamada.

| Prompt                | Marcadores                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| `ASISTENTE_ANALITICO` | `diaSemana`, `fecha`                                                     |
| `ASISTENTE_PACIENTE`  | `nombrePaciente`, `objetivos`, `plan`, `restricciones`, `recomendaciones` |
| `FICHA_PACIENTE`      | `medidas`, `camposPersonalizados`                                        |
| `HISTORIA_CLINICA`    | `hoy`, `camposFijos`, `camposPersonalizados`                             |
| `MEDICIONES`          | `hoy`, `medidas`                                                         |

Tres decisiones sobre esto:

- **Las listas de campos se derivan del código, no se escriben en el prompt.**
  `medidas` sale de `CAMPOS_PLANTILLA` y `camposPersonalizados` del alta del
  profesional. Así, sumar una medida al modelo o dar de alta un campo propio
  alcanza para que la extracción los busque, sin que nadie tenga que acordarse
  de editar siete textos.
- **Un marcador desconocido se deja tal cual.** Si el profesional escribe
  `{{pasiente}}`, verlo en el prompt es lo que le dice dónde está el error;
  vaciarlo en silencio solo dejaría una frase incompleta.
- **Borrar un marcador es válido y tiene consecuencias.** El modelo deja de
  recibir ese dato. La pantalla lo dice; la app no lo impide, porque hay
  marcadores que un consultorio puede querer sacar a propósito.

`aplicarVariables` no reinterpreta los marcadores que aparezcan en un valor: un
paciente que se llamara `{{hoy}}` no convierte su nombre en una fecha.

## La fecha, que no es un detalle

Un modelo **no sabe qué día es**. Sin `{{fecha}}`, el asistente analítico no
podía responder «¿qué turnos tengo hoy?» por más que la herramienta le
devolviera los turnos con su fecha: no tenía contra qué compararlas, y
contestaba que no había ninguno. Lo mismo con `{{hoy}}` en las tres lecturas de
documentos, donde además desambigua el año de una fecha escrita a dos dígitos.

## Degradación

`ResolvedorPromptsIA` **atrapa cualquier error de lectura** y sigue con el texto
de fábrica. Es el mismo criterio que `ResolvedorConfigIA`: un trabajo que corra
sin alcance de inquilino, o una base que no responde, no es motivo para dejar al
paciente sin respuesta. (En la práctica el worker sí tiene alcance —corre dentro
de `ejecutarEnNutricionista`—, así que el resumen de consulta también respeta la
personalización.)

No hay caché entre requests, a propósito. Lo que se espera después de guardar un
prompt es que la próxima respuesta salga distinta; una caché de proceso haría
que el cambio apareciera cuando el server decidiera, y en varias instancias,
cuando se le ocurriera a cada una. Es una tabla de a lo sumo siete filas leída
una vez por llamada al modelo: al lado de la llamada misma, no se nota.

## Por qué la pantalla se ve plegada

Son siete prompts de hasta cinco mil caracteres. Desplegados de una empujaban
los criterios de ingredientes tan abajo que la pestaña dejaba de servir para lo
demás. (Desde la migración 71 las claves de API ya no están en esa pestaña: son
de la plataforma, ver `docs/IA-PLATAFORMA.md`. Los prompts son lo único de la
IA que sigue siendo de cada consultorio.)
La lista muestra el título y dónde se usa; la explicación se despliega al
tocarla y el texto largo vive en un modal.

Cada fila explica primero **qué toca** —dónde se usa, quién lee la salida, qué
pasa si se cambia— porque el texto solo no alcanza para saberlo: el prompt del
asistente del paciente y el de la lectura de planillas se parecen mucho en la
pantalla y no se parecen en nada en las consecuencias.

El modal arranca siempre con un texto cargado —el propio o el de fábrica— y
nunca en blanco: reescribir un prompt es casi siempre corregir dos líneas del
que ya anda, y un cuadro vacío invita a redactar de cero uno peor.

## Límites

Entre 20 y 20.000 caracteres. El mínimo evita que un prompt de dos palabras
borre de un saque los límites clínicos del asistente del paciente sin que se
note que eso fue lo que pasó; para volver atrás está «Restablecer la original»,
que es explícito. El máximo (el más largo de fábrica ronda los 5.000) deja lugar
de sobra para agregar jerga y equivalencias, y evita que una planilla entera
pegada por accidente viaje en cada llamada al modelo.

## Al sumar una funcionalidad de IA

1. Agregá la clave a `CLAVES_PROMPT_IA` y su entrada a `PROMPTS_IA` (título,
   dónde, audiencia, descripción, variables y el texto de fábrica).
2. El adaptador recibe `IPromptsIA` por constructor, con
   `new PromptsIAPorDefecto()` como valor por defecto, y pide su prompt con
   `await this.prompts.obtener("CLAVE", variables)`.
3. Cableá el resolvedor real en `nucleo.ts`.

No hace falta migración ni tocar la pantalla: el listado y el modal salen del
catálogo. `promptsIA.test.ts` verifica que los marcadores escritos en el texto y
las variables declaradas coincidan en las dos direcciones.
