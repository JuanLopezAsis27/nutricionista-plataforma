# Publicar la app móvil (iOS + Android)

La app móvil es un **shell nativo con Capacitor** que abre la app web en vivo
dentro de un WebView (ver `capacitor.config.ts`). No se
reescribe nada: el teléfono muestra el mismo sitio ya desplegado, y el shell
agrega lo nativo (permisos, wearables — ver `docs/WEARABLES.md`).

Ventaja clave: **los cambios de la web salen al instante** (sin volver a pasar
por las tiendas). Solo hace falta re-publicar en la tienda si cambiás algo
**nativo** (config de Capacitor, plugins, íconos, versión).

## Requisitos

| | iOS | Android |
|---|---|---|
| Herramienta | **Xcode** (solo en Mac) | **Android Studio** (Win/Mac/Linux) |
| Cuenta | Apple Developer (USD 99/año) | Google Play Console (USD 25, único) |
| Salida | `.ipa` → App Store Connect | `.aab` → Play Console |

## Preparar el proyecto (una vez)

Las dependencias de Capacitor **ya están instaladas** (`@capacitor/core`, `cli`,
`app`, `android`, `ios`) y `capacitor.config.ts` ya existe en la raíz con el
`appId` `com.consultorio.app`. Solo falta generar las carpetas nativas (esto
requiere tener el SDK correspondiente: Android Studio y/o Xcode):

```bash
# 1. Para producción no hay que tocar nada: sin CAP_SERVER_URL, la app usa
#    el origen de producción por HTTPS (ver capacitor.config.ts).
# 2. Generar los proyectos nativos:
npm run cap:add:android    # crea android/  (necesita Android Studio)
npm run cap:add:ios        # crea ios/      (necesita una Mac con Xcode)
npm run cap:sync           # copia config + plugins a los proyectos nativos
```

> Estos comandos (`cap add`) hay que correrlos **localmente** en la máquina que
> tiene el SDK; generan carpetas nativas grandes (conviene git-ignorarlas o no,
> según prefieras versionarlas).

Íconos y splash: `npm i -D @capacitor/assets`, poné el logo en `assets/` y
corré `npx capacitor-assets generate`.

## Arranque rápido (desarrollo, probar en un teléfono real)

Para ver la app en el teléfono apuntando a tu servidor de desarrollo (sin
desplegar todavía):

```bash
# 1. Levantá la web accesible en la LAN:
npm run dev -- -H 0.0.0.0        # queda en http://<IP-de-tu-PC>:3000

# 2. Sincronizá apuntando el shell a esa IP, por variable de entorno:
CAP_SERVER_URL=http://192.168.x.x:3000 npm run cap:sync

# 3. Corré en el dispositivo/emulador:
npm run cap:run:android          # elige dispositivo y compila
```

El teléfono y la PC tienen que estar en la **misma red**.

> **Por qué es una variable de entorno y no un valor en el archivo.** Antes la
> URL de desarrollo estaba escrita en `capacitor.config.json`, versionada y con
> `cleartext: true`. Eso hacía que cualquier build salido de una copia limpia
> del repo —incluido un release de la tienda— hablara HTTP contra una IP de red
> local: sesión, credenciales y datos clínicos en texto plano, y encima
> mandados a la máquina que tuviera esa IP en la red del usuario.
>
> Ahora el valor inseguro no puede quedar commiteado, porque no vive en ningún
> archivo. Sin `CAP_SERVER_URL`, el build es el de producción. Y `cleartext`
> se habilita únicamente si la URL pedida empieza con `http://`.

**Para el build de producción: no definas `CAP_SERVER_URL`.** Es todo. Si por
error quedara definida con un `http://` y `NODE_ENV=production`, la
configuración aborta el build en vez de generar una app insegura.

Scripts disponibles: `cap:add:android` / `cap:add:ios`, `cap:sync`, `cap:copy`,
`cap:open:android` / `cap:open:ios`, `cap:run:android`.

## iOS → App Store

1. `npx cap open ios` (abre Xcode).
2. En **Signing & Capabilities**: elegí tu *Team* (Apple Developer); Xcode firma solo.
3. Subí el número de versión/build; elegí "Any iOS Device".
4. **Product → Archive** → cuando termina, **Distribute App → App Store Connect → Upload**.
5. En [App Store Connect](https://appstoreconnect.apple.com): completá ficha
   (nombre, capturas, descripción, política de privacidad), probá con
   **TestFlight**, y **Enviá a revisión**. Aprobación: ~1–3 días.

> ⚠️ **Guía 4.2 de Apple ("minimum functionality").** Apple rechaza apps que son
> solo un envoltorio de una web. Para pasar, la app tiene que aportar valor
> **nativo**: acá lo da la **integración con Apple Watch/HealthKit** (wearables)
> y, si sumás, **notificaciones push** (`@capacitor/push-notifications`) y
> cámara nativa. Declará esas capacidades en la ficha. Android es más flexible.

## Android → Play Store

1. `npx cap open android` (abre Android Studio).
2. Generá una **keystore** de firma (una sola vez; guardala bien — sin ella no
   podés actualizar la app):
   ```bash
   keytool -genkey -v -keystore consultorio.keystore -alias consultorio \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Configurala en `android/` (recomendado: Play App Signing, que gestiona la
   clave por vos).
3. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
4. En [Play Console](https://play.google.com/console): creá la app, subí el
   `.aab`, completá la ficha y la sección de privacidad/permisos (Health Connect
   requiere justificar los permisos de salud), probá en **testing interno** y
   publicá. Aprobación: horas a ~1–2 días.

## Actualizaciones

- **Cambios de la web** (features, fixes de UI, la mayoría de lo que hacés): se
  ven al instante al desplegar la web; el WebView recarga el sitio. No tocás las
  tiendas.
- **Cambios nativos** (plugins, permisos, `capacitor.config.ts`, íconos, versión):
  `npx cap sync`, subí el número de versión, re-archivá/re-buildea y volvé a
  publicar en la tienda.

## Permisos de salud (wearables)

Ver `docs/WEARABLES.md` para el plugin de HealthKit / Health Connect, los
permisos (`Info.plist` / manifest) y el flujo de sincronización que hace
`POST /api/metricas/importar`.
