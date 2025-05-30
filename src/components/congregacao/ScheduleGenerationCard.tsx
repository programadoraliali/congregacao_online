
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NOMES_MESES } from '@/lib/congregacao/constants';
import type { DesignacoesFeitas, Membro, SubstitutionDetails } from '@/lib/congregacao/types';
import { ScheduleDisplay } from './ScheduleDisplay';
import { calcularDesignacoesAction } from '@/lib/congregacao/assignment-logic';
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle, Loader2 } from 'lucide-react'; // Removido CalendarCheck

interface ScheduleGenerationCardProps {
  membros: Membro[];
  onScheduleGenerated: (designacoes: DesignacoesFeitas, mes: number, ano: number) => void;
  currentSchedule: DesignacoesFeitas | null;
  currentMes: number | null;
  currentAno: number | null;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
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

useEffect(() => {
  const numSelectedMes = parseInt(selectedMes, 10);
  const numSelectedAno = parseInt(selectedAno, 10);

  // Se o mês/ano selecionado no card é diferente dos dados atuais do pai (currentMes/Ano)
  if (currentMes !== numSelectedMes || currentAno !== numSelectedAno) {
    // Limpa o cronograma exibido, pois o usuário selecionou um novo período e precisa clicar em "Gerar"
    if (displayedScheduleData !== null) { // Apenas atualiza se não for nulo para evitar renderização desnecessária
      setDisplayedScheduleData(null);
      setError(null); // Limpa qualquer erro anterior
    }
  } else {
    // O mês/ano selecionado no card CORRESPONDE aos dados do pai
    if (currentSchedule) {
      // Se há um cronograma do pai para esta seleção
      // Atualiza o cronograma exibido SOMENTE SE ele for realmente diferente do que já está sendo mostrado
      if (
        !displayedScheduleData || // Se nada estiver sendo exibido
        displayedScheduleData.mes !== currentMes || // Ou se o mês for diferente
        displayedScheduleData.ano !== currentAno || // Ou se o ano for diferente
        JSON.stringify(displayedScheduleData.schedule) !== JSON.stringify(currentSchedule) // Ou se o conteúdo do cronograma for diferente
      ) {
        setDisplayedScheduleData({
          schedule: currentSchedule,
          mes: currentMes,
          ano: currentAno,
        });
      }
    } else {
      // Não há cronograma do pai para esta seleção (mesmo que mês/ano coincidam)
      if (displayedScheduleData !== null) { // Apenas atualiza se não for nulo
        setDisplayedScheduleData(null);
      }
    }
  }
}, [currentSchedule, currentMes, currentAno, selectedMes, selectedAno]);


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

  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Card>
      <CardHeader>
        {/* CardTitle removido, nome da aba é suficiente */}
        <CardDescription>Selecione o mês e ano para gerar o cronograma de designações.</CardDescription>
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
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} {/* Ícone alterado */}
            {isLoading ? 'Gerando...' : 'Gerar Cronograma'}
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
              Selecione o mês e ano e clique em "Gerar Cronograma" para ver as designações.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
