
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Membro, DesignacoesFeitas, Designacao as DesignacaoTypeFromScheduleDisplay } from './types'; // Renomeado para evitar conflito local
import { NOMES_MESES, GRUPOS_LIMPEZA_APOS_REUNIAO, NONE_GROUP_ID, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, DIAS_SEMANA_REUNIAO_CORES } from './constants';
import { formatarDataCompleta, getRealFunctionId } from './utils';
import { prepararDadosTabela as prepararDadosTabelaOriginal } from '@/components/congregacao/ScheduleDisplay';


// Helper para obter nome do membro
const getMemberName = (memberId: string | null | undefined, membros: Membro[]): string => {
  if (!memberId) return '--';
  const member = membros.find(m => m.id === memberId);
  return member ? member.nome : 'Desconhecido';
};

// Helper function to get ISO week number
function getISOWeekPdf(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
}

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

  // Título Principal
  const tituloPrincipal = `Designações - ${NOMES_MESES[mes]} de ${ano}`;
  doc.setFontSize(18); // Aumentado para melhor destaque
  doc.text(tituloPrincipal, pageWidth / 2, 45, { align: 'center' });

  let startY = 70;

  const commonTableOptions: any = { // Usar 'any' para jspdf-autotable se as tipagens forem complexas
    theme: 'grid',
    styles: {
      fontSize: 7.5, // Reduzido para tentar caber mais
      cellPadding: 1.5, // Reduzido
      overflow: 'linebreak',
      font: "helvetica", // Usar uma fonte padrão
    },
    headStyles: {
      fillColor: [41, 128, 185], // Azul mais escuro
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
        valign: 'middle',
        halign: 'center',
    },
    columnStyles: {
        0: { halign: 'left', cellWidth: 'auto'}, // Coluna da Data
    },
    margin: { top: 60, right: 20, bottom: 30, left: 20 }, // Margens reduzidas
    pageBreak: 'auto', // Deixa o autoTable gerenciar quebras de página
    // didDrawPage: (data: any) => {
    //   // Adicionar header/footer se necessário
    // }
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
                 return `${dia}\n${diaAbrev}`; // Quebra de linha para economizar espaço horizontal
            }
            const memberId = row[col.key] as string | null;
            return getMemberName(memberId, membros);
        });
    });
    
    const hasData = body.some(linha => linha.slice(1).some(celula => typeof celula === 'string' && celula && celula !== '--' && celula !== 'Desconhecido'));

    return { head, body, title: tipoTabela, hasData };
  };

  const addTableToDoc = (title: string, head: any[][], body: any[][]) => {
    if (startY + 40 > pageHeight - commonTableOptions.margin.bottom) { // Estimativa de altura da tabela + título
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    doc.text(title, commonTableOptions.margin.left, startY - 8);
    autoTable(doc, {
      ...commonTableOptions,
      head: head,
      body: body,
      startY: startY,
    });
    startY = (doc as any).lastAutoTable.finalY + 15; // Espaço entre tabelas
  };

  // 1. Tabela de Indicadores
  const { head: headIndicadores, body: bodyIndicadores, hasData: temIndicadores } = prepararDadosParaPdfTabela('Indicadores');
  if (temIndicadores) {
    addTableToDoc("Indicadores", headIndicadores, bodyIndicadores);
  }

  // 2. Tabela de Volantes
  const { head: headVolantes, body: bodyVolantes, hasData: temVolantes } = prepararDadosParaPdfTabela('Volantes');
   if (temVolantes) {
    addTableToDoc("Volantes", headVolantes, bodyVolantes);
  }

  // 3. Tabela de Áudio/Vídeo (AV)
  const { head: headAV, body: bodyAV, hasData: temAV } = prepararDadosParaPdfTabela('AV');
  const datasDeReuniaoNoMesPdf: Date[] = [];
  const primeiroDiaDoMesPdf = new Date(Date.UTC(ano, mes, 1));
  const ultimoDiaDoMesPdf = new Date(Date.UTC(ano, mes + 1, 0));
   for (let dia = new Date(primeiroDiaDoMesPdf); dia <= ultimoDiaDoMesPdf; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const diaDaSemana = dia.getUTCDay();
    if (diaDaSemana === DIAS_REUNIAO.meioSemana || diaDaSemana === DIAS_REUNIAO.publica) {
      datasDeReuniaoNoMesPdf.push(new Date(dia));
    }
  }
  if (datasDeReuniaoNoMesPdf.length > 0) { // Sempre mostrar AV se houver dias de reunião
    addTableToDoc("Áudio/Vídeo (AV)", headAV, bodyAV);
  }


  // 4. Seção de Limpeza
  const limpezaAposReuniaoData: string[][] = [];
  const limpezaSemanalData: string[][] = [];

  const meetingDatesForCleaningPdf: Date[] = [];
    Object.keys(scheduleData).forEach(dataStr => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return;
        const dataObj = new Date(dataStr + 'T00:00:00');
        if (isNaN(dataObj.getTime())) return;
        if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
            const diaSemana = dataObj.getUTCDay();
            if (diaSemana === DIAS_REUNIAO.meioSemana || diaSemana === DIAS_REUNIAO.publica) {
                meetingDatesForCleaningPdf.push(dataObj);
            }
        }
    });
  meetingDatesForCleaningPdf.sort((a, b) => a.getTime() - b.getTime());

  meetingDatesForCleaningPdf.forEach(dateObj => {
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

  meetingDatesForCleaningPdf.forEach(date => {
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const year = sunday.getUTCFullYear();
    const monthAbr = NOMES_MESES[sunday.getUTCMonth()]?.substring(0, 3).toLowerCase() || '';
    const day = sunday.getUTCDate();
    const dateKey = formatarDataCompleta(sunday); // Usar a data do domingo como chave da semana
    const weekIdForSet = `${year}-${getISOWeekPdf(sunday)}`;

    if (!processedWeeksPdf.has(weekIdForSet)) {
      const weekLabel = `Semana ${day.toString().padStart(2, '0')}-${monthAbr}.`;
      weeksForCleaningPdf.push({ weekLabel, dateKey });
      processedWeeksPdf.add(weekIdForSet);
    }
  });
  weeksForCleaningPdf.sort((a,b) => a.dateKey.localeCompare(b.dateKey));


  weeksForCleaningPdf.forEach(week => {
    const responsavel = scheduleData[week.dateKey]?.limpezaSemanalResponsavel;
    if (responsavel) {
      limpezaSemanalData.push([week.weekLabel, responsavel]);
    }
  });

  if (limpezaAposReuniaoData.length > 0 || limpezaSemanalData.length > 0) {
     if (startY + 60 > pageHeight - commonTableOptions.margin.bottom) {
        doc.addPage();
        startY = commonTableOptions.margin.top;
    }
    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    doc.text("Limpeza", commonTableOptions.margin.left, startY - 8);
    // startY += 5; // Espaço após o título da seção
  
    if (limpezaAposReuniaoData.length > 0) {
        if (startY + 30 > pageHeight - commonTableOptions.margin.bottom) {
            doc.addPage();
            startY = commonTableOptions.margin.top;
            doc.setFontSize(12); doc.setTextColor(0,0,0); doc.text("Limpeza (Continuação)", commonTableOptions.margin.left, startY - 8);
        }
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        doc.text("Após a Reunião:", commonTableOptions.margin.left + 5, startY + 12); // Pequeno indent
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
            doc.setFontSize(12); doc.setTextColor(0,0,0); doc.text("Limpeza (Continuação)", commonTableOptions.margin.left, startY -8);
        }
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        doc.text("Semanal:", commonTableOptions.margin.left + 5, startY + 12); // Pequeno indent
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
        // startY = (doc as any).lastAutoTable.finalY + 15; // Não precisa se for o último
    }
  }

  doc.save(`designacoes_${NOMES_MESES[mes].toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a')}_${ano}.pdf`);
}
