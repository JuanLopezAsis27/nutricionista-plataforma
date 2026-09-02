import { describe, it, expect } from "vitest";
import { normalizarFicha } from "./InterpretadorFichaPacienteLLM";

const PEDIDOS = [
  { clave: "suplementos-ab12", etiqueta: "Suplementos", descripcion: null },
];

describe("normalizarFicha", () => {
  it("mapea los datos del paciente", () => {
    const ficha = normalizarFicha(
      {
        paciente: {
          nombre: "  Ana  ",
          apellido: "Pérez",
          email: "ANA@Ejemplo.COM",
          telefono: "11 5555-1234",
          fechaNacimiento: "1990-05-14",
          sexo: "femenino",
          notas: null,
        },
      },
      [],
    );

    expect(ficha.paciente).toEqual({
      nombre: "Ana",
      apellido: "Pérez",
      email: "ana@ejemplo.com",
      telefono: "11 5555-1234",
      fechaNacimiento: "1990-05-14",
      sexo: "FEMENINO",
      notas: null,
    });
  });

  it("descarta un email que no tiene forma de email", () => {
    // La regla del prompt es que el email esté escrito literalmente; si el
    // modelo igual lo deduce del nombre, acá se cae.
    const ficha = normalizarFicha(
      { paciente: { email: "ana perez sin arroba" } },
      [],
    );

    expect(ficha.paciente.email).toBeNull();
  });

  it("descarta una fecha que no es YYYY-MM-DD", () => {
    const ficha = normalizarFicha(
      { paciente: { fechaNacimiento: "14/05/1990" } },
      [],
    );

    expect(ficha.paciente.fechaNacimiento).toBeNull();
  });

  it("descarta un sexo que no es del enum", () => {
    const ficha = normalizarFicha({ paciente: { sexo: "no binario" } }, []);

    expect(ficha.paciente.sexo).toBeNull();
  });

  it("devuelve los siete campos de historia, con null los ausentes", () => {
    const ficha = normalizarFicha(
      { historiaClinica: { motivoConsulta: "Descenso de peso" } },
      [],
    );

    expect(ficha.historiaClinica).toEqual({
      motivoConsulta: "Descenso de peso",
      diagnosticos: null,
      medicacion: null,
      antecedentesPersonales: null,
      antecedentesFamiliares: null,
      habitos: null,
      contexto: null,
    });
  });

  it("arma los campos personalizados con la etiqueta del consultorio", () => {
    const ficha = normalizarFicha(
      { camposPersonalizados: { "suplementos-ab12": "Vitamina D" } },
      PEDIDOS,
    );

    expect(ficha.camposPersonalizados).toEqual([
      {
        clave: "suplementos-ab12",
        etiqueta: "Suplementos",
        valor: "Vitamina D",
      },
    ]);
  });

  it("ignora claves personalizadas que nadie pidió", () => {
    const ficha = normalizarFicha(
      { camposPersonalizados: { inventada: "algo" } },
      PEDIDOS,
    );

    expect(ficha.camposPersonalizados).toEqual([]);
  });

  it("descarta alertas con tipo desconocido y repone la severidad", () => {
    const ficha = normalizarFicha(
      {
        alertas: [
          { tipo: "ALERGIA", descripcion: "Maní", severidad: "inventada" },
          { tipo: "OTRA_COSA", descripcion: "Gluten", severidad: "LEVE" },
          { tipo: "INTOLERANCIA", descripcion: "  ", severidad: "LEVE" },
        ],
      },
      [],
    );

    expect(ficha.alertas).toEqual([
      {
        tipo: "ALERGIA",
        descripcion: "Maní",
        severidad: "MODERADA",
        notas: null,
      },
    ]);
  });

  it("descarta la antropometría sin peso", () => {
    // Sin peso no hay medición: la entidad lo exige y no calcularía nada.
    const ficha = normalizarFicha(
      { antropometria: { pesoKg: null, tallaCm: 165 } },
      [],
    );

    expect(ficha.antropometria).toBeNull();
  });

  it("conserva las medidas numéricas que vinieron", () => {
    const ficha = normalizarFicha(
      {
        antropometria: {
          pesoKg: 70.5,
          tallaCm: 165,
          circCintura: "no es una medida",
          pliegueTricipital: 14,
          fecha: "2026-01-10",
        },
      },
      [],
    );

    expect(ficha.antropometria).toMatchObject({
      pesoKg: 70.5,
      tallaCm: 165,
      pliegueTricipital: 14,
      fecha: "2026-01-10",
    });
  });

  it("descarta laboratorios sin título", () => {
    const ficha = normalizarFicha(
      {
        laboratorios: [
          { titulo: "Perfil lipídico", fecha: "2026-01-05", notas: "LDL 130" },
          { titulo: "   ", fecha: null, notas: null },
        ],
      },
      [],
    );

    expect(ficha.laboratorios).toEqual([
      { titulo: "Perfil lipídico", fecha: "2026-01-05", notas: "LDL 130" },
    ]);
  });

  it("recoge en campos sueltos lo que no entra en ningún campo conocido", () => {
    // Sin esto, todo lo que la ficha traía y no era uno de los campos del
    // modelo se perdía en silencio: el esquema es cerrado y el modelo no tenía
    // dónde ponerlo.
    const ficha = normalizarFicha(
      {
        otrosDatos: [
          { etiqueta: "Obra social", valor: "OSDE 210" },
          { etiqueta: "Ocupación", valor: "Docente" },
        ],
      },
      [],
    );

    expect(ficha.camposPersonalizados).toHaveLength(2);
    expect(ficha.camposPersonalizados[0]).toMatchObject({
      etiqueta: "Obra social",
      valor: "OSDE 210",
    });
    expect(ficha.camposPersonalizados[0]?.clave).toMatch(/^obra-social-/);
  });

  it("no repite un dato que ya entró en un campo del consultorio", () => {
    const ficha = normalizarFicha(
      {
        camposPersonalizados: { "suplementos-ab12": "Vitamina D" },
        otrosDatos: [{ etiqueta: "suplementos", valor: "Vitamina D" }],
      },
      PEDIDOS,
    );

    expect(ficha.camposPersonalizados).toHaveLength(1);
    expect(ficha.camposPersonalizados[0]?.clave).toBe("suplementos-ab12");
  });

  it("descarta los otros datos incompletos", () => {
    const ficha = normalizarFicha(
      {
        otrosDatos: [
          { etiqueta: "DNI", valor: "30111222" },
          { etiqueta: "  ", valor: "algo" },
          { etiqueta: "Domicilio", valor: "   " },
        ],
      },
      [],
    );

    expect(ficha.camposPersonalizados.map((c) => c.etiqueta)).toEqual(["DNI"]);
  });

  it("no rompe con una respuesta vacía", () => {
    const ficha = normalizarFicha({}, PEDIDOS);

    expect(ficha.paciente.nombre).toBeNull();
    expect(ficha.alertas).toEqual([]);
    expect(ficha.antropometria).toBeNull();
    expect(ficha.laboratorios).toEqual([]);
    expect(ficha.camposPersonalizados).toEqual([]);
  });
});
