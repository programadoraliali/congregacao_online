'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmClearDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onClearHistory: () => void;
  onClearAllData: () => void;
  clearType: 'history' | 'all' | null;
  targetMemberName?: string | null; // If clearing history for a specific member
}

export function ConfirmClearDialog({
  isOpen,
  onOpenChange,
  onClearHistory,
  onClearAllData,
  clearType,
  targetMemberName,
}: ConfirmClearDialogProps) {
  
  const handleConfirm = () => {
    if (clearType === 'history') {
      onClearHistory();
    } else if (clearType === 'all') {
      onClearAllData();
    }
    onOpenChange(false);
  };

  let title = "Confirmar Limpeza";
  let description = "Esta ação é irreversível.";

  if (clearType === 'history') {
    title = targetMemberName 
      ? `Limpar Histórico de ${targetMemberName}?` 
      : "Limpar Todo o Histórico de Designações?";
    description = targetMemberName
      ? `Tem certeza que deseja limpar todo o histórico de designações de ${targetMemberName}? Esta ação não pode ser desfeita.`
      : "Tem certeza que deseja limpar o histórico de designações de TODOS os membros? Esta ação não pode ser desfeita.";
  } else if (clearType === 'all') {
    title = "Limpar TODOS os Dados?";
    description = "ATENÇÃO! Isso removerá TODOS os membros, suas permissões, históricos e impedimentos. Esta ação é EXTREMAMENTE destrutiva e não pode ser desfeita. Confirma que deseja prosseguir?";
  }


  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={clearType === 'all' ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            Confirmar Limpeza
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
