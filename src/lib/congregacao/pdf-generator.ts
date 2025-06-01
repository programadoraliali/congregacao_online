
import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable'; // Not used for Public Meeting PDF anymore
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
      fillColor: [34, 63, 49], // Ochre from theme (approx)
      textColor: [245, 241, 232], // Light cream from theme (approx)
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
      drawMainScheduleTitle(); // Redraw title on new page
      yPos = options.margin.top + 10;
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94); // Dark grey
    doc.text(title, pageMarginMain, yPos);

    yPos += TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

    (doc as any).autoTable({ // Using jsPDF-AutoTable
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
        (doc as any).autoTable({ // Using jsPDF-AutoTable
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
                    // drawMainScheduleTitle(); // Title is already drawn by didDrawPage of outer table if new page
                 } else {
                    doc.addPage();
                    // drawMainScheduleTitle(); // Title is drawn by didDrawPage
                    startYParaSemanal = cleaningTableOptions.margin.top + 10;
                 }
                marginParaSemanal.left = pageMarginMain;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = contentWidth;

            } else { // Place side-by-side on the same page if space allows
                marginParaSemanal.left = pageMarginMain + tableWidth + 10;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = tableWidth;
            }
        } else { // No "Limpeza Após Reunião" table, so "Limpeza Semanal" takes full width
            marginParaSemanal.left = pageMarginMain;
            marginParaSemanal.right = pageMarginMain;
        }

        (doc as any).autoTable({ // Using jsPDF-AutoTable
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


// --- PDF for Public Meeting ---

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
  
  // Constants for styling
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;
  const mainTitleFontSize = 18;
  const dateFontSize = 12;
  const detailFontSize = 10;
  const textColor = [40, 40, 40]; // Dark Gray
  const lineColor = [150, 150, 150]; // Light Gray for separator line
  const lineSpacingFactor = 1.15; // Multiplier for line height
  const bullet = "\u2022"; // Bullet point character
  const bulletPointIndent = 0; // Indent for the bullet point itself from the left margin of the text block
  const bulletPointSizeAndSpace = doc.getTextWidth(bullet + " ") + 2; // Width of bullet plus a small space

  const detailItemSpacing = 7; // Space between lines of detail (Tema, Orador, etc.)
  const sectionSpacing = 22; // Space after each Sunday block, adjusted for better page fill

  const regularFont = 'helvetica';
  const boldFont = 'helvetica'; // jsPDF uses 'helvetica-bold' internally or simulates bold

  let currentY = margin;

  // Main Title
  doc.setFont(regularFont, 'normal');
  doc.setFontSize(mainTitleFontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("REUNIÃO PÚBLICA", margin, currentY, { align: 'left' });
  currentY += mainTitleFontSize * lineSpacingFactor + 10; // Space after title

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z")) // Use 'Z' for UTC
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  // Helper function to add a detail row (label + value)
  function addDetailRow(
    docInstance: jsPDF, 
    yPos: number, 
    label: string, 
    value: string
  ): number {
    let localY = yPos;
    docInstance.setFont(boldFont, 'bold');
    docInstance.setFontSize(detailFontSize);
    docInstance.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    const fullLabelText = `${bullet} ${label}`;
    docInstance.text(fullLabelText, margin + bulletPointIndent, localY);

    docInstance.setFont(regularFont, 'normal');
    const labelWidth = docInstance.getTextWidth(fullLabelText);
    const valueX = margin + bulletPointIndent + labelWidth + 3; // Small space after label
    
    const availableWidthForValue = contentWidth - (valueX - margin);
    const valueLines = docInstance.splitTextToSize(value, availableWidthForValue > 0 ? availableWidthForValue : 1); // Ensure width > 0
    
    docInstance.text(valueLines, valueX, localY);
    
    localY += (valueLines.length * detailFontSize * lineSpacingFactor);
    return localY + detailItemSpacing / 2; // Add half spacing after each item
  }

  // Helper function to estimate section height
  const estimateSectionHeight = (assignmentData: Omit<PublicMeetingAssignment, 'leitorId'>, leitorId: string | null) => {
    let height = 0;
    height += dateFontSize * lineSpacingFactor; // Date
    height += 2; // Space for line under date
    height += 5; // Space after line

    const tempDoc = new jsPDF(); // Use a temporary doc for text splitting estimations
    tempDoc.setFont(regularFont, 'normal');
    tempDoc.setFontSize(detailFontSize);

    const estimateDetailLines = (label: string, value: string) => {
        const fullLabelText = `${bullet} ${label}`;
        const labelWidth = tempDoc.getTextWidth(fullLabelText);
        const valueX = margin + bulletPointIndent + labelWidth + 3;
        const availableWidth = contentWidth - (valueX - margin);
        return tempDoc.splitTextToSize(value, availableWidth > 0 ? availableWidth : 1).length;
    };
    
    let totalLines = 0;
    totalLines += estimateDetailLines("Tema:", assignmentData.tema || 'A Ser Anunciado');
    
    let oradorNameEst = getMemberNamePdf(assignmentData.orador, allMembers);
    if (typeof assignmentData.orador === 'string' && assignmentData.orador && !allMembers.find(m => m.id === assignmentData.orador)) {
        oradorNameEst = assignmentData.orador;
    }
    let oradorCongPrefixEst = "";
    if (oradorNameEst !== 'A Ser Designado' && oradorNameEst !== 'Desconhecido') {
        oradorCongPrefixEst = assignmentData.congregacaoOrador ? `(${assignmentData.congregacaoOrador}) ` : "(Local) ";
    }
    totalLines += estimateDetailLines("Orador:", `${oradorCongPrefixEst}${oradorNameEst}`);

    totalLines += estimateDetailLines("Dirigente de A Sentinela:", getMemberNamePdf(assignmentData.dirigenteId, allMembers));
    totalLines += estimateDetailLines("Leitor de A Sentinela:", getMemberNamePdf(leitorId, allMembers));
    
    height += (totalLines * detailFontSize * lineSpacingFactor) + (4 * detailItemSpacing / 2); // 4 items
    return height + sectionSpacing; // Add spacing for after the block
  };


  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    const estimatedHeight = estimateSectionHeight(assignment, leitorId);

    if (currentY + estimatedHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      // No main title repetition to match image style more closely if it's a simple list.
      // If a header per page is desired, it can be re-added here.
    }

    // Date
    doc.setFont(boldFont, 'bold');
    doc.setFontSize(dateFontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, margin, currentY);
    currentY += dateFontSize * lineSpacingFactor * 0.7; // Slightly less space after date

    // Horizontal Line
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 5; // Space after line

    // Tema
    currentY = addDetailRow(doc, currentY, "Tema:", assignment.tema || 'A Ser Anunciado');
    
    // Orador
    let oradorName = getMemberNamePdf(assignment.orador, allMembers);
    // If assignment.orador is a string and not a known member ID, use it directly
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
    currentY = addDetailRow(doc, currentY, "Orador:", oradorFinalText);

    // Dirigente
    currentY = addDetailRow(doc, currentY, "Dirigente de A Sentinela:", getMemberNamePdf(assignment.dirigenteId, allMembers));
    
    // Leitor
    currentY = addDetailRow(doc, currentY, "Leitor de A Sentinela:", getMemberNamePdf(leitorId, allMembers));

    currentY += sectionSpacing; // Space before next Sunday's section
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
