package main

// Traducción de ingredientes con OpenRouter (formato OpenAI). Permite buscar en
// español en una base en inglés (FatSecret) y devolver los nombres en español.
// Si no hay OPENROUTER_API_KEY, deja los textos como están (sin traducir).

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const urlOpenRouter = "https://openrouter.ai/api/v1/chat/completions"

type traductor struct {
	apiKey  string
	modelo  string
	cacheEn map[string]string
	cacheEs map[string]string
	mu      sync.Mutex
}

func nuevoTraductor() *traductor {
	modelo := os.Getenv("OPENROUTER_MODEL")
	if modelo == "" {
		modelo = "anthropic/claude-haiku-4-5" // barato y rápido para traducir
	}
	return &traductor{
		apiKey:  os.Getenv("OPENROUTER_API_KEY"),
		modelo:  modelo,
		cacheEn: map[string]string{},
		cacheEs: map[string]string{},
	}
}

func (t *traductor) aIngles(ctx context.Context, termino string) string {
	if t.apiKey == "" {
		return termino
	}
	clave := strings.ToLower(strings.TrimSpace(termino))
	t.mu.Lock()
	v, ok := t.cacheEn[clave]
	t.mu.Unlock()
	if ok {
		return v
	}

	system := "Traducís nombres de alimentos/ingredientes del español al inglés para buscarlos " +
		"en una base nutricional. Respondé SOLO con el término en inglés, sin comillas ni texto extra."
	out, err := t.completar(ctx, system, termino)
	if err != nil || strings.TrimSpace(out) == "" {
		return termino
	}
	en := strings.TrimSpace(strings.SplitN(out, "\n", 2)[0])
	t.mu.Lock()
	t.cacheEn[clave] = en
	t.mu.Unlock()
	return en
}

func (t *traductor) nombresAEspanol(ctx context.Context, alimentos []Alimento) {
	if t.apiKey == "" || len(alimentos) == 0 {
		return
	}

	var faltan []string
	vistos := map[string]bool{}
	for _, a := range alimentos {
		clave := strings.ToLower(strings.TrimSpace(a.Nombre))
		t.mu.Lock()
		_, cacheado := t.cacheEs[clave]
		t.mu.Unlock()
		if clave != "" && !cacheado && !vistos[clave] {
			faltan = append(faltan, a.Nombre)
			vistos[clave] = true
		}
	}

	if len(faltan) > 0 {
		entrada, _ := json.Marshal(faltan)
		system := "Traducís nombres de alimentos/ingredientes del inglés al español rioplatense. " +
			"Devolvés SOLO un objeto JSON con la forma {\"traducciones\": [\"...\"]}: un array de la " +
			"MISMA cantidad y en el MISMO orden que la entrada. Sin explicaciones ni markdown."
		out, err := t.completar(ctx, system, string(entrada))
		if err != nil {
			log.Printf("[traductor] error traduciendo nombres: %v", err)
		} else {
			var datos struct {
				Traducciones []string `json:"traducciones"`
			}
			limpio := extraerJSON(out)
			if e := json.Unmarshal([]byte(limpio), &datos); e != nil {
				log.Printf("[traductor] respuesta no parseable (%v): %s", e, recortar([]byte(out), 200))
			} else if len(datos.Traducciones) != len(faltan) {
				log.Printf("[traductor] cantidad inesperada: pedí %d, vinieron %d", len(faltan), len(datos.Traducciones))
			}
			for i, n := range faltan {
				if i < len(datos.Traducciones) && strings.TrimSpace(datos.Traducciones[i]) != "" {
					t.mu.Lock()
					t.cacheEs[strings.ToLower(strings.TrimSpace(n))] = strings.TrimSpace(datos.Traducciones[i])
					t.mu.Unlock()
				}
			}
		}
	}

	for i := range alimentos {
		clave := strings.ToLower(strings.TrimSpace(alimentos[i].Nombre))
		t.mu.Lock()
		if v, ok := t.cacheEs[clave]; ok {
			alimentos[i].Nombre = v
		}
		t.mu.Unlock()
	}
}

// completar hace una llamada de chat a OpenRouter. NO usa `response_format`
// (los modelos de Anthropic vía OpenRouter no lo soportan y hacen fallar la
// llamada); el formato JSON se pide en el prompt y se parsea defensivamente.
func (t *traductor) completar(ctx context.Context, system, user string) (string, error) {
	cuerpo := map[string]any{
		"model":      t.modelo,
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
	}
	datos, _ := json.Marshal(cuerpo)

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, urlOpenRouter, bytes.NewReader(datos))
	req.Header.Set("Authorization", "Bearer "+t.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Title", "Consultorio")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		var b bytes.Buffer
		_, _ = b.ReadFrom(resp.Body)
		log.Printf("[openrouter] HTTP %d (modelo %q): %s", resp.StatusCode, t.modelo, recortar(b.Bytes(), 300))
		return "", nil
	}
	var j struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&j); err != nil || len(j.Choices) == 0 {
		return "", err
	}
	return strings.TrimSpace(j.Choices[0].Message.Content), nil
}

// extraerJSON limpia una respuesta del modelo para quedarse solo con el objeto
// JSON: saca fences de markdown (```json) y recorta hasta las llaves externas.
func extraerJSON(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)
	if i := strings.Index(s, "{"); i >= 0 {
		if j := strings.LastIndex(s, "}"); j >= i {
			return s[i : j+1]
		}
	}
	return s
}
