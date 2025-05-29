'use client';

import type { Membro, DesignacoesFeitas } from './types';
import { LOCAL_STORAGE_KEY_MEMBROS, LOCAL_STORAGE_KEY_SCHEDULE_CACHE } from './constants';
import { validarEstruturaMembro } from './utils';

export function carregarMembrosLocalmente(): Membro[] {
  if (typeof window === 'undefined') return [];
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_MEMBROS);
    if (dadosSalvos) {
      const membrosSalvos = JSON.parse(dadosSalvos) as Partial<Membro>[];
      const membrosValidos = membrosSalvos.map(m => validarEstruturaMembro(m, false)).filter(Boolean) as Membro[];
      return membrosValidos.sort((a, b) => a.nome.localeCompare(b.nome));
    }
  } catch (error) {
    console.error("Erro ao carregar membros do localStorage:", error);
  }
  return [];
}

export function salvarMembrosLocalmente(membros: Membro[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBROS, JSON.stringify(membros));
  } catch (error) {
    console.error("Erro ao salvar membros no localStorage:", error);
  }
}


export function carregarCacheDesignacoes(): DesignacoesFeitas | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
    if (dadosSalvos) {
      // Add more robust validation if needed for DesignacoesFeitas structure
      return JSON.parse(dadosSalvos) as DesignacoesFeitas;
    }
  } catch (error) {
    console.error("Erro ao carregar cache de designações:", error);
  }
  return null;
}

export function salvarCacheDesignacoes(designacoes: DesignacoesFeitas, mes: number, ano: number): void {
  if (typeof window === 'undefined') return;
  try {
    // Could also store mes/ano with cache to validate if it's for current selection
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE, JSON.stringify(designacoes));
  } catch (error) {
    console.error("Erro ao salvar cache de designações:", error);
  }
}

export function limparCacheDesignacoes(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
  } catch (error) {
    console.error("Erro ao limpar cache de designações:", error);
  }
}
