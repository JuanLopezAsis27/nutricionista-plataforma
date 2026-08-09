// Servicio de nutrición (AWS Lambda o HTTP local): intermediario entre la app y
// FatSecret. Busca ingredientes, los TRADUCE al español y los FILTRA según el
// criterio del nutricionista. Corre FUERA de la app (repo/deploy propio, como
// ml-servicio).
//
// Contrato (no cambiar sin actualizar el adaptador TS ProveedorNutricionHTTP):
//
//	POST /  { "termino": string, "limite"?: int, "criterio"?: Criterio }
//	→ 200   { "alimentos": [ Alimento... ] }
//	Auth:   Authorization: Bearer <NUTRICION_SERVICE_TOKEN>  (si está seteado)
//
// Correr en local:  LOCAL_PORT=8080 go run .
// Deploy:           compilar para linux/arm64 y subir a Lambda (Function URL).
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// Alimento con macros por 100 g (mismo shape que AlimentoNutricional en la app).
type Alimento struct {
	Nombre              string   `json:"nombre"`
	Marca               *string  `json:"marca"`
	ReferenciaExterna   *string  `json:"referenciaExterna"`
	Fuente              string   `json:"fuente"`
	CaloriasPor100      *float64 `json:"caloriasPor100"`
	ProteinasPor100     *float64 `json:"proteinasPor100"`
	CarbohidratosPor100 *float64 `json:"carbohidratosPor100"`
	GrasasPor100        *float64 `json:"grasasPor100"`
}

// Criterio de filtrado del nutricionista.
type Criterio struct {
	ExcluirMarcas     bool     `json:"excluirMarcas"`     // solo alimentos genéricos
	RequiereMacros    bool     `json:"requiereMacros"`    // descartar sin macros completos
	MaxCaloriasPor100 *float64 `json:"maxCaloriasPor100"` // tope opcional de kcal/100g
	ExcluirTexto      []string `json:"excluirTexto"`      // descartar si el nombre contiene
}

type Solicitud struct {
	Termino  string   `json:"termino"`
	Limite   int      `json:"limite"`
	Criterio Criterio `json:"criterio"`
}

type Respuesta struct {
	Alimentos []Alimento `json:"alimentos"`
}

// buscar orquesta: traduce la consulta → FatSecret → traduce nombres → filtra.
func buscar(ctx context.Context, sol Solicitud) (Respuesta, error) {
	termino := strings.TrimSpace(sol.Termino)
	if len(termino) < 2 {
		return Respuesta{Alimentos: []Alimento{}}, nil
	}
	limite := sol.Limite
	if limite <= 0 || limite > 25 {
		limite = 10
	}

	tr := nuevoTraductor()

	// 1. Traducir la consulta al inglés (FatSecret está en inglés).
	consulta := tr.aIngles(ctx, termino)
	if consulta == termino {
		log.Printf("[buscar] término %q sin traducir (¿falta OPENROUTER_API_KEY? FatSecret está en inglés)", termino)
	} else {
		log.Printf("[buscar] %q → traducido a %q", termino, consulta)
	}

	// 2. Buscar en FatSecret.
	alimentos, err := buscarEnFatSecret(ctx, consulta, limite)
	if err != nil {
		return Respuesta{}, err
	}

	// 3. Traducir los nombres al español.
	tr.nombresAEspanol(ctx, alimentos)

	// 4. Filtrar según el criterio del nutricionista. Va DESPUÉS de traducir
	// para que `excluirTexto` se evalúe sobre el nombre en español.
	alimentos = filtrar(alimentos, sol.Criterio)
	log.Printf("[buscar] %d alimentos tras filtrar (criterio: %+v)", len(alimentos), sol.Criterio)

	if alimentos == nil {
		alimentos = []Alimento{}
	}
	return Respuesta{Alimentos: alimentos}, nil
}

// --- Adaptadores de entrada (Lambda Function URL + HTTP local) ---------------

func autorizado(headerAuth string) bool {
	token := os.Getenv("NUTRICION_SERVICE_TOKEN")
	if token == "" {
		return true // sin token configurado, no se exige
	}
	return headerAuth == "Bearer "+token
}

func manejarLambda(ctx context.Context, req events.LambdaFunctionURLRequest) (events.LambdaFunctionURLResponse, error) {
	if !autorizado(req.Headers["authorization"]) {
		return events.LambdaFunctionURLResponse{StatusCode: 401, Body: `{"error":"token inválido"}`}, nil
	}
	var sol Solicitud
	if err := json.Unmarshal([]byte(req.Body), &sol); err != nil {
		return events.LambdaFunctionURLResponse{StatusCode: 400, Body: `{"error":"body inválido"}`}, nil
	}
	resp, err := buscar(ctx, sol)
	if err != nil {
		log.Printf("error: %v", err)
		return events.LambdaFunctionURLResponse{StatusCode: 502, Body: `{"error":"fallo al buscar"}`}, nil
	}
	cuerpo, _ := json.Marshal(resp)
	return events.LambdaFunctionURLResponse{
		StatusCode: 200,
		Headers:    map[string]string{"content-type": "application/json"},
		Body:       string(cuerpo),
	}, nil
}

func manejarHTTP(w http.ResponseWriter, r *http.Request) {
	if !autorizado(r.Header.Get("Authorization")) {
		http.Error(w, `{"error":"token inválido"}`, http.StatusUnauthorized)
		return
	}
	var sol Solicitud
	if err := json.NewDecoder(r.Body).Decode(&sol); err != nil {
		http.Error(w, `{"error":"body inválido"}`, http.StatusBadRequest)
		return
	}
	resp, err := buscar(r.Context(), sol)
	if err != nil {
		log.Printf("error: %v", err)
		http.Error(w, `{"error":"fallo al buscar"}`, http.StatusBadGateway)
		return
	}
	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// configurado reporta qué credenciales están presentes (sin exponer valores).
func diagnostico() map[string]bool {
	tiene := func(k string) bool { return strings.TrimSpace(os.Getenv(k)) != "" }
	return map[string]bool{
		"fatsecretConfigurado":  tiene("FATSECRET_CLIENT_ID") && tiene("FATSECRET_CLIENT_SECRET"),
		"openrouterConfigurado": tiene("OPENROUTER_API_KEY"),
		"tokenExigido":          tiene("NUTRICION_SERVICE_TOKEN"),
	}
}

func main() {
	cargarEnv() // en local carga .env; en Lambda no hay archivo y no hace nada.

	if puerto := os.Getenv("LOCAL_PORT"); puerto != "" {
		http.HandleFunc("/", manejarHTTP)
		http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
			_, _ = w.Write([]byte(`{"status":"ok"}`))
		})
		// GET /diagnostico: qué está configurado (útil para verificar el arranque).
		http.HandleFunc("/diagnostico", func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("content-type", "application/json")
			_ = json.NewEncoder(w).Encode(diagnostico())
		})
		log.Printf("escuchando en :%s | config: %+v", puerto, diagnostico())
		log.Fatal(http.ListenAndServe(":"+puerto, nil))
		return
	}
	log.Printf("Lambda | config: %+v", diagnostico())
	lambda.Start(manejarLambda)
}
