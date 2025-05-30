
import type { PermissaoBase, FuncaoDesignada, DiasReuniao } from './types';

export const APP_NAME = "Congregação Online";

export const NOMES_MESES: string[] = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const NOMES_DIAS_SEMANA_ABREV: string[] = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const DIAS_REUNIAO: DiasReuniao = {
  meioSemana: 4, // Quinta-feira
  publica: 0     // Domingo
};

export const PERMISSOES_BASE: PermissaoBase[] = [
  { id: 'indicadorQui', nome: 'Indicador Quinta', grupo: 'Indicadores' },
  { id: 'indicadorDom', nome: 'Indicador Domingo', grupo: 'Indicadores' },
  { id: 'volanteQui', nome: 'Volante Quinta', grupo: 'Volantes' },
  { id: 'volanteDom', nome: 'Volante Domingo', grupo: 'Volantes' },
  { id: 'leitorQui', nome: 'Leitor (Meio Semana)', grupo: 'Leitura/Presidência' }, // Ajustado nome
  { id: 'leitorDom', nome: 'Leitor (Fim Semana)', grupo: 'Leitura/Presidência' },  // Ajustado nome
  { id: 'presidente', nome: 'Presidente/Instrutor', grupo: 'Leitura/Presidência' }, // Ajustado nome
  // Poderia adicionar permissões mais granulares para NVMC se necessário no futuro
  // Ex: { id: 'parteDemonstracao', nome: 'Parte Demonstração (FMM)', grupo: 'NVMC Específico'}
];

export const FUNCOES_DESIGNADAS: FuncaoDesignada[] = [
  // Indicadores
  { id: 'indicadorExternoQui', nome: 'Indicador Externo', tipoReuniao: ['meioSemana'], tabela: 'Indicadores', permissaoRequeridaBase: 'indicadorQui' },
  { id: 'indicadorPalcoQui', nome: 'Indicador Palco', tipoReuniao: ['meioSemana'], tabela: 'Indicadores', permissaoRequeridaBase: 'indicadorQui' },
  { id: 'indicadorExternoDom', nome: 'Indicador Externo', tipoReuniao: ['publica'], tabela: 'Indicadores', permissaoRequeridaBase: 'indicadorDom' },
  { id: 'indicadorPalcoDom', nome: 'Indicador Palco', tipoReuniao: ['publica'], tabela: 'Indicadores', permissaoRequeridaBase: 'indicadorDom' },
  // Volantes
  { id: 'volante1Qui', nome: 'Volante 1', tipoReuniao: ['meioSemana'], tabela: 'Volantes', permissaoRequeridaBase: 'volanteQui' },
  { id: 'volante2Qui', nome: 'Volante 2', tipoReuniao: ['meioSemana'], tabela: 'Volantes', permissaoRequeridaBase: 'volanteQui' },
  { id: 'volante1Dom', nome: 'Volante 1', tipoReuniao: ['publica'], tabela: 'Volantes', permissaoRequeridaBase: 'volanteDom' },
  { id: 'volante2Dom', nome: 'Volante 2', tipoReuniao: ['publica'], tabela: 'Volantes', permissaoRequeridaBase: 'volanteDom' },
  // A função de presidente da reunião de meio de semana será tratada na aba NVMC.
  // { id: 'presidenteMeioSemana', nome: 'Presidente', tipoReuniao: ['meioSemana'], tabela: 'LeitorPresidente', permissaoRequeridaBase: 'presidente' },
];

export const LOCAL_STORAGE_KEY_MEMBROS = 'congregacao_membros';
export const LOCAL_STORAGE_KEY_SCHEDULE_CACHE = 'congregacao_schedule_cache';
export const LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS = 'congregacao_public_meeting_assignments';
export const LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS = 'congregacao_nvmc_assignments';


export const BADGE_COLORS: Record<string, string> = {
  Indicadores: "bg-blue-100 text-blue-700 border-blue-300",
  Volantes: "bg-green-100 text-green-700 border-green-300",
  "Leitura/Presidência": "bg-purple-100 text-purple-700 border-purple-300",
  "Partes Meio de Semana": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Demonstrações": "bg-indigo-100 text-indigo-700 border-indigo-300",
  "Outras Funções": "bg-pink-100 text-pink-700 border-pink-300",
  default: "bg-gray-100 text-gray-700 border-gray-300",
};

export const DIAS_SEMANA_REUNIAO_CORES = {
  meioSemana: "bg-accent text-accent-foreground", // Sienna
  publica: "bg-primary text-primary-foreground",    // Ochre
  outroDia: "bg-muted text-muted-foreground",
};

// Constantes para NVMC (podem ser expandidas)
export const NVMC_PART_SECTIONS = {
  GERAL: "Geral e Orações",
  TESOUROS: "Tesouros da Palavra de Deus",
  FMM: "Faça Seu Melhor no Ministério",
  VIDA_CRISTA: "Nossa Vida Cristã",
};

// Mapeamento de chaves de NVMCDailyAssignments para informações de UI e permissões
export const NVMC_ASSIGNABLE_PARTS_CONFIG: Record<keyof NVMCDailyAssignments | string, { label: string; section: string; requiredPermissionId?: string; isFmmPart?: boolean; needsAssistant?: boolean }> = {
  presidenteId: { label: "Presidente da Reunião", section: NVMC_PART_SECTIONS.GERAL, requiredPermissionId: 'presidente' },
  oracaoInicialId: { label: "Oração Inicial", section: NVMC_PART_SECTIONS.GERAL, requiredPermissionId: 'presidente' }, // Tipicamente ancião/SM qualificado
  tesourosDiscursoId: { label: "Discurso (Tesouros)", section: NVMC_PART_SECTIONS.TESOUROS, requiredPermissionId: 'presidente' }, // Instrutor qualificado
  joiasEspirituaisId: { label: "Encontre Joias Espirituais", section: NVMC_PART_SECTIONS.TESOUROS, requiredPermissionId: 'presidente' }, // Instrutor qualificado
  leituraBibliaId: { label: "Leitura da Bíblia", section: NVMC_PART_SECTIONS.TESOUROS, requiredPermissionId: 'leitorQui' }, // Irmão qualificado
  fmmParte1: { label: "Parte 1 (FMM)", section: NVMC_PART_SECTIONS.FMM, isFmmPart: true, needsAssistant: true },
  fmmParte2: { label: "Parte 2 (FMM)", section: NVMC_PART_SECTIONS.FMM, isFmmPart: true, needsAssistant: true },
  fmmParte3: { label: "Parte 3 (FMM)", section: NVMC_PART_SECTIONS.FMM, isFmmPart: true, needsAssistant: false }, // Ex: Discurso FMM
  vidaCristaParte1Id: { label: "Parte Vida Cristã", section: NVMC_PART_SECTIONS.VIDA_CRISTA, requiredPermissionId: 'presidente' }, // e.g. Necessidades Locais, ancião
  ebcDirigenteId: { label: "Dirigente do EBC", section: NVMC_PART_SECTIONS.VIDA_CRISTA, requiredPermissionId: 'presidente' }, // Instrutor qualificado
  ebcLeitorId: { label: "Leitor do EBC", section: NVMC_PART_SECTIONS.VIDA_CRISTA, requiredPermissionId: 'leitorQui' }, // Irmão qualificado
  oracaoFinalId: { label: "Oração Final", section: NVMC_PART_SECTIONS.GERAL, requiredPermissionId: 'presidente' }, // Tipicamente ancião/SM qualificado
};
