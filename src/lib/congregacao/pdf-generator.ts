
import jsPDF from 'jspdf';
// Import jspdf-autotable if you plan to use it for the main schedule PDF
// import 'jspdf-autotable'; 
import type { Membro, DesignacoesFeitas, PublicMeetingAssignment, Omit } from './types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_COMPLETOS, APP_NAME, FUNCOES_DESIGNADAS, GRUPOS_LIMPEZA_APOS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NONE_GROUP_ID } from './constants';
import { formatarDataCompleta as formatarDataParaChaveOriginal } from './utils';

// --- Constantes de Layout para PDF da Reunião Pública ---
const RP_MARGIN_TOP = 40;
const RP_MARGIN_BOTTOM = 40;
const RP_MARGIN_LEFT = 40;
const RP_MARGIN_RIGHT = 40;

const RP_MAIN_TITLE_FONT_SIZE = 18;
const RP_DATE_FONT_SIZE = 12;
const RP_DETAIL_FONT_SIZE = 10;
const RP_LINE_HEIGHT_FACTOR = 1.3; // Multiplicador para altura da linha baseado no tamanho da fonte

const RP_SPACE_AFTER_MAIN_TITLE = 40; // Ajustado de 20 para 40
const RP_SPACE_BEFORE_DATE = 0; 
const RP_SPACE_AFTER_DATE = 2.5; // Ajustado de 5 para 2.5
const RP_LINE_THICKNESS = 0.5;
const RP_SPACE_AFTER_LINE_BEFORE_DETAILS = RP_DETAIL_FONT_SIZE * 1.2; 
const RP_DETAIL_ITEM_VERTICAL_SPACING = RP_DETAIL_FONT_SIZE * 0.7;
const RP_SECTION_VERTICAL_SPACING = 45; 

const RP_COLOR_TEXT_DEFAULT_R = 50;
const RP_COLOR_TEXT_DEFAULT_G = 50;
const RP_COLOR_TEXT_DEFAULT_B = 50;

const RP_COLOR_LINE_R = 150;
const RP_COLOR_LINE_G = 150;
const RP_COLOR_LINE_B = 150;

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
  doc.setFontSize(RP_MAIN_TITLE_FONT_SIZE);
  doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
  const mainTitleText = `REUNIÃO PÚBLICA`;
  doc.text(mainTitleText, RP_MARGIN_LEFT, currentY);
  currentY += RP_MAIN_TITLE_FONT_SIZE * 0.7 + RP_SPACE_AFTER_MAIN_TITLE;

  const sundays = Object.keys(assignmentsForMonth)
    .map(dateStr => new Date(dateStr + "T00:00:00Z")) // Use Z para indicar UTC
    .filter(dateObj => dateObj.getUTCDay() === DIAS_REUNIAO.publica && assignmentsForMonth[formatarDataParaChaveOriginal(dateObj)])
    .sort((a, b) => a.getTime() - b.getTime());

  sundays.forEach((sundayDate) => {
    const dateStr = formatarDataParaChaveOriginal(sundayDate);
    const assignment = assignmentsForMonth[dateStr];
    if (!assignment) return;

    const leitorId = mainScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
    
    let oradorDisplay = "A Ser Designado";
    const oradorNomeOriginal = assignment.orador; 
    let oradorObj = allMembers.find(m => m.id === oradorNomeOriginal);
    let congregacaoOrador = assignment.congregacaoOrador;

    if (oradorObj) { // É um ID de membro local
        oradorDisplay = `(Local) ${oradorObj.nome}`;
    } else if (oradorNomeOriginal && oradorNomeOriginal.trim() !== '') { // É um nome de visitante
        oradorDisplay = congregacaoOrador ? `(${congregacaoOrador}) ${oradorNomeOriginal}` : `(Visitante) ${oradorNomeOriginal}`;
    }


    const detailItems: { label: string; value: string }[] = [
      { label: `${RP_BULLET} Tema:`, value: assignment.tema || 'A Ser Anunciado' },
      { label: `${RP_BULLET} Orador:`, value: oradorDisplay },
      { label: `${RP_BULLET} Dirigente de A Sentinela:`, value: getMemberNamePdf(assignment.dirigenteId, allMembers) },
      { label: `${RP_BULLET} Leitor de A Sentinela:`, value: getMemberNamePdf(leitorId, allMembers) }
    ];
    
    let maxLabelWidth = 0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    detailItems.forEach(item => {
        const currentLabelWidth = doc.getTextWidth(item.label + "  "); // Adiciona um pouco de espaço extra após o rótulo
        if (currentLabelWidth > maxLabelWidth) {
            maxLabelWidth = currentLabelWidth;
        }
    });
    const valueStartX = RP_MARGIN_LEFT + maxLabelWidth;
    const availableWidthForValue = contentWidth - maxLabelWidth > 0 ? contentWidth - maxLabelWidth : 1;

    // Estimar altura da seção
    let estimatedSectionHeight = RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE + RP_LINE_THICKNESS + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(RP_DETAIL_FONT_SIZE);
    detailItems.forEach(item => {
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue);
      estimatedSectionHeight += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      estimatedSectionHeight += RP_DETAIL_ITEM_VERTICAL_SPACING;
    });
    estimatedSectionHeight -= RP_DETAIL_ITEM_VERTICAL_SPACING; // Remover o último espaçamento extra

    if (!isFirstBlockOnPage) {
      estimatedSectionHeight += RP_SECTION_VERTICAL_SPACING;
    }

    if (currentY + estimatedSectionHeight > pageHeight - RP_MARGIN_BOTTOM) {
      doc.addPage();
      currentY = RP_MARGIN_TOP;
      isFirstBlockOnPage = true;
      // Não repetir o título principal em novas páginas para este layout
    }

    if (!isFirstBlockOnPage) {
        currentY += RP_SECTION_VERTICAL_SPACING;
    }
    
    // Data
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(RP_DATE_FONT_SIZE);
    doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
    const formattedDateDisplay = formatDisplayDateForPublicMeetingPdf(sundayDate);
    doc.text(formattedDateDisplay, RP_MARGIN_LEFT, currentY);
    currentY += RP_DATE_FONT_SIZE + RP_SPACE_AFTER_DATE;

    // Linha Horizontal
    doc.setDrawColor(RP_COLOR_LINE_R, RP_COLOR_LINE_G, RP_COLOR_LINE_B);
    doc.setLineWidth(RP_LINE_THICKNESS);
    doc.line(RP_MARGIN_LEFT, currentY, RP_MARGIN_LEFT + contentWidth, currentY);
    currentY += RP_LINE_THICKNESS + RP_SPACE_AFTER_LINE_BEFORE_DETAILS;

    // Detalhes
    detailItems.forEach((item, itemIndex) => {
      doc.setTextColor(RP_COLOR_TEXT_DEFAULT_R, RP_COLOR_TEXT_DEFAULT_G, RP_COLOR_TEXT_DEFAULT_B);
      
      doc.setFont('helvetica', 'bold'); 
      doc.setFontSize(RP_DETAIL_FONT_SIZE);
      doc.text(item.label, RP_MARGIN_LEFT, currentY);
      
      doc.setFont('helvetica', 'normal'); 
      const valueLines = doc.splitTextToSize(item.value, availableWidthForValue);
      doc.text(valueLines, valueStartX, currentY);
      
      currentY += (valueLines.length * RP_DETAIL_FONT_SIZE * RP_LINE_HEIGHT_FACTOR);
      if (itemIndex < detailItems.length - 1) {
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


// --- Nova Função para Cronograma Principal ---
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
  const margin = 20; // Margem geral
  const contentWidth = pageWidth - 2 * margin;

  const monthName = NOMES_MESES[month] || 'Mês Desconhecido';
  const mainTitleText = `Cronograma Principal - ${monthName} de ${year}`;
  
  let currentY = margin;

  // Título Principal
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
    
    // Considerar apenas dias de reunião (ou ajustar se a lógica for diferente para limpeza semanal)
    if (dayOfWeek !== DIAS_REUNIAO.meioSemana && dayOfWeek !== DIAS_REUNIAO.publica) {
        // Checar se há designação de limpeza semanal para um dia que não é de reunião (geralmente o domingo da semana)
        const assignmentsForDay = schedule[dateStr];
        if (!assignmentsForDay || !assignmentsForDay.limpezaSemanalResponsavel) {
            continue; 
        }
    }


    if (currentY > pageHeight - margin - 20) { // Deixar espaço para o rodapé
      doc.addPage();
      currentY = margin;
      // Adicionar cabeçalho novamente se necessário
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
    currentY += 10 * 0.7 + 3; // Espaço após data
    doc.setFont('helvetica', 'normal');

    const assignmentsOfTheDay = schedule[dateStr];
    let detailPrinted = false;

    for (const funcId in assignmentsOfTheDay) {
      const memberId = assignmentsOfTheDay[funcId];
      const funcDef = FUNCOES_DESIGNADAS.find(f => f.id === funcId);
      const member = members.find(m => m.id === memberId);

      if (funcDef && member) {
        doc.text(`  • ${funcDef.nome}: ${member.nome}`, margin + 5, currentY);
        currentY += 10 * 0.7 + 2;
        detailPrinted = true;
      } else if (funcId === 'limpezaAposReuniaoGrupoId' && memberId) {
        const grupo = GRUPOS_LIMPEZA_APOS_REUNIAO.find(g => g.id === memberId);
        if (grupo && grupo.id !== NONE_GROUP_ID) {
             doc.text(`  • Limpeza Pós-Reunião: ${grupo.nome}`, margin + 5, currentY);
             currentY += 10 * 0.7 + 2;
             detailPrinted = true;
        }
      } else if (funcId === 'limpezaSemanalResponsavel' && memberId && typeof memberId === 'string' && memberId.trim() !== '') {
         doc.text(`  • Limpeza Semanal: ${memberId}`, margin + 5, currentY);
         currentY += 10 * 0.7 + 2;
         detailPrinted = true;
      }
    }
    if(detailPrinted) currentY += 5; // Espaço entre os dias
    else currentY -= (10 * 0.7 + 3); // Reverter espaço da data se nada foi impresso
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

