/**
 * Contenedor de inyección de dependencias (manual, sin librerías).
 *
 * Este es el ÚNICO lugar donde se instancian las implementaciones concretas
 * (Prisma) y se "enchufan" en los casos de uso y servicios. El resto de la
 * aplicación depende solo de interfaces y servicios, nunca de Prisma.
 *
 * Flujo de cableado:
 *   PrismaClient → Repositorios (implementan interfaces del dominio)
 *               → Casos de uso (reciben las interfaces)
 *               → Servicios de aplicación (reciben los casos de uso)
 */

import { PrismaClienteSingleton } from "@/infraestructura/repositorios/PrismaClienteSingleton";

import { PrismaRepositorioPaciente } from "@/infraestructura/repositorios/PrismaRepositorioPaciente";
import { PrismaRepositorioTurno } from "@/infraestructura/repositorios/PrismaRepositorioTurno";
import { PrismaRepositorioDieta } from "@/infraestructura/repositorios/PrismaRepositorioDieta";
import { PrismaRepositorioUsuario } from "@/infraestructura/repositorios/PrismaRepositorioUsuario";
import { BcryptHasheador } from "@/infraestructura/seguridad/BcryptHasheador";

// Casos de uso — Pacientes
import { CrearPaciente } from "@/dominio/casos-de-uso/pacientes/CrearPaciente";
import { ObtenerPacientes } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientes";
import { ObtenerPacientePorId } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientePorId";
import { ActualizarPaciente } from "@/dominio/casos-de-uso/pacientes/ActualizarPaciente";
import { EliminarPaciente } from "@/dominio/casos-de-uso/pacientes/EliminarPaciente";

// Casos de uso — Turnos
import { AgendarTurno } from "@/dominio/casos-de-uso/turnos/AgendarTurno";
import { ObtenerTurnos } from "@/dominio/casos-de-uso/turnos/ObtenerTurnos";
import { ObtenerTurnosPorPaciente } from "@/dominio/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import { ActualizarEstadoTurno } from "@/dominio/casos-de-uso/turnos/ActualizarEstadoTurno";
import { CancelarTurno } from "@/dominio/casos-de-uso/turnos/CancelarTurno";
import { ReprogramarTurno } from "@/dominio/casos-de-uso/turnos/ReprogramarTurno";

// Casos de uso — Dietas
import { CrearDieta } from "@/dominio/casos-de-uso/dietas/CrearDieta";
import { ObtenerDietas } from "@/dominio/casos-de-uso/dietas/ObtenerDietas";
import { ObtenerDietaPorId } from "@/dominio/casos-de-uso/dietas/ObtenerDietaPorId";
import { ActualizarDieta } from "@/dominio/casos-de-uso/dietas/ActualizarDieta";
import { EliminarDieta } from "@/dominio/casos-de-uso/dietas/EliminarDieta";
import { AsignarDietaAPaciente } from "@/dominio/casos-de-uso/dietas/AsignarDietaAPaciente";
import { ObtenerDietaDelPaciente } from "@/dominio/casos-de-uso/dietas/ObtenerDietaDelPaciente";

// Servicios de aplicación
import { ServicioPaciente } from "@/aplicacion/servicios/ServicioPaciente";
import { ServicioTurno } from "@/aplicacion/servicios/ServicioTurno";
import { ServicioDieta } from "@/aplicacion/servicios/ServicioDieta";

// --- 1. Cliente de base de datos ---------------------------------------------
const prisma = PrismaClienteSingleton.obtenerInstancia();

// --- 2. Repositorios (adaptadores de salida) ---------------------------------
const repositorioPaciente = new PrismaRepositorioPaciente(prisma);
const repositorioTurno = new PrismaRepositorioTurno(prisma);
const repositorioDieta = new PrismaRepositorioDieta(prisma);
const repositorioUsuario = new PrismaRepositorioUsuario(prisma);

// Servicios de infraestructura
const hasheador = new BcryptHasheador();

// --- 3. Casos de uso ---------------------------------------------------------
// Pacientes
const crearPaciente = new CrearPaciente(repositorioPaciente, repositorioUsuario, hasheador);
const obtenerPacientes = new ObtenerPacientes(repositorioPaciente);
const obtenerPacientePorId = new ObtenerPacientePorId(repositorioPaciente);
const actualizarPaciente = new ActualizarPaciente(repositorioPaciente, repositorioUsuario);
const eliminarPaciente = new EliminarPaciente(repositorioPaciente, repositorioUsuario);

// Turnos
const agendarTurno = new AgendarTurno(repositorioTurno, repositorioPaciente);
const obtenerTurnos = new ObtenerTurnos(repositorioTurno);
const obtenerTurnosPorPaciente = new ObtenerTurnosPorPaciente(
  repositorioTurno,
  repositorioPaciente,
);
const actualizarEstadoTurno = new ActualizarEstadoTurno(repositorioTurno);
const cancelarTurno = new CancelarTurno(repositorioTurno, actualizarEstadoTurno);
const reprogramarTurno = new ReprogramarTurno(repositorioTurno);

// Dietas
const crearDieta = new CrearDieta(repositorioDieta);
const obtenerDietas = new ObtenerDietas(repositorioDieta);
const obtenerDietaPorId = new ObtenerDietaPorId(repositorioDieta);
const actualizarDieta = new ActualizarDieta(repositorioDieta);
const eliminarDieta = new EliminarDieta(repositorioDieta);
const asignarDietaAPaciente = new AsignarDietaAPaciente(repositorioDieta, repositorioPaciente);
const obtenerDietaDelPaciente = new ObtenerDietaDelPaciente(
  repositorioDieta,
  repositorioPaciente,
);

// --- 4. Servicios de aplicación ----------------------------------------------
export const servicioPaciente = new ServicioPaciente(
  crearPaciente,
  obtenerPacientes,
  obtenerPacientePorId,
  actualizarPaciente,
  eliminarPaciente,
);

export const servicioTurno = new ServicioTurno(
  agendarTurno,
  obtenerTurnos,
  obtenerTurnosPorPaciente,
  actualizarEstadoTurno,
  cancelarTurno,
  reprogramarTurno,
);

export const servicioDieta = new ServicioDieta(
  crearDieta,
  obtenerDietas,
  obtenerDietaPorId,
  actualizarDieta,
  eliminarDieta,
  asignarDietaAPaciente,
  obtenerDietaDelPaciente,
);

// El repositorio de usuario se expone para la configuración de Auth.js.
export const repositorioUsuarioCompartido = repositorioUsuario;

/** Agrupación opcional para inyectar todo el contenedor en el contexto tRPC. */
export const contenedor = {
  servicioPaciente,
  servicioTurno,
  servicioDieta,
  repositorioUsuario,
} as const;

export type Contenedor = typeof contenedor;
