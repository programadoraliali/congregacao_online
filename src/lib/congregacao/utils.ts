
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
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.toLowerCase().startsWith('sua resposta') && !line.toLowerCase().startsWith('pergunto-se:'));
  const result: ParsedNvmcProgram = {
    fmmParts: [],
    vidaCristaParts: [],
    leituraBibliaTema: undefined,
    ebcTema: undefined,
    tesourosDiscursoTema: undefined,
    joiasEspirituaisTema: undefined,
  };

  let currentSection: 'TESOUROS' | 'FMM' | 'VC' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.toUpperCase().includes('TESOUROS DA PALAVRA DE DEUS')) {
      currentSection = 'TESOUROS';
      continue;
    }
    if (line.toUpperCase().includes('FAÇA SEU MELHOR NO MINISTÉRIO')) {
      currentSection = 'FMM';
      continue;
    }
    if (line.toUpperCase().includes('NOSSA VIDA CRISTÃ')) {
      currentSection = 'VC';
      continue;
    }
    if (line.toUpperCase().startsWith('CÂNTICO') && line.includes('ORAÇÃO')) continue;
    if (line.toUpperCase().startsWith('CÂNTICO')) continue;
    if (line.toUpperCase().startsWith('COMENTÁRIOS INICIAIS')) continue;
    if (line.toUpperCase().startsWith('COMENTÁRIOS FINAIS')) continue;
    
    // Ignorar linhas de instrução/vídeo específicas que não são títulos de partes
    if (line.match(/^\s*Quando nossos irmãos/i) ||
        line.match(/^\s*Seja hospitaleiro/i) ||
        line.match(/^\s*“Um olhar animado”/i) ||
        line.match(/^\s*Um jovem casal/i) ||
        line.match(/^\s*Mostre o VÍDEO/i) ||
        line.match(/^\s*O que você aprendeu/i) ||
        line.match(/ijwbq artigo/i) || // Linha de referência para Joias Espirituais
        line.match(/Que joias espirituais você encontrou/i) // Pergunta de Joias Espirituais
       ) {
      continue;
    }
    
    const partRegex = /^\s*(\d+)\.\s*(.*)/;
    const partMatch = line.match(partRegex);

    if (partMatch) {
        const fullTitleFromLine = partMatch[2].trim();
        const partNumber = parseInt(partMatch[1], 10);

        let partName = "";
        let partTheme: string | undefined = undefined;

        const timeMatchRegex = /\s*\(\s*\d+(?:-\d+)?\s*min\s*\)/i;
        const timeMatchResult = fullTitleFromLine.match(timeMatchRegex);

        if (timeMatchResult && timeMatchResult.index !== undefined) {
            partName = fullTitleFromLine.substring(0, timeMatchResult.index).trim();
            partTheme = fullTitleFromLine.substring(timeMatchResult.index).trim();
        } else {
            partName = fullTitleFromLine;
        }
        
        // Consumir linhas subsequentes que fazem parte do tema/descrição
        let nextLineIndex = i + 1;
        while (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            const isNewPart = nextLine.match(/^\s*(\d+)\.\s*/);
            const isSectionHeader = nextLine.toUpperCase().includes('TESOUROS DA PALAVRA DE DEUS') ||
                                    nextLine.toUpperCase().includes('FAÇA SEU MELHOR NO MINISTÉRIO') ||
                                    nextLine.toUpperCase().includes('NOSSA VIDA CRISTÃ');
            const isChantOrPrayer = nextLine.toUpperCase().startsWith('CÂNTICO') || nextLine.toUpperCase().startsWith('ORAÇÃO');
            const isCommentOrQuestion = nextLine.toLowerCase().startsWith('sua resposta') || 
                                        nextLine.toLowerCase().startsWith('pergunto-se:') ||
                                        nextLine.match(/ijwbq artigo/i) ||
                                        nextLine.match(/Que joias espirituais você encontrou/i);
            const isInstructionalForNextLine = nextLine.match(/^\s*Quando nossos irmãos/i) || 
                                               nextLine.match(/^\s*Seja hospitaleiro/i) || 
                                               nextLine.match(/^\s*“Um olhar animado”/i) || 
                                               nextLine.match(/^\s*Um jovem casal/i) || 
                                               nextLine.match(/^\s*Mostre o VÍDEO/i) || 
                                               nextLine.match(/^\s*O que você aprendeu/i);

            if (isNewPart || isSectionHeader || isChantOrPrayer || isCommentOrQuestion || isInstructionalForNextLine) {
                break; 
            }
            
            // Se partTheme ainda não foi definido (ou seja, o tempo não estava na primeira linha da parte)
            // e partName já tem algo, então esta linha é o início do partTheme
            if (partName && partTheme === undefined) {
                partTheme = nextLine;
            } else if (partTheme !== undefined) { // Se partTheme já existe, anexe
                partTheme += ` ${nextLine}`;
            } else if (!partName && nextLine) { // Se partName está vazio, esta linha pode ser o partName
                 const potentialTimeMatch = nextLine.match(timeMatchRegex);
                 if(potentialTimeMatch && potentialTimeMatch.index !== undefined) {
                    partName = nextLine.substring(0, potentialTimeMatch.index).trim();
                    partTheme = nextLine.substring(potentialTimeMatch.index).trim();
                 } else {
                    partName = nextLine;
                 }
            }
            i = nextLineIndex; 
            nextLineIndex++;
        }
        partTheme = partTheme?.trim();

        // Se partName ainda estiver vazio, mas partTheme tem texto que não é só tempo/ref,
        // tente extrair partName de partTheme.
        if (!partName && partTheme && !partTheme.match(/^\s*\(\s*\d+(?:-\d+)?\s*min\s*\)\s*([\w\s.:§]+)?$/i)) {
          const themeTimeMatch = partTheme.match(timeMatchRegex);
          if (themeTimeMatch && themeTimeMatch.index !== undefined && themeTimeMatch.index > 0) { // Garante que há texto antes do tempo
              partName = partTheme.substring(0, themeTimeMatch.index).trim();
              partTheme = partTheme.substring(themeTimeMatch.index).trim();
          } else if (!themeTimeMatch) { // Se não há tempo, partTheme é o nome
              partName = partTheme;
              partTheme = undefined;
          }
        }

      const extractedPart: ParsedNvmcPart = { partName: partName.replace(/:$/, '').trim(), partTheme: partTheme || undefined };

      if (currentSection === 'TESOUROS') {
        if (extractedPart.partName.toLowerCase().includes('leitura da bíblia')) {
          result.leituraBibliaTema = extractedPart.partTheme || extractedPart.partName.replace(/leitura da bíblia/i, '').trim();
        } else if (extractedPart.partName.toLowerCase().includes('joias espirituais')) {
           // Não preenchemos um "tema" para joias, pois é uma seção de perguntas e respostas
           result.joiasEspirituaisTema = "Perguntas e respostas"; // Placeholder ou deixar undefined
        } else if (partNumber === 1) { 
            result.tesourosDiscursoTema = (extractedPart.partTheme ? `${extractedPart.partTheme} ` : "") + extractedPart.partName;
        }
      } else if (currentSection === 'FMM') {
        if(extractedPart.partName) result.fmmParts.push(extractedPart);
      } else if (currentSection === 'VC') {
        if (extractedPart.partName.toLowerCase().includes('estudo bíblico de congregação')) {
          result.ebcTema = extractedPart.partTheme || extractedPart.partName.replace(/estudo bíblico de congregação/i, '').trim();
        } else {
          if(extractedPart.partName) result.vidaCristaParts.push(extractedPart);
        }
      }
    }
  }
  return result;
}

