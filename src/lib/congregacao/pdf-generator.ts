
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


const getMemberNamePdf = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return '--';
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
  const pageMargin = 25; 
  const contentWidth = pageWidth - 2 * pageMargin;

  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  
  const drawMainTitle = () => {
    doc.setFontSize(18);
    doc.setTextColor(0,0,0);
    doc.text(tituloPrincipal, pageWidth / 2, pageMargin + 5, { align: 'center' });
  };

  drawMainTitle(); 

  let currentPdfY = pageMargin + 30; 

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
    margin: { top: pageMargin, right: pageMargin, bottom: pageMargin + 15, left: pageMargin }, 
    pageBreak: 'auto', 
    didDrawPage: function (data: any) { 
        if (data.pageNumber > 1) {
            drawMainTitle();
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
    
    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'Desconhecido'));
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
      yPos = options.margin.top + 10; 
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, pageMargin, yPos);
    
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
  const allMeetingDatesForMonth = getMeetingDatesForMonth(mes, ano);
  if (allMeetingDatesForMonth.length > 0) { 
    currentPdfY = addSectionWithTable("Áudio/Vídeo (AV)", headAV, bodyAV, currentPdfY);
  }

  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];
  
  allMeetingDatesForMonth.forEach(dateObj => {
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

  allMeetingDatesForMonth.forEach(date => { 
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
        currentPdfY = commonTableOptions.margin.top + 10;
    }
    doc.setFontSize(SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", pageMargin, currentPdfY);
    currentPdfY += TABLE_START_MARGIN_AFTER_TITLE_MAIN_SCHEDULE;

    const cleaningTableOptions: any = {
        ...commonTableOptions, 
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', font: "helvetica" },
        headStyles: { ...commonTableOptions.headStyles, fontSize: 8.5, cellPadding: 2.5 },
        margin: { ...commonTableOptions.margin, top: pageMargin }, 
    };

    const tableWidth = contentWidth / 2 - 5; 
    let finalYLimpeza = currentPdfY;
    let lastTableOnPage = 0; 

    if (limpezaAposReuniaoData.length > 0) {
        autoTable(doc, {
            ...cleaningTableOptions,
            head: [['Data', 'Grupo Pós Reunião']],
            body: limpezaAposReuniaoData,
            tableWidth: tableWidth,
            startY: currentPdfY,
            margin: { ...cleaningTableOptions.margin, left: pageMargin, right: pageWidth - pageMargin - tableWidth },
            columnStyles: { 0: { halign: 'left', cellWidth: 60 }, 1: { halign: 'left', cellWidth: 'auto' } },
        });
        finalYLimpeza = Math.max(finalYLimpeza, (doc as any).lastAutoTable.finalY);
        lastTableOnPage = (doc as any).lastAutoTable.pageNumber;
    }

    if (limpezaSemanalData.length > 0) {
        let startYParaSemanal = currentPdfY;
        let xOffsetLimpezaSemanal = pageMargin;
        let marginParaSemanal = { ...cleaningTableOptions.margin };
        let tableWidthSemanal = contentWidth;

        if (limpezaAposReuniaoData.length > 0) { 
            const estimativaAlturaSemanal = (cleaningTableOptions.headStyles.fontSize || 10) * 2 + (limpezaSemanalData.length * (cleaningTableOptions.styles.fontSize || 10) * 2);
            
            if (lastTableOnPage < doc.internal.getNumberOfPages() || (currentPdfY + estimativaAlturaSemanal > pageHeight - cleaningTableOptions.margin.bottom) ) {
                startYParaSemanal = (limpezaAposReuniaoData.length > 0) ? finalYLimpeza + SECTION_TITLE_TOP_MARGIN_MAIN_SCHEDULE : currentPdfY;
                if (limpezaAposReuniaoData.length > 0) { 
                    startYParaSemanal = finalYLimpeza + SECTION_TITLE_TOP_MARGIN_MAIN_SCHEDULE;
                    if (startYParaSemanal + SECTION_TITLE_FONT_SIZE_MAIN_SCHEDULE > pageHeight - cleaningTableOptions.margin.bottom) {
                        doc.addPage();
                        startYParaSemanal = cleaningTableOptions.margin.top + 10;
                    }
                }
                
                xOffsetLimpezaSemanal = pageMargin; 
                marginParaSemanal.left = pageMargin;
                marginParaSemanal.right = pageMargin;
                tableWidthSemanal = contentWidth;
            } else { 
                xOffsetLimpezaSemanal = pageMargin + tableWidth + 10;
                marginParaSemanal.left = xOffsetLimpezaSemanal;
                marginParaSemanal.right = pageMargin;
                tableWidthSemanal = tableWidth;
            }
        } else { 
            marginParaSemanal.left = pageMargin;
            marginParaSemanal.right = pageMargin;
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
const PDF_RED_COLOR = [180, 0, 0]; // A bit darker red
const PDF_WHITE_COLOR = [255, 255, 255];
const PDF_BLACK_COLOR = [0, 0, 0];
const PDF_GRAY_COLOR = [80, 80, 80];

const PDF_MAIN_TITLE_SIZE = 22;
const PDF_DATE_BAR_TEXT_SIZE = 11;
const PDF_SPEECH_TITLE_SIZE = 13;
const PDF_PARTICIPANT_NAME_SIZE = 10;
const PDF_PARTICIPANT_ROLE_SIZE = 7.5;

const PDF_TOP_BAR_HEIGHT = 12;
const PDF_MAIN_TITLE_Y_OFFSET = 15;
const PDF_DATE_BAR_HEIGHT = 22;
const PDF_V_SPACE_AFTER_TOP_BAR = 5;
const PDF_V_SPACE_AFTER_MAIN_TITLE = 20;
const PDF_V_SPACE_AFTER_DATE_BAR = 8;
const PDF_V_SPACE_AFTER_SPEECH_TITLE = 12;
const PDF_V_SPACE_BETWEEN_PARTICIPANT_LINES = 15;
const PDF_V_SPACE_AFTER_SUNDAY_BLOCK = 25;
const PDF_ROLE_Y_OFFSET = PDF_PARTICIPANT_ROLE_SIZE + 1;


function formatDisplayDateForPublicMeeting(date: Date): string {
    const dayName = NOMES_DIAS_SEMANA_COMPLETOS[date.getUTCDay()].toLowerCase();
    const day = date.getUTCDate();
    const monthName = NOMES_MESES[date.getUTCMonth()].toLowerCase();
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
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const drawPageHeader = () => {
    // Top Red Bar
    doc.setFillColor(...PDF_RED_COLOR);
    doc.rect(0, 0, pageWidth, PDF_TOP_BAR_HEIGHT, 'F');
    currentY = PDF_TOP_BAR_HEIGHT + PDF_V_SPACE_AFTER_TOP_BAR;

    // Main Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_MAIN_TITLE_SIZE);
    doc.setTextColor(...PDF_RED_COLOR);
    doc.text("Reunião Pública", pageWidth / 2, currentY + PDF_MAIN_TITLE_Y_OFFSET, { align: 'center' });
    currentY += PDF_MAIN_TITLE_Y_OFFSET + PDF_V_SPACE_AFTER_MAIN_TITLE;
  };
  
  drawPageHeader();

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    
    const formattedDateDisplay = formatDisplayDateForPublicMeeting(sundayDate);
    const oradorName = assignment.orador || 'A Ser Anunciado';
    const congOrador = assignment.congregacaoOrador;
    const dirigenteName = getMemberNamePdf(assignment.dirigenteId, allMembers);
    const leitorName = getMemberNamePdf(leitorId, allMembers);
    const speechTitle = assignment.tema || 'Tema a Ser Anunciado';

    // Estimate height of this Sunday's block
    let blockHeight = PDF_DATE_BAR_HEIGHT + PDF_V_SPACE_AFTER_DATE_BAR;
    doc.setFontSize(PDF_SPEECH_TITLE_SIZE);
    blockHeight += doc.splitTextToSize(speechTitle, contentWidth - 20).length * (PDF_SPEECH_TITLE_SIZE * 0.7) + PDF_V_SPACE_AFTER_SPEECH_TITLE; // Approx line height
    blockHeight += (PDF_PARTICIPANT_NAME_SIZE + PDF_ROLE_Y_OFFSET) * 2 + PDF_V_SPACE_BETWEEN_PARTICIPANT_LINES + PDF_V_SPACE_AFTER_SUNDAY_BLOCK;
    if (congOrador) blockHeight += PDF_PARTICIPANT_NAME_SIZE + PDF_ROLE_Y_OFFSET;


    if (currentY + blockHeight > pageHeight - margin) {
      doc.addPage();
      drawPageHeader();
    }

    // Date Bar
    doc.setFillColor(...PDF_RED_COLOR);
    doc.rect(margin, currentY, contentWidth, PDF_DATE_BAR_HEIGHT, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_DATE_BAR_TEXT_SIZE);
    doc.setTextColor(...PDF_WHITE_COLOR);
    doc.text(formattedDateDisplay, pageWidth / 2, currentY + PDF_DATE_BAR_HEIGHT / 2 + (PDF_DATE_BAR_TEXT_SIZE / 3), { align: 'center', baseline: 'middle' });
    currentY += PDF_DATE_BAR_HEIGHT + PDF_V_SPACE_AFTER_DATE_BAR;

    // Speech Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_SPEECH_TITLE_SIZE);
    doc.setTextColor(...PDF_BLACK_COLOR);
    const speechTitleLines = doc.splitTextToSize(speechTitle, contentWidth - 40); // Slightly less width for centering
    doc.text(speechTitleLines, pageWidth / 2, currentY, { align: 'center' });
    currentY += speechTitleLines.length * (PDF_SPEECH_TITLE_SIZE * 0.7) + PDF_V_SPACE_AFTER_SPEECH_TITLE;

    // Participants
    const col1X = margin + 10;
    const col2X = margin + contentWidth / 2 ; // Adjust as needed for visual balance
    const col3X = margin + contentWidth - 10; // For right alignment

    let yLine1 = currentY;
    let yLine2 = yLine1 + PDF_PARTICIPANT_NAME_SIZE + PDF_ROLE_Y_OFFSET + PDF_V_SPACE_BETWEEN_PARTICIPANT_LINES / 2;
    
    // Orador
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_PARTICIPANT_NAME_SIZE);
    doc.setTextColor(...PDF_BLACK_COLOR);
    doc.text(oradorName, col1X, yLine1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_PARTICIPANT_ROLE_SIZE);
    doc.setTextColor(...PDF_GRAY_COLOR);
    doc.text("ORADOR", col1X, yLine1 + PDF_ROLE_Y_OFFSET);

    // Congregação (if visitor) - aligned under Orador or in middle
    if (congOrador) {
        let yCong = yLine1 + PDF_PARTICIPANT_NAME_SIZE + PDF_ROLE_Y_OFFSET + 5; // Space below Orador role
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(PDF_PARTICIPANT_NAME_SIZE);
        doc.setTextColor(...PDF_BLACK_COLOR);
        doc.text(congOrador, col2X - 30, yLine1, {align: 'center'}); // Center-ish
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_PARTICIPANT_ROLE_SIZE);
        doc.setTextColor(...PDF_GRAY_COLOR);
        doc.text("CONGREGAÇÃO", col2X-30, yLine1 + PDF_ROLE_Y_OFFSET, {align: 'center'});
    }

    // A Sentinela (Dirigente)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_PARTICIPANT_NAME_SIZE);
    doc.setTextColor(...PDF_BLACK_COLOR);
    doc.text(dirigenteName, col1X, yLine2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_PARTICIPANT_ROLE_SIZE);
    doc.setTextColor(...PDF_GRAY_COLOR);
    doc.text("A SENTINELA", col1X, yLine2 + PDF_ROLE_Y_OFFSET);
    
    // Leitor - In second column, aligned with "A Sentinela"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_PARTICIPANT_NAME_SIZE);
    doc.setTextColor(...PDF_BLACK_COLOR);
    doc.text(leitorName, col2X -30, yLine2, {align: 'center'}); // Center-ish
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_PARTICIPANT_ROLE_SIZE);
    doc.setTextColor(...PDF_GRAY_COLOR);
    doc.text("LEITOR", col2X -30, yLine2 + PDF_ROLE_Y_OFFSET, {align: 'center'});

    currentY = yLine2 + PDF_ROLE_Y_OFFSET + PDF_V_SPACE_AFTER_SUNDAY_BLOCK;
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
