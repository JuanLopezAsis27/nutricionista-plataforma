# IA de la plataforma

Desde la migración 71, las claves de IA **son de la plataforma, no de cada
consultorio**. Las carga el SUPERADMIN una sola vez en `/admin` → «Configuración
de IA», y las usan todos los consultorios. Lo único de cada profesional son sus
**prompts** (`docs/PROMPTS-IA.md`).

## Qué cambió y por qué

Hasta la migración 70 cada nutricionista cargaba en Integraciones su propia
clave de Anthropic u OpenRouter, y otra de OpenAI/OpenRouter para voz a texto.
El producto pasó a ofrecer la IA como parte del servicio: el profesional no
tiene que abrir cuentas en tres proveedores ni entender qué es un modelo.

La migración **borra** las claves de IA que había en `credenciales_proveedor`
(proveedores ANTHROPIC, OPENROUTER y OPENAI) y las columnas de proveedor/modelo
de `preferencias_integracion`. No se migran a la configuración global a
propósito: eran de cuentas de cada profesional, y copiar una como clave de la
plataforma haría que todos los consultorios gastaran a cuenta de uno. WhatsApp
y los criterios de ingredientes siguen siendo del consultorio.

## Dónde vive

| Pieza                                   | Qué hace                                              |
| --------------------------------------- | ----------------------------------------------------- |
| `configuracion_ia_global` (una fila)    | Las tres claves cifradas y proveedor/modelo por capacidad |
| `IConfiguracionIAGlobalRepositorio`     | Puerto; `PrismaRepositorioConfiguracionIAGlobal` cifra con `CifradorTokens` |
| `ResolvedorConfigIA`                    | Arma el LLM desde la config global (cae a `ANTHROPIC_API_KEY`) |
| `ResolvedorTranscripcion`               | Igual para voz a texto (cae a `OPENAI_API_KEY`)        |
| `registros_uso_ia`                      | Una fila por llamada: consultorio, modelo, tokens, costo, error |
| `ProveedorLLMRegistrado` (`registroUso.ts`) | Decorador que escribe esa fila en cada `completar`/`conversar` |
| `IConsultorSaldoIA` / `ConsultorSaldoIA`| Pregunta a cada proveedor si la clave anda y cuánto saldo queda |
| `ServicioIAPlataforma`                  | Lo que expone el router `superadmin` (`estadoIA`, `guardarIA`, `saldosIA`, `resumenUsoIA`, `registrosUsoIA`) |

`configuracion_ia_global` **no es tabla de inquilino** (no tiene
`nutricionistaId`): se lee igual desde la request de un consultorio, el worker
o el panel. `registros_uso_ia` **sí** lo es —lleva el consultorio que originó la
llamada y está en `MODELOS_INQUILINO`—, pero el `nutricionistaId` es nullable con
`SET NULL`: dar de baja un consultorio no borra el historial de gasto.

## Una clave por PROVEEDOR, no por capacidad

La pantalla tiene tres claves (Anthropic, OpenRouter, OpenAI) y, aparte, qué
proveedor usa cada capacidad. Así la clave de OpenRouter sirve a la vez para
conversar y para transcribir, y el saldo que se consulta es el de la clave, que
es lo que el proveedor cobra. Antes eran dos claves por consultorio y, si las
dos eran de OpenRouter, había que cargar la misma dos veces.

## El registro de uso

- **Una fila por operación**, no por vuelta de la API: una pregunta al
  asistente que consultó tres herramientas es una sola cosa para quien mira el
  gasto. El decorador suma el consumo de cada vuelta.
- **El consumo viaja en las opciones de la llamada** (`alConsumir`), no en el
  constructor del proveedor: los proveedores se cachean y los comparten
  requests concurrentes, y un callback de instancia mezclaría los tokens de dos
  consultorios.
- **Registrar nunca rompe la llamada.** Si la base falla al escribir la fila,
  se loguea y el profesional recibe su respuesta igual (`anotarUso`). Es la
  única excepción a «no tragarse errores de IA»: acá lo que falla es la
  contabilidad, no la IA.
- **El costo solo aparece si el proveedor lo informa** (OpenRouter, con
  `usage: { include: true }`). Para Anthropic y OpenAI se guardan tokens. No se
  estima con una tabla de precios propia: quedaría vieja sin avisar y el panel
  mostraría un gasto inventado con cara de dato.
- Se escribe dentro del alcance del consultorio (la extensión le pone el
  `nutricionistaId`); el panel lo lee en alcance global.

## El saldo

Cada proveedor expone algo distinto con una clave común:

| Proveedor  | Qué se puede saber                                            |
| ---------- | ------------------------------------------------------------- |
| OpenRouter | Crédito comprado y consumido de la cuenta (`/api/v1/credits`) y el tope propio de la clave (`/api/v1/key`) |
| Anthropic  | Solo si la clave es válida (`GET /v1/models`, no gasta). El saldo se ve en la consola |
| OpenAI     | Igual que Anthropic. El endpoint de costos pide una clave de administración |

`ConsultorSaldoIA` **nunca lanza**: un proveedor caído es un dato del panel, no
un error de la pantalla. La consulta no se repite sola al enfocar la ventana
(son tres llamadas a terceros); hay un botón «Actualizar».

## Lo que ve el consultorio

Integraciones → «IA e ingredientes» ya no pide claves: muestra si la IA y la voz
a texto están **disponibles** (`iaDisponible`, `transcripcionDisponible` en el
estado de credenciales, calculados con los mismos resolvedores que usan las
llamadas, así que incluyen la caída a variables de entorno), los prompts y los
criterios de ingredientes. Los mensajes de «no hay IA configurada» mandan al
administrador de la plataforma, no a Integraciones.
