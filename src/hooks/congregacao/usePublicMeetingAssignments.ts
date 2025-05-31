
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AllPublicMeetingAssignments, PublicMeetingAssignment } from '@/lib/congregacao/types';
import {
  carregarPublicMeetingAssignments as carregarStorage,
  salvarPublicMeetingAssignments as salvarStorage,
  limparPublicMeetingAssignments as limparStorage,
} from '@/lib/congregacao/storage';
import { formatarDataParaChave } from '@/lib/congregacao/utils';
import { useToast } from "@/hooks/use-toast";

export function usePublicMeetingAssignments() {
  const [allAssignments, setAllAssignments] = useState<AllPublicMeetingAssignments | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setAllAssignments(carregarStorage());
  }, []);

  const saveAssignments = useCallback((
    monthAssignments: { [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> },
    mes: number,
    ano: number
  ) => {
    const yearMonthKey = formatarDataParaChave(new Date(ano, mes, 1));
    
    const existingDataForMonth = (allAssignments || {})[yearMonthKey] || {};
    const updatedMonthAssignmentsWithExistingLeitor: { [dateStr: string]: PublicMeetingAssignment } = {};

    // Merge new assignments with existing leitorId
    Object.keys(monthAssignments).forEach(dateStr => {
      updatedMonthAssignmentsWithExistingLeitor[dateStr] = {
        ...(existingDataForMonth[dateStr] || { tema: '', orador: '', congregacaoOrador: '', dirigenteId: null, leitorId: null }), // Provide default structure
        ...monthAssignments[dateStr],
         leitorId: existingDataForMonth[dateStr]?.leitorId || null, // Preserve leitorId
      };
    });
    // Ensure all dates from existing month data are carried over if not in new monthAssignments
     Object.keys(existingDataForMonth).forEach(dateStr => {
        if (!updatedMonthAssignmentsWithExistingLeitor[dateStr]) {
            updatedMonthAssignmentsWithExistingLeitor[dateStr] = existingDataForMonth[dateStr];
        }
    });


    const updatedAllAssignmentsData = {
      ...(allAssignments || {}),
      [yearMonthKey]: updatedMonthAssignmentsWithExistingLeitor,
    };

    setAllAssignments(updatedAllAssignmentsData);
    salvarStorage(updatedAllAssignmentsData);
    toast({ title: "Sucesso", description: "Designações da Reunião Pública salvas." });
  }, [allAssignments, toast]);

  const clearAssignments = useCallback(() => {
    setAllAssignments(null);
    limparStorage();
    // O toast será disparado pelo page.tsx para manter consistência com outros clear actions
  }, []);

  return {
    publicAssignmentsData: allAssignments,
    savePublicAssignments: saveAssignments,
    clearPublicAssignments: clearAssignments,
  };
}
