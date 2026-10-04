# Respaldo del consultorio

Configuración → Consultorio → «Respaldo del consultorio» baja **todo el
consultorio en un ZIP ordenado**: los datos de cada paciente en documentos que
se abren sin la app (PDF y Excel) y todos los archivos del bucket, cada uno en
la carpeta de su paciente.

```
respaldo-2026-10-04.zip
├── LEEME.txt               qué es cada cosa, y lo que no se pudo incluir
├── Pacientes.xlsx          la lista (archivados incluidos)
├── Pacientes/
│   └── García Ana/
│       ├── Evaluación.pdf      historia clínica, laboratorios, evoluciones
│       ├── Mediciones.xlsx     antropometría, una fila por consulta
│       ├── Diario.xlsx         días, comidas y actividad; «Foto» → Diario/
│       ├── Planes/             cada plan asignado en PDF + sus archivos
│       ├── Diario/             2026-07-01 Desayuno.jpg
│       ├── Laboratorios/       2026-03-10 Perfil lipídico/analisis.pdf
│       ├── Fotos de progreso/  2026-07-01 frente.jpg
│       ├── Grabaciones/        2026-07-01 consulta 1.webm
│       └── Archivos/           el resto de «Archivos y registros»
└── Sin paciente/
    ├── Recetas/<receta>/       fotos y documentos del recetario
    ├── Biblioteca/<material>/  materiales de la biblioteca
    ├── Planes/<plan>/          archivos de planes que no tiene nadie
    └── Otros/                  huérfanos: logo, fotos de perfil, subidas a medias
```

Es un respaldo para **leer**, no para restaurar: no hay importación de vuelta.
Lo que protege es que el profesional tenga sus datos clínicos en su disco, en
formatos que va a poder abrir dentro de diez años sin esta app.

## Las tres piezas

| Pieza | Capa | Qué decide |
| ----- | ---- | ---------- |
| `dominio/servicios/rutasRespaldo.ts` | Dominio | En qué ruta va cada archivo según su dueño; nombres seguros; desempate de repetidos |
| `ArmarIndiceRespaldo` (`ServicioRespaldo.indice()`) | Aplicación | El ÍNDICE: carpeta de cada paciente, rutas de lo que se genera y de cada archivo. No lee contenidos |
| `servidor/respaldoZip.ts` + `GET /api/respaldo` | Presentación | Recorre el índice y escribe el ZIP en flujo |

La ubicación de cada archivo sale de `IUbicacionArchivosRepositorio`: UNA
consulta sobre `archivos` que resuelve el arco de dueños hasta el paciente
(la foto de una comida es del paciente del registro del diario, el audio es el
del turno). Es una interfaz aparte de `IArchivoRepositorio` (ISP): la lee un
solo cliente y cruza media base.

## Decisiones

**Se arma mientras se baja.** El ZIP no existe entero en ningún lado: cada
archivo del bucket pasa como flujo y cada PDF/Excel se genera recién cuando le
toca entrar (`entrada()` espera el evento `entry` antes de seguir). El ZIP
avanza al ritmo del navegador, así que la memoria no crece con el consultorio.
Por eso es un enlace (`<a download>`) y no una mutación de tRPC: el navegador
muestra el progreso y lo escribe directo a disco. La ruta manda
`X-Accel-Buffering: no` para que nginx no lo junte entero antes de pasarlo.

**ZIP64 y sin comprimir.** `archiver` (que ya venía con exceljs) pasa a ZIP64
solo cuando hace falta: con las grabaciones de audio, un consultorio con años
supera los 4 GB que admite el ZIP clásico. Va `store: true` porque casi todo
(PDF, fotos, audio, Excel, Word) ya viene comprimido.

**El alcance del inquilino acompaña al flujo.** El recorrido es una función
async que arranca dentro de `conAlcanceDeSesion`, y el `AsyncLocalStorage` la
sigue en cada `await` aunque la respuesta ya se haya devuelto. Lo que NO
funcionaría es generar desde el `pull()` de un `ReadableStream`: ese callback
corre en el contexto de quien lee, sin inquilino, y la extensión de Prisma
fallaría cerrado.

**Un archivo que falla no tira abajo el respaldo.** Un objeto que ya no está
en el bucket o un PDF que no se pudo dibujar se saltean y quedan anotados en
`LEEME.txt`, que se escribe AL FINAL justamente para poder contarlos. Lo que sí
corta todo es un error A MITAD de un flujo (el bucket se cae mientras pasa un
audio): ahí ya no hay respuesta HTTP que cambiar, y destruir el ZIP es la
única forma de que el navegador no dé por buena una descarga incompleta. El
índice se pide ANTES de devolver el flujo, para que un fallo temprano sí salga
como error HTTP.

**Un plan compartido va a la carpeta de cada paciente.** La carpeta de un
paciente tiene que alcanzar sola para entender su tratamiento. Los planes de
modalidad APP se dibujan en PDF (`servidor/pdfPlan.ts`, el mismo que baja el
botón del plan); los de modalidad PDF ya SON sus archivos y viajan como tales.

**Los mismos documentos que la app.** La evaluación (`servidor/pdfEvaluacion.ts`),
el plan (`servidor/pdfPlan.ts`), las mediciones (`MedicionesExcel`) y la lista
de pacientes (`servidor/excelPacientes.ts`) son las mismas funciones que usan
sus botones de descarga, así que respetan la misma configuración (secciones del
PDF, ecuaciones visibles). Se extrajeron de las rutas para eso.

**Nombres que sobreviven a cualquier sistema.** `segmento()` saca los
caracteres que Windows prohíbe, el punto final y corta en 80 caracteres;
`RutasUnicas` desempata con « (2)» antes de la extensión y sin distinguir
mayúsculas (en Windows y macOS «Foto.jpg» y «foto.jpg» son el mismo archivo, y
uno pisaría al otro al descomprimir). Dos pacientes homónimos tienen carpetas
distintas; los archivados llevan « (archivado)».

## Qué NO incluye

- **Bioimpedancia, turnos, mensajes, plan semanal, objetivos**: el pedido fue
  evaluación, mediciones, planes y diario. Sumar uno es agregar una entrada en
  `documentosDelPaciente()` y su ruta en `PacienteEnRespaldo`.
- **Lo que no está en `archivos`**: las imágenes de los alimentos viven en una
  clave propia de la fila del alimento (migración 84) y no son de ningún
  paciente.

## Ojo

- Un archivo que se guarde en el bucket con un dueño NUEVO en `archivos` (una
  FK más en el arco) cae en «Sin paciente/Otros» hasta que se lo sume a
  `UbicacionArchivo` y a `rutasDeArchivo`. No se pierde, pero queda mal
  ubicado.
- El respaldo tiene información clínica de todos los pacientes. Es solo del
  NUTRICIONISTA (no del SUPERADMIN ni del paciente) y solo de su consultorio,
  por el mismo alcance que todo lo demás.
