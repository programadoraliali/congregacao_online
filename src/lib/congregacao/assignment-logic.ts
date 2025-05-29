'use server'; // Required for Genkit AI flow, but this makes functions here server-only.
// If this file is to be used client-side, need to adjust AI call or make a server action wrapper.
// For now, assuming this whole function `calcularDesignacoes` could be a server action if AI must run on server.
// Or, if AI flow is callable from client, remove 'use server'. Given Genkit setup, likely needs to be server-callable.
// Let's assume `suggestBestAssignment` is callable from a client context or this whole function becomes an API endpoint/server action.
// For simplicity in this Next.js App Router context, we'll make this a server action.

import type { Membro, FuncaoDesignada, DesignacoesFeitas, DiasReuniao } from './types';
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG } from './constants';
import { formatarDataCompleta, formatarDataParaChave, getPermissaoRequerida } from './utils';
import { suggestBestAssignment, type SuggestBestAssignmentInput } from '@/ai/flows/suggest-best-assignment';

// This function must be callable from client, so it's defined as a server action.
export async function calcularDesignacoesAction(
  mes: number, // 0-11
  ano: number,
  membros: Membro[] // Pass all members, AI needs their history
): Promise<{ htmlTabelas?: string; designacoesFeitas: DesignacoesFeitas } | { error: string }> {
  
  const DIAS_REUNIAO: DiasReuniao = DIAS_REUNIAO_CONFIG; // Use the imported config
  const designacoesFeitas: DesignacoesFeitas = {};
  const membrosDisponiveis = JSON.parse(JSON.stringify(membros)) as Membro[]; // Deep copy

  // 1. Determinar todas as datas de reunião no mês/ano
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
  
  const anoMesImpedimento = formatarDataParaChave(new Date(ano, mes)); // "AAAA-MM"

  // Construir o histórico de todos os membros para a IA
  // IA expects: Record<MemberId, Record<DateStringYYYYMMDD, TaskIdString>>
  const memberAssignmentHistoryGlobal: Record<string, Record<string, string>> = {};
  for (const membro of membros) {
    memberAssignmentHistoryGlobal[membro.id] = { ...membro.historicoDesignacoes };
  }

  // 2. Iterar por cada data de reunião
  for (const dataReuniao of datasDeReuniaoNoMes) {
    const dataStr = formatarDataCompleta(dataReuniao); // "AAAA-MM-DD"
    designacoesFeitas[dataStr] = {};
    
    const tipoReuniaoAtual = dataReuniao.getDay() === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
    const funcoesParaEsteTipoReuniao = FUNCOES_DESIGNADAS.filter(f => f.tipoReuniao.includes(tipoReuniaoAtual));

    // Track members assigned on this specific day to avoid double-booking
    const membrosDesignadosNesteDia: Set<string> = new Set();

    // 3. Iterar por cada função aplicável
    for (const funcao of funcoesParaEsteTipoReuniao) {
      // Filtrar membros elegíveis
      let membrosElegiveis = membrosDisponiveis.filter(membro => {
        // Check permissaoBase
        const permissaoNecessaria = getPermissaoRequerida(funcao.id, tipoReuniaoAtual);
        if (permissaoNecessaria && !membro.permissoesBase[permissaoNecessaria]) {
          return false;
        }
        // Check impedimentos
        if (membro.impedimentos.includes(anoMesImpedimento)) {
          return false;
        }
        // Check se já foi designado para OUTRA função NESTA MESMA data
        if (membrosDesignadosNesteDia.has(membro.id)) {
          return false;
        }
        return true;
      });

      if (membrosElegiveis.length === 0) {
        designacoesFeitas[dataStr][funcao.id] = null;
        continue;
      }
      
      // Prepare input for AI
      const aiInput: SuggestBestAssignmentInput = {
        taskId: funcao.id,
        taskName: funcao.nome,
        date: dataStr,
        availableMemberIds: membrosElegiveis.map(m => m.id),
        memberAssignmentHistory: memberAssignmentHistoryGlobal,
      };

      try {
        // console.log(`Calling AI for task ${funcao.nome} on ${dataStr} with ${membrosElegiveis.length} eligible members.`);
        const aiSuggestion = await suggestBestAssignment(aiInput);
        const suggestedMemberId = aiSuggestion.suggestedMemberId;

        if (suggestedMemberId && membrosElegiveis.find(m => m.id === suggestedMemberId)) {
          designacoesFeitas[dataStr][funcao.id] = suggestedMemberId;
          membrosDesignadosNesteDia.add(suggestedMemberId); // Mark as assigned for this day

          // Update local member history for subsequent AI calls in the same month generation
          if (memberAssignmentHistoryGlobal[suggestedMemberId]) {
            memberAssignmentHistoryGlobal[suggestedMemberId][dataStr] = funcao.id;
          } else {
            memberAssignmentHistoryGlobal[suggestedMemberId] = { [dataStr]: funcao.id };
          }

        } else {
          // AI failed or suggested invalid member, fallback (e.g. random or first eligible)
          // For simplicity, let's pick the first one if AI fails to provide a valid one.
          // A more robust fallback would consider history similar to AI.
          // console.warn(`AI suggestion for ${funcao.nome} on ${dataStr} was invalid or null. Suggested: ${suggestedMemberId}. Falling back to first eligible.`);
          const fallbackMember = membrosElegiveis[0]; // Simplistic fallback
          if (fallbackMember) {
            designacoesFeitas[dataStr][funcao.id] = fallbackMember.id;
            membrosDesignadosNesteDia.add(fallbackMember.id);
            if (memberAssignmentHistoryGlobal[fallbackMember.id]) {
                memberAssignmentHistoryGlobal[fallbackMember.id][dataStr] = funcao.id;
            } else {
                memberAssignmentHistoryGlobal[fallbackMember.id] = { [dataStr]: funcao.id };
            }
          } else {
             designacoesFeitas[dataStr][funcao.id] = null;
          }
        }
      } catch (error) {
        console.error(`Error calling AI for task ${funcao.nome} on ${dataStr}:`, error);
        // Fallback if AI call fails
        const fallbackMember = membrosElegiveis[0];
        if (fallbackMember) {
            designacoesFeitas[dataStr][funcao.id] = fallbackMember.id;
            membrosDesignadosNesteDia.add(fallbackMember.id);
             if (memberAssignmentHistoryGlobal[fallbackMember.id]) {
                memberAssignmentHistoryGlobal[fallbackMember.id][dataStr] = funcao.id;
            } else {
                memberAssignmentHistoryGlobal[fallbackMember.id] = { [dataStr]: funcao.id };
            }
        } else {
            designacoesFeitas[dataStr][funcao.id] = null;
        }
      }
    }
  }
  
  return { designacoesFeitas };
}
