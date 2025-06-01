
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment, AllPublicMeetingAssignments } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, APP_NAME } from './constants';
import { formatarDataCompleta } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


const getMemberNamePdf = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return '--';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

function getISOWeekPdf(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
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

const SECTION_TITLE_FONT_SIZE = 12;
const SECTION_TITLE_TOP_MARGIN = 18; 
const TABLE_START_MARGIN_AFTER_TITLE = 5; 
const SECTION_BOTTOM_SPACING = 20; 

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

    yPos += SECTION_TITLE_TOP_MARGIN;

    if (yPos + SECTION_TITLE_FONT_SIZE > pageHeight - options.margin.bottom) {
      doc.addPage(); 
      yPos = options.margin.top + 10; 
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, pageMargin, yPos);
    
    yPos += TABLE_START_MARGIN_AFTER_TITLE; 

    autoTable(doc, {
      ...options,
      head: head,
      body: body,
      startY: yPos,
    });
    return (doc as any).lastAutoTable.finalY + SECTION_BOTTOM_SPACING; 
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
    currentPdfY += SECTION_TITLE_TOP_MARGIN;
    const cleaningTitleY = currentPdfY;

    if (cleaningTitleY + SECTION_TITLE_FONT_SIZE > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        currentPdfY = commonTableOptions.margin.top + 10;
    }
    doc.setFontSize(SECTION_TITLE_FONT_SIZE);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", pageMargin, currentPdfY);
    currentPdfY += TABLE_START_MARGIN_AFTER_TITLE;

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
                startYParaSemanal = (limpezaAposReuniaoData.length > 0) ? finalYLimpeza + SECTION_TITLE_TOP_MARGIN : currentPdfY;
                if (limpezaAposReuniaoData.length > 0) { 
                    startYParaSemanal = finalYLimpeza + SECTION_TITLE_TOP_MARGIN;
                    if (startYParaSemanal + SECTION_TITLE_FONT_SIZE > pageHeight - cleaningTableOptions.margin.bottom) {
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

  const drawPageHeader = (pageNumber: number) => {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150); // Cinza para APP_NAME
    doc.text(APP_NAME, margin, margin - 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0); // Preto para o título principal
    const mainTitle = `Programação da Reunião Pública - ${NOMES_MESES[mes]} de ${ano}`;
    doc.text(mainTitle, pageWidth / 2, margin, { align: 'center' });
    currentY = margin + 20; // Ajustar Y inicial após cabeçalho

    if (pageNumber > 1) { 
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 20, { align: 'right'});
    }
  };
  
  drawPageHeader(doc.internal.getNumberOfPages());

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z")) 
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica)
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate, index) => {
    const dateStr = formatarDataCompleta(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;

    const formattedDate = `${NOMES_DIAS_SEMANA_ABREV[sundayDate.getUTCDay()]} ${sundayDate.getUTCDate().toString().padStart(2, '0')} de ${NOMES_MESES[sundayDate.getUTCMonth()]} de ${sundayDate.getUTCFullYear()}`;
    
    const oradorDisplay = `${assignment.orador || 'A Ser Anunciado'}${assignment.congregacaoOrador ? ` (${assignment.congregacaoOrador})` : ''}`;
    const dirigenteName = getMemberNamePdf(assignment.dirigenteId, allMembers);
    const leitorName = getMemberNamePdf(leitorId, allMembers);

    const lineHeight = 10; // Base line height for 10pt font
    const detailLineSpacing = 5; // Space between "Tema:", "Orador:", etc.
    const blockTopMargin = 10;
    const blockSeparatorHeight = 15;

    // Estimar altura do bloco de informações para este domingo
    let estimatedBlockHeight = blockTopMargin;
    doc.setFontSize(12); // Para data
    estimatedBlockHeight += lineHeight * 1.2; // Altura da data
    doc.setFontSize(10); // Para detalhes
    estimatedBlockHeight += (lineHeight + detailLineSpacing) * 4; // 4 linhas de detalhes

    if (currentY + estimatedBlockHeight > pageHeight - margin - 20) { 
      doc.addPage();
      drawPageHeader(doc.internal.getNumberOfPages());
    }

    if (index > 0) { 
      currentY += blockSeparatorHeight / 2; 
      doc.setDrawColor(200, 200, 200); 
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += blockSeparatorHeight / 2; 
    } else {
      currentY += blockTopMargin; // Espaço antes do primeiro bloco se não for o primeiro da página
    }

    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDate, margin, currentY);
    currentY += lineHeight * 1.2 + 5; // Espaço após data

    const addDetail = (label: string, value: string) => {
      doc.setFontSize(10);
      doc.setTextColor(0,0,0); // Garantir cor preta para o texto
      
      const labelText = `${label}:`;
      doc.setFont('helvetica', 'bold');
      doc.text(labelText, margin + 10, currentY);
      
      doc.setFont('helvetica', 'normal');
      const valueToDisplay = value || '--';
      const labelWidth = doc.getTextWidth(labelText);
      const xPosValue = margin + 10 + labelWidth + 5; // 5pt de espaço
      const availableWidthForValue = contentWidth - (xPosValue - (margin + 10)); // Ajustar cálculo da largura disponível
      
      const textLines = doc.splitTextToSize(valueToDisplay, availableWidthForValue);
      doc.text(textLines, xPosValue, currentY);
      currentY += (textLines.length * lineHeight) + detailLineSpacing; 
    };

    addDetail("Tema do Discurso", assignment.tema || 'A Ser Anunciado');
    addDetail("Orador", oradorDisplay);
    addDetail("Dirigente de A Sentinela", dirigenteName);
    addDetail("Leitor de A Sentinela", leitorName);
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

