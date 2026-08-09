package main

// Cliente de FatSecret Platform (OAuth2 client credentials). El token se cachea
// en memoria (la Lambda lo reutiliza entre invocaciones mientras el contenedor
// vive). Las credenciales salen del entorno (FATSECRET_CLIENT_ID/SECRET).

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	urlTokenFatSecret = "https://oauth.fatsecret.com/connect/token"
	urlApiFatSecret   = "https://platform.fatsecret.com/rest/server.api"
)

var (
	muToken     sync.Mutex
	tokenActual string
	tokenExpira time.Time
)

func tokenFatSecret(ctx context.Context) (string, error) {
	muToken.Lock()
	defer muToken.Unlock()
	if tokenActual != "" && time.Now().Before(tokenExpira.Add(-time.Minute)) {
		return tokenActual, nil
	}

	id := os.Getenv("FATSECRET_CLIENT_ID")
	secret := os.Getenv("FATSECRET_CLIENT_SECRET")
	if id == "" || secret == "" {
		log.Printf("[fatsecret] SIN credenciales (FATSECRET_CLIENT_ID/SECRET vacíos) → no se busca")
		return "", nil // sin credenciales → sin token
	}

	cuerpo := strings.NewReader("grant_type=client_credentials&scope=basic")
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, urlTokenFatSecret, cuerpo)
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(id+":"+secret)))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[fatsecret] error de red al pedir token: %v", err)
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		datos, _ := io.ReadAll(resp.Body)
		log.Printf("[fatsecret] token HTTP %d: %s", resp.StatusCode, recortar(datos, 300))
		return "", nil
	}
	var j struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&j); err != nil || j.AccessToken == "" {
		log.Printf("[fatsecret] token sin access_token (err=%v)", err)
		return "", err
	}
	log.Printf("[fatsecret] token OK (expira en %ds)", j.ExpiresIn)
	tokenActual = j.AccessToken
	segundos := j.ExpiresIn
	if segundos == 0 {
		segundos = 86400
	}
	tokenExpira = time.Now().Add(time.Duration(segundos) * time.Second)
	return tokenActual, nil
}

func buscarEnFatSecret(ctx context.Context, termino string, limite int) ([]Alimento, error) {
	token, err := tokenFatSecret(ctx)
	if err != nil || token == "" {
		return []Alimento{}, err
	}

	q := url.Values{}
	q.Set("method", "foods.search")
	q.Set("search_expression", termino)
	q.Set("format", "json")
	q.Set("max_results", strconv.Itoa(limite))

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, urlApiFatSecret+"?"+q.Encode(), nil)
	req.Header.Set("Authorization", "Bearer "+token)

	log.Printf("[fatsecret] GET foods.search expression=%q max=%d", termino, limite)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[fatsecret] error de red en foods.search: %v", err)
		return nil, err
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		log.Printf("[fatsecret] foods.search HTTP %d: %s", resp.StatusCode, recortar(datos, 400))
		return []Alimento{}, nil
	}
	// FatSecret responde 200 incluso en errores de API (p. ej. IP no whitelisteada):
	// el cuerpo trae {"error":{"code":..,"message":".."}}. Lo detectamos y logueamos.
	if strings.Contains(string(datos), `"error"`) {
		log.Printf("[fatsecret] la API devolvió un error (¿IP no habilitada en IP Restrictions?): %s", recortar(datos, 400))
		return []Alimento{}, nil
	}

	// `foods.food` puede ser objeto (1 resultado) o array (varios).
	var envoltura struct {
		Foods struct {
			Food json.RawMessage `json:"food"`
		} `json:"foods"`
	}
	if err := json.Unmarshal(datos, &envoltura); err != nil {
		return []Alimento{}, nil
	}
	var crudos []foodFatSecret
	if len(envoltura.Foods.Food) > 0 && envoltura.Foods.Food[0] == '[' {
		_ = json.Unmarshal(envoltura.Foods.Food, &crudos)
	} else if len(envoltura.Foods.Food) > 0 {
		var uno foodFatSecret
		if json.Unmarshal(envoltura.Foods.Food, &uno) == nil {
			crudos = []foodFatSecret{uno}
		}
	}

	alimentos := make([]Alimento, 0, len(crudos))
	for _, f := range crudos {
		if a, ok := parsear(f); ok {
			alimentos = append(alimentos, a)
		}
	}
	log.Printf("[fatsecret] %d crudos → %d con macros", len(crudos), len(alimentos))
	return alimentos, nil
}

// recortar devuelve los primeros n bytes como string (para loguear cuerpos sin
// volcar respuestas enormes).
func recortar(datos []byte, n int) string {
	s := strings.TrimSpace(string(datos))
	if len(s) > n {
		return s[:n] + "…"
	}
	return s
}

type foodFatSecret struct {
	FoodID          string `json:"food_id"`
	FoodName        string `json:"food_name"`
	BrandName       string `json:"brand_name"`
	FoodDescription string `json:"food_description"`
}

var (
	reCal    = regexp.MustCompile(`(?i)Calories:\s*([\d.]+)\s*kcal`)
	reFat    = regexp.MustCompile(`(?i)Fat:\s*([\d.]+)\s*g`)
	reCarbs  = regexp.MustCompile(`(?i)Carbs:\s*([\d.]+)\s*g`)
	reProt   = regexp.MustCompile(`(?i)Protein:\s*([\d.]+)\s*g`)
	rePerG   = regexp.MustCompile(`(?i)Per\s+([\d.]+)\s*g\b`)
	reParenG = regexp.MustCompile(`(?i)\(([\d.]+)\s*g\)`)
)

// parsear extrae los macros por 100 g del `food_description`.
func parsear(f foodFatSecret) (Alimento, bool) {
	nombre := strings.TrimSpace(f.FoodName)
	if nombre == "" {
		return Alimento{}, false
	}
	desc := f.FoodDescription
	cal := extraer(desc, reCal)
	grasas := extraer(desc, reFat)
	carbos := extraer(desc, reCarbs)
	prot := extraer(desc, reProt)
	if cal == nil && grasas == nil && carbos == nil && prot == nil {
		return Alimento{}, false
	}

	gramos := 100.0
	if g := extraer(desc, rePerG); g != nil {
		gramos = *g
	} else if g := extraer(desc, reParenG); g != nil {
		gramos = *g
	}
	factor := 1.0
	if gramos > 0 {
		factor = 100 / gramos
	}

	a := Alimento{
		Nombre:              nombre,
		ReferenciaExterna:   opcional(f.FoodID),
		Marca:               opcional(strings.TrimSpace(f.BrandName)),
		Fuente:              "FATSECRET",
		CaloriasPor100:      escalar(cal, factor),
		ProteinasPor100:     escalar(prot, factor),
		CarbohidratosPor100: escalar(carbos, factor),
		GrasasPor100:        escalar(grasas, factor),
	}
	return a, true
}

func extraer(texto string, re *regexp.Regexp) *float64 {
	m := re.FindStringSubmatch(texto)
	if len(m) < 2 {
		return nil
	}
	if v, err := strconv.ParseFloat(m[1], 64); err == nil {
		return &v
	}
	return nil
}

func escalar(v *float64, factor float64) *float64 {
	if v == nil {
		return nil
	}
	r := float64(int(*v*factor*10+0.5)) / 10
	return &r
}

func opcional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
