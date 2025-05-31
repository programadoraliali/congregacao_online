
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NOMES_MESES, FUNCOES_DESIGNADAS, DIAS_REUNIAO } from '@/lib/congregacao/constants';
import type { DesignacoesFeitas, FuncaoDesignada, Membro, SubstitutionDetails } from '@/lib/congregacao/types';
import { ScheduleDisplay } from './ScheduleDisplay';
import { MemberSelectionDialog } from './MemberSelectionDialog'; // Para seleção manual de AV
import { calcularDesignacoesAction } from '@/lib/congregacao/assignment-logic';
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import { getPermissaoRequerida, formatarDataCompleta } from '@/lib/congregacao/utils';

interface ScheduleGenerationCardProps {
  membros: Membro[];
  onScheduleGenerated: (designacoes: DesignacoesFeitas, mes: number, ano: number) => void;
  currentSchedule: DesignacoesFeitas | null;
  currentMes: number | null;
  currentAno: number | null;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
}

interface AVSelectionContext {
  dateStr: string;
  functionId: string; // ID real da função (ex: 'avVideoQui')
  columnKey: string; // Chave da coluna na tabela (ex: 'video')
  currentMemberId: string | null;
  requiredPermissionId: string | null;
}

export function ScheduleGenerationCard({
  membros,
  onScheduleGenerated,
  currentSchedule,
  currentMes,
  currentAno,
  onOpenSubstitutionModal
}: ScheduleGenerationCardProps) {
  const [selectedMes, setSelectedMes] = useState<string>(currentMes !== null ? currentMes.toString() : new Date().getMonth().toString());
  const [selectedAno, setSelectedAno] = useState<string>(currentAno !== null ? currentAno.toString() : new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [displayedScheduleData, setDisplayedScheduleData] = useState<{
    schedule: DesignacoesFeitas;
    mes: number;
    ano: number;
  } | null>(null);

  // Estado para o diálogo de seleção de membros AV
  const [isAVMemberSelectionOpen, setIsAVMemberSelectionOpen] = useState(false);
  const [avSelectionContext, setAVSelectionContext] = useState<AVSelectionContext | null>(null);


  useEffect(() => {
    // Se o currentSchedule (cache do pai) for para o mês/ano selecionado, usa-o.
    // Caso contrário, limpa. A geração é sempre explícita.
    if (currentSchedule && currentMes === parseInt(selectedMes) && currentAno === parseInt(selectedAno)) {
        setDisplayedScheduleData({ schedule: currentSchedule, mes: currentMes, ano: currentAno });
    } else {
        setDisplayedScheduleData(null);
    }
    setError(null);
  }, [selectedMes, selectedAno, currentSchedule, currentMes, currentAno]);


  const handleGenerateSchedule = async () => {
    setError(null);
    setIsLoading(true);
    setDisplayedScheduleData(null); 
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
      const result = await calcularDesignacoesAction(mes, ano, membros);
      if ('error' in result) {
        setError(result.error);
        toast({ title: "Erro ao Gerar Designações", description: result.error, variant: "destructive" });
      } else {
        onScheduleGenerated(result.designacoesFeitas, mes, ano); 
        setDisplayedScheduleData({ schedule: result.designacoesFeitas, mes, ano });
        toast({ title: "Designações Geradas", description: `Cronograma para ${NOMES_MESES[mes]} de ${ano} gerado com sucesso.` });
      }
    } catch (e: any) {
      console.error("Erro ao gerar designações:", e);
      const errMsg = e.message || "Ocorreu um erro desconhecido ao gerar o cronograma.";
      setError(errMsg);
      toast({ title: "Erro Crítico", description: "Falha ao contatar o serviço de IA ou processar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "Funcionalidade Indisponível",
      description: "A exportação para PDF ainda não foi implementada.",
    });
  };

  const handleOpenAVMemberSelection = (
    dateStr: string, 
    functionId: string, // ID real da função
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
    if (!avSelectionContext || !displayedScheduleData) return;

    const { dateStr, functionId } = avSelectionContext;
    const mes = displayedScheduleData.mes;
    const ano = displayedScheduleData.ano;

    const updatedSchedule = JSON.parse(JSON.stringify(displayedScheduleData.schedule)) as DesignacoesFeitas;
    
    if (!updatedSchedule[dateStr]) {
      updatedSchedule[dateStr] = {};
    }
    updatedSchedule[dateStr][functionId] = newMemberId;

    setDisplayedScheduleData({ schedule: updatedSchedule, mes, ano });
    onScheduleGenerated(updatedSchedule, mes, ano); // Salva no cache principal
    
    setIsAVMemberSelectionOpen(false);
    setAVSelectionContext(null);
    toast({ title: "Designação AV Atualizada", description: "A designação de Áudio/Vídeo foi atualizada." });
  };


  const currentYearValue = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYearValue - 2 + i);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Selecione o mês e ano para gerar o cronograma de designações. As designações de AV são manuais.</CardDescription>
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
          {!isLoading && displayedScheduleData && (
            <>
              <h3 className="text-xl font-semibold mb-4 text-center text-foreground">
                Designações para {NOMES_MESES[displayedScheduleData.mes]} de {displayedScheduleData.ano}
              </h3>
              <ScheduleDisplay
                designacoesFeitas={displayedScheduleData.schedule}
                membros={membros}
                mes={displayedScheduleData.mes}
                ano={displayedScheduleData.ano}
                onOpenSubstitutionModal={onOpenSubstitutionModal}
                onOpenAVMemberSelectionDialog={handleOpenAVMemberSelection}
              />
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4" /> Exportar como PDF (em breve)
                </Button>
              </div>
            </>
          )}
          {!isLoading && !displayedScheduleData && !error && (
             <p className="text-muted-foreground text-center py-4">
              Selecione o mês e ano e clique em "Gerar Cronograma" para ver as designações de Indicadores/Volantes.
              As designações de AV são preenchidas manualmente clicando nas células da tabela de AV.
            </p>
          )}
        </div>
      </CardContent>
      {isAVMemberSelectionOpen && avSelectionContext && (
        <MemberSelectionDialog
          isOpen={isAVMemberSelectionOpen}
          onOpenChange={setIsAVMemberSelectionOpen}
          allMembers={membros}
          targetRole={null} // Não é um "cargo" específico, mas uma função de AV
          requiredPermissionId={avSelectionContext.requiredPermissionId}
          currentDate={avSelectionContext.dateStr}
          onSelectMember={(memberId) => handleConfirmAVSelection(memberId)}
          currentlyAssignedMemberId={avSelectionContext.currentMemberId}
          dialogTitle={`Selecionar para ${FUNCOES_DESIGNADAS.find(f=>f.id === avSelectionContext.functionId)?.nome || 'Função AV'}`}
          dialogDescription={`Escolha um membro para ${FUNCOES_DESIGNADAS.find(f=>f.id === avSelectionContext.functionId)?.nome || 'esta função de AV'} em ${new Date(avSelectionContext.dateStr + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`}
        />
      )}
    </Card>
  );
}
