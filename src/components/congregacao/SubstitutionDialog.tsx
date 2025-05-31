
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Users, ListChecks } from 'lucide-react';
import type { Membro, SubstitutionDetails, DesignacoesFeitas, FuncaoDesignada as FuncaoDesignadaType } from '@/lib/congregacao/types';
import { findNextBestCandidateForSubstitution, getPotentialSubstitutesList, getEligibleMembersForFunctionDate } from '@/lib/congregacao/assignment-logic';
import { useToast } from '@/hooks/use-toast';
import { getRealFunctionId, getPermissaoRequerida } from '@/lib/congregacao/utils'; // Importado
import { FUNCOES_DESIGNADAS, DIAS_REUNIAO as DIAS_REUNIAO_CONFIG, PERMISSOES_BASE } from '@/lib/congregacao/constants'; // Importado


interface SubstitutionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substitutionDetails: SubstitutionDetails;
  allMembers: Membro[];
  currentAssignmentsForMonth: DesignacoesFeitas;
  onConfirmSubstitution: (newMemberId: string) => void;
}

type SubstitutionMode = 'options' | 'manual_selection';

export function SubstitutionDialog({
  isOpen,
  onOpenChange,
  substitutionDetails,
  allMembers,
  currentAssignmentsForMonth,
  onConfirmSubstitution,
}: SubstitutionDialogProps) {
  const [mode, setMode] = useState<SubstitutionMode>('options');
  const [isLoadingAutomatic, setIsLoadingAutomatic] = useState(false);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [potentialSubstitutes, setPotentialSubstitutes] = useState<Membro[]>([]);
  const [selectedManualSubstitute, setSelectedManualSubstitute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const { date, functionId: initialFunctionId, originalMemberId, originalMemberName, currentFunctionGroupId } = substitutionDetails;

  // Resolve the function ID to be specific (e.g., 'indicadorExternoDom')
  const resolvedFunctionId = useMemo(() => {
    if (!date || !initialFunctionId || !currentFunctionGroupId) return initialFunctionId;
    // If initialFunctionId already looks specific (ends with Qui or Dom), use it
    if (initialFunctionId.endsWith('Qui') || initialFunctionId.endsWith('Dom')) {
        return initialFunctionId;
    }
    return getRealFunctionId(initialFunctionId, date, currentFunctionGroupId);
  }, [date, initialFunctionId, currentFunctionGroupId]);

  const targetFunction = useMemo(() => {
    return FUNCOES_DESIGNADAS.find(f => f.id === resolvedFunctionId);
  }, [resolvedFunctionId]);

  const formattedDate = useMemo(() => {
    return new Date(date + "T00:00:00Z").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }, [date]);


  useEffect(() => {
    if (isOpen) {
      setMode('options');
      setIsLoadingAutomatic(false);
      setIsLoadingManual(false);
      setPotentialSubstitutes([]);
      setSelectedManualSubstitute(null);
      setError(null);
    }
  }, [isOpen, substitutionDetails]); // substitutionDetails aqui para resetar se mudar

  const handleFindAutomaticSubstitute = async () => {
    setIsLoadingAutomatic(true);
    setError(null);
    if (!targetFunction) {
        setError(`Definição da função "${resolvedFunctionId}" não encontrada.`);
        setIsLoadingAutomatic(false);
        return;
    }
    try {
      const candidate = await findNextBestCandidateForSubstitution(
        date,
        resolvedFunctionId, // Use o ID resolvido
        originalMemberId || null,
        allMembers,
        currentAssignmentsForMonth
      );
      if (candidate) {
        onConfirmSubstitution(candidate.id);
      } else {
        setError('Nenhum candidato automático elegível encontrado.');
        toast({ title: "Nenhum Candidato", description: "Não foi encontrado um candidato automático elegível.", variant: "default" });
      }
    } catch (e: any) {
      setError('Erro ao buscar candidato automático: ' + e.message);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingAutomatic(false);
    }
  };

  const handlePrepareManualSelection = async () => {
    setIsLoadingManual(true);
    setError(null);
    setPotentialSubstitutes([]);

    if (!targetFunction) {
        const msg = `Definição da função "${resolvedFunctionId}" (resolvido de "${initialFunctionId}") não encontrada. Não é possível listar substitutos.`;
        setError(msg);
        toast({ title: "Erro de Configuração", description: "Função inválida para substituição.", variant: "destructive" });
        setIsLoadingManual(false);
        return;
    }

    try {
      const substitutes = await getPotentialSubstitutesList(
        date,
        resolvedFunctionId, // Use o ID resolvido
        originalMemberId || null,
        allMembers,
        currentAssignmentsForMonth
      );

      if (substitutes.length > 0) {
        setPotentialSubstitutes(substitutes);
        setMode('manual_selection');
      } else {
        // Geração de mensagem de erro detalhada
        const detailedErrorParts: string[] = [`Nenhum membro elegível para "${targetFunction.nome}" em ${formattedDate}. Verificações:`];
        const targetDateObj = new Date(date + "T00:00:00Z");
        const tipoReuniao = targetDateObj.getUTCDay() === DIAS_REUNIAO_CONFIG.meioSemana ? 'meioSemana' : 'publica';
        const permissaoNecessariaId = getPermissaoRequerida(targetFunction.id, tipoReuniao);
        const permissaoObj = PERMISSOES_BASE.find(p => p.id === permissaoNecessariaId);

        detailedErrorParts.push(`Permissão Requerida: ${permissaoObj ? permissaoObj.nome : (permissaoNecessariaId || "Nenhuma específica")}`);

        allMembers.forEach(membro => {
          if (membro.id === originalMemberId) return; // Skip o membro original

          let elegibilidadeStatus = `- ${membro.nome}: `;
          const razoesInelegibilidade: string[] = [];

          if (permissaoNecessariaId && !membro.permissoesBase[permissaoNecessariaId]) {
            razoesInelegibilidade.push("não tem permissão");
          }
          if (membro.impedimentos.some(imp => date >= imp.from && date <= imp.to)) {
            razoesInelegibilidade.push("impedido na data");
          }
          
          const assignmentsOnDate = currentAssignmentsForMonth[date] || {};
          let hasConflict = false;
          for (const funcIdKey in assignmentsOnDate) {
            if (assignmentsOnDate[funcIdKey] === membro.id) {
                const assignedFuncDef = FUNCOES_DESIGNADAS.find(f => f.id === funcIdKey);
                if (targetFunction.tabela !== 'AV' && assignedFuncDef && assignedFuncDef.tabela !== 'AV') { // Não pode ter outra função não-AV
                    hasConflict = true;
                    razoesInelegibilidade.push(`já designado em ${assignedFuncDef.nome}`);
                    break;
                }
                if (targetFunction.tabela === 'AV' && assignedFuncDef && assignedFuncDef.tabela !== 'AV') { // Se tentando designar para AV, não pode ter função não-AV
                    hasConflict = true;
                    razoesInelegibilidade.push(`já designado em ${assignedFuncDef.nome} (conflito com AV)`);
                    break;
                }
            }
          }

          if (razoesInelegibilidade.length > 0) {
            elegibilidadeStatus += razoesInelegibilidade.join(', ');
          } else {
            elegibilidadeStatus += "aparentemente elegível (verificar lógica central se não listado).";
          }
          detailedErrorParts.push(elegibilidadeStatus);
        });
        
        setError(detailedErrorParts.join('\n'));
        toast({ title: "Nenhum Substituto", description: "Verifique os detalhes no diálogo.", variant: "default" });
      }
    } catch (e: any) {
      setError('Erro ao buscar lista de membros: ' + e.message);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingManual(false);
    }
  };

  const handleConfirmManualSelection = () => {
    if (selectedManualSubstitute) {
      onConfirmSubstitution(selectedManualSubstitute);
    } else {
      toast({ title: "Seleção Necessária", description: "Por favor, selecione um membro da lista.", variant: "default"});
    }
  };

  const isDesignatingNew = !originalMemberId || originalMemberId === '';
  const dialogTitleText = isDesignatingNew ? `Designar para ${currentFunctionGroupId}` : `Substituir: ${originalMemberName}`;
  const automaticButtonText = isDesignatingNew ? "Designar Próximo da Lista (Automático)" : "Substituir pelo Próximo da Lista (Automático)";
  const manualButtonText = isDesignatingNew ? "Escolher Designado Específico (Manual)" : "Escolher Substituto Específico (Manual)";

  const displayedFunctionName = targetFunction ? targetFunction.nome : resolvedFunctionId;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitleText}</DialogTitle>
          <DialogDescription>
            Data: {formattedDate} <br />
            Função: {currentFunctionGroupId} - {displayedFunctionName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Informações de Elegibilidade</AlertTitle>
            <ScrollArea className="h-auto max-h-[150px] whitespace-pre-wrap">
              <AlertDescription>{error}</AlertDescription>
            </ScrollArea>
          </Alert>
        )}

        {mode === 'options' && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Escolha uma opção:</p>
            <Button onClick={handleFindAutomaticSubstitute} className="w-full" variant="default" disabled={isLoadingAutomatic || !targetFunction}>
              {isLoadingAutomatic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ListChecks className="mr-2 h-4 w-4" /> {automaticButtonText}
            </Button>
            <Button
              onClick={handlePrepareManualSelection}
              variant="default"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isLoadingManual || !targetFunction}
            >
              {isLoadingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Users className="mr-2 h-4 w-4" /> {manualButtonText}
            </Button>
          </div>
        )}

        {mode === 'manual_selection' && (
          <div className="py-4 space-y-4">
            <Label className="font-semibold">Selecione o novo membro:</Label>
            {potentialSubstitutes.length > 0 ? (
              <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                <RadioGroup value={selectedManualSubstitute || ''} onValueChange={setSelectedManualSubstitute}>
                  {potentialSubstitutes.map(member => (
                    <div key={member.id} className="flex items-center space-x-2 py-1">
                      <RadioGroupItem value={member.id} id={`member-${member.id}`} />
                      <Label htmlFor={`member-${member.id}`} className="font-normal cursor-pointer">{member.nome}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum membro elegível encontrado (após aplicação de todos os filtros). Verifique a mensagem de erro acima para detalhes.</p>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setMode('options'); setError(null); }}>Voltar</Button>
              <Button onClick={handleConfirmManualSelection} disabled={!selectedManualSubstitute}>Confirmar Seleção</Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

