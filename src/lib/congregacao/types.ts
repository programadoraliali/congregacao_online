

export interface PermissaoBase {
  id: string;
  nome: string;
  grupo: string;
}

export interface FuncaoDesignada {
  id: string;
  nome: string;
  tipoReuniao: ('meioSemana' | 'publica')[];
  tabela: 'Indicadores' | 'Volantes' | 'LeitorPresidente'; // Helps group functions in schedule display
  permissaoRequeridaBase?: string; // e.g., 'indicador', 'volante', 'leitor', 'presidente' - base permission part
}

export interface Impedimento {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface Membro {
  id: string;
  nome: string;
  permissoesBase: Record<string, boolean>; // Keys are id from PERMISSOES_BASE
  historicoDesignacoes: Record<string, string>; // Key: "YYYY-MM-DD", Value: idFuncao
  impedimentos: Impedimento[]; // Array de objetos de impedimento
}

export interface Designacao {
  data: string; // "YYYY-MM-DD DiaAbrev"
  diaSemanaBadgeColor: string;
  [key: string]: string | null | undefined; // For function assignments, e.g., externo: "Nome Membro" or null
}

export interface DesignacoesFeitas {
  // Key: "YYYY-MM-DD"
  [dataStr: string]: {
    // Key: idFuncao
    [funcaoId: string]: string | null; // Value: idMembro or null if unassigned
  };
}

export interface DesignacoesSalvasHistorico {
  // Key: "AAAA-MM"
  [anoMes: string]: {
    designacoes: DesignacoesFeitas;
  };
}

export interface DiasReuniao {
  meioSemana: number; // 0 (Dom) - 6 (Sab)
  publica: number;    // 0 (Dom) - 6 (Sab)
}

export interface SubstitutionDetails {
  date: string; // YYYY-MM-DD
  functionId: string;
  originalMemberId: string;
  originalMemberName: string | null;
  currentFunctionGroupId: 'Indicadores' | 'Volantes' | string; // Para saber qual funcao especifica dentro do grupo
}

// Tipos para a aba "Reunião Pública"
export interface PublicMeetingAssignment {
  tema?: string;
  orador?: string;
  congregacaoOrador?: string;
  dirigenteId?: string | null; // Member ID for Watchtower Conductor
  leitorId?: string | null;   // Member ID for Watchtower Reader
}

export interface AllPublicMeetingAssignments {
  // Chave: "AAAA-MM" (ex: "2024-07")
  [yearMonth: string]: {
    // Chave: "AAAA-MM-DD" (data completa de cada domingo)
    [dateStr: string]: PublicMeetingAssignment;
  };
}

// Tipos para a nova aba "NVMC"
export interface NVMCParticipantDynamic {
  id: string;
  partName: string; // Ex: "Iniciando conversas", "Fazendo discípulos" - Extraído, não editável diretamente na lista
  partTheme?: string; // Ex: "(3 min) DE CASA EM CASA..." - Editável
  needsAssistant?: boolean;
  participantId?: string | null;
  assistantId?: string | null;
}

export interface NVCVidaCristaDynamicPart {
  id: string;
  partName: string; // Ex: "Podemos ter um coração alegre..." - Extraído, não editável diretamente
  partTheme?: string; // Ex: "(15 min) Consideração." - Editável
  participantId?: string | null;
}

export interface NVMCDailyAssignments {
  // Geral
  presidenteId?: string | null;
  oracaoInicialId?: string | null;
  // Tesouros da Palavra de Deus
  tesourosDiscursoId?: string | null;
  tesourosDiscursoCustomTitle?: string;
  joiasEspirituaisId?: string | null;
  joiasEspirituaisCustomTitle?: string;
  leituraBibliaId?: string | null;
  leituraBibliaCustomTitle?: string;
  // Faça Seu Melhor no Ministério (dynamic parts)
  fmmParts: NVMCParticipantDynamic[];
  // Nossa Vida Cristã (dynamic parts for talks/items)
  vidaCristaParts: NVCVidaCristaDynamicPart[];
  // EBC (fixed within VC section)
  ebcDirigenteId?: string | null;
  ebcLeitorId?: string | null;
  ebcCustomTitle?: string;
  oracaoFinalId?: string | null;
}

export interface AllNVMCAssignments {
  // Chave: "AAAA-MM" (ex: "2024-07")
  [yearMonth: string]: {
    // Chave: "YYYY-MM-DD" (data completa de cada reunião de meio de semana)
    [dateStr: string]: NVMCDailyAssignments;
  };
}

// Tipos para o parser de texto NVMC
export interface ParsedNvmcPart {
  partName: string;
  partTheme?: string;
}

export interface ParsedNvmcProgram {
  fmmParts: ParsedNvmcPart[];
  vidaCristaParts: ParsedNvmcPart[];
  leituraBibliaTema?: string;
  ebcTema?: string;
  tesourosDiscursoTema?: string;
  joiasEspirituaisTema?: string;
}

    
