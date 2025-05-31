
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
  onClearMainScheduleData?: () => void; // Para a primeira aba
  onClearPublicMeetingData?: () => void;
  onClearNvmcData?: () => void; 
  onClearFieldServiceData?: () => void; // Nova prop
  clearType: 'history' | 'all' | 'public_meeting' | 'nvmc' | 'field_service' | 'main_schedule' | null; // Novo tipo
  targetMemberName?: string | null;
}

export function ConfirmClearDialog({
  isOpen,
  onOpenChange,
  onClearHistory,
  onClearAllData,
  onClearMainScheduleData,
  onClearPublicMeetingData,
  onClearNvmcData, 
  onClearFieldServiceData,
  clearType,
  targetMemberName,
}: ConfirmClearDialogProps) {
  
  const handleConfirm = () => {
    if (clearType === 'history') {
      onClearHistory();
    } else if (clearType === 'all') {
      onClearAllData();
    } else if (clearType === 'main_schedule' && onClearMainScheduleData) {
      onClearMainScheduleData();
    } else if (clearType === 'public_meeting' && onClearPublicMeetingData) {
      onClearPublicMeetingData();
    } else if (clearType === 'nvmc' && onClearNvmcData) { 
      onClearNvmcData();
    } else if (clearType === 'field_service' && onClearFieldServiceData) {
      onClearFieldServiceData();
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
  } else if (clearType === 'main_schedule') {
    title = "Limpar Designações (Indicadores/Volantes/AV/Limpeza)?";
    description = "Tem certeza que deseja limpar todas as designações geradas ou manuais (Indicadores, Volantes, AV, Limpeza) para o mês atualmente visualizado nesta aba? O histórico dos membros NÃO será afetado por esta ação específica.";
  } else if (clearType === 'public_meeting') {
    title = "Limpar Dados da Reunião Pública?";
    description = "Tem certeza que deseja limpar todos os dados de Tema, Orador, Congregação, Dirigente e Leitor inseridos para as Reuniões Públicas? Esta ação não pode ser desfeita.";
  } else if (clearType === 'nvmc') { 
    title = "Limpar Dados NVMC?";
    description = "Tem certeza que deseja limpar todas as designações manuais da Reunião Nossa Vida e Ministério Cristão? Esta ação não pode ser desfeita.";
  } else if (clearType === 'field_service') {
    title = "Limpar Dados do Serviço de Campo?";
    description = "Tem certeza que deseja limpar todas as designações de pontos de encontro do serviço de campo? Esta ação não pode ser desfeita.";
  } else if (clearType === 'all') {
    title = "Limpar TODOS os Dados?";
    description = "ATENÇÃO! Isso removerá TODOS os membros, permissões, históricos, impedimentos e dados de todas as abas de designação (Indicadores/Volantes/AV/Limpeza, Reunião Pública, NVMC, Serviço de Campo). Esta ação é EXTREMAMENTE destrutiva e não pode ser desfeita. Confirma que deseja prosseguir?";
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
            className={(clearType === 'all' || clearType === 'public_meeting' || clearType === 'nvmc' || clearType === 'field_service' || clearType === 'main_schedule') ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            Confirmar Limpeza
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
