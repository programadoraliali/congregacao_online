
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
const RP_DATE_FONT_SIZE = 13; // Um pouco maior para destaque
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_HEIGHT_FACTOR = 1.3;

const RP_SPACE_AFTER_MAIN_TITLE = 30;
const RP_SPACE_AFTER_DATE = 5;
const RP_LINE_THICKNESS = 0.5;
const RP_SPACE_AFTER_THEME = RP_DETAIL_FONT_SIZE * 2.0; // Mais espaço após o tema
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 0.7;
const RP_SPACE_AFTER_SECTION = 45; // Espaço após a linha separadora

const RP_COLOR_TEXT_DEFAULT_R = 50;
const RP_COLOR_TEXT_DEFAULT_G = 50;
const RP_COLOR_TEXT_DEFAULT_B = 50;
const RP_COLOR_TEXT_MUTED_R = 120;
const RP_COLOR_TEXT_MUTED_G = 120;
const RP_COLOR_TEXT_MUTED_B = 120;

const RP_COLOR_LINE_R = 200; // Linha mais suave
const RP_COLOR_LINE_G = 200;
const RP_COLOR_LINE_B = 200;


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

  // Título Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
  doc.text(`REUNIÃO PÚBLICA`, pageWidth / 2, currentY, { align: 'center' });
  currentY += RP_MAIN_TITLE_FONT_SIZE * 0.7 + RP_SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z"))
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica && assignmentsForMonth[formatarDataParaChaveOriginal(dateObj)])
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate, sundayIndex) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    // Pega os valores necessários
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
    
    // --- LÓGICA DE DESENHO FINAL ---

    // 1. Data como Título da Seção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
    doc.text(formatDisplayDateForPublicMeetingPdf(sundayDate), RP_MARGIN_LEFT, currentY);
    currentY += RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE;

    // 2. Tema como Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(RP_DETAIL_FONT_SIZE + 1);
    doc.setTextColor(RP_COLOR_TEXT_MUTED_R, RP_COLOR_TEXT_MUTED_G, RP_COLOR_TEXT_MUTED_B);
    const temaLines = doc.splitTextToSize(temaValue, contentWidth);
    doc.text(temaValue, RP_MARGIN_LEFT, currentY); // Alinhado à esquerda para um look de agenda
    const temaHeight = (temaLines.length * (RP_DETAIL_FONT_SIZE + 1) * RP_LINE_HEIGHT_FACTOR);
    currentY += temaHeight + RP_SPACE_AFTER_THEME;

    // 3. Bloco de Participantes em Colunas (Agrupamento Vertical)
    const col1_X = RP_MARGIN_LEFT;
    const col2_X = RP_MARGIN_LEFT + (contentWidth / 2) + 10;
    const labelFont = 'helvetica';
    const labelWeight = 'bold';
    const valueFont = 'helvetica';
    const valueWeight = 'normal';
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);

    const labelOrador = `Orador:`;
    const labelCongregacao = `Congregação:`;
    const labelDirigente = `Dirigente:`;
    const labelLeitor = `Leitor:`;

    const maxLabelWidthCol1 = Math.max(doc.getTextWidth(labelOrador), doc.getTextWidth(labelCongregacao));
    const maxLabelWidthCol2 = Math.max(doc.getTextWidth(labelDirigente), doc.getTextWidth(labelLeitor));
    const valueX_Col1 = col1_X + maxLabelWidthCol1 + 5;
    const valueX_Col2 = col2_X + maxLabelWidthCol2 + 5;
    
    let currentLineY = currentY;
    doc.setFont(labelFont, labelWeight);
    doc.text(labelOrador, col1_X, currentLineY);
    doc.text(labelDirigente, col2_X, currentLineY);
    doc.setFont(valueFont, valueWeight);
    doc.text(oradorBaseName, valueX_Col1, currentLineY);
    doc.text(dirigenteValue, valueX_Col2, currentLineY);
    currentY += RP_DETAIL_FONT_SIZE + RP_DETAIL_ITEM_VERTICAL_SPACING;

    currentLineY = currentY;
    doc.setFont(labelFont, labelWeight);
    doc.text(labelCongregacao, col1_X, currentLineY);
    doc.text(labelLeitor, col2_X, currentLineY);
    doc.setFont(valueFont, valueWeight);
    doc.text(congregacaoValue, valueX_Col1, currentLineY);
    doc.text(leitorValue, valueX_Col2, currentLineY);
    currentY += RP_DETAIL_FONT_SIZE;
    
    // 4. Linha Separadora de Seção
    currentY += RP_SPACE_AFTER_SECTION / 2;
    doc.setDrawColor(RP_COLOR_LINE_R, RP_COLOR_LINE_G, RP_COLOR_LINE_B);
    doc.setLineWidth(RP_LINE_THICKNESS);
    doc.line(RP_MARGIN_LEFT, currentY, RP_MARGIN_LEFT + contentWidth, currentY);
    currentY += RP_SPACE_AFTER_SECTION / 2;
  });

  doc.save(`reuniao_publica_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

// A primeira parte do arquivo (constantes, helpers) permanece a mesma...
// (Esta linha de comentário no final do seu código parece ser um resto de uma instrução anterior,
// mas todo o conteúdo do arquivo será substituído pelo que está acima.)

// --- Função para Cronograma Principal (Indicadores, Volantes, AV, Limpeza) ---
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
  const contentWidth = pageWidth - 2 * margin;

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

    