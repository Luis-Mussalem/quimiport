import { DomainError } from './DomainError';

// Falhas de negócio são esperadas (ex.: documentação faltando), então são
// devolvidas como valor em vez de lançadas como exceção (ADR-005).
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Fail<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E extends Error = DomainError> = Ok<T> | Fail<E>;

export function ok(): Ok<void>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T | undefined> {
  return { ok: true, value };
}

export function fail<E extends Error>(error: E): Fail<E> {
  return { ok: false, error };
}
