import { describe, it, expect, afterEach } from "vitest";
import { describirDestinoEmail } from "./destinoEmail";

const previo = { ...process.env };
afterEach(() => {
  process.env = { ...previo };
});

describe("describirDestinoEmail", () => {
  it("avisa cuando el destino parece Mailpit", () => {
    // Es la trampa que motiva la función: los recordatorios se envían y se
    // registran como enviados, pero no llegan a ninguna casilla real.
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";

    const texto = describirDestinoEmail();

    expect(texto).toContain("NO salen a Internet");
    expect(texto).toContain("http://localhost:8025");
  });

  it("no avisa nada raro con un SMTP real", () => {
    process.env.SMTP_HOST = "smtp.sendgrid.net";
    process.env.SMTP_PORT = "587";

    const texto = describirDestinoEmail();

    expect(texto).toBe("emails → smtp.sendgrid.net:587");
  });

  it("un host local en otro puerto no se confunde con Mailpit", () => {
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "587";

    expect(describirDestinoEmail()).toBe("emails → localhost:587");
  });
});
