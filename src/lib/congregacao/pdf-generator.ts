
import jsPDF from 'jspdf';
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment, Omit } from './types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME, FUNCOES_DESIGNADAS, GRUPOS_LIMPEZA_APOS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NONE_GROUP_ID } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';

// --- Constantes de Layout ---
const RP_MARGIN_TOP = 40;
const RP_MARGIN_BOTTOM = 40;
const RP_MARGIN_LEFT = 40;
const RP_MARGIN_RIGHT = 40;

const RP_MAIN_TITLE_FONT_SIZE = 18;
const RP_DATE_FONT_SIZE = 11;
const RP_THEME_FONT_SIZE = 13; 
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_HEIGHT_FACTOR = 1.3;

const RP_SPACE_AFTER_MAIN_TITLE = 15; // Reduzido para dar espaço para a nova linha
const RP_SPACE_AFTER_DATE_AND_THEME = 25;
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 1.5;
const RP_SECTION_VERTICAL_SPACING = 40; 

const RP_BOX_PADDING = 15;
const RP_BOX_CORNER_RADIUS = 5;
const RP_BOX_BORDER_COLOR_R = 220;
const RP_BOX_BORDER_COLOR_G = 220;
const RP_BOX_BORDER_COLOR_B = 220;

// NOVO: Constantes para a linha do cabeçalho
const RP_HEADER_LINE_THICKNESS = 1.5;
const RP_HEADER_LINE_COLOR_R = 140; // Vermelho escuro/Borgonha
const RP_HEADER_LINE_COLOR_G = 0;
const RP_HEADER_LINE_COLOR_B = 20;
const RP_SPACE_AFTER_HEADER_LINE = 25;

const RP_COLOR_TEXT_DEFAULT_R = 30;

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
  const contentWidth = pageWidth - RP_MARGIN_LEFT - RP_MARGIN_RIGHT;

  let currentY = RP_MARGIN_TOP;

  // --- Título Principal e Nova Linha ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_R);
  doc.text(`REUNIÃO PÚBLICA`, pageWidth / 2, currentY, { align: 'center' });
  currentY += RP_MAIN_TITLE_FONT_SIZE * 0.7 + RP_SPACE_AFTER_MAIN_TITLE;

  // MODIFICADO: Desenha a nova linha horizontal abaixo do título
  const headerLineWidth = contentWidth * 0.4; // Linha com 40% da largura do conteúdo para elegância
  const lineX1 = (pageWidth / 2) - (headerLineWidth / 2);
  const lineX2 = (pageWidth / 2) + (headerLineWidth / 2);
  doc.setDrawColor(RP_HEADER_LINE_COLOR_R, RP_HEADER_LINE_COLOR_G, RP_HEADER_LINE_COLOR_B);
  doc.setLineWidth(RP_HEADER_LINE_THICKNESS);
  doc.line(lineX1, currentY, lineX2, currentY);
  currentY += RP_SPACE_AFTER_HEADER_LINE;
  // --- Fim do Cabeçalho ---


  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica && assignmentsForMonth[formatarDataParaChaveOriginal(dateObj)])
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate, sundayIndex) => {
    if (sundayIndex > 0) {
        currentY += RP_SECTION_VERTICAL_SPACING;
    }

    const boxContentStartY = currentY;
    let contentY = boxContentStartY;

    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;
    
    // ... (lógica para pegar valores permanece a mesma)
    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    let oradorBaseName: string = "A Ser Designado";
    const oradorInput = assignment.orador;
    if (oradorInput && oradorInput.trim() !== '') {
        const localMemberMatch = allMembers.find(m => m.id === oradorInput);
        oradorBaseName = localMemberMatch ? localMemberMatch.nome : oradorInput;
    }
    const congregacaoValue = assignment.congregacaoOrador || 'Local';
    const dirigenteValue = getMemberNamePdf(assignment.dirigenteId, allMembers);
    const leitorValue = getMemberNamePdf(leitorId, allMembers);
    const temaValue = assignment.tema || 'A Ser Anunciado';

    // Desenho da Data
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_R);
    doc.text(formatDisplayDateForPublicMeetingPdf(sundayDate), RP_MARGIN_LEFT, contentY);
    contentY += RP_DATE_FONT_SIZE * RP_LINE_HEIGHT_FACTOR * 1.5;

    // Desenho do Tema
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_THEME_FONT_SIZE);
    const temaLines = doc.splitTextToSize(temaValue, contentWidth);
    doc.text(temaLines, RP_MARGIN_LEFT, contentY);
    contentY += (temaLines.length * RP_THEME_FONT_SIZE * RP_LINE_HEIGHT_FACTOR) + RP_SPACE_AFTER_DATE_AND_THEME;

    // Bloco de Participantes (sem alterações)
    const col1_X = RP_MARGIN_LEFT;
    const col2_X = RP_MARGIN_LEFT + (contentWidth / 2);
    const barSpacing = 8;
    const textX_Col1 = col1_X + barSpacing;
    const textX_Col2 = col2_X + barSpacing;
    const participantsTitleY = contentY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    doc.text("Participantes", textX_Col1, participantsTitleY);
    const contentStartY = participantsTitleY + RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR;
    let line1_Y = contentStartY;
    let line2_Y = line1_Y + RP_DETAIL_ITEM_VERTICAL_SPACING;
    doc.setFont('helvetica', 'normal');
    doc.text(`Orador: ${oradorBaseName}`, textX_Col1, line1_Y);
    doc.text(`Dirigente: ${dirigenteValue}`, textX_Col2, line1_Y);
    doc.text(`Congregação: ${congregacaoValue}`, textX_Col1, line2_Y);
    doc.text(`Leitor: ${leitorValue}`, textX_Col2, line2_Y);
    const participantsBlockStartY = participantsTitleY - (RP_DETAIL_FONT_SIZE * 0.4);
    const participantsBlockEndY = line2_Y + (RP_DETAIL_FONT_SIZE * 0.4);
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.75);
    doc.line(col1_X, participantsBlockStartY, col1_X, participantsBlockEndY);
    doc.line(col2_X, participantsBlockStartY, col2_X, participantsBlockEndY);
    
    // Desenho do Box
    const boxContentEndY = participantsBlockEndY;
    const boxHeight = (boxContentEndY - boxContentStartY) + (RP_BOX_PADDING * 2);
    doc.setDrawColor(RP_BOX_BORDER_COLOR_R, RP_BOX_BORDER_COLOR_G, RP_BOX_BORDER_COLOR_B);
    doc.setLineWidth(1);
    doc.roundedRect(
      RP_MARGIN_LEFT - RP_BOX_PADDING,
      boxContentStartY - RP_BOX_PADDING,
      contentWidth + (RP_BOX_PADDING * 2),
      boxHeight,
      RP_BOX_CORNER_RADIUS,
      RP_BOX_CORNER_RADIUS
    );

    currentY = boxContentStartY - RP_BOX_PADDING + boxHeight;
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

// A função generateSchedulePdf e outras funções auxiliares permanecem como estavam,
// a menos que também tenham sido fornecidas para modificação.
// Por ora, apenas generatePublicMeetingPdf foi alterada com base no código fornecido.

// Função para Cronograma Principal (Indicadores, Volantes, AV, Limpeza)
// (Esta função permanece como estava antes, pois não foi fornecida uma nova versão para ela)
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
  const contentWidthMain = pageWidth - 2 * margin; // Renomeado para evitar conflito com contentWidth da outra função

  const monthName = NOMES_MESES[month] || 'Mês Desconhecido';
  const mainTitleText = `Cronograma Principal - ${monthName} de ${year}`;
  
  let currentY_schedule = margin; // Renomeado para evitar conflito com currentY da outra função

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(mainTitleText, pageWidth / 2, currentY_schedule, { align: 'center' });
  currentY_schedule += 16 * 0.7 + 15;


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


    if (currentY_schedule > pageHeight - margin - 30) { 
      doc.addPage();
      currentY_schedule = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(mainTitleText, pageWidth / 2, currentY_schedule, { align: 'center' });
      currentY_schedule += 16 * 0.7 + 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    const formattedDateDisplay_schedule = `${NOMES_DIAS_SEMANA_ABREV[dayOfWeek]} ${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCFullYear()}`; // Renomeado
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDateDisplay_schedule, margin, currentY_schedule);
    currentY_schedule += 10 * 0.7 + 3; 
    doc.setFont('helvetica', 'normal');

    let detailPrintedForDate = false;

    for (const funcId in assignmentsForDay) {
      const memberId = assignmentsForDay[funcId];
      const funcDef = FUNCOES_DESIGNADAS.find(f => f.id === funcId);
      const member = members.find(m => m.id === memberId);

      if (funcDef && member) {
        doc.text(`  • ${funcDef.nome}: ${member.nome}`, margin + 5, currentY_schedule);
        currentY_schedule += 10 * 0.7 + 2;
        detailPrintedForDate = true;
      } else if (funcId === 'limpezaAposReuniaoGrupoId' && memberId) {
        const grupo = GRUPOS_LIMPEZA_APOS_REUNIAO.find(g => g.id === memberId);
        if (grupo && grupo.id !== NONE_GROUP_ID) {
             doc.text(`  • Limpeza Pós-Reunião: ${grupo.nome}`, margin + 5, currentY_schedule);
             currentY_schedule += 10 * 0.7 + 2;
             detailPrintedForDate = true;
        }
      } else if (funcId === 'limpezaSemanalResponsavel' && memberId && typeof memberId === 'string' && memberId.trim() !== '') {
         doc.text(`  • Limpeza Semanal: ${memberId}`, margin + 5, currentY_schedule);
         currentY_schedule += 10 * 0.7 + 2;
         detailPrintedForDate = true;
      }
    }
    if(detailPrintedForDate) currentY_schedule += 5; 
    else currentY_schedule -= (10 * 0.7 + 3); // Volta se nada foi impresso para esta data
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

  doc.save(`cronograma_principal_${NOMES_MESES[month].toLowerCase().replace(/ /g, '_')}_${year}.pdf`);
}
    

    

    
