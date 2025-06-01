
import jsPDF from 'jspdf';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment, Omit } from './types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME, FUNCOES_DESIGNADAS, GRUPOS_LIMPEZA_APOS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NONE_GROUP_ID } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';

// --- Constantes de Layout para PDF da Reunião Pública ---
const RP_MARGIN_TOP = 40;
const RP_MARGIN_BOTTOM = 40;
const RP_MARGIN_LEFT = 40;
const RP_MARGIN_RIGHT = 40;

const RP_APP_NAME_FONT_SIZE = 9;
const RP_MAIN_TITLE_FONT_SIZE = 18;
const RP_DATE_FONT_SIZE = 12;
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_HEIGHT_FACTOR = 1.3;

const RP_SPACE_AFTER_MAIN_TITLE = 40; 
const RP_SPACE_BEFORE_DATE = 0; 
const RP_SPACE_AFTER_DATE = 2.5; 
const RP_LINE_THICKNESS = 0.5;
const RP_SPACE_AFTER_LINE_BEFORE_DETAILS = RP_DETAIL_FONT_SIZE * 1.2; 
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 0.7; 
const RP_SECTION_VERTICAL_SPACING = 45; 

const RP_COLOR_TEXT_DEFAULT_R = 50;
const RP_COLOR_TEXT_DEFAULT_G = 50;
const RP_COLOR_TEXT_DEFAULT_B = 50;
const RP_COLOR_TEXT_MUTED_R = 120;
const RP_COLOR_TEXT_MUTED_G = 120;
const RP_COLOR_TEXT_MUTED_B = 120;

const RP_COLOR_LINE_R = 100;
const RP_COLOR_LINE_G = 100;
const RP_COLOR_LINE_B = 100;

const RP_BULLET = "\u2022";


const getMemberNamePdf = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return 'A Ser Designado';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

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
  const contentWidth = pageWidth - RP_MARGIN_LEFT - RP_MARGIN_RIGHT;

  let currentY = RP_MARGIN_TOP;
  let isFirstBlockOnPage = true;

  // Título Principal (apenas na primeira página)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(RP_APP_NAME_FONT_SIZE);
  doc.setTextColor(RP_COLOR_TEXT_MUTED_R, RP_COLOR_TEXT_MUTED_G, RP_COLOR_TEXT_MUTED_B);
  doc.text(APP_NAME.toUpperCase(), RP_MARGIN_LEFT, currentY - RP_APP_NAME_FONT_SIZE - 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
  const mainTitleText = `REUNIÃO PÚBLICA`;
  doc.text(mainTitleText, RP_MARGIN_LEFT, currentY);
  currentY += RP_MAIN_TITLE_FONT_SIZE * 0.7 + RP_SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica && assignmentsForMonth[formatarDataParaChaveOriginal(dateObj)])
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    
    let oradorDisplayValue = "A Ser Designado";
    const oradorInput = assignment.orador; 
    const congregacaoInput = assignment.congregacaoOrador;

    if (oradorInput && oradorInput.trim() !== '') {
        const localMemberMatch = allMembers.find(m => m.id === oradorInput);
        let speakerName: string;

        if (localMemberMatch) {
            // Speaker is a local member (oradorInput was their ID)
            speakerName = localMemberMatch.nome;
        } else {
            // Speaker is a visitor (oradorInput is their name as a string)
            speakerName = oradorInput;
        }

        if (congregacaoInput && congregacaoInput.trim() !== '') {
            oradorDisplayValue = `${speakerName} ø ${congregacaoInput}`;
        } else {
            oradorDisplayValue = speakerName; // Just the name if no congregation is specified
        }
    }

    const detailItemsConfig: { label: string; value: string }[] = [
      { label: `Tema:`, value: assignment.tema || 'A Ser Anunciado' },
      { label: `Orador:`, value: oradorDisplayValue },
      { label: `Dirigente de A Sentinela:`, value: getMemberNamePdf(assignment.dirigenteId, allMembers) },
      { label: `Leitor de A Sentinela:`, value: getMemberNamePdf(leitorId, allMembers) }
    ];
    
    let maxLabelWidth = 0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    detailItemsConfig.forEach(itemConf => {
        const currentLabelWidth = doc.getTextWidth(RP_BULLET + " " + itemConf.label + " ");
        if (currentLabelWidth > maxLabelWidth) {
            maxLabelWidth = currentLabelWidth;
        }
    });
    const valueStartX = RP_MARGIN_LEFT + maxLabelWidth;
    const availableWidthForValue = contentWidth - maxLabelWidth > 0 ? contentWidth - maxLabelWidth : 1;


    let estimatedSectionHeight = RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE + RP_LINE_THICKNESS + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;
    detailItemsConfig.forEach(itemConf => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      const valueLines = doc.splitTextToSize(itemConf.value, availableWidthForValue);
      estimatedSectionHeight += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      estimatedSectionHeight += RP_DETAIL_ITEM_VERTICAL_SPACING;
    });
    estimatedSectionHeight -= RP_DETAIL_ITEM_VERTICAL_SPACING; 

    if (!isFirstBlockOnPage) {
      estimatedSectionHeight += RP_SECTION_VERTICAL_SPACING;
    }

    if (currentY + estimatedSectionHeight > pageHeight - RP_MARGIN_BOTTOM) {
      doc.addPage();
      currentY = RP_MARGIN_TOP;
      isFirstBlockOnPage = true;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(RP_APP_NAME_FONT_SIZE);
      doc.setTextColor(RP_COLOR_TEXT_MUTED_R, RP_COLOR_TEXT_MUTED_G, RP_COLOR_TEXT_MUTED_B);
      doc.text(APP_NAME.toUpperCase(), RP_MARGIN_LEFT, currentY - RP_APP_NAME_FONT_SIZE - 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
      doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
      doc.text(mainTitleText, RP_MARGIN_LEFT, currentY);
      currentY += RP_MAIN_TITLE_FONT_SIZE * 0.7 + RP_SPACE_AFTER_MAIN_TITLE;
    }

    if (!isFirstBlockOnPage) {
        currentY += RP_SECTION_VERTICAL_SPACING;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, RP_MARGIN_LEFT, currentY);
    currentY += RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE;

    doc.setDrawColor(RP_COLOR_LINE_R, RP_COLOR_LINE_G, RP_COLOR_LINE_B);
    doc.setLineWidth(RP_LINE_THICKNESS);
    doc.line(RP_MARGIN_LEFT, currentY, RP_MARGIN_LEFT + contentWidth, currentY);
    currentY += RP_LINE_THICKNESS + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;

    detailItemsConfig.forEach((itemConf, itemIndex) => {
      doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
      
      doc.setFont('helvetica', 'bold'); 
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      const labelText = RP_BULLET + " " + itemConf.label;
      doc.text(labelText, RP_MARGIN_LEFT, currentY);
      
      doc.setFont('helvetica', 'normal'); 
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      const valueLines = doc.splitTextToSize(itemConf.value, availableWidthForValue);
      doc.text(valueLines, valueStartX, currentY);
      
      currentY += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      if (itemIndex < detailItemsConfig.length - 1) {
          currentY += RP_DETAIL_ITEM_VERTICAL_SPACING;
      }
    });
    isFirstBlockOnPage = false;
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  if (pageCount > 1) {
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - RP_MARGIN_RIGHT, pageHeight - (RP_MARGIN_BOTTOM / 2), { align: 'right' });
    }
  }

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}


// --- Função para Cronograma Principal ---
export function generateSchedulePdf(
  schedule: DesignacoesFeitas,
  members: Membro[],
  month: number,
  year: number
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; 
  const contentWidth = pageWidth - 2 * margin;

  const monthName = NOMES_MESES[month] || 'Mês Desconhecido';
  const mainTitleText = `Cronograma Principal - ${monthName} de ${year}`;
  
  let currentY = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(mainTitleText, pageWidth / 2, currentY, { align: 'center' });
  currentY += 16 * 0.7 + 15;


  const sortedDates = Object.keys(schedule).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const dateStr of sortedDates) {
    const dateObj = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();
    
    const assignmentsForDay = schedule[dateStr];
    let hasContentForDay = false;
    for (const funcId in assignmentsForDay) {
        if (assignmentsForDay[funcId] && assignmentsForDay[funcId] !== NONE_GROUP_ID) {
            if (funcId === 'limpezaSemanalResponsavel' && typeof assignmentsForDay[funcId] === 'string' && (assignmentsForDay[funcId] as string).trim() === '') {
                // Skip empty weekly cleaning
            } else {
                hasContentForDay = true;
                break;
            }
        }
    }
    if (!hasContentForDay) continue;


    if (currentY > pageHeight - margin - 30) { 
      doc.addPage();
      currentY = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(mainTitleText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 16 * 0.7 + 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    const formattedDateDisplay = `${NOMES_DIAS_SEMANA_ABREV[dayOfWeek]} ${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCFullYear()}`;
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDateDisplay, margin, currentY);
    currentY += 10 * 0.7 + 3; 
    doc.setFont('helvetica', 'normal');

    let detailPrintedForDate = false;

    for (const funcId in assignmentsForDay) {
      const memberId = assignmentsForDay[funcId];
      const funcDef = FUNCOES_DESIGNADAS.find(f => f.id === funcId);
      const member = members.find(m => m.id === memberId);

      if (funcDef && member) {
        doc.text(`  • ${funcDef.nome}: ${member.nome}`, margin + 5, currentY);
        currentY += 10 * 0.7 + 2;
        detailPrintedForDate = true;
      } else if (funcId === 'limpezaAposReuniaoGrupoId' && memberId) {
        const grupo = GRUPOS_LIMPEZA_APOS_REUNIAO.find(g => g.id === memberId);
        if (grupo && grupo.id !== NONE_GROUP_ID) {
             doc.text(`  • Limpeza Pós-Reunião: ${grupo.nome}`, margin + 5, currentY);
             currentY += 10 * 0.7 + 2;
             detailPrintedForDate = true;
        }
      } else if (funcId === 'limpezaSemanalResponsavel' && memberId && typeof memberId === 'string' && memberId.trim() !== '') {
         doc.text(`  • Limpeza Semanal: ${memberId}`, margin + 5, currentY);
         currentY += 10 * 0.7 + 2;
         detailPrintedForDate = true;
      }
    }
    if(detailPrintedForDate) currentY += 5; 
    else currentY -= (10 * 0.7 + 3); 
  }
  
  const pageCount = doc.internal.getNumberOfPages();
  if (pageCount > 1) {
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - (margin / 2), { align: 'right' });
    }
  }

  doc.save(`cronograma_principal_${monthName.toLowerCase().replace(/ /g, '_')}_${year}.pdf`);
}
