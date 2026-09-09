import { describe, it, expect, vi } from "vitest";
import { ListarPlantillas } from "./secretaria/ListarPlantillas";
import { ObtenerPlantilla } from "./secretaria/ObtenerPlantilla";
import { ListarEmailsEnviados } from "./secretaria/ListarEmailsEnviados";
import { EnviarEmailDeBienvenida } from "./pacientes/EnviarEmailDeBienvenida";
import { DesconectarGoogle } from "./integraciones/DesconectarGoogle";
import { ObtenerCuentaGoogle } from "./integraciones/ObtenerCuentaGoogle";
import { CambiarEstadoNutricionista } from "./superadmin/CambiarEstadoNutricionista";
import { ListarNutricionistas } from "./superadmin/ListarNutricionistas";
import { ObtenerDia } from "./diario/ObtenerDia";
import { ListarConversacionesIA } from "./ia/GestionarConversacionesIA";
import { Usuario } from "@/dominio/entidades/Usuario";
import {
  formatearFechaCorta,
  variablesRecordatorio,
  variablesEjemplo,
} from "./secretaria/variables";
import {
  mockPlantillaEmailRepositorio,
  mockEmailEnviadoRepositorio,
  mockCuentaConectadaRepositorio,
  mockUsuarioRepositorio,
  mockRegistroDiarioRepositorio,
  mockConversacionIARepositorio,
  mockServicioEmail,
  plantillaEmailEjemplo,
} from "./_ayudas-test";

/** Segunda tanda de lecturas y bajas: secretaría, integraciones y superadmin. */

describe("variables de plantilla", () => {
  it("formatea la fecha por componentes UTC, no por zona local", () => {
    // Las fechas de turno se guardan a medianoche UTC. Con la zona local, un
    // turno del 1 de julio se anunciaría como 30 de junio a cualquiera que
    // corra el proceso al oeste de Greenwich.
    expect(formatearFechaCorta(new Date("2026-07-01T00:00:00.000Z"))).toBe(
      "01/07/2026",
    );
    expect(formatearFechaCorta(new Date("2026-12-05T00:00:00.000Z"))).toBe(
      "05/12/2026",
    );
  });

  it("las variables del recordatorio y las de ejemplo tienen las MISMAS claves", () => {
    // La vista previa usa `variablesEjemplo` y el envío real usa
    // `variablesRecordatorio`. Si divergieran, el profesional probaría una
    // plantilla que se ve bien y saldría con un placeholder sin reemplazar.
    const reales = variablesRecordatorio({
      nombrePaciente: "Ana García",
      fecha: new Date("2026-07-01T00:00:00.000Z"),
      hora: "10:00",
      nombreProfesional: "Lic. Marta",
    });
    const ejemplo = variablesEjemplo("Lic. Marta", new Date());

    expect(Object.keys(reales).sort()).toEqual(Object.keys(ejemplo).sort());
  });
});

describe("Secretaría — plantillas de email", () => {
  it("ObtenerPlantilla falla si no existe, en vez de devolver null", async () => {
    // La pantalla de edición necesita la plantilla sí o sí: devolver null la
    // dejaría con los campos vacíos y sin decir por qué.
    const caso = new ObtenerPlantilla(
      mockPlantillaEmailRepositorio({ obtenerPorId: vi.fn(async () => null) }),
    );

    await expect(caso.ejecutar("pe-inexistente")).rejects.toThrow();
  });

  it("ObtenerPlantilla devuelve la que existe", async () => {
    const plantilla = plantillaEmailEjemplo();
    const caso = new ObtenerPlantilla(
      mockPlantillaEmailRepositorio({
        obtenerPorId: vi.fn(async () => plantilla),
      }),
    );

    expect(await caso.ejecutar("pe-1")).toBe(plantilla);
  });

  it("ListarPlantillas delega sin filtrar", async () => {
    const repositorio = mockPlantillaEmailRepositorio();
    await new ListarPlantillas(repositorio).ejecutar();

    expect(repositorio.listar).toHaveBeenCalledTimes(1);
  });

  it("ListarEmailsEnviados acota por defecto el historial", async () => {
    // El log de envíos crece sin techo; traerlo entero para pintar una tabla
    // sería el tipo de consulta que se nota recién con un año de uso.
    const repositorio = mockEmailEnviadoRepositorio();

    await new ListarEmailsEnviados(repositorio).ejecutar();
    expect(repositorio.listarRecientes).toHaveBeenCalledWith(30);

    await new ListarEmailsEnviados(repositorio).ejecutar(100);
    expect(repositorio.listarRecientes).toHaveBeenCalledWith(100);
  });
});

describe("EnviarEmailDeBienvenida", () => {
  it("no envía —ni falla— si el paciente no tiene email", async () => {
    // El email es opcional en el alta. Que un paciente sin correo haga fallar
    // la creación entera sería el peor intercambio posible.
    const servicioEmail = mockServicioEmail();
    const caso = new EnviarEmailDeBienvenida(
      mockPlantillaEmailRepositorio(),
      servicioEmail,
      "Lic. Marta",
    );

    expect(await caso.ejecutar("Ana", null)).toBe(false);
    expect(servicioEmail.enviar).not.toHaveBeenCalled();
  });

  it("no envía si la plantilla de bienvenida no está cargada", async () => {
    const servicioEmail = mockServicioEmail();
    const caso = new EnviarEmailDeBienvenida(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () => null),
      }),
      servicioEmail,
      "Lic. Marta",
    );

    expect(await caso.ejecutar("Ana", "ana@ejemplo.test")).toBe(false);
    expect(servicioEmail.enviar).not.toHaveBeenCalled();
  });

  it("envía con las variables reemplazadas cuando están las dos cosas", async () => {
    const servicioEmail = mockServicioEmail();
    const caso = new EnviarEmailDeBienvenida(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () =>
          plantillaEmailEjemplo({
            asunto: "Bienvenida {{paciente}}",
            cuerpoHtml: "<p>Hola {{paciente}}, te atiende {{profesional}}</p>",
          }),
        ),
      }),
      servicioEmail,
      "Lic. Marta",
    );

    expect(await caso.ejecutar("Ana García", "ana@ejemplo.test")).toBe(true);

    const [enviado] = (servicioEmail.enviar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [{ para: string; asunto: string; html: string }];
    expect(enviado.para).toBe("ana@ejemplo.test");
    expect(enviado.asunto).toContain("Ana García");
    expect(enviado.html).toContain("Ana García");
    expect(enviado.html).toContain("Lic. Marta");
    // Ningún placeholder sin reemplazar.
    expect(enviado.html).not.toContain("{{");
  });
});

describe("Integraciones con Google", () => {
  it("obtener y desconectar apuntan al MISMO proveedor", async () => {
    // Los dos usan la clave "GOOGLE". Si una dijera otra cosa, desconectar no
    // desconectaría nada y la pantalla seguiría mostrando la cuenta.
    const cuentas = mockCuentaConectadaRepositorio();

    await new ObtenerCuentaGoogle(cuentas).ejecutar();
    expect(cuentas.obtener).toHaveBeenCalledWith("GOOGLE");

    await new DesconectarGoogle(cuentas).ejecutar();
    expect(cuentas.eliminar).toHaveBeenCalledWith("GOOGLE");
  });

  it("sin cuenta conectada devuelve null, no falla", async () => {
    const caso = new ObtenerCuentaGoogle(
      mockCuentaConectadaRepositorio({ obtener: vi.fn(async () => null) }),
    );

    expect(await caso.ejecutar()).toBeNull();
  });
});

describe("Superadmin", () => {
  function nutricionista(activo = true) {
    return Usuario.reconstruir({
      id: "user-1",
      email: "nutri@ejemplo.test",
      passwordHash: "hash",
      rol: "NUTRICIONISTA",
      pacienteId: null,
      nutricionistaId: "nutri-1",
      activo,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    });
  }

  it("CambiarEstadoNutricionista da de baja y de alta", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => nutricionista(true)),
    });
    const caso = new CambiarEstadoNutricionista(usuarios);

    await caso.ejecutar("user-1", false);

    const [guardado] = (usuarios.actualizar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Usuario];
    expect(guardado.aPrimitivos().activo).toBe(false);
  });

  it("NO deja tocar a un usuario que no es nutricionista", async () => {
    // El superadmin gestiona consultorios, no las cuentas de los pacientes.
    // Sin este control, un id de paciente pasaría por la misma puerta.
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () =>
        Usuario.reconstruir({
          ...nutricionista().aPrimitivos(),
          rol: "PACIENTE",
        }),
      ),
    });
    const caso = new CambiarEstadoNutricionista(usuarios);

    await expect(caso.ejecutar("user-1", false)).rejects.toThrow();
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("ListarNutricionistas pide solo ese rol", async () => {
    const usuarios = mockUsuarioRepositorio();
    await new ListarNutricionistas(usuarios).ejecutar();

    expect(usuarios.listarPorRol).toHaveBeenCalledWith("NUTRICIONISTA");
  });
});

describe("Lecturas simples", () => {
  it("ObtenerDia devuelve null si el paciente no cargó ese día", async () => {
    // Un día sin registro es lo normal, no un error: la hoja se abre vacía y
    // lista para cargar.
    const caso = new ObtenerDia(
      mockRegistroDiarioRepositorio({
        obtenerPorPacienteYFecha: vi.fn(async () => null),
      }),
    );

    expect(await caso.ejecutar("pac-1", new Date("2026-07-01"))).toBeNull();
  });

  /**
   * El dueño viaja hasta el repositorio tal cual: un `null` que se colara ahí
   * al listar los de un paciente le mostraría los chats del profesional.
   */
  it("ListarConversacionesIA delega en el repositorio con su dueño", async () => {
    const repositorio = mockConversacionIARepositorio();
    await new ListarConversacionesIA(repositorio).ejecutar("pac-1");

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.any(Number),
      "pac-1",
    );
  });
});
