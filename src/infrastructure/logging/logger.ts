import pino from 'pino';
import { Logger } from '../../application/shared/Logger';

export interface OpcoesDoLogger {
  nivel: string;
  // Saída colorida e legível no terminal (só em desenvolvimento).
  legivel: boolean;
}

// Logs em JSON (um objeto por linha): fáceis de filtrar e de enviar para
// ferramentas de observabilidade.
export function criarLoggerRaiz({ nivel, legivel }: OpcoesDoLogger): pino.Logger {
  return pino({
    level: nivel,
    base: { servico: 'quimiport-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    transport: legivel
      ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,servico' } }
      : undefined,
  });
}

// Adapter: implementa o port Logger da aplicação usando o Pino.
export class PinoLogger implements Logger {
  constructor(private readonly pino: pino.Logger) {}

  info(evento: string, dados: Record<string, unknown> = {}): void {
    this.pino.info({ evento, ...dados }, evento);
  }

  warn(evento: string, dados: Record<string, unknown> = {}): void {
    this.pino.warn({ evento, ...dados }, evento);
  }

  error(evento: string, dados: Record<string, unknown> = {}): void {
    this.pino.error({ evento, ...dados }, evento);
  }
}