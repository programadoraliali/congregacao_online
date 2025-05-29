
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
