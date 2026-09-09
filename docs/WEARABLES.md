# Wearables (Apple Watch / Health Connect)

Cómo sumar datos de un reloj/app de salud al seguimiento del paciente. La **app
web funciona igual sin nada de esto**: los wearables son una capa nativa
opcional (Capacitor) que se agrega encima.

## Cómo funciona

```
  App nativa (Capacitor)                 App web (Next.js, ya desplegada)
  ┌───────────────────────┐              ┌───────────────────────────────┐
  │  WebView → carga la    │  cookie de   │  POST /api/metricas/importar  │
  │  app web en vivo       │◄───sesión───►│  (pacienteId de la sesión)    │
  │                        │              └──────────────┬────────────────┘
  │  Plugin de salud:      │  POST JSON                  ▼
  │  HealthKit /           │  ────────────►  MetricaDispositivo (por día)
  │  Health Connect        │                             │
  └───────────────────────┘                  Tracking: alimenta sueño y
                                              actividad de los días INCLUIDOS
```

- El **shell nativo** es un WebView que carga la app web en vivo (`server.url`
  en `capacitor.config.json`). No hay que reescribir la app.
- Un **plugin de salud** lee del reloj (pasos, sueño, minutos de actividad…) y
  hace `POST /api/metricas/importar` con la cookie de sesión del paciente.
- En **Mi progreso → Datos del reloj**, el paciente ve los días importados y
  **elige por día si cuentan** para su seguimiento (opt-in). Los días incluidos
  completan la adherencia a los axiomas de sueño y actividad cuando el diario no
  tiene el dato. El nutricionista lo ve en la pestaña Progreso (solo lectura).

Todo el backend ya está: entidad `MetricaDispositivo`, `metricas.importar` /
`metricas.mias` / `metricas.fijarInclusion` (tRPC), la ruta REST
`/api/metricas/importar` y la integración con el tracking.

## La tarjeta dice «En desarrollo» hasta que el plugin exista

Lo que falta es la punta nativa: sin el plugin de salud montado, nadie tiene
datos acá, y la tarjeta se ve vacía para todo el mundo.

Una tarjeta vacía y sin aviso se lee como «tu reloj no sincronizó» —un problema
del paciente, que se va a ir a buscar el permiso que le falta— en vez de «esto
todavía no existe». Por eso `MetricasDispositivo` lleva el rótulo **En
desarrollo** y una línea que lo explica, del lado del paciente y del
profesional.

El rótulo se saca cuando el plugin esté andando, **no antes**: mientras la lista
pueda estar vacía por una función que falta, decirlo es la única lectura
correcta de esa tarjeta. Si algún día hay datos importados igual se listan
debajo del aviso —la importación funciona—; lo que no está es quién la dispara.

## Montar el shell nativo

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/app
npx cap init            # usa capacitor.config.json (appId/appName/server.url)
npx cap add ios         # requiere Xcode (macOS)
npx cap add android     # requiere Android Studio
# Editá capacitor.config.json → server.url = tu dominio de producción
npx cap sync
```

`webDir` apunta a `public` solo porque Capacitor lo exige; como la app es SSR,
el WebView carga el sitio en vivo vía `server.url`.

## Plugins de salud

- **iOS (Apple Watch / HealthKit):** p. ej. `capacitor-health` o
  `@perfood/capacitor-healthkit`. En `Info.plist`:
  `NSHealthShareUsageDescription` (y `NSHealthUpdateUsageDescription` si escribís).
- **Android (Health Connect):** un plugin de Health Connect; declarar los
  permisos de lectura (`android.permission.health.READ_STEPS`,
  `READ_SLEEP`, `READ_ACTIVE_CALORIES_BURNED`, `READ_HEART_RATE`…) y el intent
  de la pantalla de permisos.

Pedí permiso solo para lo que se usa: pasos, sueño, minutos de actividad,
calorías activas, frecuencia cardíaca en reposo.

## Sincronización (plantilla)

Este código corre dentro del WebView (misma sesión que la app). Llamalo al
abrir/volver a la app y una vez por día:

```ts
// sincronizarSalud.ts (proyecto Capacitor). Ajustar a la API del plugin elegido.
import { Health } from "capacitor-health"; // o el plugin que uses

async function leerDia(fecha: Date) {
  const desde = new Date(fecha);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(fecha);
  hasta.setHours(23, 59, 59, 999);
  const [pasos, sueno, actividad] = await Promise.all([
    Health.querySteps({ startDate: desde, endDate: hasta }),
    Health.querySleepHours({ startDate: desde, endDate: hasta }),
    Health.queryActiveMinutes({ startDate: desde, endDate: hasta }),
  ]);
  return {
    fecha: fecha.toISOString().slice(0, 10),
    fuente: "APPLE_WATCH", // o "HEALTH_CONNECT"
    pasos: pasos.value ?? null,
    horasSueno: sueno.value ?? null,
    minutosActividad: actividad.value ?? null,
  };
}

export async function sincronizar(diasAtras = 7) {
  const dias = [];
  for (let i = 0; i < diasAtras; i++) {
    const f = new Date();
    f.setDate(f.getDate() - i);
    dias.push(await leerDia(f));
  }
  await fetch("/api/metricas/importar", {
    method: "POST",
    credentials: "include", // usa la cookie de sesión del WebView
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dias }),
  });
}
```

`importar` es idempotente por día/fuente: reimportar el mismo día actualiza el
registro y **no pisa** la elección de opt-in del paciente.

## Privacidad

- Datos de salud → pedí consentimiento explícito antes de leer del reloj.
- Se envían solo las métricas agregadas por día (no series crudas).
- El opt-in por día le da al paciente control de qué se tiene en cuenta.
- Todo queda aislado por inquilino (`nutricionistaId`) como el resto de la app.
