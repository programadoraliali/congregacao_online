
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
  { id: 'leitorQui', nome: 'Leitor Quinta', grupo: 'Leitura/Presidência' },
  { id: 'leitorDom', nome: 'Leitor Domingo', grupo: 'Leitura/Presidência' },
  { id: 'presidente', nome: 'Presidente', grupo: 'Leitura/Presidência' },
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
  // Leitor/Presidente (Domingo)
  { id: 'leitorASentinelaDom', nome: 'Leitor (A Sentinela)', tipoReuniao: ['publica'], tabela: 'LeitorPresidente', permissaoRequeridaBase: 'leitorDom' },
  { id: 'presidenteReuniaoPublicaDom', nome: 'Presidente (Reunião Pública)', tipoReuniao: ['publica'], tabela: 'LeitorPresidente', permissaoRequeridaBase: 'presidente' },
  // Outras funções para Reunião de Meio de Semana
  { id: 'presidenteMeioSemana', nome: 'Presidente', tipoReuniao: ['meioSemana'], tabela: 'LeitorPresidente', permissaoRequeridaBase: 'presidente' },
];

export const LOCAL_STORAGE_KEY_MEMBROS = 'congregacao_membros';
export const LOCAL_STORAGE_KEY_SCHEDULE_CACHE = 'congregacao_schedule_cache';

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

