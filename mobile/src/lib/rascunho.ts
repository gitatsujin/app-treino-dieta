import { useSyncExternalStore } from 'react';

/**
 * Rascunho compartilhado entre telas (ex.: o plano em edição recebe os exercícios
 * escolhidos na tela de busca). Fica só na memória até ser salvo no banco.
 */
class Rascunho<T> {
  private valor: T;
  private ouvintes = new Set<() => void>();

  constructor(inicial: T) {
    this.valor = inicial;
  }

  ler = () => this.valor;

  definir = (v: T | ((a: T) => T)) => {
    this.valor = typeof v === 'function' ? (v as (a: T) => T)(this.valor) : v;
    this.ouvintes.forEach((o) => o());
  };

  private assinar = (cb: () => void) => {
    this.ouvintes.add(cb);
    return () => {
      this.ouvintes.delete(cb);
    };
  };

  useValor = () => {
    'use no memo';
    return useSyncExternalStore(this.assinar, this.ler);
  };
}

export function criarRascunho<T>(inicial: T) {
  return new Rascunho(inicial);
}
