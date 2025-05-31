
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV } from './constants';
import { formatarDataCompleta } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


// Helper para obter nome do membro
const getMemberName = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return '--';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

// Helper function to get ISO week number (consistent with ScheduleDisplay)
function getISOWeekPdf(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // sunday = 0, make it 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
}

// Helper para obter todas as datas de reunião no mês (consistente com ScheduleDisplay)
const getMeetingDatesForMonth = (currentMes: number, currentAno: number): Date[] => {
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


export function generateSchedulePdf(
  scheduleData: DesignacoesFeitas,
  membros: Membro[],
  mes: number,
  ano: number
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = 20;


  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  doc.setFontSize(18);
  doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });

  let startY = 70;

  const commonTableOptions: any = {
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      overflow: 'linebreak',
      font: "helvetica",
    },
    headStyles: {
      fillColor: [34, 63, 49], 
      textColor: [245, 241, 232], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    bodyStyles: {
        valign: 'middle',
        halign: 'center',
    },
    columnStyles: {
        0: { halign: 'left', cellWidth: 'auto'},
    },
    margin: { top: 60, right: pageMargin, bottom: 30, left: pageMargin },
    pageBreak: 'auto',
  };
  
  const prepararDadosParaPdfTabela = (
    tipoTabela: 'Indicadores' | 'Volantes' | 'AV'
  ): { head: any[][], body: any[][], title: string, hasData: boolean } => {
    const { data: dadosFormatados, columns } = prepararDadosTabelaOriginal(scheduleData, mes, ano, tipoTabela);

    const head = [columns.map(col => col.label)];
    const body = dadosFormatados.map((row) => {
        return columns.map(col => {
            if (col.key === 'data') {
                 const [dia, diaAbrev] = (row.data as string).split(' ');
                 return `${dia}\n${diaAbrev}`;
            }
            const memberId = row[col.key] as string | null;
            return getMemberName(memberId, membros);
        });
    });
    
    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'Desconhecido'));

    return { head, body, title: tipoTabela, hasData };
  };

  const addTableToDoc = (title: string, head: any[][], body: any[][], addTopMargin = true) => {
    const tableTitleHeight = 20; // Espaço para o título da seção
    const estimatedCellHeight = 15; // Estimativa por linha
    const headerHeight = 20; // Estimativa altura do cabeçalho da tabela
    const estimatedTableHeight = headerHeight + (body.length * estimatedCellHeight) + tableTitleHeight;

    if (addTopMargin && startY + estimatedTableHeight > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, commonTableOptions.margin.left, startY - 8);
    autoTable(doc, {
      ...commonTableOptions,
      head: head,
      body: body,
      startY: startY,
    });
    startY = (doc as any).lastAutoTable.finalY + 20; // Aumentar um pouco o espaço entre tabelas
  };

  const { head: headIndicadores, body: bodyIndicadores, hasData: temIndicadores } = prepararDadosParaPdfTabela('Indicadores');
  if (temIndicadores) {
    addTableToDoc("Indicadores", headIndicadores, bodyIndicadores);
  }

  const { head: headVolantes, body: bodyVolantes, hasData: temVolantes } = prepararDadosParaPdfTabela('Volantes');
   if (temVolantes) {
    addTableToDoc("Volantes", headVolantes, bodyVolantes);
  }

  const { head: headAV, body: bodyAV } = prepararDadosParaPdfTabela('AV');
  const allMeetingDatesForMonth = getMeetingDatesForMonth(mes, ano);
  if (allMeetingDatesForMonth.length > 0) { // Mostrar tabela AV se houver dias de reunião, mesmo sem designações
    addTableToDoc("Áudio/Vídeo (AV)", headAV, bodyAV);
  }

  // Seção de Limpeza
  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];

  allMeetingDatesForMonth.forEach(dateObj => {
    const dateStr = formatarDataCompleta(dateObj);
    const dia = dateObj.getUTCDate();
    const diaAbrev = NOMES_DIAS_SEMANA_ABREV[dateObj.getUTCDay()];
    const designacaoDia = scheduleData[dateStr];
    
    if (designacaoDia?.limpezaAposReuniaoGrupoId && designacaoDia.limpezaAposReuniaoGrupoId !== NONE_GROUP_ID) {
      const grupo = GRUPOS_LIMPEZA_APOS_REUNIAO.find(g => g.id === designacaoDia.limpezaAposReuniaoGrupoId);
      limpezaAposReuniaoData.push([`${dia} ${diaAbrev}`, grupo ? grupo.nome : 'N/D']);
    }
  });

  const weeksForCleaningPdf: { weekLabel: string, dateKey: string }[] = [];
  const processedWeeksPdf = new Set<string>();

  allMeetingDatesForMonth.forEach(date => { 
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() - date.getUTCDay()); 
    const year = sunday.getUTCFullYear();
    const monthAbr = NOMES_MESES[sunday.getUTCMonth()]?.substring(0, 3).toLowerCase() || '';
    const day = sunday.getUTCDate();
    const dateKey = formatarDataCompleta(sunday); 
    const weekIdForSet = `${year}-${getISOWeekPdf(sunday)}`;

    if (!processedWeeksPdf.has(weekIdForSet)) {
      const weekLabel = `Semana ${day.toString().padStart(2, '0')}-${monthAbr}.`;
      weeksForCleaningPdf.push({ weekLabel, dateKey });
      processedWeeksPdf.add(weekIdForSet);
    }
  });
  weeksForCleaningPdf.sort((a,b) => a.dateKey.localeCompare(b.dateKey));

  weeksForCleaningPdf.forEach(week => {
    const responsavel = scheduleData[week.dateKey]?.limpezaSemanalResponsavel;
    if (responsavel && responsavel.trim() !== '') {
      limpezaSemanalData.push([week.weekLabel, responsavel]);
    }
  });

  if (limpezaAposReuniaoData.length > 0 || limpezaSemanalData.length > 0) {
     const cleaningSectionTitleHeight = 30; // Espaço para título "Limpeza"
     const estimatedCleaningTableHeight = Math.max(limpezaAposReuniaoData.length, limpezaSemanalData.length) * 15 + 50; // Estimativa
     
     if (startY + estimatedCleaningTableHeight + cleaningSectionTitleHeight > pageHeight - commonTableOptions.margin.bottom) { 
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", commonTableOptions.margin.left, startY - 8);
  
    const cleaningTableOptions = {
      ...commonTableOptions,
      styles: { ...commonTableOptions.styles, fontSize: 7, cellPadding: 1.5 },
      headStyles: { ...commonTableOptions.headStyles, fontSize: 7.5 },
      columnStyles: { // Alinhamento específico para tabelas de limpeza
          0: { halign: 'left', cellWidth: 'auto'},
          1: { halign: 'left', cellWidth: 'auto'},
      },
    };

    if (limpezaAposReuniaoData.length > 0) {
        autoTable(doc, {
            ...cleaningTableOptions,
            head: [['Data', 'Grupo Responsável (Após Reunião)']],
            body: limpezaAposReuniaoData,
            startY: startY,
        });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (limpezaSemanalData.length > 0) {
       if (startY + (limpezaSemanalData.length * 15) + 50 > pageHeight - commonTableOptions.margin.bottom && limpezaAposReuniaoData.length > 0) {
          doc.addPage();
          startY = commonTableOptions.margin.top;
       }
        autoTable(doc, {
            ...cleaningTableOptions,
            head: [['Semana', 'Responsáveis (Limpeza Semanal)']],
            body: limpezaSemanalData,
            startY: startY,
        });
         startY = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
