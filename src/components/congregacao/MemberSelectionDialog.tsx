
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, UserCheck } from 'lucide-react';
import type { Membro } from '@/lib/congregacao/types';
import { useToast } from '@/hooks/use-toast';

interface MemberSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allMembers: Membro[];
  targetRole: 'dirigente' | 'leitor' | null; // Kept for PublicMeeting, can be null for NVMC
  requiredPermissionId?: string | null; // For NVMC part-specific permissions
  currentDate: string; // YYYY-MM-DD
  onSelectMember: (memberId: string) => void;
  currentlyAssignedMemberId?: string | null;
  excludedMemberId?: string | null; // ID of member already assigned to the *other* role on this date (PublicMeeting)
  excludedMemberIds?: string[]; // Array of IDs to exclude (e.g. participant 1 when selecting participant 2 for FMM)
  dialogTitle?: string; // Optional custom title
  dialogDescription?: string; // Optional custom description
}

export function MemberSelectionDialog({
  isOpen,
  onOpenChange,
  allMembers,
  targetRole,
  requiredPermissionId,
  currentDate,
  onSelectMember,
  currentlyAssignedMemberId,
  excludedMemberId,
  excludedMemberIds = [],
  dialogTitle: customDialogTitle,
  dialogDescription: customDialogDescription,
}: MemberSelectionDialogProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(currentlyAssignedMemberId || null);
    }
  }, [isOpen, currentlyAssignedMemberId]);

  const permissionIdToUse = requiredPermissionId !== undefined ? requiredPermissionId : 
    (targetRole === 'dirigente' ? 'presidente' : (targetRole === 'leitor' ? 'leitorDom' : null));


  const eligibleMembers = useMemo(() => {
    return allMembers.filter(member => {
      // Check permission
      if (permissionIdToUse) {
        if (!member.permissoesBase[permissionIdToUse]) {
          return false;
        }
      } // If permissionIdToUse is null, no specific permission is required (e.g. FMM parts)

      // Check impediments
      if (member.impedimentos.some(imp => currentDate >= imp.from && currentDate <= imp.to)) {
        return false;
      }
      // Check if excluded (single ID for public meeting or multiple for NVMC)
      if (excludedMemberId && member.id === excludedMemberId) {
        return false;
      }
      if (excludedMemberIds.includes(member.id)) {
        return false;
      }
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allMembers, permissionIdToUse, currentDate, excludedMemberId, excludedMemberIds]);

  const handleConfirmSelection = () => {
    if (selectedMember) {
      onSelectMember(selectedMember);
      onOpenChange(false);
    } else {
      toast({
        title: "Seleção Necessária",
        description: "Por favor, selecione um membro da lista.",
        variant: "default",
      });
    }
  };

  const roleName = targetRole === 'dirigente' ? 'Dirigente de A Sentinela' : 
                   targetRole === 'leitor' ? 'Leitor de A Sentinela' : 
                   'Participante';
  
  const title = customDialogTitle || `Selecionar ${roleName}`;
  const description = customDialogDescription || 
    `Escolha um membro para a função em ${new Date(currentDate + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}. 
     A lista mostra membros ${permissionIdToUse ? 'com a permissão necessária' : 'elegíveis'} e sem impedimentos para esta data.`;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {eligibleMembers.length > 0 ? (
          <ScrollArea className="h-[250px] w-full rounded-md border p-3 my-4">
            <RadioGroup value={selectedMember || ''} onValueChange={setSelectedMember}>
              {eligibleMembers.map(member => (
                <div key={member.id} className="flex items-center space-x-2 py-1.5">
                  <RadioGroupItem value={member.id} id={`member-select-${member.id}`} />
                  <Label htmlFor={`member-select-${member.id}`} className="font-normal cursor-pointer">{member.nome}</Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        ) : (
          <div className="my-4 p-4 bg-muted/50 rounded-md text-center text-muted-foreground flex items-center justify-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Nenhum membro elegível encontrado para esta função e data.
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleConfirmSelection} disabled={eligibleMembers.length === 0 || !selectedMember}>
            Confirmar Seleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
