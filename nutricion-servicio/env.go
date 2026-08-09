package main

// Carga mínima de un archivo .env (sin dependencias externas). En Lambda no hay
// .env y se usan las variables del entorno directamente; en local, esto permite
// `go run .` sin exportar nada a mano (útil en Windows, donde `export` no aplica).

import (
	"bufio"
	"log"
	"os"
	"strings"
)

func cargarEnv() {
	f, err := os.Open(".env")
	if err != nil {
		return // sin .env (p. ej. en Lambda): se usan las vars del entorno.
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	cargadas := 0
	for sc.Scan() {
		linea := strings.TrimSpace(sc.Text())
		if linea == "" || strings.HasPrefix(linea, "#") {
			continue
		}
		idx := strings.Index(linea, "=")
		if idx < 0 {
			continue
		}
		clave := strings.TrimSpace(linea[:idx])
		valor := strings.TrimSpace(linea[idx+1:])
		valor = strings.Trim(valor, `"'`) // saca comillas envolventes
		if clave == "" {
			continue
		}
		// No pisar lo que ya venga del entorno real.
		if _, existe := os.LookupEnv(clave); !existe {
			_ = os.Setenv(clave, valor)
			cargadas++
		}
	}
	if cargadas > 0 {
		log.Printf(".env cargado (%d variables)", cargadas)
	}
}
