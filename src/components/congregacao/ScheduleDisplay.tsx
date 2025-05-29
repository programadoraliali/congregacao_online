
'use client';

import React from 'react';
import type { Membro, FuncaoDesignada, DesignacoesFeitas, Designacao } from '@/lib/congregacao/types';
import { FUNCOES_DESIGNADAS, NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES } from '@/lib/congregacao/constants';
import { ScheduleTable } from './ScheduleTable';

interface ScheduleDisplayProps {
  designacoesFeitas: DesignacoesFeitas | null;
  membros: Membro[];
  mes: number; // 0-11
  ano: number;
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
  tipoTabela: 'Indicadores' | 'Volantes' | 'LeitorPresidente'
): { data: Designacao[], columns: { key: string; label: string }[] } {
  
  let columns: { key: string; label: string }[];
  const dataTabela: Designacao[] = [];
  const datasNoMesComReuniao: Set<string> = new Set();

  // Collect all dates that have any assignments in designacoesFeitas for the current month/year and are meeting days
  Object.keys(designacoesFeitas).forEach(dataStr => {
    const dataObj = new Date(dataStr + 'T00:00:00'); // Ensure local timezone
    if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
        const diaSemana = dataObj.getDay(); // 0 for Sunday, 4 for Thursday etc.
        if(diaSemana === DIAS_REUNIAO.meioSemana || diaSemana === DIAS_REUNIAO.publica) {
             datasNoMesComReuniao.add(dataStr);
        }
    }
  });

  // Create rows for each meeting day, sorted
  const sortedDates = Array.from(datasNoMesComReuniao).sort();

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
      if (diaSemanaIndex === DIAS_REUNIAO.meioSemana) { // Quinta
        row['indicador1'] = getNomeMembro(designacoesDoDia['indicadorExternoQui'], membros);
        row['indicador2'] = getNomeMembro(designacoesDoDia['indicadorPalcoQui'], membros);
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) { // Domingo
        row['indicador1'] = getNomeMembro(designacoesDoDia['indicadorExternoDom'], membros);
        row['indicador2'] = getNomeMembro(designacoesDoDia['indicadorPalcoDom'], membros);
      }
      dataTabela.push(row);
    });

  } else if (tipoTabela === 'Volantes') {
    columns = [
      { key: 'data', label: 'Data' },
      { key: 'volante1', label: 'Volante 1' },
      { key: 'volante2', label: 'Volante 2' },
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
        row['volante1'] = getNomeMembro(designacoesDoDia['volante1Qui'], membros);
        row['volante2'] = getNomeMembro(designacoesDoDia['volante2Qui'], membros);
      } else if (diaSemanaIndex === DIAS_REUNIAO.publica) { // Domingo
        row['volante1'] = getNomeMembro(designacoesDoDia['volante1Dom'], membros);
        row['volante2'] = getNomeMembro(designacoesDoDia['volante2Dom'], membros);
      }
      dataTabela.push(row);
    });
  } else { // LeitorPresidente (ou qualquer outro tipo de tabela no futuro)
    const funcoesDaTabela = FUNCOES_DESIGNADAS.filter(f => f.tabela === tipoTabela);
    columns = [{ key: 'data', label: 'Data' }];
    funcoesDaTabela.forEach(f => {
      columns.push({ key: f.id, label: f.nome });
    });

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
      funcoesDaTabela.forEach(funcao => {
        const tipoReuniaoAtual = diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
        if (funcao.tipoReuniao.includes(tipoReuniaoAtual)) {
          row[funcao.id] = getNomeMembro(designacoesDoDia[funcao.id], membros);
        } else {
          row[funcao.id] = null; // Function not applicable for this meeting type
        }
      });
      dataTabela.push(row);
    });
  }
  
  return { data: dataTabela, columns };
}


export function ScheduleDisplay({ designacoesFeitas, membros, mes, ano }: ScheduleDisplayProps) {
  if (!designacoesFeitas) {
    return <p className="text-muted-foreground text-center py-4">Nenhuma designação gerada.</p>;
  }

  const dadosIndicadores = prepararDadosTabela(designacoesFeitas, membros, mes, ano, 'Indicadores');
  const dadosVolantes = prepararDadosTabela(designacoesFeitas, membros, mes, ano, 'Volantes');
  const dadosLeitorPresidente = prepararDadosTabela(designacoesFeitas, membros, mes, ano, 'LeitorPresidente');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <ScheduleTable title="Indicadores" data={dadosIndicadores.data} columns={dadosIndicadores.columns} />
        <ScheduleTable title="Volantes" data={dadosVolantes.data} columns={dadosVolantes.columns} />
      </div>
      <div>
        <ScheduleTable title="Leitor & Presidente" data={dadosLeitorPresidente.data} columns={dadosLeitorPresidente.columns} />
      </div>
    </div>
  );
}

