
import { type Membro, type PermissaoBase } from './types';
import { PERMISSOES_BASE, NOMES_MESES, NOMES_DIAS_SEMANA_ABREV } from './constants';

export function gerarIdMembro(): string {
  return `membro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatarDataParaChave(data: Date): string {
  const ano = data.getFullYear();
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  return `${ano}-${mes}`; // YYYY-MM
}

export function formatarDataCompleta(data: Date): string {
  const ano = data.getFullYear();
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  const dia = data.getDate().toString().padStart(2, '0');
  return `${ano}-${mes}-${dia}`; // YYYY-MM-DD
}

export function obterNomeMes(mesIndex: number): string {
  return NOMES_MESES[mesIndex] || '';
}

export function obterAbrevDiaSemana(diaIndex: number): string {
  return NOMES_DIAS_SEMANA_ABREV[diaIndex] || '';
}


export function validarEstruturaMembro(membro: Partial<Membro>, gerarIdSeAusente: boolean): Membro | null {
  if (!membro || typeof membro.nome !== 'string' || membro.nome.trim() === '') {
    console.error("Validação falhou: Nome do membro é inválido.", membro);
    return null;
  }

  const id = (gerarIdSeAusente && !membro.id) ? gerarIdMembro() : membro.id;
  if (typeof id !== 'string' || id.trim() === '') {
    console.error("Validação falhou: ID do membro é inválido.", membro);
    return null;
  }

  const permissoesBase: Record<string, boolean> = {};
  // Initialize with all new PERMISSOES_BASE, defaulting to false
  for (const p of PERMISSOES_BASE) {
    permissoesBase[p.id] = (membro.permissoesBase && typeof membro.permissoesBase === 'object') ? !!membro.permissoesBase[p.id] : false;
  }
  
  const historicoDesignacoes: Record<string, string> = {};
  if (membro.historicoDesignacoes && typeof membro.historicoDesignacoes === 'object') {
    for (const dataKey in membro.historicoDesignacoes) {
      if (typeof dataKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataKey) && typeof membro.historicoDesignacoes[dataKey] === 'string') {
        historicoDesignacoes[dataKey] = membro.historicoDesignacoes[dataKey];
      } else {
        // console.warn(`Chave ou valor de histórico inválido para ${dataKey}, pulando.`);
      }
    }
  }

  const impedimentos: string[] = [];
  if (Array.isArray(membro.impedimentos)) {
    membro.impedimentos.forEach(imp => {
      if (typeof imp === 'string' && /^\d{4}-\d{2}$/.test(imp)) {
        impedimentos.push(imp);
      } else {
        // console.warn(`Impedimento inválido ${imp}, pulando.`);
      }
    });
  }

  return {
    id: id,
    nome: membro.nome.trim(),
    permissoesBase: permissoesBase,
    historicoDesignacoes: historicoDesignacoes,
    impedimentos: impedimentos.sort(),
  };
}

export function agruparPermissoes(permissoes: PermissaoBase[]): Record<string, PermissaoBase[]> {
  return permissoes.reduce((acc, permissao) => {
    const grupo = permissao.grupo || 'Outras';
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    acc[grupo].push(permissao);
    return acc;
  }, {} as Record<string, PermissaoBase[]>);
}

export function getPermissaoRequerida(funcaoId: string, tipoReuniao: 'meioSemana' | 'publica'): string | undefined {
    switch (funcaoId) {
        case 'indicadorExternoQui':
        case 'indicadorPalcoQui':
            return 'indicadorQui';
        case 'indicadorExternoDom':
        case 'indicadorPalcoDom':
            return 'indicadorDom';
        case 'volante1Qui':
        case 'volante2Qui':
            return 'volanteQui';
        case 'volante1Dom':
        case 'volante2Dom':
            return 'volanteDom';
        case 'leitorASentinelaDom':
            return 'leitorDom';
        // Se uma função para 'Leitor (Qui)' for adicionada em FUNCOES_DESIGNADAS,
        // por exemplo com id 'leitorBibliaQui', um case seria:
        // case 'leitorBibliaQui':
        //     return 'leitorQui';
        case 'presidenteReuniaoPublicaDom':
        case 'presidenteMeioSemana':
            return 'presidente';
        default:
            // Se a função não mapear para uma permissão específica das novas,
            // pode ser que não precise de permissão ou a lógica precise ser revisada.
            return undefined;
    }
}
