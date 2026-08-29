import { describe, it, expect } from "vitest";
import { mapearMensajeWhatsapp } from "./PrismaRepositorioMensajeWhatsapp";
import { mapearRecordatorioWhatsapp } from "./PrismaRepositorioRecordatorioWhatsapp";
import {
  mapearConversacion,
  mapearMensaje,
} from "./PrismaRepositorioMensajeria";
import { mapearPlantillaEmail } from "./PrismaRepositorioPlantillaEmail";
import { mapearEmailEnviado } from "./PrismaRepositorioEmailEnviado";
import { mapearPlantillaWhatsapp } from "./PrismaRepositorioPlantillaWhatsapp";
import { mapearConfiguracionRecordatorios } from "./PrismaRepositorioConfiguracionRecordatorios";
import { mapearAxioma } from "./PrismaRepositorioAxioma";
import { mapearArchivo } from "./PrismaRepositorioArchivo";
import { mapearConfiguracion } from "./PrismaRepositorioConfiguracion";
import {
  mapearConsultaIA,
  mapearAnalisisComida,
} from "./PrismaRepositorioHistorialIA";
import { mapearTokenRecuperacion } from "./PrismaRepositorioTokenRecuperacion";
import { mapearCuentaConectada } from "./PrismaRepositorioCuentaConectada";

/** Tests de los mapeadores de comunicación, IA, archivos y seguridad. */

describe("mapearMensajeWhatsapp", () => {
  it("distingue el id propio del id externo de Meta", () => {
    // `id` es nuestro, `idExterno` es el de la API de WhatsApp. Cruzarlos hace
    // que los webhooks de estado no encuentren nunca el mensaje que actualizan.
    const datos = mapearMensajeWhatsapp({
      id: "msg-local-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      direccion: "SALIENTE",
      telefono: "+541155554444",
      cuerpo: "Hola, te esperamos manana",
      idExterno: "wamid.EXTERNO123",
      estado: "ENVIADO",
      error: null,
      creadoEn: new Date("2026-04-01T10:00:00.000Z"),
      actualizadoEn: new Date("2026-04-01T10:00:01.000Z"),
    } as unknown as Parameters<typeof mapearMensajeWhatsapp>[0]).aPrimitivos();

    expect(datos.id).toBe("msg-local-1");
    expect(datos.idExterno).toBe("wamid.EXTERNO123");
    expect(datos.direccion).toBe("SALIENTE");
    expect(datos.estado).toBe("ENVIADO");
    expect(datos.error).toBeNull();
  });
});

describe("mapearRecordatorioWhatsapp", () => {
  it("no cruza las tres fechas del ciclo de vida", () => {
    // creadoEn (se genero), confirmadoEn (el paciente confirmo) y respondidoEn
    // (contesto algo). Cruzarlas da por confirmado un turno que no lo esta.
    const datos = mapearRecordatorioWhatsapp({
      id: "rec-1",
      nutricionistaId: "nutri-1",
      turnoId: "turno-1",
      pacienteId: "pac-1",
      telefono: "+541155554444",
      mensaje: "Recordatorio de turno",
      estado: "CONFIRMADO",
      usuarioId: "user-1",
      idExterno: "wamid.ABC",
      origen: "AUTOMATICO",
      diasAntes: 1,
      plantillaId: "plant-1",
      error: null,
      creadoEn: new Date("2026-04-01T09:00:00.000Z"),
      confirmadoEn: new Date("2026-04-01T12:00:00.000Z"),
      respondidoEn: new Date("2026-04-01T11:30:00.000Z"),
    } as unknown as Parameters<
      typeof mapearRecordatorioWhatsapp
    >[0]).aPrimitivos();

    expect(datos.creadoEn).toEqual(new Date("2026-04-01T09:00:00.000Z"));
    expect(datos.confirmadoEn).toEqual(new Date("2026-04-01T12:00:00.000Z"));
    expect(datos.respondidoEn).toEqual(new Date("2026-04-01T11:30:00.000Z"));
  });

  it("no cruza turnoId, pacienteId, usuarioId ni plantillaId", () => {
    // Cuatro claves foraneas `string` seguidas. El compilador las acepta todas
    // intercambiadas; el resultado es un recordatorio enganchado al turno de
    // otra persona.
    const datos = mapearRecordatorioWhatsapp({
      id: "rec-2",
      nutricionistaId: "nutri-1",
      turnoId: "id-turno",
      pacienteId: "id-paciente",
      telefono: "+541155554444",
      mensaje: "Recordatorio",
      estado: "PENDIENTE",
      usuarioId: "id-usuario",
      idExterno: null,
      origen: "MANUAL",
      diasAntes: 2,
      plantillaId: "id-plantilla",
      error: null,
      creadoEn: new Date("2026-04-01T09:00:00.000Z"),
      confirmadoEn: null,
      respondidoEn: null,
    } as unknown as Parameters<
      typeof mapearRecordatorioWhatsapp
    >[0]).aPrimitivos();

    expect(datos.turnoId).toBe("id-turno");
    expect(datos.pacienteId).toBe("id-paciente");
    expect(datos.usuarioId).toBe("id-usuario");
    expect(datos.plantillaId).toBe("id-plantilla");
    expect(datos.origen).toBe("MANUAL");
    expect(datos.diasAntes).toBe(2);
  });
});

describe("mapearConversacion y mapearMensaje", () => {
  it("mapea la conversacion con su ultimo mensaje desnormalizado", () => {
    const datos = mapearConversacion({
      id: "conv-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      ultimoMensajeTexto: "nos vemos el martes",
      ultimoMensajeEn: new Date("2026-04-02T18:00:00.000Z"),
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-04-02T18:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.pacienteId).toBe("pac-1");
    expect(datos.ultimoMensajeTexto).toBe("nos vemos el martes");
    expect(datos.ultimoMensajeEn).toEqual(new Date("2026-04-02T18:00:00.000Z"));
  });

  it("distingue creadoEn de leidoEn en el mensaje", () => {
    // leidoEn null es el criterio de "no leido" que alimenta el contador de la
    // campanita. Si tomara creadoEn, nada figuraria como no leido nunca.
    const datos = mapearMensaje({
      id: "msg-1",
      nutricionistaId: "nutri-1",
      conversacionId: "conv-1",
      autorId: "user-1",
      cuerpo: "hola",
      leidoEn: null,
      creadoEn: new Date("2026-04-02T18:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.conversacionId).toBe("conv-1");
    expect(datos.autorId).toBe("user-1");
    expect(datos.leidoEn).toBeNull();
    expect(datos.creadoEn).toEqual(new Date("2026-04-02T18:00:00.000Z"));
  });
});

describe("mapearPlantillaEmail", () => {
  it("no cruza clave, nombre, asunto ni descripcion", () => {
    // Cuatro strings seguidos. `clave` es un identificador que usa el codigo
    // para buscar la plantilla; los otros tres son texto para humanos.
    const datos = mapearPlantillaEmail({
      id: "pe-1",
      nutricionistaId: "nutri-1",
      clave: "BIENVENIDA",
      nombre: "Bienvenida al paciente",
      asunto: "Te damos la bienvenida",
      cuerpoHtml: "<p>Hola</p>",
      descripcion: "se envia al alta",
      deSistema: true,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.clave).toBe("BIENVENIDA");
    expect(datos.nombre).toBe("Bienvenida al paciente");
    expect(datos.asunto).toBe("Te damos la bienvenida");
    expect(datos.descripcion).toBe("se envia al alta");
    expect(datos.cuerpoHtml).toBe("<p>Hola</p>");
    expect(datos.deSistema).toBe(true);
  });
});

describe("mapearEmailEnviado", () => {
  it("distingue el destinatario del asunto y de la referencia", () => {
    const datos = mapearEmailEnviado({
      id: "ee-1",
      nutricionistaId: "nutri-1",
      plantillaClave: "BIENVENIDA",
      para: "ana@ejemplo.test",
      asunto: "Te damos la bienvenida",
      referenciaId: "ref-1",
      pacienteId: "pac-1",
      error: null,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.para).toBe("ana@ejemplo.test");
    expect(datos.asunto).toBe("Te damos la bienvenida");
    expect(datos.plantillaClave).toBe("BIENVENIDA");
    expect(datos.referenciaId).toBe("ref-1");
    expect(datos.pacienteId).toBe("pac-1");
  });
});

describe("mapearPlantillaWhatsapp", () => {
  it("no cruza los dos booleanos ni los campos de Meta", () => {
    // `predeterminada` y `activa` son ambos boolean y ambos gobiernan que
    // plantilla se usa. Cruzarlos manda el mensaje equivocado al paciente.
    const datos = mapearPlantillaWhatsapp({
      id: "pw-1",
      nutricionistaId: "nutri-1",
      nombre: "Recordatorio 24h",
      cuerpo: "Hola {{1}}, te esperamos el {{2}}",
      claveMeta: "recordatorio_24h",
      idiomaMeta: "es_AR",
      variablesMeta: ["nombrePaciente", "fechaTurno"],
      predeterminada: true,
      activa: false,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.predeterminada).toBe(true);
    expect(datos.activa).toBe(false);
    expect(datos.claveMeta).toBe("recordatorio_24h");
    expect(datos.idiomaMeta).toBe("es_AR");
    expect(datos.variablesMeta).toEqual(["nombrePaciente", "fechaTurno"]);
  });
});

describe("mapearConfiguracionRecordatorios", () => {
  it("no mezcla los tres canales entre si", () => {
    // El mapeador con más riesgo de cruce del módulo: tres canales
    // (whatsapp / email / calendario) con campos de nombre paralelo y del
    // mismo tipo. Valores deliberadamente distintos por canal: si se cruzan,
    // el test dice exactamente cuál.
    const datos = mapearConfiguracionRecordatorios({
      id: "conf-1",
      nutricionistaId: "nutri-1",
      whatsappActivo: true,
      whatsappAutomatico: false,
      whatsappDiasAntes: [3, 1],
      emailActivo: false,
      emailAutomatico: true,
      emailDiasAntes: [2],
      calendarioActivo: true,
      calendarioInvitarPaciente: false,
      calendarioMinutosAntes: [1440, 60],
      horaEnvio: "09:00",
      horasEntreAvisos: 12,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.whatsappActivo).toBe(true);
    expect(datos.whatsappAutomatico).toBe(false);
    expect(datos.whatsappDiasAntes).toEqual([3, 1]);

    expect(datos.emailActivo).toBe(false);
    expect(datos.emailAutomatico).toBe(true);
    expect(datos.emailDiasAntes).toEqual([2]);

    expect(datos.calendarioActivo).toBe(true);
    expect(datos.calendarioInvitarPaciente).toBe(false);
    expect(datos.calendarioMinutosAntes).toEqual([1440, 60]);

    expect(datos.horaEnvio).toBe("09:00");
    expect(datos.horasEntreAvisos).toBe(12);
  });

  it("reconstruye las programaciones tal cual estan guardadas", () => {
    // Deliberado: `normalizarLista` (ordenar de mayor a menor y deduplicar)
    // corre al ACTUALIZAR, no al reconstruir. Es el patron habitual: la
    // invariante se impone al escribir y la lectura confia en lo persistido.
    //
    // El test fija ese contrato para que quede explicito: si manana alguien
    // agrega normalizacion en `reconstruir`, este test avisa que cambio el
    // comportamiento en vez de que se descubra en la consola de envios.
    // Corolario a tener en cuenta: una fila escrita por fuera de la entidad
    // (seed o migracion) sale sin normalizar.
    const datos = mapearConfiguracionRecordatorios({
      id: "conf-2",
      nutricionistaId: "nutri-1",
      whatsappActivo: true,
      whatsappAutomatico: true,
      whatsappDiasAntes: [1, 3, 3, 7],
      emailActivo: true,
      emailAutomatico: true,
      emailDiasAntes: [2, 2],
      calendarioActivo: true,
      calendarioInvitarPaciente: true,
      calendarioMinutosAntes: [60, 1440],
      horaEnvio: "09:00",
      horasEntreAvisos: 24,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.whatsappDiasAntes).toEqual([1, 3, 3, 7]);
    expect(datos.emailDiasAntes).toEqual([2, 2]);
    expect(datos.calendarioMinutosAntes).toEqual([60, 1440]);
  });
});

describe("mapearAxioma", () => {
  it("no cruza valor con valorMax ni ambito con operador", () => {
    // valor/valorMax definen un rango: invertirlos da una regla que no se
    // cumple nunca (o siempre).
    const datos = mapearAxioma({
      id: "ax-1",
      nutricionistaId: "nutri-1",
      ambito: "ANTROPOMETRIA",
      parametro: "imc",
      operador: "ENTRE",
      valor: 18.5,
      valorMax: 24.9,
      unidad: "kg/m2",
      texto: "IMC en rango saludable",
      prioridad: 10,
      activo: true,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearAxioma>[0]).aPrimitivos();

    expect(datos.valor).toBe(18.5);
    expect(datos.valorMax).toBe(24.9);
    expect(datos.ambito).toBe("ANTROPOMETRIA");
    expect(datos.operador).toBe("ENTRE");
    expect(datos.parametro).toBe("imc");
    expect(datos.prioridad).toBe(10);
  });
});

describe("mapearArchivo", () => {
  it("distingue la clave de almacenamiento del nombre original", () => {
    // `clave` es la ruta interna en S3/MinIO; `nombreOriginal` es lo que el
    // usuario subio. Cruzarlos expone la estructura del bucket en la UI, o
    // busca en el bucket por un nombre que no existe.
    const datos = mapearArchivo({
      id: "arch-1",
      nutricionistaId: "nutri-1",
      clave: "nutri-1/2026/01/uuid-interno.pdf",
      nombreOriginal: "Analisis de sangre.pdf",
      mimeType: "application/pdf",
      tamanoBytes: 20480,
      titulo: "Analisis marzo",
      categoria: "LABORATORIO",
      subidoPorId: "user-1",
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearArchivo>[0]).aPrimitivos();

    expect(datos.clave).toBe("nutri-1/2026/01/uuid-interno.pdf");
    expect(datos.nombreOriginal).toBe("Analisis de sangre.pdf");
    expect(datos.titulo).toBe("Analisis marzo");
    expect(datos.tamanoBytes).toBe(20480);
    expect(datos.categoria).toBe("LABORATORIO");
  });
});

describe("mapearConsultaIA y mapearAnalisisComida", () => {
  it("no cruza pregunta con respuesta", () => {
    const datos = mapearConsultaIA({
      id: "ia-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      pregunta: "que puedo mejorar",
      respuesta: "aumentar proteina en el desayuno",
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.pregunta).toBe("que puedo mejorar");
    expect(datos.respuesta).toBe("aumentar proteina en el desayuno");
  });

  it("conserva el resultado del analisis como objeto estructurado", () => {
    const datos = mapearAnalisisComida({
      id: "an-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      archivoId: "arch-1",
      resultado: { alimentos: ["pollo", "arroz"], caloriasEstimadas: 520 },
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.archivoId).toBe("arch-1");
    expect(datos.resultado).toEqual({
      alimentos: ["pollo", "arroz"],
      caloriasEstimadas: 520,
    });
  });
});

describe("mapearTokenRecuperacion", () => {
  it("distingue expiraEn de usadoEn", () => {
    // Son las dos condiciones que invalidan un token de recuperacion, por
    // motivos distintos. Cruzarlas deja pasar tokens vencidos o ya usados:
    // esto no es un bug de presentacion, es de seguridad.
    const datos = mapearTokenRecuperacion({
      id: "tok-1",
      usuarioId: "user-1",
      tokenHash: "hash-del-token",
      expiraEn: new Date("2026-01-01T01:00:00.000Z"),
      usadoEn: null,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    }).aPrimitivos();

    expect(datos.expiraEn).toEqual(new Date("2026-01-01T01:00:00.000Z"));
    expect(datos.usadoEn).toBeNull();
    expect(datos.creadoEn).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(datos.tokenHash).toBe("hash-del-token");
  });
});

describe("mapearCuentaConectada", () => {
  // Cifrador de mentira: devuelve el valor con un prefijo para poder afirmar
  // que el descifrado se aplico, y a que campo.
  const cifrador = { descifrar: (valor: string) => `claro:${valor}` };

  it("descifra access y refresh token sin cruzarlos", () => {
    const datos = mapearCuentaConectada(
      {
        id: "cc-1",
        nutricionistaId: "nutri-1",
        proveedor: "GOOGLE",
        emailCuenta: "ana@gmail.test",
        accessTokenCifrado: "ACCESS",
        refreshTokenCifrado: "REFRESH",
        scopes: ["calendar"],
        expiraEn: new Date("2026-01-01T01:00:00.000Z"),
        creadoEn: new Date("2026-01-01T00:00:00.000Z"),
        actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as Parameters<typeof mapearCuentaConectada>[0],
      cifrador,
    ).aPrimitivos();

    expect(datos.accessToken).toBe("claro:ACCESS");
    expect(datos.refreshToken).toBe("claro:REFRESH");
    expect(datos.proveedor).toBe("GOOGLE");
    expect(datos.scopes).toEqual(["calendar"]);
  });

  it("no intenta descifrar un refresh token ausente", () => {
    // Google no siempre devuelve refresh token. Pasarle null al cifrador
    // lanzaria y tumbaria la pantalla de integraciones entera.
    const datos = mapearCuentaConectada(
      {
        id: "cc-2",
        nutricionistaId: "nutri-1",
        proveedor: "GOOGLE",
        emailCuenta: "ana@gmail.test",
        accessTokenCifrado: "ACCESS",
        refreshTokenCifrado: null,
        scopes: [],
        expiraEn: null,
        creadoEn: new Date("2026-01-01T00:00:00.000Z"),
        actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as Parameters<typeof mapearCuentaConectada>[0],
      cifrador,
    ).aPrimitivos();

    expect(datos.accessToken).toBe("claro:ACCESS");
    expect(datos.refreshToken).toBeNull();
  });
});

describe("mapearConfiguracion", () => {
  const fila = {
    id: "conf-1",
    nutricionistaId: "nutri-1",
    turnoDuracionMinutos: 45,
    turnoPasoMinutos: 15,
    atencionHoraDesde: "08:00",
    atencionHoraHasta: "18:00",
    diasAtencion: [1, 2, 3, 4, 5],
    nombreProfesional: "Lic. Ana Gomez",
    matricula: "MN 12345",
    logoArchivoId: "arch-logo",
    pdfColorPrimario: "#2563eb",
    pdfSubtitulo: "Consultorio de nutricion",
    pdfPieTexto: "Gracias por su visita",
    pdfMostrarRecetas: true,
    pdfMostrarMacros: false,
    pdfMostrarEquivalencias: true,
    pdfMostrarRecomendaciones: false,
    whatsappPrefijoPais: "54",
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
  } as unknown as Parameters<typeof mapearConfiguracion>[0];

  it("no cruza los cuatro interruptores del PDF entre si", () => {
    // Cuatro boolean seguidos con nombres casi iguales. Cruzarlos hace que el
    // PDF del plan muestre secciones que el profesional apago (o al reves), y
    // nada falla: el plan se genera igual, solo que mal.
    const datos = mapearConfiguracion(fila).aPrimitivos();

    expect(datos.pdfMostrarRecetas).toBe(true);
    expect(datos.pdfMostrarMacros).toBe(false);
    expect(datos.pdfMostrarEquivalencias).toBe(true);
    expect(datos.pdfMostrarRecomendaciones).toBe(false);
  });

  it("no cruza duracion con paso, ni hora de inicio con la de fin", () => {
    // turnoDuracionMinutos (cuanto dura un turno) y turnoPasoMinutos (cada
    // cuanto arranca uno) son dos numeros de minutos distintos: cruzarlos
    // deforma toda la grilla de la agenda.
    const datos = mapearConfiguracion(fila).aPrimitivos();

    expect(datos.turnoDuracionMinutos).toBe(45);
    expect(datos.turnoPasoMinutos).toBe(15);
    expect(datos.atencionHoraDesde).toBe("08:00");
    expect(datos.atencionHoraHasta).toBe("18:00");
    expect(datos.diasAtencion).toEqual([1, 2, 3, 4, 5]);
  });

  it("copia los datos de marca del profesional", () => {
    const datos = mapearConfiguracion(fila).aPrimitivos();

    expect(datos.nombreProfesional).toBe("Lic. Ana Gomez");
    expect(datos.matricula).toBe("MN 12345");
    expect(datos.logoArchivoId).toBe("arch-logo");
    expect(datos.pdfColorPrimario).toBe("#2563eb");
    expect(datos.pdfSubtitulo).toBe("Consultorio de nutricion");
    expect(datos.pdfPieTexto).toBe("Gracias por su visita");
    expect(datos.whatsappPrefijoPais).toBe("54");
  });
});
