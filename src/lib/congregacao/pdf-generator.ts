
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas } from './types';
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV } from './constants';
import { formatarDataCompleta } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


// Helper para obter nome do membro
const getMemberName = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return '--';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

// Helper function to get ISO week number (consistent with ScheduleDisplay)
function getISOWeekPdf(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // sunday = 0, make it 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
}

// Helper para obter todas as datas de reunião no mês (consistente com ScheduleDisplay)
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

  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  doc.setFontSize(18);
  doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });

  let startY = 70;

  const commonTableOptions: any = {
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      overflow: 'linebreak',
      font: "helvetica",
    },
    headStyles: {
      fillColor: [34, 63, 49], // --jw-ochre HSL to RGB approx
      textColor: [245, 241, 232], // --jw-light-ochre (background) for text
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
        valign: 'middle',
        halign: 'center',
    },
    columnStyles: {
        0: { halign: 'left', cellWidth: 'auto'},
    },
    margin: { top: 60, right: 20, bottom: 30, left: 20 },
    pageBreak: 'auto',
  };
  
  const prepararDadosParaPdfTabela = (
    tipoTabela: 'Indicadores' | 'Volantes' | 'AV'
  ): { head: any[][], body: any[][], title: string, hasData: boolean } => {
    const { data: dadosFormatados, columns } = prepararDadosTabelaOriginal(scheduleData, mes, ano, tipoTabela);

    const head = [columns.map(col => col.label)];
    const body = dadosFormatados.map((row) => {
        return columns.map(col => {
            if (col.key === 'data') {
                 const [dia, diaAbrev] = (row.data as string).split(' ');
                 return `${dia}\n${diaAbrev}`;
            }
            const memberId = row[col.key] as string | null;
            return getMemberName(memberId, membros);
        });
    });
    
    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'Desconhecido'));

    return { head, body, title: tipoTabela, hasData };
  };

  const addTableToDoc = (title: string, head: any[][], body: any[][], addTopMargin = true) => {
    const estimatedTableHeight = (body.length + 1) * 15 + 30; // Estimativa grosseira
    if (addTopMargin && startY + estimatedTableHeight > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94); // Um cinza escuro para os títulos das seções
    doc.text(title, commonTableOptions.margin.left, startY - 8);
    autoTable(doc, {
      ...commonTableOptions,
      head: head,
      body: body,
      startY: startY,
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  };

  const { head: headIndicadores, body: bodyIndicadores, hasData: temIndicadores } = prepararDadosParaPdfTabela('Indicadores');
  if (temIndicadores) {
    addTableToDoc("Indicadores", headIndicadores, bodyIndicadores);
  }

  const { head: headVolantes, body: bodyVolantes, hasData: temVolantes } = prepararDadosParaPdfTabela('Volantes');
   if (temVolantes) {
    addTableToDoc("Volantes", headVolantes, bodyVolantes);
  }

  const { head: headAV, body: bodyAV } = prepararDadosParaPdfTabela('AV');
  const allMeetingDatesForMonth = getMeetingDatesForMonth(mes, ano);
  if (allMeetingDatesForMonth.length > 0) {
    addTableToDoc("Áudio/Vídeo (AV)", headAV, bodyAV);
  }

  // Seção de Limpeza
  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];

  // Usar todas as datas de reunião do mês para verificar "Limpeza Após Reunião"
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

  // Gerar semanas para "Limpeza Semanal"
  const weeksForCleaningPdf: { weekLabel: string, dateKey: string }[] = [];
  const processedWeeksPdf = new Set<string>();

  allMeetingDatesForMonth.forEach(date => { // Usar todas as datas de reunião para derivar as semanas
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() - date.getUTCDay()); // Encontra o domingo da semana
    const year = sunday.getUTCFullYear();
    const monthAbr = NOMES_MESES[sunday.getUTCMonth()]?.substring(0, 3).toLowerCase() || '';
    const day = sunday.getUTCDate();
    const dateKey = formatarDataCompleta(sunday); // Chave é o domingo da semana
    const weekIdForSet = `${year}-${getISOWeekPdf(sunday)}`;

    if (!processedWeeksPdf.has(weekIdForSet)) {
      const weekLabel = `Semana ${day.toString().padStart(2, '0')}-${monthAbr}.`;
      weeksForCleaningPdf.push({ weekLabel, dateKey });
      processedWeeksPdf.add(weekIdForSet);
    }
  });
  weeksForCleaningPdf.sort((a,b) => a.dateKey.localeCompare(b.dateKey));

  weeksForCleaningPdf.forEach(week => {
    // Acessar o scheduleData usando a dateKey da semana (domingo)
    const responsavel = scheduleData[week.dateKey]?.limpezaSemanalResponsavel;
    if (responsavel && responsavel.trim() !== '') {
      limpezaSemanalData.push([week.weekLabel, responsavel]);
    }
  });

  if (limpezaAposReuniaoData.length > 0 || limpezaSemanalData.length > 0) {
     if (startY + 60 > pageHeight - commonTableOptions.margin.bottom) { // Estimativa generosa para título e subtítulos
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    doc.text("Limpeza", commonTableOptions.margin.left, startY - 8);
  
    if (limpezaAposReuniaoData.length > 0) {
        if (startY + 30 > pageHeight - commonTableOptions.margin.bottom) {
            doc.addPage();
            startY = commonTableOptions.margin.top;
            doc.setFontSize(12); doc.setTextColor(52, 73, 94); doc.text("Limpeza (Continuação)", commonTableOptions.margin.left, startY - 8);
        }
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        doc.text("Após a Reunião:", commonTableOptions.margin.left + 5, startY + 12);
        autoTable(doc, {
            ...commonTableOptions,
            head: [['Data', 'Grupo Responsável']],
            body: limpezaAposReuniaoData,
            startY: startY + 20,
            theme: 'plain',
            styles: { ...commonTableOptions.styles, fontSize: 7, cellPadding: 1 },
            headStyles: { ...commonTableOptions.headStyles, fontSize: 7.5, fillColor: undefined, textColor: [0,0,0] },
            tableWidth: 'wrap',
            columnStyles: { 0: { halign: 'left'}, 1: {halign: 'left'}},
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (limpezaSemanalData.length > 0) {
        if (startY + 40 > pageHeight - commonTableOptions.margin.bottom) {
            doc.addPage();
            startY = commonTableOptions.margin.top;
            doc.setFontSize(12); doc.setTextColor(52, 73, 94); doc.text("Limpeza (Continuação)", commonTableOptions.margin.left, startY -8);
        }
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        doc.text("Semanal:", commonTableOptions.margin.left + 5, startY + 12);
        autoTable(doc, {
            ...commonTableOptions,
            head: [['Semana', 'Responsáveis']],
            body: limpezaSemanalData,
            startY: startY + 20,
            theme: 'plain',
            styles: { ...commonTableOptions.styles, fontSize: 7, cellPadding: 1 },
            headStyles: { ...commonTableOptions.headStyles, fontSize: 7.5, fillColor: undefined, textColor: [0,0,0] },
            tableWidth: 'wrap',
            columnStyles: { 0: { halign: 'left'}, 1: {halign: 'left'}},
        });
    }
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}

    