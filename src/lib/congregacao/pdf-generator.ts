
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV } from './constants';
import { formatarDataCompleta } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


const getMemberName = (memberId: string | null | undefined, membros: Membro[]): string => {
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
const SECTION_TITLE_TOP_MARGIN = 18; // Espaço antes de um título de seção
const TABLE_START_MARGIN_AFTER_TITLE = 5; // Espaço entre o título da seção e o início da tabela
const SECTION_BOTTOM_SPACING = 20; // Espaço após uma tabela, antes da próxima seção

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
  const pageMargin = 25; // Aumentei um pouco para garantir que não encoste nas bordas
  const contentWidth = pageWidth - 2 * pageMargin;

  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  
  const drawMainTitle = () => {
    doc.setFontSize(18);
    doc.setTextColor(0,0,0);
    doc.text(tituloPrincipal, pageWidth / 2, pageMargin + 5, { align: 'center' });
  };

  drawMainTitle(); // Desenha o título principal na primeira página

  let currentPdfY = pageMargin + 30; // Posição Y inicial no PDF, abaixo do título principal

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
    margin: { top: pageMargin, right: pageMargin, bottom: pageMargin + 15, left: pageMargin }, // Aumentei bottom margin
    pageBreak: 'auto', // Confiar no autoTable para quebras
    didDrawPage: function (data: any) { // Hook para redesenhar o título principal
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
            return getMemberName(memberId, membros);
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

    // Adiciona espaço antes do título da seção
    yPos += SECTION_TITLE_TOP_MARGIN;

    // Verifica se o título da seção caberá na página atual
    if (yPos + SECTION_TITLE_FONT_SIZE > pageHeight - options.margin.bottom) {
      doc.addPage(); // Adiciona nova página se o título não couber
      yPos = options.margin.top + 10; // Posição Y inicial na nova página (após o título principal)
    }

    doc.setFontSize(SECTION_TITLE_FONT_SIZE);
    doc.setTextColor(52, 73, 94); 
    doc.text(title, pageMargin, yPos);
    
    yPos += TABLE_START_MARGIN_AFTER_TITLE; // Espaço entre título e tabela

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

  // Seção de Limpeza
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
        ...commonTableOptions, // Herda didDrawPage e outras opções comuns
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', font: "helvetica" },
        headStyles: { ...commonTableOptions.headStyles, fontSize: 8.5, cellPadding: 2.5 },
        margin: { ...commonTableOptions.margin, top: pageMargin }, // Garante que didDrawPage funcione bem com a margem
    };

    const tableWidth = contentWidth / 2 - 5; 
    let finalYLimpeza = currentPdfY;
    let lastTableOnPage = 0; // Para controlar a página da primeira tabela de limpeza

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

        if (limpezaAposReuniaoData.length > 0) { // Se houver tabela anterior, tenta posicionar ao lado
            // Verificar se a tabela "Pós Reunião" foi para outra página
            // ou se não há espaço suficiente na página atual para a tabela "Semanal" ao lado.
            const estimativaAlturaSemanal = (cleaningTableOptions.headStyles.fontSize || 10) * 2 + (limpezaSemanalData.length * (cleaningTableOptions.styles.fontSize || 10) * 2);
            
            if (lastTableOnPage < doc.internal.getNumberOfPages() || (currentPdfY + estimativaAlturaSemanal > pageHeight - cleaningTableOptions.margin.bottom) ) {
                // Pós Reunião foi para nova página OU não há espaço para Semanal ao lado na página atual de Pós Reunião.
                // Colocar Semanal abaixo de Pós Reunião (se Pós Reunião existe) ou no início (se Pós Reuniao não existe e Semanal precisa de nova página)
                startYParaSemanal = (limpezaAposReuniaoData.length > 0) ? finalYLimpeza + SECTION_TITLE_TOP_MARGIN : currentPdfY;
                if (limpezaAposReuniaoData.length > 0) { // Se teve a primeira, e vamos para baixo.
                    startYParaSemanal = finalYLimpeza + SECTION_TITLE_TOP_MARGIN;
                     // Adicionar título para "Limpeza Semanal" se ela vai abaixo
                    if (startYParaSemanal + SECTION_TITLE_FONT_SIZE > pageHeight - cleaningTableOptions.margin.bottom) {
                        doc.addPage();
                        startYParaSemanal = cleaningTableOptions.margin.top + 10;
                    }
                    // doc.setFontSize(SECTION_TITLE_FONT_SIZE - 1); // um pouco menor para subtítulo
                    // doc.text("Limpeza Semanal", pageMargin, startYParaSemanal - 5);
                    // startYParaSemanal += TABLE_START_MARGIN_AFTER_TITLE;
                }
                
                xOffsetLimpezaSemanal = pageMargin; // Volta para a margem esquerda
                marginParaSemanal.left = pageMargin;
                marginParaSemanal.right = pageMargin;
                tableWidthSemanal = contentWidth;
            } else { // Cabe ao lado
                xOffsetLimpezaSemanal = pageMargin + tableWidth + 10;
                marginParaSemanal.left = xOffsetLimpezaSemanal;
                marginParaSemanal.right = pageMargin;
                tableWidthSemanal = tableWidth;
            }
        } else { // Sem tabela anterior, ocupa a largura total
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
