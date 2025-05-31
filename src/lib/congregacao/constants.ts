
import type { PermissaoBase, FuncaoDesignada, DiasReuniao, NVMCDailyAssignments, NVCVidaCristaDynamicPart } from './types';

export const APP_NAME = "Congregação Online";

export const NOMES_MESES: string[] = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const NOMES_DIAS_SEMANA_ABREV: string[] = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const NOMES_DIAS_SEMANA_COMPLETOS: string[] = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
];


export const DIAS_REUNIAO: DiasReuniao = {
  meioSemana: 4, // Quinta-feira
  publica: 0     // Domingo
};

export const PERMISSOES_BASE: PermissaoBase[] = [
  { id: 'indicadorQui', nome: 'Indicador Quinta', grupo: 'Indicadores' },
  { id: 'indicadorDom', nome: 'Indicador Domingo', grupo: 'Indicadores' },
  { id: 'volanteQui', nome: 'Volante Quinta', grupo: 'Volantes' },
  { id: 'volanteDom', nome: 'Volante Domingo', grupo: 'Volantes' },
  { id: 'leitorQui', nome: 'Leitor (Meio Semana)', grupo: 'Leitura/Presidência' },
  { id: 'leitorDom', nome: 'Leitor (Fim Semana)', grupo: 'Leitura/Presidência' },
  { id: 'presidente', nome: 'Presidente/Instrutor', grupo: 'Leitura/Presidência' },  { id: 'av', nome: 'Áudio/Vídeo', grupo: 'Áudio/Vídeo' },
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
  // Leitura/Presidência
  { id: 'leitorDom', nome: 'Leitor A Sentinela (Dom)', tipoReuniao: ['publica'], tabela: 'LeitorPresidente', permissaoRequeridaBase: 'leitorDom' },
  // Áudio/Vídeo
  { id: 'avVideoQui', nome: 'Vídeo (Qui)', tipoReuniao: ['meioSemana'], tabela: 'AV', permissaoRequeridaBase: 'av' },
  { id: 'avIndicadorZoomQui', nome: 'Indicador Zoom (Qui)', tipoReuniao: ['meioSemana'], tabela: 'AV', permissaoRequeridaBase: 'av' },
  { id: 'avBackupQui', nome: 'Backup (Qui)', tipoReuniao: ['meioSemana'], tabela: 'AV', permissaoRequeridaBase: 'av' },
  { id: 'avVideoDom', nome: 'Vídeo (Dom)', tipoReuniao: ['publica'], tabela: 'AV', permissaoRequeridaBase: 'av' },
  { id: 'avIndicadorZoomDom', nome: 'Indicador Zoom (Dom)', tipoReuniao: ['publica'], tabela: 'AV', permissaoRequeridaBase: 'av' },
  { id: 'avBackupDom', nome: 'Backup (Dom)', tipoReuniao: ['publica'], tabela: 'AV', permissaoRequeridaBase: 'av' },
];

export const LOCAL_STORAGE_KEY_MEMBROS = 'congregacao_membros';
export const LOCAL_STORAGE_KEY_SCHEDULE_CACHE = 'congregacao_schedule_cache';
export const LOCAL_STORAGE_KEY_PUBLIC_MEETING_ASSIGNMENTS = 'congregacao_public_meeting_assignments';
export const LOCAL_STORAGE_KEY_NVMC_ASSIGNMENTS = 'congregacao_nvmc_assignments';
export const LOCAL_STORAGE_KEY_FIELD_SERVICE_ASSIGNMENTS = 'congregacao_field_service_assignments';
export const LOCAL_STORAGE_KEY_FIELD_SERVICE_MODALITIES = 'congregacao_field_service_modalities';
export const LOCAL_STORAGE_KEY_FIELD_SERVICE_LOCATIONS = 'congregacao_field_service_locations';
export const LOCAL_STORAGE_KEY_USER_SCHEDULE = 'congregacao_user_schedule';


export const BADGE_COLORS: Record<string, string> = {
  Indicadores: "bg-blue-100 text-blue-700 border-blue-300",
  Volantes: "bg-green-100 text-green-700 border-green-300",
  "Leitura/Presidência": "bg-purple-100 text-purple-700 border-purple-300",
  "Áudio/Vídeo": "bg-teal-100 text-teal-700 border-teal-300",
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

export const NVMC_PART_SECTIONS = {
  CANTICO_E_ORACAO_INICIAL: "CÂNTICO E ORAÇÃO INICIAL",
  TESOUROS_DA_PALAVRA_DE_DEUS: "TESOUROS DA PALAVRA DE DEUS",
  FACA_SEU_MELHOR_NO_MINISTERIO: "FAÇA SEU MELHOR NO MINISTÉRIO",
  NOSSA_VIDA_CRISTA: "NOSSA VIDA CRISTÃ",
  COMENTARIOS_FINAIS: "COMENTÁRIOS FINAIS"
};

// Configuration for fixed NVMC parts
type FixedPartKeys = Exclude<keyof NVMCDailyAssignments,
  'fmmParts' |
  'vidaCristaParts' |
  'comentariosIniciaisDetalhes' |
  'tesourosDiscursoCustomTitle' |
  'joiasEspirituaisCustomTitle' |
  'leituraBibliaCustomTitle' |
  'ebcCustomTitle' |
  'canticoInicialNumero' |
  'vidaCristaCantico' |
  'comentariosFinaisDetalhes'
>;


export const NVMC_FIXED_PARTS_CONFIG: Record<FixedPartKeys | string, { label: string; section: string; requiredPermissionId?: string; }> = {
  presidenteId: { label: "Presidente da Reunião", section: NVMC_PART_SECTIONS.CANTICO_E_ORACAO_INICIAL, requiredPermissionId: 'presidente' },
  oracaoInicialId: { label: "Oração Inicial", section: NVMC_PART_SECTIONS.CANTICO_E_ORACAO_INICIAL, requiredPermissionId: 'presidente' },
  tesourosDiscursoId: { label: "Discurso (Tesouros)", section: NVMC_PART_SECTIONS.TESOUROS_DA_PALAVRA_DE_DEUS, requiredPermissionId: 'presidente' },
  joiasEspirituaisId: { label: "Encontre Joias Espirituais", section: NVMC_PART_SECTIONS.TESOUROS_DA_PALAVRA_DE_DEUS, requiredPermissionId: 'presidente' },
  leituraBibliaSalaAId: { label: "Leitura da Bíblia (Salão Principal)", section: NVMC_PART_SECTIONS.TESOUROS_DA_PALAVRA_DE_DEUS, requiredPermissionId: 'leitorQui' },
  leituraBibliaSalaBId: { label: "Leitura da Bíblia (Sala B)", section: NVMC_PART_SECTIONS.TESOUROS_DA_PALAVRA_DE_DEUS, requiredPermissionId: 'leitorQui' },
  ebcDirigenteId: { label: "Dirigente do EBC", section: NVMC_PART_SECTIONS.NOSSA_VIDA_CRISTA, requiredPermissionId: 'presidente' },
  ebcLeitorId: { label: "Leitor do EBC", section: NVMC_PART_SECTIONS.NOSSA_VIDA_CRISTA, requiredPermissionId: 'leitorQui' },
  oracaoFinalId: { label: "Oração Final", section: NVMC_PART_SECTIONS.COMENTARIOS_FINAIS, requiredPermissionId: 'presidente' },
};

export const NONE_GROUP_ID = "__NONE_CLEANING_GROUP__";

export const GRUPOS_LIMPEZA_APOS_REUNIAO = [
  { id: NONE_GROUP_ID, nome: 'Nenhum' },
  { id: 'grupo1', nome: 'Grupo 1 - Luiz Aguinaldo' },
  { id: 'grupo2', nome: 'Grupo 2 - Marcos Camillo' },
  { id: 'grupo3', nome: 'Grupo 3 - Ângelo Berben' },
  { id: 'grupo4', nome: 'Grupo 4 - Marcelo Teixeira' },
  { id: 'grupo5', nome: 'Grupo 5 - Tai Lee' },
  { id: 'grupo6', nome: 'Grupo 6 - Marco Saudo' },
];

// Field Service Time Options (5 min intervals for 24 hours)
export const FIELD_SERVICE_TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 24 * (60 / 5) }, (_, i) => {
  const totalMinutes = i * 5;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { value: formattedTime, label: formattedTime };
});

