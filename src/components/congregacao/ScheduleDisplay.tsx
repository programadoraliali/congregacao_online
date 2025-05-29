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
  
  const funcoesDaTabela = FUNCOES_DESIGNADAS.filter(f => f.tabela === tipoTabela);
  const columns: { key: string; label: string }[] = [{ key: 'data', label: 'Data' }];
  
  funcoesDaTabela.forEach(f => {
    columns.push({ key: f.id, label: f.nome });
  });

  const dataTabela: Designacao[] = [];
  const datasNoMesComReuniao: Set<string> = new Set();

  // Collect all dates that have any assignments in designacoesFeitas
  Object.keys(designacoesFeitas).forEach(dataStr => {
    const dataObj = new Date(dataStr + 'T00:00:00'); // Ensure local timezone
    if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
        const diaSemana = dataObj.getDay();
        if(diaSemana === DIAS_REUNIAO.meioSemana || diaSemana === DIAS_REUNIAO.publica) {
             datasNoMesComReuniao.add(dataStr);
        }
    }
  });


  // Create rows for each meeting day
  const sortedDates = Array.from(datasNoMesComReuniao).sort();

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
      <div className="flex flex-col gap-6"> {/* Changed from lg:flex-row */}
        <ScheduleTable title="Indicadores" data={dadosIndicadores.data} columns={dadosIndicadores.columns} />
        <ScheduleTable title="Volantes" data={dadosVolantes.data} columns={dadosVolantes.columns} />
      </div>
      <div>
        <ScheduleTable title="Leitor & Presidente" data={dadosLeitorPresidente.data} columns={dadosLeitorPresidente.columns} />
      </div>
    </div>
  );
}
