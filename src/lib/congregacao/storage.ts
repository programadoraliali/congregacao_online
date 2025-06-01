
'use client';

import type { Membro, DesignacoesFeitas, AllPublicMeetingAssignments, AllNVMCAssignments, AllFieldServiceAssignments, ManagedListItem, DesignacaoSalva, TodosCronogramasSalvos } from './types';
import { 
  LOCAL_STORAGE_KEY_MEMBROS, 
  LOCAL_STORAGE_KEY_SCHEDULE_CACHE,
  LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS,
  LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS,
  LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS,
  LOCAL_STORAGE_KEY_FIELD_SERVICE_MODALITIES,
  LOCAL_STORAGE_KEY_FIELD_SERVICE_LOCATIONS,
  LOCAL_STORAGE_KEY_USER_SCHEDULE,
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

export function carregarCacheDesignacoes(): DesignacaoSalva | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as DesignacaoSalva;
      // Adicionar validação básica da estrutura se necessário
      if (parsedData && typeof parsedData === 'object' && 
          'schedule' in parsedData && 'mes' in parsedData && 'ano' in parsedData && 'status' in parsedData) {
        return parsedData;
      } else {
         console.warn("Cache de designações encontrado, mas com estrutura inválida. Limpando.");
         localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_CACHE);
         return null;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar cache de designações:", error);
  }
  return null;
}

export function salvarCacheDesignacoes(data: DesignacaoSalva): void {
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


export function carregarTodosCronogramas(): TodosCronogramasSalvos | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_USER_SCHEDULE);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as TodosCronogramasSalvos;
      // Basic validation: check if it's an object (and not an array)
      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        // Further validation for each entry can be added here if needed
        return parsedData;
      } else {
        console.warn("Dados de cronogramas salvos encontrados, mas com estrutura inválida (esperado objeto, recebido array ou outro). Limpando.");
        localStorage.removeItem(LOCAL_STORAGE_KEY_USER_SCHEDULE);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar todos os cronogramas do localStorage:", error);
  }
  return null; // Return null if not found or error
}

export function salvarTodosCronogramas(cronogramas: TodosCronogramasSalvos): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_USER_SCHEDULE, JSON.stringify(cronogramas));
  } catch (error) {
    console.error("Erro ao salvar todos os cronogramas no localStorage:", error);
  }
}

export function salvarDesignacoesUsuario(designacaoParaSalvar: DesignacaoSalva): void {
  if (typeof window === 'undefined') return;
  try {
    const todosCronogramas = carregarTodosCronogramas() || {};
    const yearMonthKey = `${designacaoParaSalvar.ano}-${String(designacaoParaSalvar.mes + 1).padStart(2, '0')}`;
    todosCronogramas[yearMonthKey] = designacaoParaSalvar; // Salva com status 'rascunho'
    salvarTodosCronogramas(todosCronogramas);
    // O cache principal (LOCAL_STORAGE_KEY_SCHEDULE_CACHE) pode ser atualizado aqui também se desejado,
    // ou deixado para ser carregado a partir de LOCAL_STORAGE_KEY_USER_SCHEDULE na próxima vez.
    // Por consistência com o botão "Finalizar", que limpa o cache, talvez seja melhor não salvar no cache aqui.
    // Ou, se salvar, garantir que o status 'rascunho' seja o correto.
    // Vamos manter o cache atualizado com o que está sendo trabalhado:
    salvarCacheDesignacoes(designacaoParaSalvar);
  } catch (error) {
    console.error("Erro ao salvar designações do usuário:", error);
  }
}

export function limparTodosCronogramasSalvos(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER_SCHEDULE);
  } catch (error) {
    console.error("Erro ao limpar todos os cronogramas salvos:", error);
  }
}


// Funções para a aba "Reunião Pública"
export function carregarPublicMeetingAssignments(): AllPublicMeetingAssignments | null {
  if (typeof window === 'undefined') return null;
  try {
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS);
    if (dadosSalvos) {
      const parsedData = JSON.parse(dadosSalvos) as AllPublicMeetingAssignments;
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

// Funções para listas gerenciadas do Serviço de Campo (Modalidades e Locais Base)
function carregarManagedList(key: string): ManagedListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const dadosSalvos = localStorage.getItem(key);
    if (dadosSalvos) {
      const items = JSON.parse(dadosSalvos) as ManagedListItem[];
      if (Array.isArray(items) && items.every(item => item && typeof item.id === 'string' && typeof item.name === 'string')) {
        return items.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        console.warn(`Lista gerenciada em '${key}' com estrutura inválida. Limpando.`);
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error(`Erro ao carregar lista gerenciada de '${key}':`, error);
  }
  return [];
}

function salvarManagedList(key: string, items: ManagedListItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Erro ao salvar lista gerenciada em '${key}':`, error);
  }
}

export function carregarModalidades(): ManagedListItem[] {
  return carregarManagedList(LOCAL_STORAGE_KEY_FIELD_SERVICE_MODALITIES);
}
export function salvarModalidades(items: ManagedListItem[]): void {
  salvarManagedList(LOCAL_STORAGE_KEY_FIELD_SERVICE_MODALITIES, items);
}
export function limparModalidades(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_MODALITIES);
}

export function carregarLocaisBase(): ManagedListItem[] {
  return carregarManagedList(LOCAL_STORAGE_KEY_FIELD_SERVICE_LOCATIONS);
}
export function salvarLocaisBase(items: ManagedListItem[]): void {
  salvarManagedList(LOCAL_STORAGE_KEY_FIELD_SERVICE_LOCATIONS, items);
}
export function limparLocaisBase(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY_FIELD_SERVICE_LOCATIONS);
}
