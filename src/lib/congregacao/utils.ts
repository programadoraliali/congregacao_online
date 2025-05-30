

import { type Membro, type PermissaoBase, type Impedimento, type ParsedNvmcProgram, type ParsedNvmcPart } from './types';
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
  for (const p of PERMISSOES_BASE) {
    permissoesBase[p.id] = (membro.permissoesBase && typeof membro.permissoesBase === 'object') ? !!membro.permissoesBase[p.id] : false;
  }
  
  const historicoDesignacoes: Record<string, string> = {};
  if (membro.historicoDesignacoes && typeof membro.historicoDesignacoes === 'object') {
    for (const dataKey in membro.historicoDesignacoes) {
      if (typeof dataKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataKey) && typeof membro.historicoDesignacoes[dataKey] === 'string') {
        historicoDesignacoes[dataKey] = membro.historicoDesignacoes[dataKey];
      }
    }
  }

  const impedimentos: Impedimento[] = [];
  if (Array.isArray(membro.impedimentos)) {
    membro.impedimentos.forEach(imp => {
      if (typeof imp === 'object' && imp !== null &&
          typeof imp.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(imp.from) &&
          typeof imp.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(imp.to) &&
          imp.from <= imp.to) { // Garante que 'from' não seja posterior a 'to'
        impedimentos.push({ from: imp.from, to: imp.to });
      } else {
        // console.warn(`Impedimento inválido ${JSON.stringify(imp)}, pulando.`);
      }
    });
  }
  // Ordenar impedimentos por data de início
  impedimentos.sort((a, b) => a.from.localeCompare(b.from));

  return {
    id: id,
    nome: membro.nome.trim(),
    permissoesBase: permissoesBase,
    historicoDesignacoes: historicoDesignacoes,
    impedimentos: impedimentos,
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
        // Adicionar case para leitorQui se existir função correspondente
        // case 'leitorBibliaQui': // Exemplo, supondo uma função que use 'leitorQui'
        //     return 'leitorQui';
        case 'presidenteReuniaoPublicaDom':
        case 'presidenteMeioSemana':
            return 'presidente';
        default:
            // Tentativa de mapeamento genérico para funções não listadas explicitamente
            if (funcaoId.toLowerCase().includes('leitor') && tipoReuniao === 'meioSemana') return 'leitorQui';
            if (funcaoId.toLowerCase().includes('leitor') && tipoReuniao === 'publica') return 'leitorDom';
            return undefined;
    }
}

export function parseNvmcProgramText(text: string): ParsedNvmcProgram {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('Sua resposta') && !line.startsWith('PERGUNTE-SE:'));
  const result: ParsedNvmcProgram = {
    fmmParts: [],
    vidaCristaParts: [],
  };

  let currentSection: 'TESOUROS' | 'FMM' | 'VC' | null = null;
  let expectingTitleFor: 'LEITURA' | 'EBC' | 'DISCURSO_TESOUROS' | 'JOIAS' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('TESOUROS DA PALAVRA DE DEUS')) {
      currentSection = 'TESOUROS';
      expectingTitleFor = null;
      continue;
    }
    if (line.includes('FAÇA SEU MELHOR NO MINISTÉRIO')) {
      currentSection = 'FMM';
      expectingTitleFor = null;
      continue;
    }
    if (line.includes('NOSSA VIDA CRISTÃ')) {
      currentSection = 'VC';
      expectingTitleFor = null;
      continue;
    }
    
    if (line.match(/^\s*\(\d+\s*min\)\s*$/) || line.match(/^\s*\(\d+\s*min\)\s*Consideração\s*\.?\s*$/i)) {
        if (expectingTitleFor) expectingTitleFor = null;
        continue;
    }


    const partMatch = line.match(/^(\d+)\.\s*(.*)/);
    if (partMatch) {
      const partTitleSegment = partMatch[2].trim();
      let fullTitle = partTitleSegment;
      const partNumber = parseInt(partMatch[1], 10); // Moved partNumber declaration up

      if (i + 1 < lines.length && lines[i + 1].match(/^\s*\(\d+\s*min\)/)) {
        const nextLineContent = lines[i + 1].replace(/^\s*\(\d+\s*min\)\s*/, '').trim();
        if (nextLineContent && !nextLineContent.match(/^(\d+)\.\s/) && !lines[i+1].includes('Cântico')) { 
          fullTitle += ` ${nextLineContent}`;
        }
        
        if (!partTitleSegment.toLowerCase().includes('leitura da bíblia') && 
            !partTitleSegment.toLowerCase().includes('estudo bíblico de congregação') &&
            !partTitleSegment.toLowerCase().includes('joias espirituais') &&
            !(currentSection === 'TESOUROS' && partNumber === 1) 
           ) {
        }
      }
      

      if (currentSection === 'TESOUROS') {
        if (partTitleSegment.toLowerCase().includes('leitura da bíblia')) {
          result.leituraBibliaTema = fullTitle.replace(/leitura da bíblia/i, '').trim();
          expectingTitleFor = null;
        } else if (partTitleSegment.toLowerCase().includes('joias espirituais')) {
           result.joiasEspirituaisTema = "Perguntas e respostas sobre a leitura da Bíblia."; 
           expectingTitleFor = null;
        } else if (partNumber === 1 && !partTitleSegment.toLowerCase().includes('leitura da bíblia') && !partTitleSegment.toLowerCase().includes('joias espirituais')) {
            result.tesourosDiscursoTema = fullTitle;
            expectingTitleFor = null;
        }
      } else if (currentSection === 'FMM') {
        result.fmmParts.push({ customTitle: fullTitle });
        expectingTitleFor = null;
      } else if (currentSection === 'VC') {
        if (partTitleSegment.toLowerCase().includes('estudo bíblico de congregação')) {
          result.ebcTema = fullTitle.replace(/estudo bíblico de congregação/i, '').trim();
          expectingTitleFor = null;
        } else if (!partTitleSegment.toLowerCase().startsWith('Cântico')) {
          result.vidaCristaParts.push({ customTitle: fullTitle });
          expectingTitleFor = null;
        }
      }
      if (i + 1 < lines.length && lines[i + 1].match(/^\s*\(\d+\s*min\)/) && 
          (partTitleSegment.toLowerCase().includes('leitura da bíblia') ||
           partTitleSegment.toLowerCase().includes('estudo bíblico de congregação') ||
           (currentSection === 'TESOUROS' && partNumber === 1 && !partTitleSegment.toLowerCase().includes('joias espirituais')) ||
           currentSection === 'FMM' ||
           (currentSection === 'VC' && !partTitleSegment.toLowerCase().includes('estudo bíblico de congregação') && !partTitleSegment.toLowerCase().startsWith('Cântico')) 
          )
         ) {
           i++;
      }
    }
  }
  return result;
}

