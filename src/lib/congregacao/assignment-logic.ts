
'use server'; 

import type { Membro, FuncaoDesignada, DesignacoesFeitas, DiasReuniao } from './types';
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG, NOMES_DIAS_SEMANA_ABREV } from './constants';
import { formatarDataCompleta, getPermissaoRequerida } from './utils';
// AI import removido pois a lógica de sugestão será determinística
// import { suggestBestAssignment, type SuggestBestAssignmentInput } from '@/ai/flows/suggest-best-assignment';

// --- Funções Auxiliares para Priorização ---

function encontrarDataReuniaoAnterior(
  dataAtual: Date,
  tipoReuniaoAtual: 'meioSemana' | 'publica',
  datasDeReuniaoNoMes: Date[],
  DIAS_REUNIAO: DiasReuniao
): Date | null {
  const diaSemanaAlvo = tipoReuniaoAtual === 'meioSemana' ? DIAS_REUNIAO.meioSemana : DIAS_REUNIAO.publica;
  let dataAnterior: Date | null = null;
  for (const dataCand of datasDeReuniaoNoMes) {
    if (dataCand < dataAtual && dataCand.getDay() === diaSemanaAlvo) {
      if (dataAnterior === null || dataCand > dataAnterior) {
        dataAnterior = new Date(dataCand); // Garante nova instância
      }
    }
  }
  return dataAnterior;
}

function fezFuncaoNaReuniaoAnterior(
  membroId: string,
  funcaoId: string,
  dataReuniaoAnteriorStr: string | null,
  designacoesFeitasNoMesAtual: DesignacoesFeitas
): boolean {
  if (!dataReuniaoAnteriorStr) return false;
  const designacoesDoDiaAnterior = designacoesFeitasNoMesAtual[dataReuniaoAnteriorStr];
  if (!designacoesDoDiaAnterior) return false;
  // Verifica se o membro fez especificamente esta função (ou uma equivalente com o mesmo base ID, ex: indicadorExternoQui vs indicadorPalcoQui)
  // Para simplificar, vamos considerar a funcaoId exata.
  // Se a regra fosse "qualquer função de indicador", a lógica seria mais complexa aqui.
  return designacoesDoDiaAnterior[funcaoId] === membroId;
}

function contarUsoFuncaoNoMes(
  membroId: string,
  funcaoId: string,
  designacoesFeitasNoMesAtual: DesignacoesFeitas,
  dataAtualStr: string // Para não contar a designação que estamos prestes a fazer
): number {
  let count = 0;
  for (const dataStr in designacoesFeitasNoMesAtual) {
    if (dataStr >= dataAtualStr) continue; // Considera apenas designações já feitas
    const funcoesDoDia = designacoesFeitasNoMesAtual[dataStr];
    if (funcoesDoDia && funcoesDoDia[funcaoId] === membroId) {
      count++;
    }
  }
  return count;
}

function contarUsoGeralNoMes(
  membroId: string,
  designacoesFeitasNoMesAtual: DesignacoesFeitas,
  dataAtualStr: string // Para não contar a designação que estamos prestes a fazer
): number {
  let count = 0;
  for (const dataStr in designacoesFeitasNoMesAtual) {
    if (dataStr >= dataAtualStr) continue; // Considera apenas designações já feitas
    const funcoesDoDia = designacoesFeitasNoMesAtual[dataStr];
    if (funcoesDoDia) {
      for (const funcId in funcoesDoDia) {
        if (funcoesDoDia[funcId] === membroId) {
          count++;
        }
      }
    }
  }
  return count;
}

function contarUsoFuncaoNoHistorico(
  membroId: string,
  funcaoId: string,
  membro: Membro
): number {
  let count = 0;
  for (const dataStr in membro.historicoDesignacoes) {
    if (membro.historicoDesignacoes[dataStr] === funcaoId) {
      count++;
    }
  }
  return count;
}

function getDataUltimaVezFuncao(
  membroId: string,
  funcaoId: string,
  membro: Membro
): string | null {
  let ultimaData: string | null = null;
  for (const dataStr in membro.historicoDesignacoes) {
    if (membro.historicoDesignacoes[dataStr] === funcaoId) {
      if (ultimaData === null || dataStr > ultimaData) {
        ultimaData = dataStr;
      }
    }
  }
  return ultimaData;
}

// --- Lógica Principal de Geração ---

export async function calcularDesignacoesAction(
  mes: number, // 0-11
  ano: number,
  membros: Membro[] 
): Promise<{ designacoesFeitas: DesignacoesFeitas } | { error: string }> {
  
  const DIAS_REUNIAO: DiasReuniao = DIAS_REUNIAO_CONFIG;
  const designacoesFeitasNoMesAtual: DesignacoesFeitas = {};
  
  // Usar uma cópia para não modificar os objetos originais, especialmente o histórico
  // que será usado para consulta do "passado" antes deste mês.
  const membrosDisponiveis = JSON.parse(JSON.stringify(membros)) as Membro[];

  const datasDeReuniaoNoMes: Date[] = [];
  const primeiroDiaDoMes = new Date(Date.UTC(ano, mes, 1));
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0));

  for (let dia = new Date(primeiroDiaDoMes); dia <= ultimoDiaDoMes; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const diaDaSemana = dia.getUTCDay(); // Use UTC days
    if (diaDaSemana === DIAS_REUNIAO.meioSemana || diaDaSemana === DIAS_REUNIAO.publica) {
      datasDeReuniaoNoMes.push(new Date(dia)); // Salva uma cópia da data
    }
  }

  if (datasDeReuniaoNoMes.length === 0) {
    return { error: "Nenhuma data de reunião encontrada para este mês." };
  }
  // Ordenar as datas de reunião cronologicamente (já deve estar, mas para garantir)
  datasDeReuniaoNoMes.sort((a, b) => a.getTime() - b.getTime());

  for (const dataReuniao of datasDeReuniaoNoMes) {
    const dataReuniaoStr = formatarDataCompleta(dataReuniao); // "YYYY-MM-DD"
    designacoesFeitasNoMesAtual[dataReuniaoStr] = {};
    
    const tipoReuniaoAtual = dataReuniao.getUTCDay() === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
    const funcoesParaEsteTipoReuniao = FUNCOES_DESIGNADAS.filter(f => f.tipoReuniao.includes(tipoReuniaoAtual));

    const membrosDesignadosNesteDia: Set<string> = new Set();

    const dataReuniaoAnteriorObj = encontrarDataReuniaoAnterior(dataReuniao, tipoReuniaoAtual, datasDeReuniaoNoMes, DIAS_REUNIAO);
    const dataReuniaoAnteriorStr = dataReuniaoAnteriorObj ? formatarDataCompleta(dataReuniaoAnteriorObj) : null;


    for (const funcao of funcoesParaEsteTipoReuniao) {
      // 4.2. Regras de Elegibilidade
      let membrosElegiveis = membrosDisponiveis.filter(membro => {
        // Condição de Permissão
        const permissaoNecessariaId = getPermissaoRequerida(funcao.id, tipoReuniaoAtual);
        if (!permissaoNecessariaId || !membro.permissoesBase[permissaoNecessariaId]) {
          return false;
        }

        // Condição de Impedimento
        if (membro.impedimentos.some(imp => dataReuniaoStr >= imp.from && dataReuniaoStr <= imp.to)) {
          return false;
        }

        // Condição de Designação Única por Dia
        if (membrosDesignadosNesteDia.has(membro.id)) {
          return false;
        }
        return true;
      });

      if (membrosElegiveis.length === 0) {
        designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = null;
        continue;
      }

      // 4.3. Sistema de Priorização
      membrosElegiveis.sort((membroA, membroB) => {
        // Prioridade 1: Anti-Repetição Imediata
        const fezAFuncaoAnterior = fezFuncaoNaReuniaoAnterior(membroA.id, funcao.id, dataReuniaoAnteriorStr, designacoesFeitasNoMesAtual);
        const fezBFuncaoAnterior = fezFuncaoNaReuniaoAnterior(membroB.id, funcao.id, dataReuniaoAnteriorStr, designacoesFeitasNoMesAtual);
        if (fezAFuncaoAnterior && !fezBFuncaoAnterior) return 1; 
        if (!fezAFuncaoAnterior && fezBFuncaoAnterior) return -1;

        // Prioridade 2: Uso na Função no Mês (considerando designações já feitas neste ciclo)
        const usoFuncaoMesA = contarUsoFuncaoNoMes(membroA.id, funcao.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
        const usoFuncaoMesB = contarUsoFuncaoNoMes(membroB.id, funcao.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
        if (usoFuncaoMesA !== usoFuncaoMesB) return usoFuncaoMesA - usoFuncaoMesB;

        // Prioridade 3: Uso Geral no Mês (considerando designações já feitas neste ciclo)
        const usoGeralMesA = contarUsoGeralNoMes(membroA.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
        const usoGeralMesB = contarUsoGeralNoMes(membroB.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
        if (usoGeralMesA !== usoGeralMesB) return usoGeralMesA - usoGeralMesB;
        
        // Para as prioridades 4 e 5, usamos o histórico original do membro (membros[findIndex])
        const membroOriginalA = membros.find(m => m.id === membroA.id)!;
        const membroOriginalB = membros.find(m => m.id === membroB.id)!;

        // Prioridade 4: Uso na Função no Histórico Passado
        const usoFuncaoHistA = contarUsoFuncaoNoHistorico(membroA.id, funcao.id, membroOriginalA);
        const usoFuncaoHistB = contarUsoFuncaoNoHistorico(membroB.id, funcao.id, membroOriginalB);
        if (usoFuncaoHistA !== usoFuncaoHistB) return usoFuncaoHistA - usoFuncaoHistB;

        // Prioridade 5: Data da Última Vez (Histórico Passado)
        const ultimaVezA = getDataUltimaVezFuncao(membroA.id, funcao.id, membroOriginalA);
        const ultimaVezB = getDataUltimaVezFuncao(membroB.id, funcao.id, membroOriginalB);

        if (ultimaVezA === null && ultimaVezB !== null) return -1; // A (nunca fez) tem prioridade
        if (ultimaVezA !== null && ultimaVezB === null) return 1;  // B (nunca fez) tem prioridade
        if (ultimaVezA && ultimaVezB && ultimaVezA !== ultimaVezB) {
          return ultimaVezA.localeCompare(ultimaVezB); // Data mais antiga (menor string) tem prioridade
        }
        
        // Desempate Final: Aleatório
        return Math.random() - 0.5;
      });

      const membroEscolhido = membrosElegiveis[0];
      if (membroEscolhido) {
        designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = membroEscolhido.id;
        membrosDesignadosNesteDia.add(membroEscolhido.id);
        // O histórico do membro (membro.historicoDesignacoes) não é atualizado aqui.
        // Isso será feito na page.tsx após o retorno desta função,
        // para garantir que as prioridades 4 e 5 usem o histórico *antes* deste mês.
      } else {
        // Isso não deveria acontecer se membrosElegiveis.length > 0
        designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = null;
      }
    }
  }
  
  return { designacoesFeitas: designacoesFeitasNoMesAtual };
}

    