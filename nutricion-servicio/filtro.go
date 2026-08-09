package main

// Filtrado de alimentos según el criterio del nutricionista. Todo opcional:
// un Criterio vacío deja pasar todo.

import "strings"

func filtrar(alimentos []Alimento, c Criterio) []Alimento {
	fuera := make([]Alimento, 0, len(alimentos))
	for _, a := range alimentos {
		if c.ExcluirMarcas && a.Marca != nil && strings.TrimSpace(*a.Marca) != "" {
			continue // solo genéricos
		}
		if c.RequiereMacros && !macrosCompletos(a) {
			continue
		}
		if c.MaxCaloriasPor100 != nil && a.CaloriasPor100 != nil && *a.CaloriasPor100 > *c.MaxCaloriasPor100 {
			continue
		}
		if contieneAlguno(a.Nombre, c.ExcluirTexto) {
			continue
		}
		fuera = append(fuera, a)
	}
	return fuera
}

func macrosCompletos(a Alimento) bool {
	return a.CaloriasPor100 != nil &&
		a.ProteinasPor100 != nil &&
		a.CarbohidratosPor100 != nil &&
		a.GrasasPor100 != nil
}

func contieneAlguno(nombre string, textos []string) bool {
	n := strings.ToLower(nombre)
	for _, t := range textos {
		t = strings.ToLower(strings.TrimSpace(t))
		if t != "" && strings.Contains(n, t) {
			return true
		}
	}
	return false
}
