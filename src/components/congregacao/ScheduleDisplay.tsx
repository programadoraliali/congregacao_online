
'use client';

import React from 'react';
import type { Membro, DesignacoesFeitas, Designacao, SubstitutionDetails } from '@/lib/congregacao/types';
import { FUNCOES_DESIGNADAS, NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES } from '@/lib/congregacao/constants';
import { ScheduleTable } from './ScheduleTable';

interface ScheduleDisplayProps {
  designacoesFeitas: DesignacoesFeitas | null;
  membros: Membro[];
  mes: number; // 0-11
  ano: number;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
}

function getNomeMembro(idMembro: string | null, membros: Membro[]): string | null {
  if (!idMembro) return null;
  const membro = membros.find(m => m.id === idMembro);
  return membro ? membro.nome : 'Desconhecido';
}

function prepararDadosTabela(
  designacoesFeitas: DesignacoesFeitas,
  membros: Membro[],
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
      { key: 'indicador1', label: 'Indicador 1' },
      { key: 'indicador2', label: 'Indicador 2' },
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
      // A função designada para Indicador 1 pode ser indicadorExternoQui ou indicadorExternoDom
      // A função designada para Indicador 2 pode ser indicadorPalcoQui ou indicadorPalcoDom
      // O `col.key` em ScheduleTable será 'indicador1' ou 'indicador2'.
      // Precisamos mapear isso de volta para o ID da função real para substituição.
      // Vamos usar o ID da função real como chave na linha de dados aqui.

      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) { // Quinta
        row['indicadorExternoQui'] = getNomeMembro(designacoesDoDia['indicadorExternoQui'], membros); // Coluna "Indicador 1" usará este ID de função
        row['indicadorPalcoQui'] = getNomeMembro(designacoesDoDia['indicadorPalcoQui'], membros);   // Coluna "Indicador 2" usará este ID de função
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) { // Domingo
        row['indicadorExternoDom'] = getNomeMembro(designacoesDoDia['indicadorExternoDom'], membros);
        row['indicadorPalcoDom'] = getNomeMembro(designacoesDoDia['indicadorPalcoDom'], membros);
      }
      dataTabela.push(row);
    });
     // Ajustar as colunas para corresponder às chaves que podem ser clicadas na ScheduleTable
     columns = [
        { key: 'data', label: 'Data' },
        { key: FUNCOES_DESIGNADAS.find(f => f.id.startsWith('indicadorExterno'))!.id, label: 'Indicador 1' }, // Usará 'indicadorExternoQui' ou 'indicadorExternoDom' como key
        { key: FUNCOES_DESIGNADAS.find(f => f.id.startsWith('indicadorPalco'))!.id, label: 'Indicador 2' }, // Usará 'indicadorPalcoQui' ou 'indicadorPalcoDom' como key
      ];
      // Reconstruir as chaves de dados para que a ScheduleTable possa usar uma chave consistente para as colunas
      // mas ainda precisamos dos nomes dos membros. A ScheduleTable passará a chave da coluna (functionId real)
      const MAPPED_COL_KEYS_INDICADORES = {
        indicador1: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom',
        indicador2: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom',
      }
      const remappedDataIndicadores = dataTabela.map(row => {
        const dataObj = new Date(sortedDates[dataTabela.indexOf(row)] + 'T00:00:00');
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
    // Lógica similar para volantes
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
      
      row[MAPPED_COL_KEYS_VOLANTES.volante1(diaSemanaIndex)] = getNomeMembro(designacoesDoDia[MAPPED_COL_KEYS_VOLANTES.volante1(diaSemanaIndex)], membros);
      row[MAPPED_COL_KEYS_VOLANTES.volante2(diaSemanaIndex)] = getNomeMembro(designacoesDoDia[MAPPED_COL_KEYS_VOLANTES.volante2(diaSemanaIndex)], membros);
      dataTabelaVolantes.push(row);
    });
     const remappedDataVolantes = dataTabelaVolantes.map(row => {
        const dataObj = new Date(sortedDates[dataTabelaVolantes.indexOf(row)] + 'T00:00:00');
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
    const dataObj = new Date(dateStr + 'T00:00:00');
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

  const dadosIndicadores = prepararDadosTabela(designacoesFeitas, membros, mes, ano, 'Indicadores');
  const dadosVolantes = prepararDadosTabela(designacoesFeitas, membros, mes, ano, 'Volantes');

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
