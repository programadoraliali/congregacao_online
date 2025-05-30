
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
export interface NVMCParticipantAssignment {
  customTitle?: string;       // User-defined title for the part (e.g., theme of FMM part)
  participantId?: string | null;
  assistantId?: string | null;    // For demonstrations/parts with two people
}

export interface NVMCDailyAssignments {
  // Geral
  presidenteId?: string | null;
  oracaoInicialId?: string | null;
  // Tesouros da Palavra de Deus
  tesourosDiscursoId?: string | null;
  joiasEspirituaisId?: string | null;
  leituraBibliaId?: string | null;
  // Faça Seu Melhor no Ministério (example for 3 flexible parts)
  fmmParte1?: NVMCParticipantAssignment;
  fmmParte2?: NVMCParticipantAssignment;
  fmmParte3?: NVMCParticipantAssignment;
  // Nossa Vida Cristã
  vidaCristaParte1CustomTitle?: string; // e.g., "Necessidades Locais" or specific article
  vidaCristaParte1Id?: string | null;
  ebcDirigenteId?: string | null;
  ebcLeitorId?: string | null;
  oracaoFinalId?: string | null;
}

export interface AllNVMCAssignments {
  // Chave: "AAAA-MM" (ex: "2024-07")
  [yearMonth: string]: {
    // Chave: "YYYY-MM-DD" (data completa de cada reunião de meio de semana)
    [dateStr: string]: NVMCDailyAssignments;
  };
}
