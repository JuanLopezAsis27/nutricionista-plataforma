import { describe, it, expect } from "vitest";
import { Paciente } from "./Paciente";

const BASE = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@mail.com",
  fechaNacimiento: null,
  notas: null,
};

/**
 * `telefonoE164` es la clave con la que la ingesta de WhatsApp resuelve al
 * paciente. Antes esa canonización se hacía en cada mensaje entrante sobre la
 * tabla entera; ahora la calcula la entidad al guardar, así que estos casos
 * son los que sostienen el índice.
 */
describe("Paciente.telefonoE164", () => {
  it("canoniza un teléfono cargado en formato local argentino", () => {
    const paciente = Paciente.crear(
      { ...BASE, telefono: "011 15 5555-4444" },
      "pac-1",
    );
    expect(paciente.telefonoE164).toBe("5491155554444");
  });

  it("llega al mismo canónico desde el formato internacional", () => {
    const local = Paciente.crear(
      { ...BASE, telefono: "011 15 5555-4444" },
      "pac-1",
    );
    const internacional = Paciente.crear(
      { ...BASE, telefono: "+54 9 11 5555-4444" },
      "pac-2",
    );
    expect(internacional.telefonoE164).toBe(local.telefonoE164);
  });

  it("respeta el prefijo de país del consultorio", () => {
    const paciente = Paciente.crear(
      { ...BASE, telefono: "600 123 456" },
      "pac-1",
      new Date(),
      "34",
    );
    expect(paciente.telefonoE164).toBe("34600123456");
  });

  it("deja el canónico en null cuando no hay teléfono", () => {
    expect(
      Paciente.crear({ ...BASE, telefono: null }, "pac-1").telefonoE164,
    ).toBeNull();
  });

  it("no bloquea el alta por un teléfono ilegible: lo deja sin canónico", () => {
    const paciente = Paciente.crear(
      { ...BASE, telefono: "no es un número" },
      "pac-1",
    );
    expect(paciente.telefono).toBe("no es un número");
    expect(paciente.telefonoE164).toBeNull();
  });

  it("recalcula el canónico al editar el teléfono", () => {
    const paciente = Paciente.crear(
      { ...BASE, telefono: "011 15 5555-4444" },
      "pac-1",
    );
    const editado = paciente.actualizar({ telefono: "011 15 1111-2222" });
    expect(editado.telefonoE164).toBe("5491111112222");
  });

  it("editar otros campos no toca el estado de archivado", () => {
    const archivado = Paciente.crear(
      { ...BASE, telefono: null },
      "pac-1",
    ).archivar("pausa");
    const editado = archivado.actualizar({ nombre: "Anita" });
    expect(editado.nombre).toBe("Anita");
    expect(editado.estaArchivado).toBe(true);
    expect(editado.motivoArchivado).toBe("pausa");
  });
});
