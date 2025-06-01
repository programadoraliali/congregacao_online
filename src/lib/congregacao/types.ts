
export interface PermissaoBase {
  id: string;
  nome: string;
  grupo: string;
}

export interface FuncaoDesignada {
  id: string;
  nome: string;
  tipoReuniao: ('meioSemana' | 'publica')[];
  tabela: 'Indicadores' | 'Volantes' | 'LeitorPresidente' | 'AV'; // Helps group functions in schedule display
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
    limpezaAposReuniaoGrupoId?: string | null; // This can be null, string or undefined
    limpezaSemanalResponsavel?: string | null; // This can be null, string or undefined
  };
}

export interface DesignacaoSalva {
  schedule: DesignacoesFeitas;
  mes: number; // 0-11
  ano: number;
  status: 'rascunho' | 'finalizado';
}

export interface TodosCronogramasSalvos {
  [yearMonthKey: string]: DesignacaoSalva; // Key: "YYYY-MM" (e.g., "2024-07")
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
  currentFunctionGroupId: 'Indicadores' | 'Volantes' | 'AV' | string; // Para saber qual funcao especifica dentro do grupo
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
  partName: string;
  partTheme?: string;
  needsAssistant?: boolean;
  participantSalaAId?: string | null;
  assistantSalaAId?: string | null;
  participantSalaBId?: string | null;
  assistantSalaBId?: string | null;
}

export interface NVCVidaCristaDynamicPart {
  id: string;
  partName: string;
  partTheme?: string;
  participantId?: string | null;
}

export interface NVMCDailyAssignments {
  // Geral
  canticoInicialNumero?: string;
  comentariosIniciaisDetalhes?: string; // Formato: (X min)
  presidenteId?: string | null;
  oracaoInicialId?: string | null;
  // Tesouros da Palavra de Deus
  tesourosDiscursoId?: string | null;
  tesourosDiscursoCustomTitle?: string;
  joiasEspirituaisId?: string | null;
  joiasEspirituaisCustomTitle?: string;
  leituraBibliaSalaAId?: string | null;
  leituraBibliaSalaBId?: string | null;
  leituraBibliaCustomTitle?: string;
  // Faça Seu Melhor no Ministério (dynamic parts)
  fmmParts: NVMCParticipantDynamic[];
  // Nossa Vida Cristã (dynamic parts for talks/items)
  vidaCristaParts: NVCVidaCristaDynamicPart[];
  vidaCristaCantico?: string; // Para o cântico intermediário
  // EBC (fixed within VC section)
  ebcDirigenteId?: string | null;
  ebcLeitorId?: string | null;
  ebcCustomTitle?: string;
  // Encerramento
  comentariosFinaisDetalhes?: string; // Formato: (X min) | Cântico Y e Oração
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
  canticoInicialNumero?: string;
  comentariosIniciaisDetalhes?: string;
  fmmParts: ParsedNvmcPart[];
  vidaCristaParts: NVCVidaCristaDynamicPart[];
  vidaCristaCantico?: string;
  leituraBibliaTema?: string;
  ebcTema?: string;
  tesourosDiscursoTema?: string;
  joiasEspirituaisTema?: string;
  comentariosFinaisDetalhes?: string;
}

// --- Tipos para Serviço de Campo ---
export interface ManagedListItem {
  id: string;
  name: string;
}

export interface FieldServiceMeetingDateEntry {
  specificDateKey: string; // YYYY-MM-DD
  leaderName: string;
  specialNote: string;
}

export interface FieldServiceMeetingSlot {
  id: string;
  time: string; // Agora será um valor do seletor, ex: "08:45"
  modalityId?: string | null; // ID da lista de modalidades gerenciadas
  baseLocationId?: string | null; // ID da lista de locais base gerenciados
  additionalDetails?: string; // Campo de texto para "Grupos 1,2" ou "1º Sábado"
  assignedDates: FieldServiceMeetingDateEntry[];
}

export interface FieldServiceDayOfWeekSlots {
  slots: FieldServiceMeetingSlot[];
}

export interface FieldServiceMonthlyData {
  // Chave: Dia da semana (0-6, onde 0 é Domingo) como string
  [dayOfWeek: string]: FieldServiceDayOfWeekSlots;
}

export interface AllFieldServiceAssignments {
  // Chave: "AAAA-MM" (ex: "2024-07")
  [yearMonth: string]: FieldServiceMonthlyData;
}
