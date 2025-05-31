
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Membro, DesignacoesFeitas } from '@/lib/congregacao/types';
import {
  carregarCacheDesignacoes,
  salvarCacheDesignacoes,
  limparCacheDesignacoes as limparStorageCacheDesignacoes,
  salvarDesignacoesUsuario, // Importar a nova função
  carregarDesignacoesUsuario, // Importar a nova função
  limparDesignacoesUsuario, // Importar a nova função
} from '@/lib/congregacao/storage';
import { calcularDesignacoesAction } from '@/lib/congregacao/assignment-logic';

interface UseScheduleManagementProps {
  membros: Membro[];
  updateMemberHistory: (updatedMembers: Membro[]) => void;
}

interface ScheduleState {
  designacoes: DesignacoesFeitas | null;
  mes: number | null;
  ano: number | null;
}

export function useScheduleManagement({ membros, updateMemberHistory }: UseScheduleManagementProps) {
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    designacoes: null,
    mes: null,
    ano: null,
  });

  // Carregar do cache ou das designações salvas pelo usuário ao iniciar
  useEffect(() => {
    const cached = carregarCacheDesignacoes();
    if (cached) {
      setScheduleState({ designacoes: cached.schedule, mes: cached.mes, ano: cached.ano });
      return; // Se encontrou cache, usa o cache
    }
    const saved = carregarDesignacoesUsuario(); // Tenta carregar designações do usuário
    if (saved) {
       setScheduleState({ designacoes: saved.schedule, mes: saved.mes, ano: saved.ano });
    }
  }, []); // Dependência vazia para rodar apenas uma vez na montagem

  const persistSchedule = useCallback((newSchedule: DesignacoesFeitas | null, newMes: number | null, newAno: number | null) => {
    setScheduleState({ designacoes: newSchedule, mes: newMes, ano: newAno });
    if (newSchedule && newMes !== null && newAno !== null) {
      salvarCacheDesignacoes({ schedule: newSchedule, mes: newMes, ano: newAno });
    } else {
      limparStorageCacheDesignacoes();
    }
  }, []);

  const internalUpdateMemberHistoryForMonth = useCallback((
    currentScheduleForMonth: DesignacoesFeitas,
    scheduleMes: number,
    scheduleAno: number
  ) => {
    const membrosComHistoricoAtualizado = [...membros].map(m => {
      const membroModificado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } };

      // Primeiro, remove do histórico as designações auto-geráveis deste mês para este membro
      Object.keys(membroModificado.historicoDesignacoes).forEach(histDateStr => {
        const histDateObj = new Date(histDateStr + "T00:00:00");
        if (histDateObj.getFullYear() === scheduleAno && histDateObj.getMonth() === scheduleMes) {
          const funcaoIdNoHistorico = membroModificado.historicoDesignacoes[histDateStr];
          // Verifica se a função no histórico é uma daquelas que são auto-geradas (não AV, não Limpeza)
          if (funcaoIdNoHistorico && !funcaoIdNoHistorico.startsWith('av') && !funcaoIdNoHistorico.startsWith('limpeza')) {
             delete membroModificado.historicoDesignacoes[histDateStr];
          }
        }
      });
      
      // Depois, adiciona as novas designações auto-geráveis deste mês para este membro
      Object.entries(currentScheduleForMonth).forEach(([dateStr, funcoesDoDia]) => {
        const dataObj = new Date(dateStr + "T00:00:00");
        if (dataObj.getFullYear() === scheduleAno && dataObj.getMonth() === scheduleMes) {
          Object.entries(funcoesDoDia).forEach(([funcaoId, membroId]) => {
            if (membroId === m.id) {
              // Adiciona apenas se não for AV e não for Limpeza, pois essas são manuais
              if (!funcaoId.startsWith('av') && !funcaoId.startsWith('limpeza')) {
                membroModificado.historicoDesignacoes[dateStr] = funcaoId;
              }
            }
          });
        }
      });
      return membroModificado;
    });
    updateMemberHistory(membrosComHistoricoAtualizado);
  }, [membros, updateMemberHistory]);


  const generateNewSchedule = useCallback(async (mes: number, ano: number): Promise<{ success: boolean; error?: string; generatedSchedule?: DesignacoesFeitas }> => {
    const result = await calcularDesignacoesAction(mes, ano, membros);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    persistSchedule(result.designacoesFeitas, mes, ano);
    internalUpdateMemberHistoryForMonth(result.designacoesFeitas, mes, ano);
    return { success: true, generatedSchedule: result.designacoesFeitas };
  }, [membros, persistSchedule, internalUpdateMemberHistoryForMonth]);

  const confirmManualAssignmentOrSubstitution = useCallback((
    date: string,
    functionId: string,
    newMemberId: string | null,
    originalMemberId: string | null,
    currentScheduleData: DesignacoesFeitas, // Deve ser o schedule do estado atual do hook
    currentMesValue: number,
    currentAnoValue: number
  ) => {
    const updatedSchedule = JSON.parse(JSON.stringify(currentScheduleData)) as DesignacoesFeitas;
    if (!updatedSchedule[date]) {
      updatedSchedule[date] = {};
    }
    updatedSchedule[date][functionId] = newMemberId; // Atribui ou remove (se newMemberId for null)

    persistSchedule(updatedSchedule, currentMesValue, currentAnoValue);

    // Atualiza o histórico apenas para a designação específica que foi alterada
    const membrosComHistoricoAtualizado = [...membros].map(m => {
      const membroModificado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } };
      // Se era o membro original e a função no histórico bate, remove
      if (originalMemberId && m.id === originalMemberId && membroModificado.historicoDesignacoes[date] === functionId) {
        delete membroModificado.historicoDesignacoes[date];
      }
      // Se é o novo membro e foi designado (não nulo), adiciona/atualiza no histórico
      // Não adicionar ao histórico se for uma função AV ou de limpeza, pois essas não entram no histórico da mesma forma
      if (newMemberId && m.id === newMemberId && !functionId.startsWith('av') && !functionId.startsWith('limpeza')) {
        membroModificado.historicoDesignacoes[date] = functionId;
      }
      return membroModificado;
    });
    updateMemberHistory(membrosComHistoricoAtualizado);

  }, [membros, persistSchedule, updateMemberHistory]);


  const updateLimpezaAssignment = useCallback((
    dateKey: string,
    type: 'aposReuniao' | 'semanal',
    value: string | null
  ) => {
    if (!scheduleState.designacoes || scheduleState.mes === null || scheduleState.ano === null) {
      // Se o cronograma principal não estiver carregado, cria um objeto vazio para o mês/ano atual
      const mesAtual = scheduleState.mes ?? new Date().getMonth();
      const anoAtual = scheduleState.ano ?? new Date().getFullYear();
      const novoSchedule: DesignacoesFeitas = {};
      if (!novoSchedule[dateKey]) novoSchedule[dateKey] = {};

      if (type === 'aposReuniao') {
        novoSchedule[dateKey].limpezaAposReuniaoGrupoId = value;
      } else {
        novoSchedule[dateKey].limpezaSemanalResponsavel = value || '';
      }
      persistSchedule(novoSchedule, mesAtual, anoAtual);
      return;
    }

    const updatedSchedule = JSON.parse(JSON.stringify(scheduleState.designacoes)) as DesignacoesFeitas;
    if (!updatedSchedule[dateKey]) {
      updatedSchedule[dateKey] = {};
    }
    if (type === 'aposReuniao') {
      updatedSchedule[dateKey].limpezaAposReuniaoGrupoId = value;
    } else {
      updatedSchedule[dateKey].limpezaSemanalResponsavel = value || '';
    }
    persistSchedule(updatedSchedule, scheduleState.mes, scheduleState.ano);
  }, [scheduleState, persistSchedule]);

  const clearMainScheduleAndCache = useCallback(() => {
    persistSchedule(null, null, null);
    // A limpeza do histórico de membros relacionada a este cache
    // deve ocorrer onde este clear é chamado, se necessário,
    // pois o hook não sabe o contexto completo para limpar todo o histórico.
  }, [persistSchedule]);

  // Nova função para salvar as designações explicitamente pelo usuário
  const salvarDesignacoes = useCallback(() => {
    if (scheduleState.designacoes && scheduleState.mes !== null && scheduleState.ano !== null) {
      salvarDesignacoesUsuario({ schedule: scheduleState.designacoes, mes: scheduleState.mes, ano: scheduleState.ano });
      console.log("Designações salvas pelo usuário."); // Feedback visual no console por enquanto
      // TODO: Adicionar um toast ou outro feedback para o usuário na interface
    } else {
      console.warn("Nenhuma designação para salvar."); // Feedback no console
       // TODO: Adicionar um toast ou outro feedback para o usuário na interface (ex: "Nenhuma designação gerada para salvar.")
    }
  }, [scheduleState]); // Depende de scheduleState para pegar os dados atuais


  // Nova função para carregar as designações salvas pelo usuário
  const carregarDesignacoes = useCallback(() => {
    const saved = carregarDesignacoesUsuario();
    if (saved) {
      setScheduleState({ designacoes: saved.schedule, mes: saved.mes, ano: saved.ano });
      console.log("Designações carregadas pelo usuário."); // Feedback visual no console por enquanto
      // TODO: Adicionar um toast ou outro feedback para o usuário na interface
    } else {
      console.warn("Nenhuma designação salva pelo usuário encontrada."); // Feedback no console
      // TODO: Adicionar um toast ou outro feedback para o usuário na interface (ex: "Nenhuma designação salva encontrada.")
    }
  }, []); // Sem dependências que mudam o comportamento, apenas chama a função de storage

  return {
    scheduleData: scheduleState.designacoes,
    scheduleMes: scheduleState.mes,
    scheduleAno: scheduleState.ano,
    generateNewSchedule,
    confirmManualAssignmentOrSubstitution,
    updateLimpezaAssignment,
    clearMainScheduleAndCache,
    salvarDesignacoes, // Exportar a nova função de salvar
    carregarDesignacoes, // Exportar a nova função de carregar
  };
}
