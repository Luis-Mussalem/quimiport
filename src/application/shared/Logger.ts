// Port de log: os casos de uso registram eventos de negócio sem saber
// qual biblioteca de log está por trás.
export interface Logger {
  info(evento: string, dados?: Record<string, unknown>): void;
  warn(evento: string, dados?: Record<string, unknown>): void;
  error(evento: string, dados?: Record<string, unknown>): void;
}
