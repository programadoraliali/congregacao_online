
import jsPDF from 'jspdf';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment, Omit } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


const getMemberNamePdf = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return 'A Ser Designado';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

function getISOWeekPdf(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
}

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

const SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE = 12;
const SECTION_TITLE_TOP_MARGIN_MAIN_SCHEDULE = 18;
const TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE = 5;
const SECTION_BOTTOM_SPACING_MAIN_SCHEDULE = 20;

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
  const pageMarginMain = 25;
  const contentWidth = pageWidth - 2 * pageMarginMain;

  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;

  const drawMainScheduleTitle = () => {
    doc.setFontSize(18);
    doc.setTextColor(0,0,0);
    doc.text(tituloPrincipal, pageWidth / 2, pageMarginMain + 5, { align: 'center' });
  };

  drawMainScheduleTitle();

  let currentPdfY = pageMarginMain + 30;

  const commonTableOptions: any = {
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      overflow: 'linebreak',
      font: "helvetica",
    },
    headStyles: {
      fillColor: [34, 63, 49], 
      textColor: [245, 241, 232], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
        valign: 'middle',
        halign: 'center',
    },
    columnStyles: {
        0: { halign: 'left', cellWidth: 'auto'},
    },
    margin: { top: pageMarginMain, right: pageMarginMain, bottom: pageMarginMain + 15, left: pageMarginMain },
    pageBreak: 'auto',
    didDrawPage: function (data: any) {
        if (data.pageNumber > 1) {
            drawMainScheduleTitle();
        }
    },
  };

  const prepararDadosParaPdfTabela = (
    tipoTabela: 'Indicadores' | 'Volantes' | 'AV'
  ): { head: any[][], body: any[][], title: string, hasData: boolean } => {
    const { data: dadosFormatados, columns } = prepararDadosTabelaOriginal(scheduleData, mes, ano, tipoTabela);

    const head = [columns.map(col => {
        if (tipoTabela === 'Indicadores') {
            if (col.key === 'indicadorExterno') return 'Indicador Externo';
            if (col.key === 'indicadorPalco') return 'Indicador Palco';
        }
        return col.label;
    })];
    const body = dadosFormatados.map((row) => {
        return columns.map(col => {
            if (col.key === 'data') {
                 const [dia, diaAbrev] = (row.data as string).split(' ');
                 return `${dia} ${diaAbrev}`;
            }
            const memberId = row[col.key] as string | null;
            return getMemberNamePdf(memberId, membros);
        });
    });

    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'A Ser Designado' && celula !== 'Desconhecido'));
    return { head, body, title: tipoTabela, hasData };
  };

  const addSectionWithTable = (
    title: string,
    head: any[][],
    body: any[][],
    currentY: number,
    options: any = commonTableOptions
  ): number => {
    let yPos = currentY;

    yPos += SECTION_TITLE_TOP_MARGIN_MAIN_SCHEDULE;

    if (yPos + SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE > pageHeight - options.margin.bottom) {
      doc.addPage();
      drawMainScheduleTitle(); 
      yPos = options.margin.top + 10;
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, pageMarginMain, yPos);

    yPos += TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

    (doc as any).autoTable({ 
      ...options,
      head: head,
      body: body,
      startY: yPos,
    });
    return (doc as any).lastAutoTable.finalY + SECTION_BOTTOM_SPACING_MAIN_SCHEDULE;
  };


  const { head: headIndicadores, body: bodyIndicadores, hasData: temIndicadores } = prepararDadosParaPdfTabela('Indicadores');
  if (temIndicadores) {
    currentPdfY = addSectionWithTable("Indicadores", headIndicadores, bodyIndicadores, currentPdfY);
  }

  const { head: headVolantes, body: bodyVolantes, hasData: temVolantes } = prepararDadosParaPdfTabela('Volantes');
   if (temVolantes) {
    currentPdfY = addSectionWithTable("Volantes", headVolantes, bodyVolantes, currentPdfY);
  }

  const { head: headAV, body: bodyAV } = prepararDadosParaPdfTabela('AV');
  const allMeetingDatesForMonthAV = getMeetingDatesForMonth(mes, ano);
  if (allMeetingDatesForMonthAV.length > 0) {
    currentPdfY = addSectionWithTable("Áudio/Vídeo (AV)", headAV, bodyAV, currentPdfY);
  }

  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];

  const allMeetingDatesForMonthCleaning = getMeetingDatesForMonth(mes, ano);

  allMeetingDatesForMonthCleaning.forEach(dateObj => {
    const dateStr = formatarDataParaChaveOriginal(dateObj);
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

  allMeetingDatesForMonthCleaning.forEach(date => {
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const year = sunday.getUTCFullYear();
    const monthAbr = NOMES_MESES[sunday.getUTCMonth()]?.substring(0, 3).toLowerCase() || '';
    const day = sunday.getUTCDate();
    const dateKey = formatarDataParaChaveOriginal(sunday);
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
    currentPdfY += SECTION_TITLE_TOP_MARGIN_MAIN_SCHEDULE;
    const cleaningTitleY = currentPdfY;

    if (cleaningTitleY + SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        drawMainScheduleTitle();
        currentPdfY = commonTableOptions.margin.top + 10;
    }
    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", pageMarginMain, currentPdfY);
    currentPdfY += TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

    const cleaningTableOptions: any = {
        ...commonTableOptions,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', font: "helvetica" },
        headStyles: { ...commonTableOptions.headStyles, fontSize: 8.5, cellPadding: 2.5 },
        margin: { ...commonTableOptions.margin, top: pageMarginMain },
    };

    const tableWidth = contentWidth / 2 - 5;
    let finalYLimpeza = currentPdfY;
    let lastTableOnPage = doc.internal.getNumberOfPages();

    if (limpezaAposReuniaoData.length > 0) {
        (doc as any).autoTable({ 
            ...cleaningTableOptions,
            head: [['Data', 'Grupo Pós Reunião']],
            body: limpezaAposReuniaoData,
            tableWidth: tableWidth,
            startY: currentPdfY,
            margin: { ...cleaningTableOptions.margin, left: pageMarginMain, right: pageWidth - pageMarginMain - tableWidth },
            columnStyles: { 0: { halign: 'left', cellWidth: 60 }, 1: { halign: 'left', cellWidth: 'auto' } },
        });
        finalYLimpeza = Math.max(finalYLimpeza, (doc as any).lastAutoTable.finalY);
        lastTableOnPage = (doc as any).lastAutoTable.pageNumber;
    }

    if (limpezaSemanalData.length > 0) {
        let startYParaSemanal = currentPdfY;
        let marginParaSemanal = { ...cleaningTableOptions.margin };
        let tableWidthSemanal = contentWidth;

        if (limpezaAposReuniaoData.length > 0) {
            const estimativaAlturaSemanal = (cleaningTableOptions.headStyles.fontSize || 10) * 2 + (limpezaSemanalData.length * (cleaningTableOptions.styles.fontSize || 10) * 2);

            if (lastTableOnPage < doc.internal.getNumberOfPages() || (currentPdfY + estimativaAlturaSemanal > pageHeight - cleaningTableOptions.margin.bottom) ) {
                 if (lastTableOnPage < doc.internal.getNumberOfPages()) {
                    startYParaSemanal = cleaningTableOptions.margin.top + 10;
                 } else {
                    doc.addPage();
                    startYParaSemanal = commonTableOptions.margin.top + 10; // Use commonTableOptions for consistent Y start after title
                 }
                marginParaSemanal.left = pageMarginMain;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = contentWidth;

            } else { 
                marginParaSemanal.left = pageMarginMain + tableWidth + 10;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = tableWidth;
            }
        } else { 
            marginParaSemanal.left = pageMarginMain;
            marginParaSemanal.right = pageMarginMain;
        }

        (doc as any).autoTable({ 
            ...cleaningTableOptions,
            head: [['Semana', 'Responsáveis (Semanal)']],
            body: limpezaSemanalData,
            tableWidth: tableWidthSemanal,
            startY: startYParaSemanal,
            margin: marginParaSemanal,
            columnStyles: { 0: { halign: 'left', cellWidth: 60 }, 1: { halign: 'left', cellWidth: 'auto' } },
        });
    }
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}


function formatDisplayDateForPublicMeetingPdf(date: Date): string {
    const dayName = NOMES_DIAS_SEMANA_COMPLETOS[date.getUTCDay()];
    const day = date.getUTCDate();
    const monthName = NOMES_MESES[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${dayName}, ${day} de ${monthName} de ${year}`;
}

export function generatePublicMeetingPdf(
  assignmentsForMonth: { [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> },
  mainScheduleForMonth: DesignacoesFeitas | null,
  allMembers: Membro[],
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
  
  const regularFont = 'helvetica';
  const boldFont = 'helvetica'; 

  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  const MAIN_TITLE_FONT_SIZE = 18;
  const DATE_FONT_SIZE = 11; // Ajustado para ser menor que título principal mas maior que detalhes
  const DETAIL_FONT_SIZE = 10;
  const LINE_SPACING_FACTOR = 1.2;
  const BULLET = "\u2022";

  const SPACE_AFTER_MAIN_TITLE = 15;
  const SPACE_AFTER_DATE = 2; // Espaço entre a data e a linha abaixo dela
  const SPACE_AFTER_LINE = 8;  // Espaço entre a linha e o primeiro item de detalhe
  const LABEL_TO_VALUE_SPACING = 5; // Espaço horizontal entre o fim do rótulo e o início do valor
  const DETAIL_ITEM_VERTICAL_SPACING = 7; // Espaço vertical entre cada par de rótulo/valor
  const SECTION_VERTICAL_SPACING = 18; // Espaço entre os blocos de cada domingo

  const textColor = [40, 40, 40]; 
  const lineColor = [100, 100, 100]; 

  let currentY = margin;

  doc.setFont(regularFont, 'normal');
  doc.setFontSize(MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("REUNIÃO PÚBLICA", margin, currentY);
  currentY += MAIN_TITLE_FONT_SIZE * LINE_SPACING_FACTOR + SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  const estimateDetailItemHeight = (docInstance: jsPDF, label: string, value: string, valueStartXPos: number): number => {
    let height = 0;
    docInstance.setFont(regularFont, 'normal');
    docInstance.setFontSize(DETAIL_FONT_SIZE);
    const availableWidth = contentWidth - (valueStartXPos - margin);
    const valueLines = docInstance.splitTextToSize(value, availableWidth > 0 ? availableWidth : 1);
    height += (valueLines.length * DETAIL_FONT_SIZE * LINE_SPACING_FACTOR);
    height += DETAIL_ITEM_VERTICAL_SPACING;
    return height;
  };
  
  const estimateSectionHeight = (docInstance: jsPDF, assignment: Omit<PublicMeetingAssignment, 'leitorId'>, leitorId: string | null, currentMaxLabelWidth: number) => {
    let height = 0;
    height += DATE_FONT_SIZE * LINE_SPACING_FACTOR;
    height += SPACE_AFTER_DATE;
    height += 1; // line thickness
    height += SPACE_AFTER_LINE;

    const valueStartX = margin + currentMaxLabelWidth + LABEL_TO_VALUE_SPACING;

    let oradorName = getMemberNamePdf(assignment.orador, allMembers);
    if (typeof assignment.orador === 'string' && assignment.orador && !allMembers.find(m => m.id === assignment.orador)) {
        oradorName = assignment.orador;
    }
    let oradorCongregationPrefix = "";
    if (oradorName !== 'A Ser Designado' && oradorName !== 'Desconhecido') {
        if (assignment.congregacaoOrador) {
            oradorCongregationPrefix = `(${assignment.congregacaoOrador}) `;
        } else {
            oradorCongregationPrefix = "(Local) ";
        }
    }
    const oradorFinalText = `${oradorCongregationPrefix}${oradorName}`;

    height += estimateDetailItemHeight(docInstance, "Tema:", assignment.tema || 'A Ser Anunciado', valueStartX);
    height += estimateDetailItemHeight(docInstance, "Orador:", oradorFinalText, valueStartX);
    height += estimateDetailItemHeight(docInstance, "Dirigente de A Sentinela:", getMemberNamePdf(assignment.dirigenteId, allMembers), valueStartX);
    height += estimateDetailItemHeight(docInstance, "Leitor de A Sentinela:", getMemberNamePdf(leitorId, allMembers), valueStartX);
    
    return height + SECTION_VERTICAL_SPACING - DETAIL_ITEM_VERTICAL_SPACING; // Subtract one DETAIL_ITEM_VERTICAL_SPACING as it's added by the last item
  };


  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;

    const detailItems = [
      { label: "Tema:", value: assignment.tema || 'A Ser Anunciado' },
      { 
        label: "Orador:", 
        value: (() => {
          let oradorName = getMemberNamePdf(assignment.orador, allMembers);
          if (typeof assignment.orador === 'string' && assignment.orador && !allMembers.find(m => m.id === assignment.orador)) {
              oradorName = assignment.orador;
          }
          let oradorCongregationPrefix = "";
          if (oradorName !== 'A Ser Designado' && oradorName !== 'Desconhecido') {
              if (assignment.congregacaoOrador) {
                  oradorCongregationPrefix = `(${assignment.congregacaoOrador}) `;
              } else {
                  oradorCongregationPrefix = "(Local) ";
              }
          }
          return `${oradorCongregationPrefix}${oradorName}`;
        })()
      },
      { label: "Dirigente de A Sentinela:", value: getMemberNamePdf(assignment.dirigenteId, allMembers) },
      { label: "Leitor de A Sentinela:", value: getMemberNamePdf(leitorId, allMembers) }
    ];

    let maxBulletedLabelWidth = 0;
    doc.setFont(boldFont, 'bold');
    doc.setFontSize(DETAIL_FONT_SIZE);
    detailItems.forEach(item => {
        const currentBulletedLabelWidth = doc.getTextWidth(`${BULLET} ${item.label} `); // Note space after label text
        if (currentBulletedLabelWidth > maxBulletedLabelWidth) {
            maxBulletedLabelWidth = currentBulletedLabelWidth;
        }
    });
    const valueStartX = margin + maxBulletedLabelWidth + LABEL_TO_VALUE_SPACING;


    const estimatedHeight = estimateSectionHeight(doc, assignment, leitorId, maxBulletedLabelWidth);
    if (index > 0 && currentY + estimatedHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      // Redraw main title if desired on new pages, for now it's only on the first.
      // doc.setFont(regularFont, 'normal');
      // doc.setFontSize(MAIN_TITLE_FONT_SIZE);
      // doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      // doc.text("REUNIÃO PÚBLICA", margin, currentY);
      // currentY += MAIN_TITLE_FONT_SIZE * LINE_SPACING_FACTOR + SPACE_AFTER_MAIN_TITLE;
    }

    if (index > 0) { // Add space before new section, unless it's the first on page after title
        currentY += SECTION_VERTICAL_SPACING / 2; 
    }
    
    doc.setFont(boldFont, 'bold');
    doc.setFontSize(DATE_FONT_SIZE);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, margin, currentY);
    currentY += DATE_FONT_SIZE * LINE_SPACING_FACTOR * 0.7; 
    currentY += SPACE_AFTER_DATE;

    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += SPACE_AFTER_LINE;

    detailItems.forEach(item => {
        doc.setFont(boldFont, 'bold');
        doc.setFontSize(DETAIL_FONT_SIZE);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        const labelTextWithBullet = `${BULLET} ${item.label}`;
        doc.text(labelTextWithBullet, margin, currentY);
    
        doc.setFont(regularFont, 'normal');
        doc.setFontSize(DETAIL_FONT_SIZE);
        const availableWidthForValue = contentWidth - (valueStartX - margin);
        const valueLines = doc.splitTextToSize(item.value, availableWidthForValue > 0 ? availableWidthForValue : 1);
        doc.text(valueLines, valueStartX, currentY);
    
        currentY += (valueLines.length * DETAIL_FONT_SIZE * LINE_SPACING_FACTOR);
        currentY += DETAIL_ITEM_VERTICAL_SPACING; 
    });
    currentY -= DETAIL_ITEM_VERTICAL_SPACING; // Remove last extra spacing
    currentY += SECTION_VERTICAL_SPACING; // Add space for the next section
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

