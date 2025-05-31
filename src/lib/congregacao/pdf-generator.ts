
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
  const contentWidth = pageWidth - 2 * pageMargin;


  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  doc.setFontSize(18);
  doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });

  let startY = 70;

  const commonTableOptions: any = {
    theme: 'grid',
    styles: {
      fontSize: 8.5, // Aumentado
      cellPadding: 2.5, // Aumentado
      overflow: 'linebreak',
      font: "helvetica",
    },
    headStyles: {
      fillColor: [34, 63, 49], 
      textColor: [245, 241, 232], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9, // Aumentado
      cellPadding: 3, // Adicionado
    },
    bodyStyles: {
        valign: 'middle',
        halign: 'center',
    },
    columnStyles: {
        0: { halign: 'left', cellWidth: 'auto'}, // Date column
    },
    margin: { top: 0, right: pageMargin, bottom: 30, left: pageMargin }, // margin.top é para o documento, startY controla tabelas
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
                 return `${dia} ${diaAbrev}`; // Data em uma linha
            }
            const memberId = row[col.key] as string | null;
            return getMemberName(memberId, membros);
        });
    });
    
    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'Desconhecido'));

    return { head, body, title: tipoTabela, hasData };
  };

  const addTableToDoc = (title: string, head: any[][], body: any[][], currentStartY: number, tableOptions: any = commonTableOptions): number => {
    const tableTitleHeight = 20; 
    const estimatedCellHeight = 15; // Ajustado para novo fontSize/padding
    const headerHeight = 20; // Ajustado
    const estimatedTableHeight = headerHeight + (body.length * estimatedCellHeight) + tableTitleHeight;

    let newStartY = currentStartY;
    if (newStartY === commonTableOptions.margin.top) { // Se for a primeira tabela na página, usa o startY global
        newStartY = startY;
    }

    if (newStartY + estimatedTableHeight > pageHeight - tableOptions.margin.bottom && body.length > 0) { 
        doc.addPage();
        newStartY = commonTableOptions.margin.top || 40; // Usa a margem top global ou um valor padrão
        doc.setFontSize(18); // Recria título principal na nova página
        doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });
        newStartY = 70; // Posição do primeiro elemento na nova página
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, pageMargin, newStartY - 8);
    autoTable(doc, {
      ...tableOptions,
      head: head,
      body: body,
      startY: newStartY,
    });
    return (doc as any).lastAutoTable.finalY + 15; 
  };

  const { head: headIndicadores, body: bodyIndicadores, hasData: temIndicadores } = prepararDadosParaPdfTabela('Indicadores');
  if (temIndicadores) {
    startY = addTableToDoc("Indicadores", headIndicadores, bodyIndicadores, startY);
  }

  const { head: headVolantes, body: bodyVolantes, hasData: temVolantes } = prepararDadosParaPdfTabela('Volantes');
   if (temVolantes) {
    startY = addTableToDoc("Volantes", headVolantes, bodyVolantes, startY);
  }

  const { head: headAV, body: bodyAV } = prepararDadosParaPdfTabela('AV');
  const allMeetingDatesForMonth = getMeetingDatesForMonth(mes, ano);
  if (allMeetingDatesForMonth.length > 0) { 
    startY = addTableToDoc("Áudio/Vídeo (AV)", headAV, bodyAV, startY);
  }

  // Seção de Limpeza - Lado a Lado
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
      const weekLabel = `Sem. ${day.toString().padStart(2, '0')}/${monthAbr}`;
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
     const cleaningSectionTitleHeight = 30; 
     const maxRowsCleaning = Math.max(limpezaAposReuniaoData.length, limpezaSemanalData.length);
     const estimatedCleaningSectionHeight = (maxRowsCleaning * 18) + 50 + cleaningSectionTitleHeight; // 18 é uma estimativa para altura da célula com novo padding/fonte
     
     if (startY + estimatedCleaningSectionHeight > pageHeight - commonTableOptions.margin.bottom) { 
        doc.addPage();
        startY = commonTableOptions.margin.top || 40;
        doc.setFontSize(18);
        doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });
        startY = 70;
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    const cleaningTitleY = startY - 8;
    doc.text("Limpeza", pageMargin, cleaningTitleY);
    startY = cleaningTitleY + 8; // Ajustar startY para a primeira tabela de limpeza

    const cleaningTableOptions = {
        theme: 'grid',
        styles: {
            fontSize: 8, // Aumentado
            cellPadding: 2, // Aumentado
            overflow: 'linebreak',
            font: "helvetica",
        },
        headStyles: {
            fillColor: [34, 63, 49],
            textColor: [245, 241, 232],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8.5, // Aumentado
            cellPadding: 2.5, // Adicionado
        },
        bodyStyles: {
            valign: 'middle',
            halign: 'center',
        },
        pageBreak: 'auto',
        margin: { top: 0, right: 0, bottom: commonTableOptions.margin.bottom, left: 0 }, // Margens internas para o autotable
    };

    const tableWidthLimpeza = contentWidth / 2 - 5; 
    let finalYLimpezaApos = startY;
    let finalYLimpezaSemanal = startY;

    if (limpezaAposReuniaoData.length > 0) {
        autoTable(doc, {
            ...cleaningTableOptions,
            head: [['Data', 'Grupo Pós Reunião']],
            body: limpezaAposReuniaoData,
            tableWidth: tableWidthLimpeza,
            startY: startY,
            margin: { ...cleaningTableOptions.margin, left: pageMargin, right: pageWidth - pageMargin - tableWidthLimpeza },
            columnStyles: {
                0: { halign: 'left', cellWidth: 60 }, 
                1: { halign: 'left', cellWidth: 'auto' },
            },
        });
        finalYLimpezaApos = (doc as any).lastAutoTable.finalY;
    }

    if (limpezaSemanalData.length > 0) {
        autoTable(doc, {
            ...cleaningTableOptions,
            head: [['Semana', 'Responsáveis (Semanal)']],
            body: limpezaSemanalData,
            tableWidth: tableWidthLimpeza,
            startY: startY, // Começa no mesmo startY
            margin: { ...cleaningTableOptions.margin, left: pageMargin + tableWidthLimpeza + 10, right: pageMargin },
            columnStyles: {
                0: { halign: 'left', cellWidth: 60 }, 
                1: { halign: 'left', cellWidth: 'auto' },
            },
        });
        finalYLimpezaSemanal = (doc as any).lastAutoTable.finalY;
    }
    startY = Math.max(finalYLimpezaApos, finalYLimpezaSemanal) + 15;
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

    
