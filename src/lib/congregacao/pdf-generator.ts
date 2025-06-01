
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
         // Adicionar número da página no rodapé
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
      // drawMainScheduleTitle(); // o didDrawPage já faz isso
      yPos = options.margin.top + 25; // Ajuste para não sobrepor o título redesenhado
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
        // drawMainScheduleTitle(); // o didDrawPage já faz isso
        currentPdfY = commonTableOptions.margin.top + 25;
        cleaningTitleY = currentPdfY; // Reatribuir cleaningTitleY após addPage
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
             didDrawPage: function (data: any) { // Copiado de commonTableOptions e adaptado
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

        if (limpezaAposReuniaoData.length > 0) { // Se a tabela de limpeza pós reunião foi desenhada
             if (lastTableOnPage < doc.internal.getNumberOfPages()) { // Se a tabela anterior causou quebra de página
                startYParaSemanal = commonTableOptions.margin.top + 25; // Começa abaixo do título
                marginParaSemanal.left = pageMarginMain;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = contentWidth; 
            } else { // Ambas cabem na mesma página (lado a lado)
                marginParaSemanal.left = pageMarginMain + tableWidth + 10;
                marginParaSemanal.right = pageMarginMain;
                tableWidthSemanal = tableWidth;
            }
        } else { // Se a tabela de limpeza semanal é a primeira (ou única) tabela de limpeza
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
             didDrawPage: function (data: any) { // Copiado de commonTableOptions e adaptado
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

const RP_MAIN_TITLE_FONT_SIZE = 18;
const RP_DATE_FONT_SIZE = 12;
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_SPACING_FACTOR = 1.4; // Para multilinhas
const RP_BULLET = "\u2022"; // •

const RP_MARGIN = 40;
const RP_SPACE_AFTER_MAIN_TITLE = 20;
const RP_SPACE_AFTER_DATE_TEXT = RP_DATE_FONT_SIZE * 0.3;
const RP_SPACE_AFTER_LINE_BEFORE_DETAILS = RP_DETAIL_FONT_SIZE * 1.2; // Aumentado de 0.7
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 0.5; // Espaço entre os itens (Tema, Orador etc.)
const RP_SECTION_VERTICAL_SPACING = 20; // Espaço entre blocos de domingos

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
  const contentWidth = pageWidth - 2 * RP_MARGIN;

  const regularFont = 'helvetica';
  const boldFont = 'helvetica'; 

  const textColor = [40, 40, 40]; 
  const lineColor = [150, 150, 150]; 
  
  let currentY = RP_MARGIN;

  // Título Principal
  doc.setFont(regularFont, 'normal');
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("REUNIÃO PÚBLICA", RP_MARGIN, currentY);
  currentY += RP_MAIN_TITLE_FONT_SIZE + RP_SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z")) // Use T00:00:00Z para consistência UTC
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

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
          let oradorCongregation = assignment.congregacaoOrador ? `(${assignment.congregacaoOrador})` : "(Local)";
          // Se orador não é um ID de membro conhecido, mas uma string (nome direto), usar o que foi digitado.
          if (typeof assignment.orador === 'string' && assignment.orador && !allMembers.find(m => m.id === assignment.orador)) {
              oradorName = assignment.orador;
              // Se foi digitado um nome, não mostrar "(Local)" a menos que a congregação também tenha sido digitada
              if (!assignment.congregacaoOrador && oradorName !== 'A Ser Designado' && oradorName !== 'Desconhecido') {
                oradorCongregation = ""; // Evita (Local) se o nome foi apenas digitado
              }
          } else if (oradorName === 'A Ser Designado' || oradorName === 'Desconhecido') {
             oradorCongregation = ""; // Não mostrar (Local) para "A Ser Designado"
          }
          return `${oradorCongregation} ${oradorName}`.trim();
        })()
      },
      { label: "Dirigente de A Sentinela:", value: getMemberNamePdf(assignment.dirigenteId, allMembers) },
      { label: "Leitor de A Sentinela:", value: getMemberNamePdf(leitorId, allMembers) }
    ];

    // Estimar altura da seção
    let estimatedSectionHeight = RP_DATE_FONT_SIZE * RP_LINE_SPACING_FACTOR + RP_SPACE_AFTER_DATE_TEXT + 1 + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    let maxLabelWidth = 0;
    detailItems.forEach(item => {
        const labelTextWithBullet = `${RP_BULLET} ${item.label}`;
        const currentLabelWidth = doc.getTextWidth(labelTextWithBullet);
        if (currentLabelWidth > maxLabelWidth) {
            maxLabelWidth = currentLabelWidth;
        }
    });
    const valueStartX = RP_MARGIN + maxLabelWidth + 5; // 5pt de espaço entre label e valor
    const availableWidthForValue = contentWidth - (valueStartX - RP_MARGIN);

    detailItems.forEach(item => {
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue > 0 ? availableWidthForValue : 1);
      estimatedSectionHeight += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_SPACING_FACTOR);
      estimatedSectionHeight += RP_DETAIL_ITEM_VERTICAL_SPACING;
    });
    estimatedSectionHeight += RP_SECTION_VERTICAL_SPACING - RP_DETAIL_ITEM_VERTICAL_SPACING;


    if (index > 0 && currentY + estimatedSectionHeight > pageHeight - RP_MARGIN) {
      doc.addPage();
      currentY = RP_MARGIN;
      // Não repetir o título principal em novas páginas para este layout
    } else if (index > 0) {
        currentY += RP_SECTION_VERTICAL_SPACING * 0.5; // Espaço menor entre seções na mesma página
    }
    
    // Data
    doc.setFont(boldFont, 'bold');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, RP_MARGIN, currentY);
    currentY += RP_DATE_FONT_SIZE * RP_LINE_SPACING_FACTOR * 0.8; // Ajustar para a linha não sobrepor
    currentY += RP_SPACE_AFTER_DATE_TEXT;

    // Linha Horizontal
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.5);
    doc.line(RP_MARGIN, currentY, RP_MARGIN + contentWidth, currentY);
    currentY += RP_SPACE_AFTER_LINE_BEFORE_DETAILS;

    // Detalhes
    detailItems.forEach(item => {
      doc.setFont(regularFont, 'normal'); // Rótulo não mais em negrito, como na imagem
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      const labelTextWithBullet = `${RP_BULLET} ${item.label}`;
      doc.text(labelTextWithBullet, RP_MARGIN, currentY);
      
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue > 0 ? availableWidthForValue : 1);
      doc.text(valueLines, valueStartX, currentY);
      
      currentY += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_SPACING_FACTOR);
      currentY += RP_DETAIL_ITEM_VERTICAL_SPACING;
    });
     currentY += RP_SECTION_VERTICAL_SPACING * 0.5; // Espaço final da seção
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
