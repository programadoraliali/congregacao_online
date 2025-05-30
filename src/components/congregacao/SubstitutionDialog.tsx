
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
import type { Membro, SubstitutionDetails, DesignacoesFeitas } from '@/lib/congregacao/types';
import { findNextBestCandidateForSubstitution, getPotentialSubstitutesList } from '@/lib/congregacao/assignment-logic';
import { useToast } from '@/hooks/use-toast';

interface SubstitutionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substitutionDetails: SubstitutionDetails;
  allMembers: Membro[];
  currentAssignmentsForMonth: DesignacoesFeitas; // Para verificar conflitos no dia
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
  const [automaticCandidate, setAutomaticCandidate] = useState<Membro | null>(null); // Estado para armazenar o candidato para evitar confirmação no mesmo fluxo
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const { date, functionId, originalMemberId, originalMemberName } = substitutionDetails;

  useEffect(() => {
    // Reset state when dialog opens or details change
    if (isOpen) {
      setMode('options');
      setIsLoadingAutomatic(false);
      setIsLoadingManual(false);
      setPotentialSubstitutes([]);
      setSelectedManualSubstitute(null);
      setAutomaticCandidate(null);
      setError(null);
    }
  }, [isOpen, substitutionDetails]);

  const handleFindAutomaticSubstitute = async () => {
    setIsLoadingAutomatic(true);
    setError(null);
    setAutomaticCandidate(null); 
    try {
      const candidate = await findNextBestCandidateForSubstitution(
        date,
        functionId,
        originalMemberId,
        allMembers,
        currentAssignmentsForMonth
      );
      if (candidate) {
        onConfirmSubstitution(candidate.id);
      } else {
        setError('Nenhum substituto automático elegível encontrado.');
        toast({ title: "Nenhum Substituto", description: "Não foi encontrado um substituto automático elegível.", variant: "default" });
      }
    } catch (e: any) {
      setError('Erro ao buscar substituto automático: ' + e.message);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingAutomatic(false);
    }
  };

  const handlePrepareManualSelection = async () => {
    setIsLoadingManual(true);
    setError(null);
    setPotentialSubstitutes([]);
    try {
      const substitutes = await getPotentialSubstitutesList(
        date,
        functionId,
        originalMemberId,
        allMembers,
        currentAssignmentsForMonth
      );
      if (substitutes.length > 0) {
        setPotentialSubstitutes(substitutes);
        setMode('manual_selection');
      } else {
        setError('Nenhum membro elegível encontrado para substituição manual.');
        toast({ title: "Nenhum Substituto", description: "Não há membros elegíveis para esta função e data.", variant: "default" });
      }
    } catch (e: any) {
      setError('Erro ao buscar lista de substitutos: ' + e.message);
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

  const memberToReplaceName = originalMemberName || allMembers.find(m => m.id === originalMemberId)?.nome || 'Membro Desconhecido';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Substituir: {memberToReplaceName}</DialogTitle>
          <DialogDescription>
            Data: {new Date(date + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} <br />
            Função: {substitutionDetails.currentFunctionGroupId} - {functionId}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === 'options' && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Escolha como deseja encontrar um substituto:</p>
            <Button onClick={handleFindAutomaticSubstitute} className="w-full" disabled={isLoadingAutomatic}>
              {isLoadingAutomatic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ListChecks className="mr-2 h-4 w-4" /> Substituir pelo Próximo da Lista (Automático)
            </Button>
            <Button onClick={handlePrepareManualSelection} className="w-full" variant="default" disabled={isLoadingManual}>
              {isLoadingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Users className="mr-2 h-4 w-4" /> Escolher Substituto Específico (Manual)
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
              <p className="text-sm text-muted-foreground">Nenhum substituto elegível encontrado.</p>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setMode('options')}>Voltar</Button>
              <Button onClick={handleConfirmManualSelection} disabled={!selectedManualSubstitute}>Confirmar Seleção Manual</Button>
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

