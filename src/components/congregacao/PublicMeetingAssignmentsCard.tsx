
'use client';

import React from 'react';
import type { Membro, DesignacoesFeitas, Designacao, SubstitutionDetails } from '@/lib/congregacao/types';
import { NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES } from '@/lib/congregacao/constants';
import { formatarDataCompleta } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleTable } from './ScheduleTable'; // Reutilizando ScheduleTable
import { BookOpen, UserCheck } from 'lucide-react';

interface PublicMeetingAssignmentsCardProps {
  allMembers: Membro[];
  assignments: DesignacoesFeitas | null;
  month: number | null;
  year: number | null;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
}

export function PublicMeetingAssignmentsCard({
  allMembers,
  assignments,
  month,
  year,
  onOpenSubstitutionModal,
}: PublicMeetingAssignmentsCardProps) {
  if (assignments === null || month === null || year === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5 text-primary" /> Reunião Pública</CardTitle>
          <CardDescription>Designações para Presidente e Leitor de A Sentinela.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Gere o cronograma na aba "Indicadores/Volantes/AV/Limpeza" primeiro para ver as designações aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const publicMeetingData: Designacao[] = [];
  const fullDateStringsForTable: string[] = [];

  const primeiroDiaDoMes = new Date(Date.UTC(year, month, 1));
  const ultimoDiaDoMes = new Date(Date.UTC(year, month + 1, 0));

  for (let dia = new Date(primeiroDiaDoMes); dia <= ultimoDiaDoMes; dia.setUTCDate(dia.getUTCDate() + 1)) {
    if (dia.getUTCDay() === DIAS_REUNIAO.publica) { // Apenas Domingos
      const dateStr = formatarDataCompleta(dia);
      const dayAssignments = assignments[dateStr];

      if (dayAssignments) {
        publicMeetingData.push({
          data: `${dia.getUTCDate()} ${NOMES_DIAS_SEMANA_ABREV[dia.getUTCDay()]}`,
          diaSemanaBadgeColor: DIAS_SEMANA_REUNIAO_CORES.publica,
          presidenteReuniaoPublicaDom: dayAssignments['presidenteReuniaoPublicaDom'],
          leitorASentinelaDom: dayAssignments['leitorASentinelaDom'],
        });
        fullDateStringsForTable.push(dateStr);
      } else {
        // Adicionar linha vazia se não houver designações para um domingo específico (pouco provável se o cronograma foi gerado)
         publicMeetingData.push({
          data: `${dia.getUTCDate()} ${NOMES_DIAS_SEMANA_ABREV[dia.getUTCDay()]}`,
          diaSemanaBadgeColor: DIAS_SEMANA_REUNIAO_CORES.publica,
          presidenteReuniaoPublicaDom: null,
          leitorASentinelaDom: null,
        });
        fullDateStringsForTable.push(dateStr);
      }
    }
  }
  
  const columns = [
    { key: 'data', label: 'Data' },
    { key: 'presidenteReuniaoPublicaDom', label: 'Presidente da Reunião Pública' },
    { key: 'leitorASentinelaDom', label: 'Leitor de A Sentinela' },
  ];

  const handleNameClick = (
    dateClicked: string, // YYYY-MM-DD from fullDateStringsForTable
    columnKey: string, // 'presidenteReuniaoPublicaDom' or 'leitorASentinelaDom'
    originalMemberId: string,
    originalMemberName: string | null
  ) => {
    // columnKey já é o functionId correto aqui
    onOpenSubstitutionModal({
      date: dateClicked,
      functionId: columnKey,
      originalMemberId,
      originalMemberName,
      currentFunctionGroupId: 'ReuniaoPublica', // ou um nome mais específico se necessário
    });
  };
  
  if (publicMeetingData.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5 text-primary" /> Reunião Pública</CardTitle>
          <CardDescription>Designações para Presidente e Leitor de A Sentinela.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Não há domingos ou nenhuma designação para Reunião Pública neste mês.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary" /> Designações da Reunião Pública</CardTitle>
        <CardDescription>
          Lista de Presidentes da Reunião Pública e Leitores de A Sentinela para os domingos do mês selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScheduleTable
          title="" // O título do card já é suficiente
          data={publicMeetingData}
          columns={columns}
          allMembers={allMembers}
          onNameClick={handleNameClick}
          currentFullDateStrings={fullDateStringsForTable}
        />
      </CardContent>
    </Card>
  );
}

    