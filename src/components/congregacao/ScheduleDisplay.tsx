
'use client';

import React from 'react';
import type { Membro, DesignacoesFeitas, Designacao, SubstitutionDetails } from '@/lib/congregacao/types';
import { FUNCOES_DESIGNADAS, NOMES_MESES, NOMES_DIAS_SEMANA_ABREV, DIAS_REUNIAO, DIAS_SEMANA_REUNIAO_CORES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID } from '@/lib/congregacao/constants';
import { ScheduleTable } from './ScheduleTable';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatarDataCompleta, getRealFunctionId } from '@/lib/congregacao/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


export function prepararDadosTabela(
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return;
    const dataObj = new Date(dataStr + 'T00:00:00');
    if (isNaN(dataObj.getTime())) return;

    if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
        const diaSemana = dataObj.getUTCDay();
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
      { key: 'indicadorExterno', label: 'Indicador Externo' },
      { key: 'indicadorPalco', label: 'Indicador Palco' },
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
        indicadorExterno: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorExternoQui' : 'indicadorExternoDom',
        indicadorPalco: (diaSemanaIndex: number) => diaSemanaIndex === DIAS_REUNIAO.meioSemana ? 'indicadorPalcoQui' : 'indicadorPalcoDom',
      }
      const remappedDataIndicadores = dataTabela.map((row, index) => {
        const dataObj = new Date(sortedDates[index] + 'T00:00:00');
        const diaSemanaIndex = dataObj.getUTCDay();
        return {
            ...row,
            indicadorExterno: row[MAPPED_COL_KEYS_INDICADORES.indicadorExterno(diaSemanaIndex)],
            indicadorPalco: row[MAPPED_COL_KEYS_INDICADORES.indicadorPalco(diaSemanaIndex)],
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


interface ScheduleDisplayProps {
    designacoesFeitas: DesignacoesFeitas;
    membros: Membro[];
    mes: number;
    ano: number;
    onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
    onOpenAVMemberSelectionDialog: (dateStr: string, functionId: string, columnKey: string, currentMemberId: string | null) => void;
    onLimpezaChange: (dateKey: string, type: 'aposReuniao' | 'semanal', value: string | null) => void;
 status: string | null;
}

// Helper function to get ISO week number
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
}


export function ScheduleDisplay({
    designacoesFeitas,
    membros,
    mes,
    ano,
    onOpenSubstitutionModal,
    onOpenAVMemberSelectionDialog,
    onLimpezaChange,
 status,
}: ScheduleDisplayProps) {
  const { toast } = useToast();

  if (!designacoesFeitas || Object.keys(designacoesFeitas).length === 0) {
    return null;
  }


  const dadosIndicadores = prepararDadosTabela(designacoesFeitas, mes, ano, 'Indicadores');
  const dadosVolantes = prepararDadosTabela(designacoesFeitas, mes, ano, 'Volantes');
  const dadosAV = prepararDadosTabela(designacoesFeitas, mes, ano, 'AV');

  const handleCellClick = (
    date: string,
    columnKey: string,
    originalMemberId: string | null,
    originalMemberName: string | null,
    tableTitle: string
  ) => {
 if (status === 'finalizado') {
 return; // Do nothing if the schedule is finalized
 }

    const realFunctionId = getRealFunctionId(columnKey, date, tableTitle);

    if (tableTitle === 'Áudio/Vídeo (AV)') {
      onOpenAVMemberSelectionDialog(date, realFunctionId, columnKey, originalMemberId);
    } else {
      if (originalMemberId && originalMemberName) {
        onOpenSubstitutionModal({ date, functionId: realFunctionId, originalMemberId, originalMemberName, currentFunctionGroupId: tableTitle });
      } else {
        onOpenSubstitutionModal({ date, functionId: realFunctionId, originalMemberId: '', originalMemberName: "Ninguém Designado", currentFunctionGroupId: tableTitle });
      }
    }
  };

  const hasIndicadoresData = dadosIndicadores.data.length > 0 && dadosIndicadores.data.some(row => Object.keys(row).some(key => key !== 'data' && key !== 'diaSemanaBadgeColor' && row[key]));
  const hasVolantesData = dadosVolantes.data.length > 0 && dadosVolantes.data.some(row => Object.keys(row).some(key => key !== 'data' && key !== 'diaSemanaBadgeColor' && row[key]));

  const hasAnyMeetingDates = dadosIndicadores.fullDateStrings.length > 0 || dadosVolantes.fullDateStrings.length > 0 || dadosAV.fullDateStrings.length > 0;
  const hasAVDataStructure = hasAnyMeetingDates;

  const hasAnyDataForMonth = Object.values(designacoesFeitas).some(dayAssignments =>
    Object.keys(dayAssignments).length > 0 && Object.values(dayAssignments).some(val => val !== null && val !== '' && val !== NONE_GROUP_ID)
  );

  const hasLimpezaData = Object.values(designacoesFeitas).some(d => d.limpezaAposReuniaoGrupoId || d.limpezaSemanalResponsavel);

  if (!hasAnyDataForMonth && !hasAVDataStructure && !hasLimpezaData) {
     return <p className="text-muted-foreground text-center py-4">Nenhuma designação para {NOMES_MESES[mes]} de {ano}. Gere o cronograma ou adicione manualmente.</p>;
  }

  const getMeetingDatesForCleaning = (currentMes: number, currentAno: number): Date[] => {
    const dates: Date[] = [];
    const firstDay = new Date(Date.UTC(currentAno, currentMes, 1));
    const lastDayOfMonth = new Date(Date.UTC(currentAno, currentMes + 1, 0)).getUTCDate();
    for (let day = 1; day <= lastDayOfMonth; day++) {
        const currentDate = new Date(Date.UTC(currentAno, currentMes, day));
        const dayOfWeek = currentDate.getUTCDay();
        if (dayOfWeek === DIAS_REUNIAO.meioSemana || dayOfWeek === DIAS_REUNIAO.publica) {
            dates.push(currentDate);
        }
    }
    return dates.sort((a,b) => a.getTime() - b.getTime());
  };

  const meetingDatesForCleaning = getMeetingDatesForCleaning(mes, ano);

  const weeksForCleaning = React.useMemo(() => {
    if (!meetingDatesForCleaning || meetingDatesForCleaning.length === 0) return [];
    const weeks: { weekLabel: string, dateKey: string }[] = [];
    const processedWeeks = new Set<string>();

    meetingDatesForCleaning.forEach(date => {
      const sunday = new Date(date);
      sunday.setUTCDate(date.getUTCDate() - date.getUTCDay());

      const year = sunday.getUTCFullYear();
      const month = sunday.getUTCMonth();
      const day = sunday.getUTCDate();

      const dateKey = formatarDataCompleta(sunday);
      const weekIdForSet = `${year}-${getISOWeek(sunday)}`;

      if (!processedWeeks.has(weekIdForSet)) {
        const monthAbbrev = NOMES_MESES[month]?.substring(0, 3).toLowerCase() || '';
        const weekLabel = `Semana ${day.toString().padStart(2, '0')}-${monthAbbrev}.`;
        weeks.push({ weekLabel, dateKey });
        processedWeeks.add(weekIdForSet);
      }
    });
    return weeks.sort((a,b) => a.dateKey.localeCompare(b.dateKey));
  }, [mes, ano, meetingDatesForCleaning]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
          <ScheduleTable
            title="Indicadores"
            data={dadosIndicadores.data}
            columns={dadosIndicadores.columns}
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosIndicadores.fullDateStrings}
 isReadOnly={status === 'finalizado'}
          />
          <ScheduleTable
            title="Volantes"
            data={dadosVolantes.data}
            columns={dadosVolantes.columns}
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosVolantes.fullDateStrings}
 isReadOnly={status === 'finalizado'}
          />
          <ScheduleTable
            title="Áudio/Vídeo (AV)"
            data={dadosAV.data}
            columns={dadosAV.columns}
            allMembers={membros}
            onCellClick={handleCellClick}
            currentFullDateStrings={dadosAV.fullDateStrings}
            isAVTable={true}
 isReadOnly={status === 'finalizado'}
          />
      </div>

      {/* Seção de Limpeza */}
      {(meetingDatesForCleaning.length > 0 || weeksForCleaning.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Limpeza</CardTitle></CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-x-6 gap-y-4">
            {/* Coluna Limpeza Após Reunião */}
            <div className="flex-1 space-y-3 min-w-[280px]">
              <h4 className="font-medium text-md text-foreground">Limpeza Após a Reunião</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {meetingDatesForCleaning.map(dateObj => {
                  const dateStr = formatarDataCompleta(dateObj);
                  const dia = dateObj.getUTCDate();
                  const diaSemanaIndex = dateObj.getUTCDay();
                  const diaAbrev = NOMES_DIAS_SEMANA_ABREV[diaSemanaIndex];
                  const badgeColorClass = diaSemanaIndex === DIAS_REUNIAO.meioSemana ? DIAS_SEMANA_REUNIAO_CORES.meioSemana : DIAS_SEMANA_REUNIAO_CORES.publica;
                  const currentGroupId = designacoesFeitas[dateStr]?.limpezaAposReuniaoGrupoId;

                  return (
                    <div key={dateStr} className="flex items-center gap-3">
                      <div className="flex items-center space-x-2 w-24">
                         <span>{dia.toString().padStart(2,'0')}</span>
                         <Badge variant="outline" className={badgeColorClass}>{diaAbrev}</Badge>
                      </div>
                      <Select
                        value={currentGroupId ?? NONE_GROUP_ID}
                        onValueChange={(value) => onLimpezaChange(dateStr, 'aposReuniao', value === NONE_GROUP_ID ? null : value)}
 disabled={status === 'finalizado'}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="Selecione o grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRUPOS_LIMPEZA_APOS_REUNIAO.map(grupo => (
                            <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna Limpeza Semanal */}
            <div className="flex-1 space-y-3 min-w-[280px]">
              <h4 className="font-medium text-md text-foreground">Limpeza Semanal</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {weeksForCleaning.map(week => {
                  const currentResponsavel = designacoesFeitas[week.dateKey]?.limpezaSemanalResponsavel || '';
                  return (
                    <div key={week.dateKey} className="flex items-center gap-3">
                      <Label htmlFor={`limpeza-semanal-${week.dateKey}`} className="w-32 text-sm">{week.weekLabel}</Label>
                      <Input
                        id={`limpeza-semanal-${week.dateKey}`}
                        value={currentResponsavel}
                        onChange={(e) => onLimpezaChange(week.dateKey, 'semanal', e.target.value)}
                        placeholder="Responsáveis"
 disabled={status === 'finalizado'}
                        className="flex-1 h-9 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
