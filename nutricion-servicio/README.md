# nutricion-servicio

Microservicio en **Go** que actúa de intermediario entre la app y **FatSecret**.
Corre **fuera** de la app principal (repo/deploy propio, igual que el futuro
`ml-servicio`). Hace tres cosas en una sola llamada:

1. **Traduce** la consulta del nutri de español → inglés (FatSecret está en inglés).
2. **Busca** el alimento en FatSecret y le arma los macros por 100 g.
3. **Filtra** los resultados según el criterio del nutri (sin marcas, tope de
   calorías, macros completos, excluir texto) y **traduce los nombres** de vuelta
   al español.

Pensado para desplegarse como **AWS Lambda con Function URL** (o cualquier
runtime; también corre como servidor HTTP local para desarrollo).

## Contrato HTTP

```
POST /
Authorization: Bearer <NUTRICION_SERVICE_TOKEN>   (si el token está configurado)
Content-Type: application/json

{
  "termino": "manzana",
  "limite": 10,
  "criterio": {
    "excluirMarcas": true,          // solo alimentos genéricos (sin marca)
    "requiereMacros": true,         // descartar los que no tengan los 4 macros
    "maxCaloriasPor100": 300,       // tope opcional de kcal/100 g
    "excluirTexto": ["fried", "syrup"]  // descartar si el nombre contiene alguno
  }
}
```

Respuesta `200`:

```json
{
  "alimentos": [
    {
      "nombre": "Manzana",
      "marca": null,
      "referenciaExterna": "12345",
      "fuente": "FATSECRET",
      "caloriasPor100": 52,
      "proteinasPor100": 0.3,
      "carbohidratosPor100": 13.8,
      "grasasPor100": 0.2
    }
  ]
}
```

El shape de `alimentos` es **idéntico** a `AlimentoNutricional` de la app, así que
el adaptador `ProveedorNutricionHTTP` lo consume sin transformar. `criterio` y
`limite` son opcionales; `termino` de menos de 2 caracteres devuelve `[]`.

## Variables de entorno

Ver [`.env.example`](.env.example). Resumen:

| Variable | Para qué |
|---|---|
| `FATSECRET_CLIENT_ID` / `_SECRET` | credenciales OAuth2 de FatSecret |
| `OPENROUTER_API_KEY` | traducir ingredientes (si falta, no traduce) |
| `OPENROUTER_MODEL` | modelo de traducción (default `anthropic/claude-haiku-4-5`) |
| `NUTRICION_SERVICE_TOKEN` | token que exige a la app (si falta, sin auth) |
| `LOCAL_PORT` | si está seteado, corre como HTTP local en vez de Lambda |

**Degradación:** sin credenciales de FatSecret devuelve `[]` (la app cae a su
proveedor local / Open Food Facts). Sin OpenRouter, busca igual pero no traduce.

## Correr en local

```bash
cp .env.example .env      # completar credenciales
set -a; . ./.env; set +a  # exportar las vars (bash)
go run .                  # con LOCAL_PORT seteado levanta HTTP
# probar:
curl -s localhost:8080/ -H "Authorization: Bearer $NUTRICION_SERVICE_TOKEN" \
  -d '{"termino":"manzana","limite":5,"criterio":{"excluirMarcas":true}}' | jq
```

`GET /health` responde `{"status":"ok"}`.

## Deploy a AWS Lambda (Function URL)

Compilar el binario para el runtime `provided.al2023` (arm64):

```bash
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bootstrap .
zip funcion.zip bootstrap
```

1. Crear una función Lambda, runtime **Amazon Linux 2023 (provided.al2023)**,
   arquitectura **arm64**, handler `bootstrap`.
2. Subir `funcion.zip`.
3. Cargar las variables de entorno (las de `.env.example`, **sin** `LOCAL_PORT`).
4. Activar **Function URL** (auth `NONE`; la auth la hace el `NUTRICION_SERVICE_TOKEN`).
5. Copiar la URL a la app en `NUTRICION_SERVICE_URL`.

> **IP de FatSecret:** FatSecret exige whitelistear la IP saliente. Lambda usa IPs
> dinámicas: para una IP fija, poné la función en una VPC con NAT Gateway y
> whitelisteá la IP elástica del NAT. Alternativa sin VPC: hospedarlo en el mismo
> VPS del `docker-compose` (como un contenedor más) con IP fija — en ese caso usá
> `LOCAL_PORT` y publicá el binario detrás de nginx (o solo en la red interna).

## Estructura

| Archivo | Qué hace |
|---|---|
| `main.go` | contrato, orquestación `buscar()`, handlers Lambda + HTTP |
| `fatsecret.go` | OAuth2 + `foods.search` + parseo de macros por 100 g |
| `traductor.go` | traducción ES↔EN vía OpenRouter (con caché en memoria) |
| `filtro.go` | filtrado por el criterio del nutricionista |

## Relación con la app

La app la consume vía `ProveedorNutricionHTTP` (en
`src/infraestructura/nutricion/`), que envuelve al proveedor local como fallback:
si `NUTRICION_SERVICE_URL` no está seteada o el servicio falla, la app sigue
funcionando con FatSecret/Open Food Facts directo. Es **degradación**, no un
requisito duro.
