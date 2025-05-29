
'use server'; 

import type { Membro, FuncaoDesignada, DesignacoesFeitas, DiasReuniao } from './types';
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG } from './constants';
import { formatarDataCompleta, getPermissaoRequerida } from './utils';
import { suggestBestAssignment, type SuggestBestAssignmentInput } from '@/ai/flows/suggest-best-assignment';

export async function calcularDesignacoesAction(
  mes: number, // 0-11
  ano: number,
  membros: Membro[] 
): Promise<{ htmlTabelas?: string; designacoesFeitas: DesignacoesFeitas } | { error: string }> {
  
  const DIAS_REUNIAO: DiasReuniao = DIAS_REUNIAO_CONFIG;
  const designacoesFeitas: DesignacoesFeitas = {};
  const membrosDisponiveis = JSON.parse(JSON.stringify(membros)) as Membro[]; // Deep copy

  const datasDeReuniaoNoMes: Date[] = [];
  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0);

  for (let dia = new Date(primeiroDiaDoMes); dia <= ultimoDiaDoMes; dia.setDate(dia.getDate() + 1)) {
    const diaDaSemana = dia.getDay();
    if (diaDaSemana === DIAS_REUNIAO.meioSemana || diaDaSemana === DIAS_REUNIAO.publica) {
      datasDeReuniaoNoMes.push(new Date(dia));
    }
  }

  if (datasDeReuniaoNoMes.length === 0) {
    return { error: "Nenhuma data de reunião encontrada para este mês." };
  }
  
  const memberAssignmentHistoryGlobal: Record<string, Record<string, string>> = {};
  for (const membro of membros) {
    memberAssignmentHistoryGlobal[membro.id] = { ...membro.historicoDesignacoes };
  }

  for (const dataReuniao of datasDeReuniaoNoMes) {
    const dataReuniaoStr = formatarDataCompleta(dataReuniao); // "YYYY-MM-DD"
    designacoesFeitas[dataReuniaoStr] = {};
    
    const tipoReuniaoAtual = dataReuniao.getDay() === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
    const funcoesParaEsteTipoReuniao = FUNCOES_DESIGNADAS.filter(f => f.tipoReuniao.includes(tipoReuniaoAtual));

    const membrosDesignadosNesteDia: Set<string> = new Set();

    for (const funcao of funcoesParaEsteTipoReuniao) {
      let membrosElegiveis = membrosDisponiveis.filter(membro => {
        const permissaoNecessaria = getPermissaoRequerida(funcao.id, tipoReuniaoAtual);
        if (permissaoNecessaria && !membro.permissoesBase[permissaoNecessaria]) {
          return false;
        }

        // Check for impediments based on date ranges
        let estaImpedidoNesteDia = false;
        for (const impedimento of membro.impedimentos) {
          // dataReuniaoStr is "YYYY-MM-DD"
          // impedimento.from and impedimento.to are also "YYYY-MM-DD"
          if (dataReuniaoStr >= impedimento.from && dataReuniaoStr <= impedimento.to) {
            estaImpedidoNesteDia = true;
            break;
          }
        }
        if (estaImpedidoNesteDia) {
          return false;
        }

        if (membrosDesignadosNesteDia.has(membro.id)) {
          return false;
        }
        return true;
      });

      if (membrosElegiveis.length === 0) {
        designacoesFeitas[dataReuniaoStr][funcao.id] = null;
        continue;
      }
      
      const aiInput: SuggestBestAssignmentInput = {
        taskId: funcao.id,
        taskName: funcao.nome,
        date: dataReuniaoStr,
        availableMemberIds: membrosElegiveis.map(m => m.id),
        memberAssignmentHistory: memberAssignmentHistoryGlobal,
      };

      try {
        const aiSuggestion = await suggestBestAssignment(aiInput);
        const suggestedMemberId = aiSuggestion.suggestedMemberId;

        if (suggestedMemberId && membrosElegiveis.find(m => m.id === suggestedMemberId)) {
          designacoesFeitas[dataReuniaoStr][funcao.id] = suggestedMemberId;
          membrosDesignadosNesteDia.add(suggestedMemberId); 

          if (memberAssignmentHistoryGlobal[suggestedMemberId]) {
            memberAssignmentHistoryGlobal[suggestedMemberId][dataReuniaoStr] = funcao.id;
          } else {
            memberAssignmentHistoryGlobal[suggestedMemberId] = { [dataReuniaoStr]: funcao.id };
          }

        } else {
          // Fallback if AI fails or doesn't suggest a valid member from the eligible list
          const fallbackMember = membrosElegiveis.sort((a,b) => { // Simple sort: prefer those who did this task longest ago or never
            const lastTimeA = Object.entries(a.historicoDesignacoes).filter(([_,fid]) => fid === funcao.id).map(([date])=>date).sort().pop();
            const lastTimeB = Object.entries(b.historicoDesignacoes).filter(([_,fid]) => fid === funcao.id).map(([date])=>date).sort().pop();
            if(!lastTimeA && lastTimeB) return -1;
            if(lastTimeA && !lastTimeB) return 1;
            if(!lastTimeA && !lastTimeB) return 0;
            return lastTimeA!.localeCompare(lastTimeB!);
          })[0];

          if (fallbackMember) {
            designacoesFeitas[dataReuniaoStr][funcao.id] = fallbackMember.id;
            membrosDesignadosNesteDia.add(fallbackMember.id);
            if (memberAssignmentHistoryGlobal[fallbackMember.id]) {
                memberAssignmentHistoryGlobal[fallbackMember.id][dataReuniaoStr] = funcao.id;
            } else {
                memberAssignmentHistoryGlobal[fallbackMember.id] = { [dataReuniaoStr]: funcao.id };
            }
          } else {
             designacoesFeitas[dataReuniaoStr][funcao.id] = null;
          }
        }
      } catch (error) {
        console.error(`Error calling AI for task ${funcao.nome} on ${dataReuniaoStr}:`, error);
        // Fallback strategy if AI call fails
         const fallbackMember = membrosElegiveis.sort((a,b) => {
            const lastTimeA = Object.entries(a.historicoDesignacoes).filter(([_,fid]) => fid === funcao.id).map(([date])=>date).sort().pop();
            const lastTimeB = Object.entries(b.historicoDesignacoes).filter(([_,fid]) => fid === funcao.id).map(([date])=>date).sort().pop();
            if(!lastTimeA && lastTimeB) return -1;
            if(lastTimeA && !lastTimeB) return 1;
            if(!lastTimeA && !lastTimeB) return 0;
            return lastTimeA!.localeCompare(lastTimeB!);
          })[0];
        if (fallbackMember) {
            designacoesFeitas[dataReuniaoStr][funcao.id] = fallbackMember.id;
            membrosDesignadosNesteDia.add(fallbackMember.id);
             if (memberAssignmentHistoryGlobal[fallbackMember.id]) {
                memberAssignmentHistoryGlobal[fallbackMember.id][dataReuniaoStr] = funcao.id;
            } else {
                memberAssignmentHistoryGlobal[fallbackMember.id] = { [dataReuniaoStr]: funcao.id };
            }
        } else {
            designacoesFeitas[dataReuniaoStr][funcao.id] = null;
        }
      }
    }
  }
  
  return { designacoesFeitas };
}
