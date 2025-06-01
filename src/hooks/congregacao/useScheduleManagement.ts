
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Membro, DesignacoesFeitas, DesignacaoSalva, TodosCronogramasSalvos } from '@/lib/congregacao/types';
import {
  carregarCacheDesignacoes,
  salvarCacheDesignacoes,
  limparCacheDesignacoes as limparStorageCacheDesignacoes,
  salvarTodosCronogramas,
  carregarTodosCronogramas,
  salvarDesignacoesUsuario,
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
  status: 'rascunho' | 'finalizado' | null;
}

export function useScheduleManagement({ membros, updateMemberHistory }: UseScheduleManagementProps) {
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    designacoes: null,
    mes: null,
    ano: null,
    status: null,
  });

  useEffect(() => {
    const cached = carregarCacheDesignacoes();
    if (cached) {
      setScheduleState({ designacoes: cached.schedule, mes: cached.mes, ano: cached.ano, status: cached.status });
    }
    // Não carrega mais 'carregarDesignacoesUsuario' aqui. Usuário pode carregar explicitamente.
  }, []);

  const persistScheduleToStateAndCache = useCallback((newSchedule: DesignacoesFeitas | null, newMes: number | null, newAno: number | null, newStatus: 'rascunho' | 'finalizado' | null) => {
    setScheduleState({ designacoes: newSchedule, mes: newMes, ano: newAno, status: newStatus });
    if (newSchedule && newMes !== null && newAno !== null && newStatus) {
      salvarCacheDesignacoes({ schedule: newSchedule, mes: newMes, ano: newAno, status: newStatus });
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
      Object.keys(membroModificado.historicoDesignacoes).forEach(histDateStr => {
        const histDateObj = new Date(histDateStr + "T00:00:00");
        if (histDateObj.getFullYear() === scheduleAno && histDateObj.getMonth() === scheduleMes) {
          const funcaoIdNoHistorico = membroModificado.historicoDesignacoes[histDateStr];
          if (funcaoIdNoHistorico && !funcaoIdNoHistorico.startsWith('av') && !funcaoIdNoHistorico.startsWith('limpeza')) {
             delete membroModificado.historicoDesignacoes[histDateStr];
          }
        }
      });
      Object.entries(currentScheduleForMonth).forEach(([dateStr, funcoesDoDia]) => {
        const dataObj = new Date(dateStr + "T00:00:00");
        if (dataObj.getFullYear() === scheduleAno && dataObj.getMonth() === scheduleMes) {
          Object.entries(funcoesDoDia).forEach(([funcaoId, membroId]) => {
            if (membroId === m.id) {
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
    // Ao gerar novo, o status é 'rascunho'
    persistScheduleToStateAndCache(result.designacoesFeitas, mes, ano, 'rascunho');
    internalUpdateMemberHistoryForMonth(result.designacoesFeitas, mes, ano);
    return { success: true, generatedSchedule: result.designacoesFeitas };
  }, [membros, persistScheduleToStateAndCache, internalUpdateMemberHistoryForMonth]);

  const confirmManualAssignmentOrSubstitution = useCallback((
    date: string,
    functionId: string,
    newMemberId: string | null,
    originalMemberId: string | null,
    currentScheduleData: DesignacoesFeitas,
    currentMesValue: number,
    currentAnoValue: number
  ) => {
    const updatedSchedule = JSON.parse(JSON.stringify(currentScheduleData)) as DesignacoesFeitas;
    if (!updatedSchedule[date]) {
      updatedSchedule[date] = {};
    }
    updatedSchedule[date][functionId] = newMemberId;

    // Mantém o status atual ao fazer uma substituição/designação manual.
    // Se o cronograma era 'finalizado', ele continua 'finalizado' mas com a alteração.
    // Se era 'rascunho', continua 'rascunho'.
    const currentStatus = scheduleState.status || 'rascunho'; 
    persistScheduleToStateAndCache(updatedSchedule, currentMesValue, currentAnoValue, currentStatus);

    const membrosComHistoricoAtualizado = [...membros].map(m => {
      const membroModificado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } };
      if (originalMemberId && m.id === originalMemberId && membroModificado.historicoDesignacoes[date] === functionId) {
        delete membroModificado.historicoDesignacoes[date];
      }
      if (newMemberId && m.id === newMemberId && !functionId.startsWith('av') && !functionId.startsWith('limpeza')) {
        membroModificado.historicoDesignacoes[date] = functionId;
      }
      return membroModificado;
    });
    updateMemberHistory(membrosComHistoricoAtualizado);

  }, [membros, persistScheduleToStateAndCache, updateMemberHistory, scheduleState.status]);


  const updateLimpezaAssignment = useCallback((
    dateKey: string,
    type: 'aposReuniao' | 'semanal',
    value: string | null
  ) => {
    const currentStatus = scheduleState.status || 'rascunho';
    if (!scheduleState.designacoes || scheduleState.mes === null || scheduleState.ano === null) {
      const mesAtual = scheduleState.mes ?? new Date().getMonth();
      const anoAtual = scheduleState.ano ?? new Date().getFullYear();
      const novoSchedule: DesignacoesFeitas = {};
      if (!novoSchedule[dateKey]) novoSchedule[dateKey] = {};

      if (type === 'aposReuniao') {
        novoSchedule[dateKey].limpezaAposReuniaoGrupoId = value;
      } else {
        novoSchedule[dateKey].limpezaSemanalResponsavel = value || '';
      }
      persistScheduleToStateAndCache(novoSchedule, mesAtual, anoAtual, currentStatus);
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
    persistScheduleToStateAndCache(updatedSchedule, scheduleState.mes, scheduleState.ano, currentStatus);
  }, [scheduleState, persistScheduleToStateAndCache]);

  const clearMainScheduleAndCache = useCallback(() => {
    persistScheduleToStateAndCache(null, null, null, null);
  }, [persistScheduleToStateAndCache]);

  const salvarDesignacoes = useCallback(() => {
    if (scheduleState.designacoes && scheduleState.mes !== null && scheduleState.ano !== null) {
      salvarDesignacoesUsuario({
        schedule: scheduleState.designacoes,
        mes: scheduleState.mes,
        ano: scheduleState.ano,
        status: 'rascunho', 
      });
      // Atualiza também o estado local e o cache para refletir o status 'rascunho'
      persistScheduleToStateAndCache(scheduleState.designacoes, scheduleState.mes, scheduleState.ano, 'rascunho');
      return { success: true };
    } else {
      return { success: false, error: "Nenhuma designação gerada para salvar." };
    }
  }, [scheduleState, persistScheduleToStateAndCache]);

  const finalizarCronograma = useCallback((): { success: boolean; error?: string } => {
    if (!scheduleState.designacoes || scheduleState.mes === null || scheduleState.ano === null) {
      return { success: false, error: "Nenhum cronograma carregado para finalizar." };
    }
  
    for (const date in scheduleState.designacoes) {
      const assignmentsForDay = scheduleState.designacoes[date];
      for (const functionId in assignmentsForDay) {
        if (functionId !== 'limpezaAposReuniaoGrupoId' && functionId !== 'limpezaSemanalResponsavel') {
           const assignedMemberId = assignmentsForDay[functionId];
           if (assignedMemberId === null || assignedMemberId === '') {
             return { success: false, error: "Existem designações em branco. Preencha todas as designações antes de finalizar." };
           }
        }
      }
    }
  
    const todosOsCronogramas = carregarTodosCronogramas() || {};
    const yearMonthKey = `${scheduleState.ano}-${String(scheduleState.mes + 1).padStart(2, '0')}`;
  
    todosOsCronogramas[yearMonthKey] = {
        schedule: scheduleState.designacoes,
        mes: scheduleState.mes,
        ano: scheduleState.ano,
        status: 'finalizado',
    };
    salvarTodosCronogramas(todosOsCronogramas);
    
    // O cache deve refletir o estado finalizado
    persistScheduleToStateAndCache(scheduleState.designacoes, scheduleState.mes, scheduleState.ano, 'finalizado');
    // limparStorageCacheDesignacoes(); // Não limpar o cache, mas sim atualizá-lo para 'finalizado'
    
    return { success: true };
  }, [scheduleState, persistScheduleToStateAndCache]);

  const carregarDesignacoes = useCallback((mes: number, ano: number) => {
    const todosCronogramas = carregarTodosCronogramas();
    const yearMonthKey = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const saved = todosCronogramas ? todosCronogramas[yearMonthKey] : null;

    if (saved) {
      persistScheduleToStateAndCache(saved.schedule, saved.mes, saved.ano, saved.status);
    } else {
      persistScheduleToStateAndCache(null, mes, ano, null); // Limpa se não encontrado, mas mantém mês/ano selecionados
    }
  }, [persistScheduleToStateAndCache]);

  return {
    scheduleData: scheduleState.designacoes,
    scheduleMes: scheduleState.mes,
    scheduleAno: scheduleState.ano,
    status: scheduleState.status,
    generateNewSchedule,
    confirmManualAssignmentOrSubstitution,
    updateLimpezaAssignment,
    clearMainScheduleAndCache,
    salvarDesignacoes,
    finalizarCronograma, // Exportar a função de finalizar
    carregarDesignacoes,
  };
}
