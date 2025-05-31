
'use client';

import React from 'react';
import type { Membro, DesignacoesFeitas, Designacao, SubstitutionDetails } from '@/lib/congregacao/types';
import { FUNCOES_DESIGNADAS, NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES } from '@/lib/congregacao/constants';
import { ScheduleTable } from './ScheduleTable';
import { useToast } from "@/hooks/use-toast";


function prepararDadosTabela(
  designacoesFeitas: DesignacoesFeitas,
  mes: number,
  ano: number,
  tipoTabela: 'Indicadores' | 'Volantes' | 'AV'
): { data: Designacao[], columns: { key: string; label: string }[], fullDateStrings: string[] } {
  
  let columns: { key: string; label: string }[];
  const dataTabela: Designacao[] = [];
  const datasNoMesComReuniao: Set<string> = new Set();
  const fullDateStrings: string[] = [];

  Object.keys(designacoesFeitas).forEach(dataStr => {
    const dataObj = new Date(dataStr + 'T00:00:00');
    if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
        const diaSemana = dataObj.getUTCDay(); // Use getUTCDay para consistência
        if(diaSemana === DIAS_REUNIAO.meioSemana || diaSemana === DIAS_REUNIAO.publica) {
             datasNoMesComReuniao.add(dataStr);
        }
    }
  });

  const sortedDates = Array.from(datasNoMesComReuniao).sort();
  sortedDates.forEach(d => fullDateStrings.push(d)); 

  if (tipoTabela === 'Indicadores') {
    columns = [
      { key: 'data', label: 'Data' },
      { key: 'indicador1', label: 'Indicador 1' },
      { key: 'indicador2', label: 'Indicador 2' },
    ];

    sortedDates.forEach(dataStr => {
      const dataObj = new Date(dataStr + 'T00:00:00');
      const dia = dataObj.getUTCDate();
      const diaSemanaIndex = dataObj.getUTCDay();
      const diaAbrev = NOMES_DIAS_SEMANA_ABREV[diaSemanaIndex];
      
      let badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.outroDia;
      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.meioSemana;
      else if (diaSemanaIndex === DIAS_REUNIAO.publica) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.publica;

      const row: Designacao = {
        data: `${dia} ${diaAbrev}`,
        diaSemanaBadgeColor: badgeColorClass,
      };
      
      const designacoesDoDia = designacoesFeitas[dataStr] || {};

      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) { 
        row['indicadorExternoQui'] = designacoesDoDia['indicadorExternoQui']; 
        row['indicadorPalcoQui'] = designacoesDoDia['indicadorPalcoQui'];   
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) { 
        row['indicadorExternoDom'] = designacoesDoDia['indicadorExternoDom'];
        row['indicadorPalcoDom'] = designacoesDoDia['indicadorPalcoDom'];
      }
      dataTabela.push(row);
    });
    
      const MAPPED_COL_KEYS_INDICADORES = {
        indicador1: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom',
        indicador2: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom',
      }
      const remappedDataIndicadores = dataTabela.map((row, index) => {
        const dataObj = new Date(sortedDates[index] + 'T00:00:00');
        const diaSemanaIndex = dataObj.getUTCDay();
        return {
            ...row,
            indicador1: row[MAPPED_COL_KEYS_INDICADORES.indicador1(diaSemanaIndex)],
            indicador2: row[MAPPED_COL_KEYS_INDICADORES.indicador2(diaSemanaIndex)],
        }
      });
      return { data: remappedDataIndicadores, columns, fullDateStrings };

  } else if (tipoTabela === 'Volantes') {
    columns = [
        { key: 'data', label: 'Data' },
        { key: 'volante1', label: 'Volante 1' },
        { key: 'volante2', label: 'Volante 2' },
    ];
    const MAPPED_COL_KEYS_VOLANTES = {
        volante1: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'volante1Qui' : 'volante1Dom',
        volante2: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'volante2Qui' : 'volante2Dom',
    }
    const dataTabelaVolantes: Designacao[] = [];
     sortedDates.forEach(dataStr => {
      const dataObj = new Date(dataStr + 'T00:00:00');
      const dia = dataObj.getUTCDate();
      const diaSemanaIndex = dataObj.getUTCDay();
      const diaAbrev = NOMES_DIAS_SEMANA_ABREV[diaSemanaIndex];
      let badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.outroDia;
      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.meioSemana;
      else if (diaSemanaIndex === DIAS_REUNIAO.publica) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.publica;

      const designacoesDoDia = designacoesFeitas[dataStr] || {};
      const row: Designacao = { data: `${dia} ${diaAbrev}`, diaSemanaBadgeColor: badgeColorClass };
      
      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) {
        row['volante1Qui'] = designacoesDoDia['volante1Qui'];
        row['volante2Qui'] = designacoesDoDia['volante2Qui'];
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) {
        row['volante1Dom'] = designacoesDoDia['volante1Dom'];
        row['volante2Dom'] = designacoesDoDia['volante2Dom'];
      }
      dataTabelaVolantes.push(row);
    });

     const remappedDataVolantes = dataTabelaVolantes.map((row, index) => {
        const dataObj = new Date(sortedDates[index] + 'T00:00:00');
        const diaSemanaIndex = dataObj.getUTCDay();
        return {
            ...row,
            volante1: row[MAPPED_COL_KEYS_VOLANTES.volante1(diaSemanaIndex)],
            volante2: row[MAPPED_COL_KEYS_VOLANTES.volante2(diaSemanaIndex)],
        }
      });
    return { data: remappedDataVolantes, columns, fullDateStrings };
  } else if (tipoTabela === 'AV') {
    columns = [
        { key: 'data', label: 'Data' },
        { key: 'video', label: 'Vídeo' },
        { key: 'indicadorZoom', label: 'Indicador Zoom' },
        { key: 'backupAV', label: 'Backup' },
    ];
    const MAPPED_COL_KEYS_AV = {
        video: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'avVideoQui' : 'avVideoDom',
        indicadorZoom: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'avIndicadorZoomQui' : 'avIndicadorZoomDom',
        backupAV: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'avBackupQui' : 'avBackupDom',
    };
    const dataTabelaAV: Designacao[] = [];
    sortedDates.forEach(dataStr => {
        const dataObj = new Date(dataStr + 'T00:00:00');
        const dia = dataObj.getUTCDate();
        const diaSemanaIndex = dataObj.getUTCDay();
        const diaAbrev = NOMES_DIAS_SEMANA_ABREV[diaSemanaIndex];
        let badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.outroDia;
        if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.meioSemana;
        else if (diaSemanaIndex === DIAS_REUNIAO.publica) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.publica;

        const designacoesDoDia = designacoesFeitas[dataStr] || {};
        const row: Designacao = { data: `${dia} ${diaAbrev}`, diaSemanaBadgeColor: badgeColorClass };
        
        if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) {
            row['avVideoQui'] = designacoesDoDia['avVideoQui'];
            row['avIndicadorZoomQui'] = designacoesDoDia['avIndicadorZoomQui'];
            row['avBackupQui'] = designacoesDoDia['avBackupQui'];
        } else if (diaSemanaIndex === DIAS_REUNIAO.publica) {
            row['avVideoDom'] = designacoesDoDia['avVideoDom'];
            row['avIndicadorZoomDom'] = designacoesDoDia['avIndicadorZoomDom'];
            row['avBackupDom'] = designacoesDoDia['avBackupDom'];
        }
        dataTabelaAV.push(row);
    });

    const remappedDataAV = dataTabelaAV.map((row, index) => {
        const dataObj = new Date(sortedDates[index] + 'T00:00:00');
        const diaSemanaIndex = dataObj.getUTCDay();
        return {
            ...row,
            video: row[MAPPED_COL_KEYS_AV.video(diaSemanaIndex)],
            indicadorZoom: row[MAPPED_COL_KEYS_AV.indicadorZoom(diaSemanaIndex)],
            backupAV: row[MAPPED_COL_KEYS_AV.backupAV(diaSemanaIndex)],
        };
    });
    return { data: remappedDataAV, columns, fullDateStrings };
  } else { 
    columns = [];
  }
  
  return { data: dataTabela, columns, fullDateStrings };
}

export const getRealFunctionId = (columnKey: string, dateStr: string, tipoTabela: string): string => {
    const dataObj = new Date(dateStr + "T00:00:00");
    const diaSemanaIndex = dataObj.getUTCDay();
    const isMeioSemana = diaSemanaIndex === DIAS_REUNIAO.meioSemana;

    if (tipoTabela === 'Indicadores') {
        if (columnKey === 'indicador1') return isMeioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom';
        if (columnKey === 'indicador2') return isMeioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom';
    } else if (tipoTabela === 'Volantes') {
        if (columnKey === 'volante1') return isMeioSemana ? 'volante1Qui' : 'volante1Dom';
        if (columnKey === 'volante2') return isMeioSemana ? 'volante2Qui' : 'volante2Dom';
    } else if (tipoTabela === 'Áudio/Vídeo (AV)') { // Nome da tabela como usado no title
        if (columnKey === 'video') return isMeioSemana ? 'avVideoQui' : 'avVideoDom';
        if (columnKey === 'indicadorZoom') return isMeioSemana ? 'avIndicadorZoomQui' : 'avIndicadorZoomDom';
        if (columnKey === 'backupAV') return isMeioSemana ? 'avBackupQui' : 'avBackupDom';
    }
    return columnKey; // Fallback
};

interface ScheduleDisplayProps {
    designacoesFeitas: DesignacoesFeitas;
    membros: Membro[];
    mes: number;
    ano: number;
    onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
    onOpenAVMemberSelectionDialog: (dateStr: string, functionId: string, columnKey: string, currentMemberId: string | null) => void;
}

export function ScheduleDisplay({ 
    designacoesFeitas, 
    membros, 
    mes, 
    ano, 
    onOpenSubstitutionModal,
    onOpenAVMemberSelectionDialog
}: ScheduleDisplayProps) {
  const { toast } = useToast();

  if (!designacoesFeitas || Object.keys(designacoesFeitas).length === 0) {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    if (mes === mesAtual && ano === anoAtual) {
      // Não mostra mensagem se for o mês/ano atual e não houver designações
    } else {
      return <p className="text-muted-foreground text-center py-4">Nenhuma designação gerada para {NOMES_MESES[mes]} de {ano}.</p>;
    }
    return null;
  }


  const dadosIndicadores = prepararDadosTabela(designacoesFeitas, mes, ano, 'Indicadores');
  const dadosVolantes = prepararDadosTabela(designacoesFeitas, mes, ano, 'Volantes');
  const dadosAV = prepararDadosTabela(designacoesFeitas, mes, ano, 'AV');

  const handleCellClick = (
    date: string, // YYYY-MM-DD
    columnKey: string, 
    originalMemberId: string | null, // Pode ser null se a célula estiver vazia
    originalMemberName: string | null,
    tableTitle: string 
  ) => {
    const realFunctionId = getRealFunctionId(columnKey, date, tableTitle);
    
    if (tableTitle === 'Áudio/Vídeo (AV)') {
      onOpenAVMemberSelectionDialog(date, realFunctionId, columnKey, originalMemberId);
    } else { // Indicadores ou Volantes
      if (originalMemberId && originalMemberName) { // Só abre substituição se houver alguém designado
        onOpenSubstitutionModal({ date, functionId: realFunctionId, originalMemberId, originalMemberName, currentFunctionGroupId: tableTitle });
      } else {
        toast({
            title: "Célula Vazia",
            description: "Não há ninguém designado para esta função para substituir.",
            variant: "default"
        });
      }
    }
  };

  const hasIndicadoresData = dadosIndicadores.data.length > 0 && dadosIndicadores.data.some(row => Object.keys(row).some(key => key !== 'data' && key !== 'diaSemanaBadgeColor' && row[key]));
  const hasVolantesData = dadosVolantes.data.length > 0 && dadosVolantes.data.some(row => Object.keys(row).some(key => key !== 'data' && key !== 'diaSemanaBadgeColor' && row[key]));
  // A tabela de AV será sempre exibida se houver datas de reunião no mês, para permitir preenchimento manual.
  const hasAVDataStructure = dadosAV.data.length > 0;


  const hasAnyDataForMonth = Object.values(designacoesFeitas).some(dayAssignments => 
    Object.keys(dayAssignments).length > 0 && Object.values(dayAssignments).some(val => val !== null)
  );

  if (!hasAnyDataForMonth && !hasAVDataStructure) { // Se não há dados automáticos E nem estrutura para AV manual
     return <p className="text-muted-foreground text-center py-4">Nenhuma designação para {NOMES_MESES[mes]} de {ano}. Gere o cronograma ou adicione manualmente.</p>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        {hasIndicadoresData && (
          <ScheduleTable 
            title="Indicadores" 
            data={dadosIndicadores.data} 
            columns={dadosIndicadores.columns} 
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosIndicadores.fullDateStrings}
          />
        )}
        {hasVolantesData && (
          <ScheduleTable 
            title="Volantes" 
            data={dadosVolantes.data} 
            columns={dadosVolantes.columns} 
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosVolantes.fullDateStrings}
          />
        )}
        {hasAVDataStructure && ( // Mostrar tabela de AV se houver datas de reunião, mesmo que vazia
          <ScheduleTable 
            title="Áudio/Vídeo (AV)" 
            data={dadosAV.data} 
            columns={dadosAV.columns} 
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosAV.fullDateStrings}
            isAVTable={true}
          />
        )}
      </div>
    </div>
  );
}
