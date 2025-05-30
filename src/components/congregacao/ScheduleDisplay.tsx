
'use client';

import React from 'react';
import type { Membro, DesignacoesFeitas, Designacao, SubstitutionDetails } from '@/lib/congregacao/types';
import { FUNCOES_DESIGNADAS, NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES } from '@/lib/congregacao/constants';
import { ScheduleTable } from './ScheduleTable';

// getNomeMembro foi removido pois ScheduleTable tem sua própria lógica de resolução de nome.

function prepararDadosTabela(
  designacoesFeitas: DesignacoesFeitas,
  // membros: Membro[], // Não é mais necessário aqui, ScheduleTable resolve os nomes
  mes: number,
  ano: number,
  tipoTabela: 'Indicadores' | 'Volantes'
): { data: Designacao[], columns: { key: string; label: string }[], fullDateStrings: string[] } {
  
  let columns: { key: string; label: string }[];
  const dataTabela: Designacao[] = [];
  const datasNoMesComReuniao: Set<string> = new Set();
  const fullDateStrings: string[] = [];

  Object.keys(designacoesFeitas).forEach(dataStr => {
    const dataObj = new Date(dataStr + 'T00:00:00');
    if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
        const diaSemana = dataObj.getDay();
        if(diaSemana === DIAS_REUNIAO.meioSemana || diaSemana === DIAS_REUNIAO.publica) {
             datasNoMesComReuniao.add(dataStr);
        }
    }
  });

  const sortedDates = Array.from(datasNoMesComReuniao).sort();
  sortedDates.forEach(d => fullDateStrings.push(d)); // Store YYYY-MM-DD strings

  if (tipoTabela === 'Indicadores') {
    columns = [
      { key: 'data', label: 'Data' },
      { key: FUNCOES_DESIGNADAS.find(f => f.id.startsWith('indicadorExterno'))!.id, label: 'Indicador 1' }, 
      { key: FUNCOES_DESIGNADAS.find(f => f.id.startsWith('indicadorPalco'))!.id, label: 'Indicador 2' }, 
    ];

    sortedDates.forEach(dataStr => {
      const dataObj = new Date(dataStr + 'T00:00:00');
      const dia = dataObj.getDate();
      const diaSemanaIndex = dataObj.getDay();
      const diaAbrev = NOMES_DIAS_SEMANA_ABREV[diaSemanaIndex];
      
      let badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.outroDia;
      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.meioSemana;
      else if (diaSemanaIndex === DIAS_REUNIAO.publica) badgeColorClass = DIAS_SEMANA_REUNIAO_CORES.publica;

      const row: Designacao = {
        data: `${dia} ${diaAbrev}`,
        diaSemanaBadgeColor: badgeColorClass,
      };
      
      const designacoesDoDia = designacoesFeitas[dataStr] || {};

      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) { // Quinta
        row['indicadorExternoQui'] = designacoesDoDia['indicadorExternoQui']; 
        row['indicadorPalcoQui'] = designacoesDoDia['indicadorPalcoQui'];   
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) { // Domingo
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
        const diaSemanaIndex = dataObj.getDay();
        return {
            ...row,
            indicador1: row[MAPPED_COL_KEYS_INDICADORES.indicador1(diaSemanaIndex)],
            indicador2: row[MAPPED_COL_KEYS_INDICADORES.indicador2(diaSemanaIndex)],
        }
      });
      return { data: remappedDataIndicadores, columns: [
        { key: 'data', label: 'Data' },
        { key: 'indicador1', label: 'Indicador 1' },
        { key: 'indicador2', label: 'Indicador 2' },
      ], fullDateStrings };


  } else if (tipoTabela === 'Volantes') {
    const MAPPED_COL_KEYS_VOLANTES = {
        volante1: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'volante1Qui' : 'volante1Dom',
        volante2: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'volante2Qui' : 'volante2Dom',
    }
    const dataTabelaVolantes: Designacao[] = [];
     sortedDates.forEach(dataStr => {
      const dataObj = new Date(dataStr + 'T00:00:00');
      const dia = dataObj.getDate();
      const diaSemanaIndex = dataObj.getDay();
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
        const diaSemanaIndex = dataObj.getDay();
        return {
            ...row,
            volante1: row[MAPPED_COL_KEYS_VOLANTES.volante1(diaSemanaIndex)],
            volante2: row[MAPPED_COL_KEYS_VOLANTES.volante2(diaSemanaIndex)],
        }
      });
    return { data: remappedDataVolantes, columns: [
        { key: 'data', label: 'Data' },
        { key: 'volante1', label: 'Volante 1' },
        { key: 'volante2', label: 'Volante 2' },
    ], fullDateStrings };

  } else { 
    columns = [];
  }
  
  return { data: dataTabela, columns, fullDateStrings };
}

// Helper para obter o ID da função real com base na chave da coluna e data
const getRealFunctionId = (columnKey: string, dateStr: string, tipoTabela: string): string => {
    const dataObj = new Date(dateStr + "T00:00:00");
    const diaSemanaIndex = dataObj.getDay();
    const isMeioSemana = diaSemanaIndex === DIAS_REUNIAO.meioSemana;

    if (tipoTabela === 'Indicadores') {
        if (columnKey === 'indicador1') return isMeioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom';
        if (columnKey === 'indicador2') return isMeioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom';
    } else if (tipoTabela === 'Volantes') {
        if (columnKey === 'volante1') return isMeioSemana ? 'volante1Qui' : 'volante1Dom';
        if (columnKey === 'volante2') return isMeioSemana ? 'volante2Qui' : 'volante2Dom';
    }
    return columnKey; // Fallback
};


export function ScheduleDisplay({ designacoesFeitas, membros, mes, ano, onOpenSubstitutionModal }: ScheduleDisplayProps) {
  if (!designacoesFeitas) {
    return <p className="text-muted-foreground text-center py-4">Nenhuma designação gerada.</p>;
  }

  const dadosIndicadores = prepararDadosTabela(designacoesFeitas, mes, ano, 'Indicadores');
  const dadosVolantes = prepararDadosTabela(designacoesFeitas, mes, ano, 'Volantes');

  const handleNameClick = (
    date: string, // YYYY-MM-DD
    columnKey: string, // e.g., 'indicador1', 'volante2'
    originalMemberId: string, 
    originalMemberName: string | null,
    functionGroupId: string // 'Indicadores' ou 'Volantes'
  ) => {
    const realFunctionId = getRealFunctionId(columnKey, date, functionGroupId);
    onOpenSubstitutionModal({ date, functionId: realFunctionId, originalMemberId, originalMemberName, currentFunctionGroupId: functionGroupId });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <ScheduleTable 
          title="Indicadores" 
          data={dadosIndicadores.data} 
          columns={dadosIndicadores.columns} 
          allMembers={membros}
          onNameClick={handleNameClick}
          currentFullDateStrings={dadosIndicadores.fullDateStrings}
        />
        <ScheduleTable 
          title="Volantes" 
          data={dadosVolantes.data} 
          columns={dadosVolantes.columns} 
          allMembers={membros}
          onNameClick={handleNameClick}
          currentFullDateStrings={dadosVolantes.fullDateStrings}
        />
      </div>
    </div>
  );
}
