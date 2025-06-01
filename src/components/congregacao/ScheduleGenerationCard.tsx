
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NOMES_MESES, FUNCOES_DESIGNADAS, DIAS_REUNIAO } from '@/lib/congregacao/constants';
import type { DesignacoesFeitas, FuncaoDesignada, Membro, SubstitutionDetails } from '@/lib/congregacao/types';
import { ScheduleDisplay } from './ScheduleDisplay';
import { MemberSelectionDialog } from './MemberSelectionDialog'; 
// import { calcularDesignacoesAction } from '@/lib/congregacao/assignment-logic'; // Agora tratado no hook
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import { getPermissaoRequerida, formatarDataCompleta } from '@/lib/congregacao/utils';
import { generateSchedulePdf } from '@/lib/congregacao/pdf-generator';


interface ScheduleGenerationCardProps {
  membros: Membro[];
  onScheduleGenerated: (mes: number, ano: number) => Promise<{ success: boolean; error?: string; generatedSchedule?: DesignacoesFeitas }>;
  currentSchedule: DesignacoesFeitas | null;
  currentMes: number | null;
  currentAno: number | null;
  status: string | null; // Added status field
  onFinalizeSchedule: () => Promise<{ success: boolean; error?: string }>; // Added finalize handler
  onSaveProgress: () => void; // Added save progress handler
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
  onDirectAssignAV: (date: string, functionId: string, newMemberId: string | null, originalMemberId: string | null) => void;
  onLimpezaChange: (dateKey: string, type: 'aposReuniao' | 'semanal', value: string | null) => void;
}

interface AVSelectionContext {
  dateStr: string;
  functionId: string; 
  columnKey: string; 
  currentMemberId: string | null;
  requiredPermissionId: string | null;
}

export function ScheduleGenerationCard({
  membros,
  onScheduleGenerated, // Agora é generateNewSchedule do hook
  currentSchedule,   // Agora é scheduleData do hook
  currentMes,        // Agora é scheduleMes do hook
  currentAno,         // Agora é scheduleAno do hook
  status, // Received status prop
  onFinalizeSchedule, // Received finalize handler
  onSaveProgress, // Received save progress handler
  onOpenSubstitutionModal,
  onDirectAssignAV,
  onLimpezaChange // Nova prop
}: ScheduleGenerationCardProps) {
  const [selectedMes, setSelectedMes] = useState<string>(currentMes !== null ? currentMes.toString() : new Date().getMonth().toString());
  const [selectedAno, setSelectedAno] = useState<string>(currentAno !== null ? currentAno.toString() : new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // O schedule exibido agora vem diretamente das props (currentSchedule, currentMes, currentAno)
  // que são alimentadas pelo hook useScheduleManagement.
  // Não precisamos mais do estado local `displayedScheduleData` aqui.

  const [isAVMemberSelectionOpen, setIsAVMemberSelectionOpen] = useState(false);
  const [avSelectionContext, setAVSelectionContext] = useState<AVSelectionContext | null>(null);


  useEffect(() => {
    // Sincroniza os seletores de mês/ano se as props mudarem (ex: ao carregar cache)
    if (currentMes !== null && currentAno !== null) {
      setSelectedMes(currentMes.toString());
      setSelectedAno(currentAno.toString());
    }
    setError(null); // Limpa o erro se o mês/ano mudar ou o schedule for carregado
  }, [currentMes, currentAno]);


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
        // Chama a função passada por prop, que agora é do hook useScheduleManagement
        const result = await onScheduleGenerated(mes, ano); 
        
        if (result.error) {
            setError(result.error);
            // O toast de erro já é tratado dentro do page.tsx ao chamar a função do hook
        }
        // O toast de sucesso também é tratado em page.tsx
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
    // Toast de sucesso será mostrado por page.tsx
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
            <Select value={selectedMes} onValueChange={setSelectedMes}>
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
             <Select value={selectedAno} onValueChange={setSelectedAno}>
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
          <Button onClick={handleGenerateSchedule} disabled={isLoading} className="w-full sm:w-auto">
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
                status={status} // Pass status to ScheduleDisplay
                designacoesFeitas={currentSchedule}
                membros={membros}
                mes={currentMes}
                ano={currentAno}
                onOpenSubstitutionModal={onOpenSubstitutionModal}
                onOpenAVMemberSelectionDialog={handleOpenAVMemberSelection}
                onLimpezaChange={onLimpezaChange} // Passa a prop adiante
              />
               {status === 'rascunho' && (
                 <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={onSaveProgress} disabled={!currentSchedule || isLoading}>
                    Salvar Progresso
                  </Button>
                  <Button onClick={onFinalizeSchedule} disabled={!currentSchedule || isLoading}>
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
          {!isLoading && !currentSchedule && !error && (
             <p className="text-muted-foreground text-center py-4">
              {status === 'finalizado' ? (
                `O cronograma para ${NOMES_MESES[currentMes]} de ${currentAno} foi finalizado.`
              ) : (
                 "Nenhum cronograma carregado. "
              )}
              Selecione o mês e ano e clique em "Gerar Cronograma" para ver as designações de Indicadores/Volantes.
              As designações de AV e Limpeza são preenchidas manualmente.
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
