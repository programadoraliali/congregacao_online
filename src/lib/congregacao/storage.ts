
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


export function carregarCacheDesignacoes(): { schedule: DesignacoesFeitas, mes: number, ano: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos);
      // Adicionar validação básica da estrutura
      if (parsedData && typeof parsedData === 'object' && 
          'schedule' in parsedData && 'mes' in parsedData && 'ano' in parsedData &&
          typeof parsedData.schedule === 'object' && 
          typeof parsedData.mes === 'number' && typeof parsedData.ano === 'number') {
        return parsedData as { schedule: DesignacoesFeitas, mes: number, ano: number };
      } else {
        console.warn("Cache de designações encontrado, mas com estrutura inválida. Limpando.");
        localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE); // Limpa cache inválido
        return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar cache de designações:", error);
  }
  return null;
}

export function salvarCacheDesignacoes(data: { schedule: DesignacoesFeitas, mes: number, ano: number }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE, JSON.stringify(data));
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

