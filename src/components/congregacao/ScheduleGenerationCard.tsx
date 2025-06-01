
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NOMES_MESES, FUNCOES_DESIGNADAS, DIAS_REUNIAO, NONE_GROUP_ID } from '@/lib/congregacao/constants';
import type { DesignacoesFeitas, FuncaoDesignada, Membro, SubstitutionDetails } from '@/lib/congregacao/types';
import { ScheduleDisplay } from './ScheduleDisplay';
import { MemberSelectionDialog } from './MemberSelectionDialog';
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle, Loader2, UserPlus, Info } from 'lucide-react';
import { getPermissaoRequerida, formatarDataCompleta } from '@/lib/congregacao/utils';
import { generateSchedulePdf } from '@/lib/congregacao/pdf-generator';

interface AVSelectionContext {
  dateStr: string;
  functionId: string;
  columnKey: string;
  currentMemberId: string | null;
  requiredPermissionId: string | null;
}

interface ScheduleGenerationCardProps {
  membros: Membro[];
  onScheduleGenerated: (mes: number, ano: number) => Promise<{ success: boolean; error?: string; generatedSchedule?: DesignacoesFeitas }>;
  currentSchedule: DesignacoesFeitas | null;
  currentMes: number | null;
  currentAno: number | null;
  status: string | null;
  onFinalizeSchedule: () => Promise<{ success: boolean; error?: string }>;
  onSaveProgress: () => void;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
  onDirectAssignAV: (date: string, functionId: string, newMemberId: string | null, originalMemberId: string | null) => void;
  onLimpezaChange: (dateKey: string, type: 'aposReuniao' | 'semanal', value: string | null) => void;
  onMonthYearChangeRequest: (mes: number, ano: number) => void;
}

export function ScheduleGenerationCard({
  membros,
  onScheduleGenerated,
  currentSchedule,
  currentMes,
  currentAno,
  status,
  onFinalizeSchedule,
  onSaveProgress,
  onOpenSubstitutionModal,
  onDirectAssignAV,
  onLimpezaChange,
  onMonthYearChangeRequest,
}: ScheduleGenerationCardProps) {
  const [selectedMes, setSelectedMes] = useState<string>(currentMes !== null ? currentMes.toString() : new Date().getMonth().toString());
  const [selectedAno, setSelectedAno] = useState<string>(currentAno !== null ? currentAno.toString() : new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isAVMemberSelectionOpen, setIsAVMemberSelectionOpen] = useState(false);
  const [avSelectionContext, setAVSelectionContext] = useState<AVSelectionContext | null>(null);


  useEffect(() => {
    if (currentMes !== null && currentAno !== null) {
      setSelectedMes(currentMes.toString());
      setSelectedAno(currentAno.toString());
    }
    setError(null);
  }, [currentMes, currentAno]);

  const allRequiredFieldsFilled = useMemo(() => {
    if (!currentSchedule || status !== 'rascunho' || currentMes === null || currentAno === null) {
      return false;
    }
  
    const localDIAS_REUNIAO = {
      meioSemana: DIAS_REUNIAO.meioSemana,
      publica: DIAS_REUNIAO.publica,
    };
  
    const datasDeReuniaoNoMes: string[] = [];
    const primeiroDiaDoMes = new Date(Date.UTC(currentAno, currentMes, 1));
    const ultimoDiaDoMes = new Date(Date.UTC(currentAno, currentMes + 1, 0));
  
    for (let d = new Date(primeiroDiaDoMes); d <= ultimoDiaDoMes; d.setUTCDate(d.getUTCDate() + 1)) {
      const diaSemana = d.getUTCDay();
      if (diaSemana === localDIAS_REUNIAO.meioSemana || diaSemana === localDIAS_REUNIAO.publica) {
        datasDeReuniaoNoMes.push(formatarDataCompleta(d));
      }
    }
  
    // 1. Checar todas as funções (Indicadores, Volantes, AV) para cada dia de reunião
    for (const dateStr of datasDeReuniaoNoMes) {
      const assignmentsForDay = currentSchedule[dateStr];
      if (!assignmentsForDay) return false; 
  
      const dataObj = new Date(dateStr + "T00:00:00Z");
      const tipoReuniao = dataObj.getUTCDay() === localDIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
  
      const funcoesDoDia = FUNCOES_DESIGNADAS.filter(f => f.tipoReuniao.includes(tipoReuniao));
      for (const funcao of funcoesDoDia) {
        if (!assignmentsForDay[funcao.id]) { 
          return false;
        }
      }
  
      // 2. Checar limpeza após reunião para cada dia de reunião
      if (!assignmentsForDay.limpezaAposReuniaoGrupoId || assignmentsForDay.limpezaAposReuniaoGrupoId === NONE_GROUP_ID) {
        return false;
      }
    }
  
    // 3. Checar limpeza semanal para cada semana que tem reunião
    const weeksComReuniao = new Set<string>();
    datasDeReuniaoNoMes.forEach(dateStr => {
      const dataObj = new Date(dateStr + "T00:00:00Z");
      const domingoDaSemana = new Date(dataObj);
      domingoDaSemana.setUTCDate(dataObj.getUTCDate() - dataObj.getUTCDay());
      weeksComReuniao.add(formatarDataCompleta(domingoDaSemana));
    });
  
    for (const weekKey of Array.from(weeksComReuniao)) {
      const weeklyData = currentSchedule[weekKey];
      if (!weeklyData || !weeklyData.limpezaSemanalResponsavel || weeklyData.limpezaSemanalResponsavel.trim() === '') {
          return false;
      }
    }
  
    return true;
  }, [currentSchedule, status, currentMes, currentAno]);


  const handleGenerateSchedule = async () => {
    setError(null);
    setIsLoading(true);
    const mes = parseInt(selectedMes, 10);
    const ano = parseInt(selectedAno, 10);

    if (membros.length === 0) {
      const errMsg = "Não é possível gerar designações pois não há membros cadastrados.";
      setError(errMsg);
      setIsLoading(false);
      toast({ title: "Erro", description: "Adicione membros primeiro.", variant: "destructive" });
      return;
    }

    try {
        const result = await onScheduleGenerated(mes, ano);

        if (result.error) {
            setError(result.error);
        }
    } catch (e: any) {
        console.error("Falha crítica ao gerar cronograma:", e);
        setError("Ocorreu uma falha inesperada ao gerar o cronograma. Verifique o console para mais detalhes.");
        toast({ title: "Erro Inesperado", description: "Falha ao gerar cronograma.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (currentSchedule && currentMes !== null && currentAno !== null && membros.length > 0) {
      try {
        generateSchedulePdf(
          currentSchedule,
          membros,
          currentMes,
          currentAno
        );
        toast({ title: "PDF Gerado", description: "O download do PDF deve iniciar em breve." });
      } catch (e: any) {
        console.error("Erro ao gerar PDF:", e);
        toast({ title: "Erro ao Gerar PDF", description: e.message || "Não foi possível gerar o PDF.", variant: "destructive" });
      }
    } else {
      toast({
        title: "Dados Insuficientes",
        description: "Gere o cronograma ou adicione membros antes de exportar.",
        variant: "default",
      });
    }
  };

  const handleOpenAVMemberSelection = (
    dateStr: string,
    functionId: string,
    columnKey: string,
    currentMemberId: string | null
  ) => {
    const targetDate = new Date(dateStr + "T00:00:00");
    const tipoReuniao = targetDate.getUTCDay() === DIAS_REUNIAO.meioSemana ? 'meioSemana' : 'publica';
    const funcDef = FUNCOES_DESIGNADAS.find(f => f.id === functionId);
    const requiredPermissionId = funcDef?.permissaoRequeridaBase
        ? getPermissaoRequerida(funcDef.id, tipoReuniao)
        : null;

    setAVSelectionContext({ dateStr, functionId, columnKey, currentMemberId, requiredPermissionId });
    setIsAVMemberSelectionOpen(true);
  };

  const handleConfirmAVSelection = (newMemberId: string | null) => {
    if (!avSelectionContext || currentMes === null || currentAno === null) return;

    const { dateStr, functionId } = avSelectionContext;
    const originalMemberId = avSelectionContext.currentMemberId || null;

    onDirectAssignAV(dateStr, functionId, newMemberId, originalMemberId);

    setIsAVMemberSelectionOpen(false);
    setAVSelectionContext(null);
  };


  const currentYearValue = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYearValue - 2 + i);

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Selecione o mês e ano para gerar o cronograma de designações. As designações de AV e Limpeza são manuais/editáveis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
          <div className="flex-1">
            <Label htmlFor="selectMes">Mês</Label>
            <Select
              value={selectedMes}
              onValueChange={(value) => {
                const newMes = parseInt(value, 10);
                setSelectedMes(value);
                if (currentAno !== null) {
                    onMonthYearChangeRequest(newMes, parseInt(selectedAno, 10));
                }
              }}
            >
              <SelectTrigger id="selectMes">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {NOMES_MESES.map((nome, index) => (
                  <SelectItem key={index} value={index.toString()}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="inputAno">Ano</Label>
             <Select
                value={selectedAno}
                onValueChange={(value) => {
                  const newAno = parseInt(value, 10);
                  setSelectedAno(value);
                   if (currentMes !== null) {
                    onMonthYearChangeRequest(parseInt(selectedMes, 10), newAno);
                  }
                }}
              >
                <SelectTrigger id="inputAno">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                    {yearsForSelect.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerateSchedule}
            disabled={isLoading || status === 'rascunho' || status === 'finalizado'}
            className="w-full sm:w-auto"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {isLoading ? 'Gerando...' : 'Gerar Cronograma (Indicadores/Volantes)'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        )}

        {status === 'rascunho' && currentSchedule && currentMes !== null && (
          <div className="mb-4 p-3 rounded-md bg-blue-100 text-blue-700 flex items-center text-sm">
            <Info className="h-5 w-5 mr-2" />
            <p>Um rascunho para {NOMES_MESES[currentMes]} de {currentAno} está carregado. Você pode continuar editando ou finalizar.</p>
          </div>
        )}
        {status === 'finalizado' && currentSchedule && currentMes !== null && (
          <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700 flex items-center text-sm">
            <Info className="h-5 w-5 mr-2" />
            <p>O cronograma finalizado para {NOMES_MESES[currentMes]} de {currentAno} está carregado. Para editar, será necessário criar um novo rascunho (gerando novamente).</p>
          </div>
        )}


        <div id="resultadoDesignacoes" className="mt-6">
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Gerando designações, por favor aguarde...</p>
            </div>
          )}
          {!isLoading && currentSchedule && currentMes !== null && currentAno !== null && (
            <>
              <h3 className="text-xl font-semibold mb-4 text-center text-foreground">
                Designações para {NOMES_MESES[currentMes]} de {currentAno}
              </h3>
              <ScheduleDisplay
                status={status}
                designacoesFeitas={currentSchedule}
                membros={membros}
                mes={currentMes}
                ano={currentAno}
                onOpenSubstitutionModal={onOpenSubstitutionModal}
                onOpenAVMemberSelectionDialog={handleOpenAVMemberSelection}
                onLimpezaChange={onLimpezaChange}
              />
               {status === 'rascunho' && (
                 <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={onSaveProgress} disabled={!currentSchedule || isLoading}>
                    Salvar Progresso
                  </Button>
                  <Button onClick={onFinalizeSchedule} disabled={!currentSchedule || isLoading || !allRequiredFieldsFilled}>
                    Finalizar e Salvar Mês
                  </Button>
                </div>
              )}
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={handleExportPDF} disabled={!currentSchedule || isLoading}>
                  <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
                </Button>
              </div>
            </>
          )}
          {!isLoading && !currentSchedule && !error && !status && (
             <p className="text-muted-foreground text-center py-4">
              Nenhum cronograma carregado. Selecione o mês e ano e clique em "Gerar Cronograma" para iniciar.
            </p>
          )}
        </div>
      </CardContent>
      {isAVMemberSelectionOpen && avSelectionContext && (
        <MemberSelectionDialog
          isOpen={isAVMemberSelectionOpen}
          onOpenChange={setIsAVMemberSelectionOpen}
          allMembers={membros}
          targetRole={null}
          requiredPermissionId={avSelectionContext.requiredPermissionId}
          currentDate={avSelectionContext.dateStr}
          onSelectMember={(memberId) => handleConfirmAVSelection(memberId)}
          currentlyAssignedMemberId={avSelectionContext.currentMemberId}
          dialogTitle={`Selecionar para ${FUNCOES_DESIGNADAS.find(f=>f.id === avSelectionContext.functionId)?.nome || 'Função AV'}`}
          dialogDescription={`Escolha um membro para ${FUNCOES_DESIGNADAS.find(f=>f.id === avSelectionContext.functionId)?.nome || 'esta função de AV'} em ${new Date(avSelectionContext.dateStr + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`}
        />
      )}
     {status && <p className="text-sm text-center text-muted-foreground mt-4">Status: {status === 'rascunho' ? 'Rascunho' : 'Finalizado'}</p>}
    </Card>
  );
}

