
'use client';

import type { Membro, DesignacoesFeitas, AllPublicMeetingAssignments, AllNVMCAssignments, AllFieldServiceAssignments } from './types';
import { 
  LOCAL_STORAGE_KEY_MEMBROS, 
  LOCAL_STORAGE_KEY_SCHEDULE_CACHE,
  LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS,
  LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS,
  LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS
} from './constants';
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
      if (parsedData && typeof parsedData === 'object' && 
          'schedule' in parsedData && 'mes' in parsedData && 'ano' in parsedData &&
          typeof parsedData.schedule === 'object' && 
          typeof parsedData.mes === 'number' && typeof parsedData.ano === 'number') {
        return parsedData as { schedule: DesignacoesFeitas, mes: number, ano: number };
      } else {
        console.warn("Cache de designações (aba 1) encontrado, mas com estrutura inválida. Limpando.");
        localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
        return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar cache de designações (aba 1):", error);
  }
  return null;
}

export function salvarCacheDesignacoes(data: { schedule: DesignacoesFeitas, mes: number, ano: number }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar cache de designações (aba 1):", error);
  }
}

export function limparCacheDesignacoes(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
  } catch (error) {
    console.error("Erro ao limpar cache de designações (aba 1):", error);
  }
}

// Funções para a aba "Reunião Pública"
export function carregarPublicMeetingAssignments(): AllPublicMeetingAssignments | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as AllPublicMeetingAssignments;
      // Adicionar validação básica da estrutura se necessário
      if (parsedData && typeof parsedData === 'object') {
        return parsedData;
      } else {
         console.warn("Cache de Reunião Pública encontrado, mas com estrutura inválida. Limpando.");
         localStorage.removeItem(LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS);
         return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar designações da Reunião Pública:", error);
  }
  return null;
}

export function salvarPublicMeetingAssignments(data: AllPublicMeetingAssignments): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar designações da Reunião Pública:", error);
  }
}

export function limparPublicMeetingAssignments(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS);
  } catch (error) {
    console.error("Erro ao limpar designações da Reunião Pública:", error);
  }
}

// Funções para a aba "NVMC"
export function carregarNVMCAssignments(): AllNVMCAssignments | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as AllNVMCAssignments;
      if (parsedData && typeof parsedData === 'object') {
        return parsedData;
      } else {
         console.warn("Cache de NVMC encontrado, mas com estrutura inválida. Limpando.");
         localStorage.removeItem(LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS);
         return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar designações NVMC:", error);
  }
  return null;
}

export function salvarNVMCAssignments(data: AllNVMCAssignments): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar designações NVMC:", error);
  }
}

export function limparNVMCAssignments(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS);
  } catch (error) {
    console.error("Erro ao limpar designações NVMC:", error);
  }
}

// Funções para a aba "Serviço de Campo"
export function carregarFieldServiceAssignments(): AllFieldServiceAssignments | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as AllFieldServiceAssignments;
      if (parsedData && typeof parsedData === 'object') {
        return parsedData;
      } else {
         console.warn("Cache de Serviço de Campo encontrado, mas com estrutura inválida. Limpando.");
         localStorage.removeItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS);
         return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar designações do Serviço de Campo:", error);
  }
  return null;
}

export function salvarFieldServiceAssignments(data: AllFieldServiceAssignments): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar designações do Serviço de Campo:", error);
  }
}

export function limparFieldServiceAssignments(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS);
  } catch (error) {
    console.error("Erro ao limpar designações do Serviço de Campo:", error);
  }
}
