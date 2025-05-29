
'use server'; 

import type { Membro, FuncaoDesignada, DesignacoesFeitas, DiasReuniao } from './types';
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG } from './constants';
import { formatarDataCompleta, getPermissaoRequerida } from './utils'; // formatarDataParaChave removed if not used
import { suggestBestAssignment, type SuggestBestAssignmentInput } from '@/ai/flows/suggest-best-assignment';

export async function calcularDesignacoesAction(
  mes: number, // 0-11
  ano: number,
  membros: Membro[] 
): Promise<{ htmlTabelas?: string; designacoesFeitas: DesignacoesFeitas } | { error: string }> {
  
  const DIAS_REUNIAO: DiasReuniao = DIAS_REUNIAO_CONFIG;
  const designacoesFeitas: DesignacoesFeitas = {};
  const membrosDisponiveis = JSON.parse(JSON.stringify(membros)) as Membro[];

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
        // Check specific day impediment
        if (membro.impedimentos.includes(dataReuniaoStr)) {
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
          const fallbackMember = membrosElegiveis[0]; 
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
        const fallbackMember = membrosElegiveis[0];
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
