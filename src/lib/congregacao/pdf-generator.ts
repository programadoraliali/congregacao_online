
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


const getMemberNamePdf = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return 'A Ser Designado'; // Default to this if no memberId
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
      drawMainScheduleTitle(); // Redraw title on new page
      yPos = options.margin.top + 10;
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94);
    doc.text(title, pageMarginMain, yPos);

    yPos += TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

    autoTable(doc, {
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
  if (allMeetingDatesForMonthAV.length > 0) { // Ensure AV table structure is shown if there are meeting dates
    currentPdfY = addSectionWithTable("Áudio/Vídeo (AV)", headAV, bodyAV, currentPdfY);
  }

  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];

  const allMeetingDatesForMonthCleaning = getMeetingDatesForMonth(mes, ano); // Re-fetch for cleaning

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
        drawMainScheduleTitle(); // Redraw title
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
        autoTable(doc, {
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
                    drawMainScheduleTitle();
                 } else {
                    doc.addPage();
                    drawMainScheduleTitle();
                    startYParaSemanal = cleaningTableOptions.margin.top + 10;
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

        autoTable(doc, {
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
  const margin = 40; // Increased margin for better spacing
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  // Main Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18); // Slightly larger for main title
  doc.setTextColor(40, 40, 40);
  doc.text("REUNIÃO PÚBLICA", margin, currentY, { align: 'left' });
  currentY += doc.getLineHeight() * 1.8; // Increased spacing after main title

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  const bullet = "\u2022"; // Bullet point character
  const detailFontSize = 10;
  const dateFontSize = 12;
  const labelIndent = margin + 10; // Indent for bulleted items
  const valueIndent = labelIndent + 15; // Indent for the text after the label
  const lineHeight = doc.getLineHeight() * 0.45; // Adjusted line height factor for 10pt font
  const sectionSpacing = 20; // Space between Sunday sections
  const lineBelowDateYOffset = 3;
  const lineLength = contentWidth * 0.85; // Line slightly shorter than content width


  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;

    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    const speechTitle = assignment.tema || 'A Ser Anunciado';
    let oradorText = getMemberNamePdf(assignment.orador, allMembers); // Use getMemberNamePdf for consistency if orador is a member ID
    if (typeof assignment.orador === 'string' && assignment.orador && !allMembers.find(m=>m.id === assignment.orador)) { // if orador is a string name and not an ID
        oradorText = assignment.orador;
    }
    if (assignment.congregacaoOrador && oradorText !== 'A Ser Designado' && oradorText !== 'Desconhecido') {
        oradorText += ` (${assignment.congregacaoOrador})`;
    } else if (oradorText !== 'A Ser Designado' && oradorText !== 'Desconhecido' && !assignment.congregacaoOrador) {
        oradorText += ` (Local)`;
    }


    const dirigenteName = getMemberNamePdf(assignment.dirigenteId, allMembers);
    const leitorName = getMemberNamePdf(leitorId, allMembers);

    // Calculate height of this section for page break logic
    let sectionHeight = 0;
    sectionHeight += doc.getLineHeight() * (dateFontSize / doc.getFontSize()); // Date height
    sectionHeight += 5; // Space for line and after
    const addDetailHeight = (text: string) => {
        const lines = doc.splitTextToSize(text, contentWidth - (valueIndent - margin));
        sectionHeight += lines.length * doc.getLineHeight() * (detailFontSize / doc.getFontSize());
        sectionHeight += lineHeight /2; // Small spacing between detail items
    };
    addDetailHeight(`Tema: ${speechTitle}`);
    addDetailHeight(`Orador: ${oradorText}`);
    addDetailHeight(`Dirigente de A Sentinela: ${dirigenteName}`);
    addDetailHeight(`Leitor de A Sentinela: ${leitorName}`);
    sectionHeight += sectionSpacing;


    if (currentY + sectionHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      // No need to repeat main title on subsequent pages as per image style
    }

    // Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(dateFontSize);
    doc.setTextColor(40, 40, 40);
    doc.text(formattedDateDisplay, margin, currentY);
    currentY += doc.getLineHeight() * (dateFontSize / doc.getFontSize()) * 0.7;


    // Horizontal Line
    doc.setDrawColor(100, 100, 100); // Darker gray for the line
    doc.setLineWidth(0.5);
    doc.line(margin, currentY + lineBelowDateYOffset, margin + lineLength, currentY + lineBelowDateYOffset);
    currentY += lineBelowDateYOffset + 7; // Space after line

    // Helper to draw bulleted items
    const drawBulletedItem = (label: string, value: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(detailFontSize);
      doc.setTextColor(40, 40, 40);

      const fullText = `${label} ${value}`;
      const splitText = doc.splitTextToSize(fullText, contentWidth - (labelIndent - margin + 5 /* bullet width*/));

      splitText.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          doc.text(bullet, labelIndent, currentY);
          doc.text(line, labelIndent + 8, currentY);
        } else {
          doc.text(line, labelIndent + 8, currentY); // Indent subsequent lines of a wrapped item
        }
        currentY += lineHeight;
      });
       currentY += lineHeight * 0.3; // Extra small space after each full item
    };

    drawBulletedItem('Tema:', speechTitle);
    drawBulletedItem('Orador:', oradorText);
    drawBulletedItem('Dirigente de A Sentinela:', dirigenteName);
    drawBulletedItem('Leitor de A Sentinela:', leitorName);

    currentY += sectionSpacing * 0.7; // Space before next Sunday's section
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
