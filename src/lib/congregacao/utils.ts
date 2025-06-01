
import { type Membro, type PermissaoBase, type Impedimento, type ParsedNvmcProgram, type ParsedNvmcPart } from './types';
import { PERMISSOES_BASE, NOMES_MESES, NOMES_DIAS_SEMANA_ABREV, FUNCOES_DESIGNADAS, DIAS_REUNIAO } from './constants';

export function gerarIdMembro(): string {
  return `membro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatarDataParaChave(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${ano}-${mes}`; // YYYY-MM
}

export function formatarDataCompleta(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
  const dia = data.getUTCDate().toString().padStart(2, '0');
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
    const funcaoDef = FUNCOES_DESIGNADAS.find(f => f.id === funcaoId);
    if (funcaoDef && funcaoDef.permissaoRequeridaBase) {
        // Priorizar a permissão base definida diretamente na função
        return funcaoDef.permissaoRequeridaBase;
    }
    return undefined; // Retorna undefined se nenhuma permissão base específica for encontrada
}


export function getRealFunctionId(columnKey: string, dateStr: string, tipoTabela: string): string {
    const dataObj = new Date(dateStr + "T00:00:00Z"); // Use UTC for this date object to be consistent
    const diaSemanaIndex = dataObj.getUTCDay();
    const isMeioSemana = diaSemanaIndex === DIAS_REUNIAO.meioSemana;

    if (tipoTabela === 'Indicadores') {
        if (columnKey === 'indicadorExterno') return isMeioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom';
        if (columnKey === 'indicadorPalco') return isMeioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom';
    } else if (tipoTabela === 'Volantes') {
        if (columnKey === 'volante1') return isMeioSemana ? 'volante1Qui' : 'volante1Dom';
        if (columnKey === 'volante2') return isMeioSemana ? 'volante2Qui' : 'volante2Dom';
    } else if (tipoTabela === 'Áudio/Vídeo (AV)') { 
        if (columnKey === 'video') return isMeioSemana ? 'avVideoQui' : 'avVideoDom';
        if (columnKey === 'indicadorZoom') return isMeioSemana ? 'avIndicadorZoomQui' : 'avIndicadorZoomDom';
        if (columnKey === 'backupAV') return isMeioSemana ? 'avBackupQui' : 'avBackupDom';
    }
    // If columnKey is already specific (e.g., 'indicadorExternoDom' or 'leitorDom'), or not matched above, return it.
    return columnKey; 
}

export function parseNvmcProgramText(text: string): ParsedNvmcProgram {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.toLowerCase().startsWith('sua resposta') && !line.toLowerCase().startsWith('pergunto-se:'));
  const result: ParsedNvmcProgram = {
    canticoInicialNumero: undefined,
    comentariosIniciaisDetalhes: undefined,
    fmmParts: [],
    vidaCristaParts: [],
    vidaCristaCantico: undefined,
    leituraBibliaTema: undefined,
    ebcTema: undefined,
    tesourosDiscursoTema: undefined,
    joiasEspirituaisTema: undefined,
    comentariosFinaisDetalhes: undefined,
  };

  let currentSection: 'TESOUROS' | 'FMM' | 'VC' | null = null;
  let isInitialCommentLineProcessed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isInitialCommentLineProcessed && line.toUpperCase().includes('CÂNTICO') && line.toUpperCase().includes('ORAÇÃO') && (line.toUpperCase().includes('COMENTÁRIOS INICIAIS') || line.toUpperCase().includes('COMENTÁRIOS INTRODUTÓRIOS'))) {
      const canticoMatch = line.match(/Cântico\s+\d+/i);
      if (canticoMatch) {
        result.canticoInicialNumero = canticoMatch[0];
      }

      const parts = line.split('|');
      if (parts.length > 1) {
        const commentPart = parts.slice(1).join('|').trim();
         if (commentPart.toLowerCase().startsWith('comentários iniciais') || commentPart.toLowerCase().startsWith('comentários introdutórios')) {
             const introText = commentPart.toLowerCase().startsWith('comentários iniciais') ? 'comentários iniciais' : 'comentários introdutórios';
             result.comentariosIniciaisDetalhes = commentPart.substring(introText.length).trim();
         } else {
            result.comentariosIniciaisDetalhes = commentPart;
         }
      }
      isInitialCommentLineProcessed = true;
      continue; 
    }
    if (!isInitialCommentLineProcessed && (line.toLowerCase().startsWith('comentários iniciais') || line.toLowerCase().startsWith('comentários introdutórios'))) {
        const introText = line.toLowerCase().startsWith('comentários iniciais') ? 'comentários iniciais' : 'comentários introdutórios';
        result.comentariosIniciaisDetalhes = line.substring(introText.length).trim();
        isInitialCommentLineProcessed = true; 
        continue;
    }


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
    if (line.toUpperCase().startsWith('COMENTÁRIOS FINAIS')) {
      let details = line.substring('Comentários finais'.length).trim();
      if (details.startsWith('|')) {
        details = details.substring(1).trim();
      }
      result.comentariosFinaisDetalhes = details;
      currentSection = null; 
      continue;
    }
    
    if (line.toUpperCase().startsWith('CÂNTICO') && currentSection === 'VC' && !line.toUpperCase().includes('ORAÇÃO')) {
        result.vidaCristaCantico = line; 
        continue; 
    } else if (line.toUpperCase().startsWith('CÂNTICO') && (currentSection === null || line.toUpperCase().includes('ORAÇÃO'))) {
        // Cântico final com oração é parte dos comentários finais, já tratado ou será se estiver na linha de comentários finais.
        // Ou se for o cântico inicial já tratado
        continue;
    }
        
    if (line.match(/^\s*Quando nossos irmãos/i) ||
        line.match(/^\s*Seja hospitaleiro/i) ||
        line.match(/^\s*“Um olhar animado”/i) ||
        line.match(/^\s*Um jovem casal/i) ||
        line.match(/^\s*Mostre o VÍDEO/i) ||
        line.match(/^\s*O que você aprendeu/i) ||
        line.match(/ijwbq artigo/i) || 
        line.match(/Que joias espirituais você encontrou/i) ||
        line.toLowerCase().includes("depois, pergunte:")
       ) {
      continue;
    }

    const partRegex = /^\s*(\d+)\.\s*(.*)/;
    const partMatch = line.match(partRegex);

    if (partMatch) {
      const partNumber = parseInt(partMatch[1], 10);
      let fullTitleFromLine = partMatch[2].trim();
      
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
      partName = partName.replace(/:$/, '').trim(); 

      let nextLineIndex = i + 1;
      while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim();
          const isNewNumberedPart = nextLine.match(/^\s*(\d+)\.\s*/);
          const isSectionHeader = nextLine.toUpperCase().includes('TESOUROS DA PALAVRA DE DEUS') ||
                                  nextLine.toUpperCase().includes('FAÇA SEU MELHOR NO MINISTÉRIO') ||
                                  nextLine.toUpperCase().includes('NOSSA VIDA CRISTÃ');
          const isFinalCommentOrChant = nextLine.toUpperCase().startsWith('COMENTÁRIOS FINAIS') || 
                                        (nextLine.toUpperCase().startsWith('CÂNTICO') && (nextLine.toUpperCase().includes('ORAÇÃO') || currentSection !== 'VC'));
          const isInstruction = nextLine.toLowerCase().startsWith('sua resposta') || 
                                nextLine.toLowerCase().startsWith('pergunto-se:') ||
                                nextLine.match(/ijwbq artigo/i) ||
                                nextLine.match(/Que joias espirituais você encontrou/i) ||
                                nextLine.toLowerCase().includes("depois, pergunte:") ||
                                nextLine.match(/^\s*Quando nossos irmãos/i) || 
                                nextLine.match(/^\s*Seja hospitaleiro/i) || 
                                nextLine.match(/^\s*“Um olhar animado”/i) || 
                                nextLine.match(/^\s*Um jovem casal/i) || 
                                nextLine.match(/^\s*Mostre o VÍDEO/i) || 
                                nextLine.match(/^\s*O que você aprendeu/i);

          if (isNewNumberedPart || isSectionHeader || isFinalCommentOrChant || isInstruction) {
              break; 
          }
          
          if (partTheme === undefined) {
              partTheme = nextLine;
          } else { 
              partTheme += ` ${nextLine}`;
          }
          i = nextLineIndex; 
          nextLineIndex++;
      }
      partTheme = partTheme?.trim();
      
      const extractedPart: ParsedNvmcPart = { partName, partTheme };
      
      if (currentSection === 'TESOUROS') {
        if (extractedPart.partName.toLowerCase().includes('leitura da bíblia')) {
          result.leituraBibliaTema = (extractedPart.partTheme ? `${extractedPart.partTheme} ` : "") + extractedPart.partName.replace(/leitura da bíblia/i, '').trim();
        } else if (extractedPart.partName.toLowerCase().includes('joias espirituais')) {
           result.joiasEspirituaisTema = (extractedPart.partTheme ? `${extractedPart.partTheme} ` : "") + "Perguntas e respostas";
        } else if (partNumber === 1) { 
           result.tesourosDiscursoTema = (extractedPart.partTheme ? `${extractedPart.partTheme} ` : "") + extractedPart.partName;
        }
      } else if (currentSection === 'FMM') {
        if(extractedPart.partName) result.fmmParts.push(extractedPart);
      } else if (currentSection === 'VC') {
        if (extractedPart.partName.toLowerCase().includes('estudo bíblico de congregação')) {
          result.ebcTema = (extractedPart.partTheme ? `${extractedPart.partTheme} ` : "") + extractedPart.partName.replace(/estudo bíblico de congregação/i, '').trim();
        } else {
          if(extractedPart.partName) result.vidaCristaParts.push(extractedPart);
        }
      }
    } else if (currentSection === 'VC' && (line.toLowerCase().startsWith('bt cap') || line.toLowerCase().startsWith('lff lição'))) { 
        result.ebcTema = line;
    }
  }
  return result;
}

