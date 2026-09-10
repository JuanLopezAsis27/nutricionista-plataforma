# PWA — instalar la app como acceso directo

La app web es una **PWA**: se puede instalar en Windows, Mac, Android y iPhone,
y queda con su ícono, su acceso directo y su propia ventana —sin barra de
direcciones—, igual que una aplicación nativa.

No es un empaquetado ni una segunda app: es **el mismo sitio**. Lo que se
instala es un atajo al origen desplegado, así que un despliegue de la web
actualiza a todo el mundo sin reinstalar nada.

> Para la app de las **tiendas** (Play Store / App Store), que es otra cosa —un
> shell nativo con Capacitor—, ver `docs/MOBILE.md`. Las dos conviven: la PWA no
> toca nada del proyecto de Capacitor.

## Las piezas

| Archivo                                        | Qué hace                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `src/app/manifest.ts`                          | El manifiesto (`/manifest.webmanifest`): nombre, íconos, colores   |
| `public/sw.js`                                 | El service worker: pantalla sin conexión y caché de assets        |
| `src/componentes/pwa/RegistroServiceWorker.tsx`| Registra el worker (solo en producción)                           |
| `src/componentes/pwa/instalacion.ts`           | El estado compartido de «se puede instalar»                       |
| `src/componentes/pwa/BotonInstalarApp.tsx`     | El cartel que ofrece instalar, una vez por visita                 |
| `src/componentes/pwa/BotonInstalarHeader.tsx`  | El botón de instalar de las barras de navegación                  |
| `src/app/sin-conexion/page.tsx`                | Lo que se ve cuando no hay red                                     |
| `src/app/icon.png`, `favicon.ico`, `apple-icon.png` | Favicon y ícono de iOS (metadatos de Next)                    |
| `public/iconos/*`                              | Los íconos que declara el manifiesto                              |
| `assets/marca/logo-original.jpg`               | El logo tal cual lo entregó el profesional (fuente de todo)       |
| `scripts/generar-iconos-pwa.mjs`               | Limpia el logo y regenera todos los íconos                        |

Hacen falta **las dos** cosas —manifiesto y service worker con manejador de
`fetch`— para que Chrome ofrezca "Instalar". Con el manifiesto solo, el acceso
directo queda siendo un marcador del navegador que abre una pestaña común.

## Qué se cachea, y qué no

Esta es la decisión importante y conviene no revertirla por descuido.

**El service worker NO cachea ninguna página ni ninguna respuesta de `/api/*`.**
Solo guarda lo que es idéntico para todo el mundo: los assets con hash de
`/_next/static/` (cuando cambia el contenido cambia la URL, así que una copia
vieja nunca queda obsoleta) y los íconos.

El motivo es que todas las pantallas dependen de la sesión. Una respuesta HTML
guardada en el Cache Storage es la ficha de un paciente escrita en el disco del
dispositivo, y **el Cache Storage no se limpia al cerrar sesión**: quedaría
accesible para quien abra la app después, en la compu del consultorio o en un
teléfono prestado. Por eso tampoco se usó `next-pwa` ni Workbox, que precachean
el shell entero por defecto.

La contrapartida es que la app **no funciona sin conexión**, y está bien: sin
red no hay datos que mostrar de todos modos. Lo único que aporta el worker sin
red es `/sin-conexion`, que reemplaza al error del navegador —dentro de una
ventana instalada, sin barra ni botón de recargar, ese error deja a la persona
sin salida.

## Cómo se instala

- **Windows / Mac (Chrome o Edge)**: aparece el cartel de la app abajo a la
  derecha, o el ícono de instalar en la barra de direcciones, o menú ⋮ →
  _Enviar, guardar y compartir_ → _Instalar página como aplicación_. Queda un
  acceso directo en el escritorio y en el menú Inicio.
- **Android (Chrome)**: el mismo cartel, o menú ⋮ → _Agregar a la pantalla
  principal_.
- **iPhone / iPad (Safari)**: iOS **no** implementa `beforeinstallprompt`, así
  que no hay diálogo posible. La única vía es Compartir → _Agregar a inicio_.
  Por eso, en iOS, el cartel muestra esa instrucción en lugar de un botón y el
  botón del header la explica en un toast: esconderlos dejaría al iPhone sin
  ninguna pista.

### Las dos puertas: el cartel y el botón

El **botón** (`BotonInstalarHeader`, un ícono de descarga) es la puerta
permanente. Vive en la barra superior del panel, en la barra móvil de las dos
barras laterales y en el pie del sidebar del paciente —que en escritorio no
tiene barra superior—. Se dibuja solo si hay algo para ofrecer, y con eso queda
resuelto el «solo en el navegador»: cuando la app ya corre instalada, el estado
dice que no se puede instalar y el componente no renderiza nada. Chrome tampoco
entrega el evento si la app ya está instalada aunque se la mire desde una
pestaña común, así que ahí también desaparece.

El **cartel** (`BotonInstalarApp`) es solo el empujón inicial: asoma a los 2
segundos, se va solo a los 10 y **aparece una vez por visita**. Esa marca va en
`sessionStorage` (`pwa-instalacion-mostrada`) y no en el estado del componente:
no alcanza con que el layout no se vuelva a montar, porque entre el login y el
panel —y en cualquier navegación que rehaga el documento— el componente arranca
de cero y el cartel volvía a asomar en cada pantalla. La ✕ lo descarta para
siempre, en `localStorage` (`pwa-instalacion-descartada`).

Los dos leen el mismo estado (`instalacion.ts`) y no cada uno el suyo. El
motivo es que `beforeinstallprompt` se dispara **una sola vez por carga** y
bastante temprano: un componente que se monte después —el botón del header, que
recién existe cuando hay sesión— se lo perdería si escuchara por su cuenta. El
módulo lo atrapa al importarse y lo guarda para el que pregunte.

## Requisitos de despliegue

- **HTTPS obligatorio.** Los service workers solo corren sobre HTTPS (la
  excepción es `localhost`). En producción eso ya lo da nginx; ver
  `docs/DESPLIEGUE.md`.
- **Nada que configurar en nginx.** El manifiesto y `sw.js` salen de la app como
  cualquier otra ruta.
- `sw.js` se sirve con `Cache-Control: public, max-age=0, must-revalidate`
  (definido en `next.config.ts`). Es el único archivo que **no** puede quedar
  cacheado: un worker viejo en el navegador sigue respondiendo por su cuenta y
  no hay forma de desalojarlo desde el servidor.

## Probarlo en local

El worker **no se registra en desarrollo** a propósito: en `next dev` los chunks
de `/_next/static/` no llevan hash de contenido, así que cachearlos serviría
código viejo y rompería el refresco en caliente. Para probar la instalación:

```bash
npm run build
npm start                 # http://localhost:3000
```

`localhost` cuenta como origen seguro, así que Chrome registra el worker y
ofrece instalar. En DevTools: pestaña **Application** → _Manifest_ (tiene que
listar los íconos sin advertencias) y _Service Workers_ (tiene que decir
"activated and is running").

## Los íconos

El ícono es el logo del consultorio: la barra de pesas con el nombre y
«NUTRICIÓN Y DEPORTE». Todo sale de `assets/marca/logo-original.jpg`:

```bash
node scripts/generar-iconos-pwa.mjs
```

Los PNG resultantes **se commitean**: el build no puede depender de `sharp`,
que viene de arrastre con Next y no es una dependencia declarada del proyecto.

### Qué le hace el script al logo

El original es un JPEG de 256×256, con el trazo en un negro deslavado (~20% de
gris), ruido de compresión alrededor de las letras y el logo sentado sobre un
círculo gris claro con mucho aire. Así, tal cual, se veía sucio y chico. El
script lo agranda, le aplica una curva de niveles que lleva el trazo a negro
puro y el fondo a blanco —con eso se van el ruido y el círculo gris de una— y
usa la luminancia invertida como canal alfa. El resultado es el logo en negro
sobre transparente, que recién ahí se encuadra.

Que el fondo sea **alfa** y no blanco importa para el calado de «NUTRICIÓN Y
DEPORTE»: como es blanco dentro de la barra negra, si se dejara opaco sería un
parche que solo funciona sobre blanco.

El fondo del ícono es blanco y no el coral de la marca: el logo es negro sobre
claro y sobre coral pierde contraste, además de teñir ese calado. El coral
sigue siendo el `theme_color` del manifiesto.

### Por qué cada formato se encuadra distinto

El logo es apaisado (1,38:1), así que lo que lo limita en un lienzo cuadrado es
siempre el ancho; por eso la ocupación se mide sobre el ancho y el aire de
arriba y abajo sale solo.

Los `maskable` son archivos aparte y no una copia de los otros: Android recorta
el ícono con la forma del launcher (círculo, gota, squircle) y solo garantiza el
80% central. Un rectángulo de 1,38:1 dentro de ese círculo no puede pasar del
**64% del ancho**; con el 84% que usan los `any`, las pesas de los extremos
quedaban cortadas.

### Límite conocido

Debajo de ~64 px el nombre no se lee: es un logo con texto y no hay
procesamiento que arregle eso. A 96 px y de ahí para arriba se lee bien, que es
el tamaño al que se ve en la pantalla de inicio y en la barra de tareas. Si
alguna vez molesta en la pestaña del navegador, la salida es una **marca
simplificada** para los tamaños chicos (la barra de pesas y el óvalo, sin
texto), no seguir tocando este archivo.

## Al cambiar el service worker

Subir la constante `VERSION` en `public/sw.js`. Eso invalida el caché entero en
el próximo despliegue: al activarse, el worker nuevo borra todas las cachés
`nutricionista-*` que no sean la suya.
