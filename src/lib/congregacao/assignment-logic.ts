
'use server'; 

import type { Membro, FuncaoDesignada, DesignacoesFeitas, DiasReuniao } from './types';
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG } from './constants';
import { formatarDataCompleta, getPermissaoRequerida } from './utils';


// --- Funções Auxiliares de Elegibilidade e Priorização (Refatoradas e Exportadas) ---

function encontrarDataReuniaoAnterior(
  dataAtual: Date,
  tipoReuniaoAtual: 'meioSemana' | 'publica',
  datasDeReuniaoNoMes: Date[],
  DIAS_REUNIAO: DiasReuniao
): Date | null {
  const diaSemanaAlvo = tipoReuniaoAtual === 'meioSemana' ? DIAS_REUNIAO.meioSemana : DIAS_REUNIAO.publica;
  let dataAnterior: Date | null = null;
  for (const dataCand of datasDeReuniaoNoMes) {
    if (dataCand < dataAtual && dataCand.getUTCDay() === diaSemanaAlvo) {
      if (dataAnterior === null || dataCand > dataAnterior) {
        dataAnterior = new Date(dataCand);
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
  return designacoesDoDiaAnterior[funcaoId] === membroId;
}

function contarUsoFuncaoNoMes(
  membroId: string,
  funcaoId: string,
  designacoesFeitasNoMesAtual: DesignacoesFeitas,
  dataAtualStr: string,
  ignorarDataAtual: boolean = true // Se true, não conta a designação da dataAtualStr
): number {
  let count = 0;
  for (const dataStr in designacoesFeitasNoMesAtual) {
    if (ignorarDataAtual && dataStr >= dataAtualStr) continue;
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
  dataAtualStr: string,
  ignorarDataAtual: boolean = true // Se true, não conta a designação da dataAtualStr
): number {
  let count = 0;
  for (const dataStr in designacoesFeitasNoMesAtual) {
    if (ignorarDataAtual && dataStr >= dataAtualStr) continue;
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

export async function getEligibleMembersForFunctionDate(
  funcao: FuncaoDesignada,
  dataReuniao: Date,
  dataReuniaoStr: string,
  todosMembros: Membro[],
  designacoesNoDia: Record<string, string | null> = {}, // Designações já feitas neste dia específico
  membroExcluidoId?: string | null // Para substituição, não considerar este membro
): Promise<Membro[]> {
  const tipoReuniao = dataReuniao.getUTCDay() === DIAS_REUNIAO_CONFIG.meioSemana ? 'meioSemana' : 'publica';
  const membrosDesignadosNesteDia = new Set(Object.values(designacoesNoDia).filter(id => id !== null) as string[]);

  return todosMembros.filter(membro => {
    if (membroExcluidoId && membro.id === membroExcluidoId) {
      return false;
    }

    const permissaoNecessariaId = getPermissaoRequerida(funcao.id, tipoReuniao);
    if (!permissaoNecessariaId || !membro.permissoesBase[permissaoNecessariaId]) {
      return false;
    }

    if (membro.impedimentos.some(imp => dataReuniaoStr >= imp.from && dataReuniaoStr <= imp.to)) {
      return false;
    }

    if (funcao.tabela !== 'AV' && membrosDesignadosNesteDia.has(membro.id)) {
        return false;
    }
    if (funcao.tabela === 'AV') {
        let countAVAssignmentsForMember = 0;
        let memberHasNonAVAssignment = false;
        for (const funcIdDesignada in designacoesNoDia) {
            if (designacoesNoDia[funcIdDesignada] === membro.id) {
                const funcDef = FUNCOES_DESIGNADAS.find(f => f.id === funcIdDesignada);
                if (funcDef && funcDef.tabela === 'AV') {
                    countAVAssignmentsForMember++;
                } else if (funcDef && funcDef.tabela !== 'AV') {
                    memberHasNonAVAssignment = true;
                }
            }
        }
        if (memberHasNonAVAssignment) return false; // Cannot do AV if has non-AV assignment
        // Allow multiple AV assignments if the function itself is AV
    }


    return true;
  });
}

export async function sortMembersByPriority(
  membrosElegiveis: Membro[],
  funcao: FuncaoDesignada,
  dataReuniaoAnteriorStr: string | null,
  designacoesFeitasNoMesAtual: DesignacoesFeitas,
  dataReuniaoStr: string,
  membrosComHistoricoCompleto: Membro[] // Para acessar o histórico original completo
): Promise<Membro[]> {
  
  const membrosOrdenados = [...membrosElegiveis];

  membrosOrdenados.sort((membroA, membroB) => {
    const fezAFuncaoAnterior = fezFuncaoNaReuniaoAnterior(membroA.id, funcao.id, dataReuniaoAnteriorStr, designacoesFeitasNoMesAtual);
    const fezBFuncaoAnterior = fezFuncaoNaReuniaoAnterior(membroB.id, funcao.id, dataReuniaoAnteriorStr, designacoesFeitasNoMesAtual);
    if (fezAFuncaoAnterior && !fezBFuncaoAnterior) return 1; 
    if (!fezAFuncaoAnterior && fezBFuncaoAnterior) return -1;

    const usoFuncaoMesA = contarUsoFuncaoNoMes(membroA.id, funcao.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
    const usoFuncaoMesB = contarUsoFuncaoNoMes(membroB.id, funcao.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
    if (usoFuncaoMesA !== usoFuncaoMesB) return usoFuncaoMesA - usoFuncaoMesB;

    const usoGeralMesA = contarUsoGeralNoMes(membroA.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
    const usoGeralMesB = contarUsoGeralNoMes(membroB.id, designacoesFeitasNoMesAtual, dataReuniaoStr);
    if (usoGeralMesA !== usoGeralMesB) return usoGeralMesA - usoGeralMesB;
    
    const membroOriginalA = membrosComHistoricoCompleto.find(m => m.id === membroA.id)!;
    const membroOriginalB = membrosComHistoricoCompleto.find(m => m.id === membroB.id)!;

    const usoFuncaoHistA = contarUsoFuncaoNoHistorico(membroA.id, funcao.id, membroOriginalA);
    const usoFuncaoHistB = contarUsoFuncaoNoHistorico(membroB.id, funcao.id, membroOriginalB);
    if (usoFuncaoHistA !== usoFuncaoHistB) return usoFuncaoHistA - usoFuncaoHistB;

    const ultimaVezA = getDataUltimaVezFuncao(membroA.id, funcao.id, membroOriginalA);
    const ultimaVezB = getDataUltimaVezFuncao(membroB.id, funcao.id, membroOriginalB);

    if (ultimaVezA === null && ultimaVezB !== null) return -1;
    if (ultimaVezA !== null && ultimaVezB === null) return 1;
    if (ultimaVezA && ultimaVezB && ultimaVezA !== ultimaVezB) {
      return ultimaVezA.localeCompare(ultimaVezB);
    }
    
    return Math.random() - 0.5;
  });
  return membrosOrdenados;
}

// --- Lógica Principal de Geração ---
export async function calcularDesignacoesAction(
  mes: number, // 0-11
  ano: number,
  membros: Membro[] 
): Promise<{ designacoesFeitas: DesignacoesFeitas } | { error: string }> {
  
  const DIAS_REUNIAO: DiasReuniao = DIAS_REUNIAO_CONFIG;
  const designacoesFeitasNoMesAtual: DesignacoesFeitas = {};
  const membrosDisponiveis = JSON.parse(JSON.stringify(membros)) as Membro[]; 

  const datasDeReuniaoNoMes: Date[] = [];
  const primeiroDiaDoMes = new Date(Date.UTC(ano, mes, 1));
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0));

  for (let dia = new Date(primeiroDiaDoMes); dia <= ultimoDiaDoMes; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const diaDaSemana = dia.getUTCDay();
    if (diaDaSemana === DIAS_REUNIAO.meioSemana || diaDaSemana === DIAS_REUNIAO.publica) {
      datasDeReuniaoNoMes.push(new Date(dia));
    }
  }

  if (datasDeReuniaoNoMes.length === 0) {
    return { error: "Nenhuma data de reunião encontrada para este mês." };
  }
  datasDeReuniaoNoMes.sort((a, b) => a.getTime() - b.getTime());

  for (const dataReuniao of datasDeReuniaoNoMes) {
    const dataReuniaoStr = formatarDataCompleta(dataReuniao);
    designacoesFeitasNoMesAtual[dataReuniaoStr] = {
      ...designacoesFeitasNoMesAtual[dataReuniaoStr], // Preserve existing if any (from cache)
      limpezaAposReuniaoGrupoId: designacoesFeitasNoMesAtual[dataReuniaoStr]?.limpezaAposReuniaoGrupoId || null,
      limpezaSemanalResponsavel: designacoesFeitasNoMesAtual[dataReuniaoStr]?.limpezaSemanalResponsavel || '',
    };
    
    const tipoReuniaoAtual = dataReuniao.getUTCDay() === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
    
    const funcoesParaGeracaoAutomatica = FUNCOES_DESIGNADAS.filter(
      f => f.tipoReuniao.includes(tipoReuniaoAtual) && f.tabela !== 'AV'
    );
    
    const dataReuniaoAnteriorObj = encontrarDataReuniaoAnterior(dataReuniao, tipoReuniaoAtual, datasDeReuniaoNoMes, DIAS_REUNIAO);
    const dataReuniaoAnteriorStr = dataReuniaoAnteriorObj ? formatarDataCompleta(dataReuniaoAnteriorObj) : null;

    for (const funcao of funcoesParaGeracaoAutomatica) {
      const membrosElegiveis = await getEligibleMembersForFunctionDate(
        funcao,
        dataReuniao,
        dataReuniaoStr,
        membrosDisponiveis,
        designacoesFeitasNoMesAtual[dataReuniaoStr]
      );

      if (membrosElegiveis.length === 0) {
        if (!designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id]) { // Only set to null if not already set (from cache)
            designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = null;
        }
        continue;
      }

      const membrosOrdenados = await sortMembersByPriority(
        membrosElegiveis,
        funcao,
        dataReuniaoAnteriorStr, 
        designacoesFeitasNoMesAtual,
        dataReuniaoStr,
        membros 
      );

      const membroEscolhido = membrosOrdenados[0];
      if (membroEscolhido) {
         if (!designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id]) {
            designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = membroEscolhido.id;
         }
      } else {
         if (!designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id]) {
            designacoesFeitasNoMesAtual[dataReuniaoStr][funcao.id] = null;
         }
      }
    }

    const funcoesAVParaEsteTipo = FUNCOES_DESIGNADAS.filter(
        f => f.tipoReuniao.includes(tipoReuniaoAtual) && f.tabela === 'AV'
    );
    for (const funcaoAV of funcoesAVParaEsteTipo) {
        if (designacoesFeitasNoMesAtual[dataReuniaoStr][funcaoAV.id] === undefined) { 
             designacoesFeitasNoMesAtual[dataReuniaoStr][funcaoAV.id] = null;
        }
    }
  }
  
  return { designacoesFeitas: designacoesFeitasNoMesAtual };
}


// --- Funções para Lógica de Substituição ---

export async function findNextBestCandidateForSubstitution(
  dateStr: string,
  functionId: string,
  originalMemberId: string,
  allMembers: Membro[],
  currentAssignmentsForMonth: DesignacoesFeitas
): Promise<Membro | null> {
  const targetDate = new Date(dateStr + "T00:00:00"); 
  const targetFunction = FUNCOES_DESIGNADAS.find(f => f.id === functionId);

  if (!targetFunction) return null;

  const assignmentsOnTargetDate = currentAssignmentsForMonth[dateStr] || {};
  
  const datasDeReuniaoNoMesFicticia : Date[] = Object.keys(currentAssignmentsForMonth)
    .map(d => new Date(d + "T00:00:00"))
    .sort((a,b) => a.getTime() - b.getTime());
  
  const tipoReuniaoAtual = targetDate.getUTCDay() === DIAS_REUNIAO_CONFIG.meioSemana ? 'meioSemana' : 'publica';
  const dataReuniaoAnteriorObj = encontrarDataReuniaoAnterior(targetDate, tipoReuniaoAtual, datasDeReuniaoNoMesFicticia, DIAS_REUNIAO_CONFIG);
  const dataReuniaoAnteriorStr = dataReuniaoAnteriorObj ? formatarDataCompleta(dataReuniaoAnteriorObj) : null;


  const eligibleMembers = await getEligibleMembersForFunctionDate(
    targetFunction,
    targetDate,
    dateStr,
    allMembers,
    assignmentsOnTargetDate,
    originalMemberId 
  );

  if (eligibleMembers.length === 0) return null;

  const sortedMembers = await sortMembersByPriority(
    eligibleMembers,
    targetFunction,
    dataReuniaoAnteriorStr, 
    currentAssignmentsForMonth,
    dateStr,
    allMembers
  );
  
  return sortedMembers.length > 0 ? sortedMembers[0] : null;
}

export async function getPotentialSubstitutesList(
  dateStr: string,
  functionId: string,
  originalMemberId: string,
  allMembers: Membro[],
  currentAssignmentsForMonth: DesignacoesFeitas
): Promise<Membro[]> {
  const targetDate = new Date(dateStr + "T00:00:00");
  const targetFunction = FUNCOES_DESIGNADAS.find(f => f.id === functionId);

  if (!targetFunction) return [];

  const assignmentsOnTargetDate = currentAssignmentsForMonth[dateStr] || {};
  
  const datasDeReuniaoNoMesFicticia : Date[] = Object.keys(currentAssignmentsForMonth)
    .map(d => new Date(d + "T00:00:00"))
    .sort((a,b) => a.getTime() - b.getTime());
  
  const tipoReuniaoAtual = targetDate.getUTCDay() === DIAS_REUNIAO_CONFIG.meioSemana ? 'meioSemana' : 'publica';
  const dataReuniaoAnteriorObj = encontrarDataReuniaoAnterior(targetDate, tipoReuniaoAtual, datasDeReuniaoNoMesFicticia, DIAS_REUNIAO_CONFIG);
  const dataReuniaoAnteriorStr = dataReuniaoAnteriorObj ? formatarDataCompleta(dataReuniaoAnteriorObj) : null;


  const eligibleMembers = await getEligibleMembersForFunctionDate(
    targetFunction,
    targetDate,
    dateStr,
    allMembers,
    assignmentsOnTargetDate,
    originalMemberId 
  );

  return eligibleMembers.sort((a, b) => a.nome.localeCompare(b.nome));
}

