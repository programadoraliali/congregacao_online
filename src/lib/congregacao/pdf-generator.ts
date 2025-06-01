
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
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        if (pageCount > 1) {
             doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - data.settings.margin.right, pageHeight - 15);
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
      yPos = options.margin.top + 25; 
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
    let cleaningTitleY = currentPdfY;

    if (cleaningTitleY + SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        currentPdfY = commonTableOptions.margin.top + 25;
        cleaningTitleY = currentPdfY; 
    }
    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", pageMarginMain, cleaningTitleY);
    currentPdfY = cleaningTitleY + TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

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
             didDrawPage: function (data: any) { 
                if (data.pageNumber > 1) {
                    drawMainScheduleTitle();
                }
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                if (pageCount > 1) {
                    doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - data.settings.margin.right, pageHeight - 15);
                }
            },
        });
        finalYLimpeza = Math.max(finalYLimpeza, (doc as any).lastAutoTable.finalY);
        lastTableOnPage = (doc as any).lastAutoTable.pageNumber;
    }

    if (limpezaSemanalData.length > 0) {
        let startYParaSemanal = currentPdfY;
        let marginParaSemanal = { ...cleaningTableOptions.margin };
        let tableWidthSemanal = contentWidth;

        if (limpezaAposReuniaoData.length > 0) { 
             if (lastTableOnPage < doc.internal.getNumberOfPages()) { 
                startYParaSemanal = commonTableOptions.margin.top + 25; 
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
            tableWidthSemanal = contentWidth;
        }


        (doc as any).autoTable({ 
            ...cleaningTableOptions,
            head: [['Semana', 'Responsáveis (Semanal)']],
            body: limpezaSemanalData,
            tableWidth: tableWidthSemanal,
            startY: startYParaSemanal,
            margin: marginParaSemanal,
            columnStyles: { 0: { halign: 'left', cellWidth: 60 }, 1: { halign: 'left', cellWidth: 'auto' } },
             didDrawPage: function (data: any) { 
                if (data.pageNumber > 1) {
                    drawMainScheduleTitle();
                }
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                if (pageCount > 1) {
                    doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - data.settings.margin.right, pageHeight - 15);
                }
            },
        });
    }
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}


// --- PDF para Reunião Pública ---

const RP_MARGIN = 40;
const RP_CONTENT_WIDTH_OFFSET = 2 * RP_MARGIN;

// Fontes e Cores
const RP_FONT_FAMILY_NORMAL = 'helvetica';
const RP_FONT_FAMILY_BOLD = 'helvetica';
const RP_TEXT_COLOR_DARK_GRAY = [40, 40, 40]; // #282828
const RP_LINE_COLOR_MEDIUM_GRAY = [100, 100, 100]; // #646464

// Tamanhos de Fonte
const RP_MAIN_TITLE_FONT_SIZE = 18;
const RP_DATE_FONT_SIZE = 12;
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_HEIGHT_FACTOR = 1.4; // Multiplicador para espaçamento entre linhas de texto multilinhas
const RP_BULLET = "\u2022"; // •

// Espaçamentos Verticais
const RP_MAIN_TITLE_Y_OFFSET = 20;
const RP_SPACE_AFTER_MAIN_TITLE = 25;
const RP_SPACE_AFTER_DATE_TEXT = RP_DATE_FONT_SIZE * 0.2; // Pequeno espaço entre o texto da data e a linha
const RP_HORIZONTAL_LINE_Y_OFFSET_AFTER_DATE = 2; // Adiciona este offset à posição Y da linha após o texto da data
const RP_SPACE_AFTER_LINE_BEFORE_DETAILS = RP_DETAIL_FONT_SIZE * 1.2; // Espaço entre a linha e o primeiro item de detalhe
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 0.6; // Espaço entre cada item de detalhe (Tema, Orador etc.)
const RP_SECTION_VERTICAL_SPACING = 45; // Espaço ENTRE blocos de domingo completos

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
  const contentWidth = pageWidth - RP_CONTENT_WIDTH_OFFSET;

  let currentY = RP_MARGIN;

  // Título Principal
  doc.setFont(RP_FONT_FAMILY_NORMAL, 'normal');
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(RP_TEXT_COLOR_DARK_GRAY[0], RP_TEXT_COLOR_DARK_GRAY[1], RP_TEXT_COLOR_DARK_GRAY[2]);
  const mainTitleText = `REUNIÃO PÚBLICA - ${NOMES_MESES[mes].toUpperCase()} DE ${ano}`;
  doc.text(mainTitleText, RP_MARGIN, currentY + RP_MAIN_TITLE_Y_OFFSET);
  currentY += RP_MAIN_TITLE_Y_OFFSET + RP_SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z")) // Use Z para UTC
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    
    let oradorValue = getMemberNamePdf(assignment.orador, allMembers);
    if (typeof assignment.orador === 'string' && assignment.orador && !allMembers.find(m => m.id === assignment.orador)) {
        oradorValue = assignment.orador;
    }
    const congregacaoOradorText = assignment.congregacaoOrador ? `(${assignment.congregacaoOrador})` : (oradorValue !== 'A Ser Designado' && oradorValue !== 'Desconhecido' ? '(Local)' : '');
    const oradorDisplay = `${congregacaoOradorText} ${oradorValue}`.trim();

    const detailItems = [
      { label: "Tema:", value: assignment.tema || 'A Ser Anunciado' },
      { label: "Orador:", value: oradorDisplay },
      { label: "Dirigente de A Sentinela:", value: getMemberNamePdf(assignment.dirigenteId, allMembers) },
      { label: "Leitor de A Sentinela:", value: getMemberNamePdf(leitorId, allMembers) }
    ];
    
    // Estimar altura da seção
    let estimatedSectionHeight = RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE_TEXT + RP_HORIZONTAL_LINE_Y_OFFSET_AFTER_DATE + 1 + RP_SPACE_AFTER_LINE_BEFORE_DETAILS; // +1 for line height approx
    
    doc.setFont(RP_FONT_FAMILY_BOLD, 'bold');
    let maxLabelWidth = 0;
    detailItems.forEach(item => {
        const currentLabelWidth = doc.getTextWidth(`${RP_BULLET} ${item.label} `);
        if (currentLabelWidth > maxLabelWidth) {
            maxLabelWidth = currentLabelWidth;
        }
    });
    const valueStartX = RP_MARGIN + maxLabelWidth + 5; // 5pt de espaço entre label e value
    const availableWidthForValue = contentWidth - (maxLabelWidth + 5);

    doc.setFont(RP_FONT_FAMILY_NORMAL, 'normal');
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    detailItems.forEach(item => {
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue > 0 ? availableWidthForValue : 1);
      estimatedSectionHeight += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      estimatedSectionHeight += RP_DETAIL_ITEM_VERTICAL_SPACING;
    });
    estimatedSectionHeight -= RP_DETAIL_ITEM_VERTICAL_SPACING; 
    
    if (index > 0) { 
        currentY += RP_SECTION_VERTICAL_SPACING;
    }

    if (currentY + estimatedSectionHeight > pageHeight - RP_MARGIN) {
      doc.addPage();
      currentY = RP_MARGIN;
      // Não redesenha o título principal em novas páginas
    }
    
    // Data
    doc.setFont(RP_FONT_FAMILY_BOLD, 'bold');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(RP_TEXT_COLOR_DARK_GRAY[0], RP_TEXT_COLOR_DARK_GRAY[1], RP_TEXT_COLOR_DARK_GRAY[2]);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, RP_MARGIN, currentY);
    currentY += RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE_TEXT;

    // Linha Horizontal
    doc.setDrawColor(RP_LINE_COLOR_MEDIUM_GRAY[0], RP_LINE_COLOR_MEDIUM_GRAY[1], RP_LINE_COLOR_MEDIUM_GRAY[2]);
    doc.setLineWidth(0.5);
    const lineYPos = currentY + RP_HORIZONTAL_LINE_Y_OFFSET_AFTER_DATE;
    doc.line(RP_MARGIN, lineYPos, RP_MARGIN + contentWidth, lineYPos);
    currentY = lineYPos + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;

    // Detalhes
    detailItems.forEach((item, itemIndex) => {
      const labelTextWithBullet = `${RP_BULLET} ${item.label} `;
      doc.setFont(RP_FONT_FAMILY_BOLD, 'bold');
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      doc.setTextColor(RP_TEXT_COLOR_DARK_GRAY[0], RP_TEXT_COLOR_DARK_GRAY[1], RP_TEXT_COLOR_DARK_GRAY[2]);
      doc.text(labelTextWithBullet, RP_MARGIN, currentY);
      
      doc.setFont(RP_FONT_FAMILY_NORMAL, 'normal'); 
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue > 0 ? availableWidthForValue : 1);
      doc.text(valueLines, valueStartX, currentY);
      
      currentY += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      if (itemIndex < detailItems.length - 1) {
          currentY += RP_DETAIL_ITEM_VERTICAL_SPACING;
      }
    });
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    if(pageCount > 1) {
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - RP_MARGIN, pageHeight - 15, { align: 'right' });
    }
  }

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
