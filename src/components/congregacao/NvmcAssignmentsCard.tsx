
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Membro, AllNVMCAssignments, NVMCDailyAssignments, NVMCParticipantAssignment } from '@/lib/congregacao/types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NVMC_PART_SECTIONS, NVMC_ASSIGNABLE_PARTS_CONFIG } from '@/lib/congregacao/constants';
import { formatarDataCompleta, formatarDataParaChave, obterNomeMes } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, BookUser, Edit3 } from 'lucide-react';
import { MemberSelectionDialog } from './MemberSelectionDialog';
import { useToast } from "@/hooks/use-toast";

interface NvmcAssignmentsCardProps {
  allMembers: Membro[];
  allNvmcAssignments: AllNVMCAssignments | null;
  initialMonth: number; // 0-11
  initialYear: number;
  onSaveNvmcAssignments: (
    updatedMonthAssignments: { [dateStr: string]: NVMCDailyAssignments },
    month: number,
    year: number
  ) => void;
}

type MemberRoleForNvmc = keyof NVMCDailyAssignments | { fmmKey: keyof NVMCDailyAssignments, subKey: 'participantId' | 'assistantId' };


export function NvmcAssignmentsCard({
  allMembers,
  allNvmcAssignments,
  initialMonth,
  initialYear,
  onSaveNvmcAssignments,
}: NvmcAssignmentsCardProps) {
  const [displayMonth, setDisplayMonth] = useState<number>(initialMonth ?? new Date().getMonth());
  const [displayYear, setDisplayYear] = useState<number>(initialYear ?? new Date().getFullYear());
  
  // Stores assignments for the currently displayed month: { "YYYY-MM-DD": NVMCDailyAssignments }
  const [currentMonthAssignments, setCurrentMonthAssignments] = useState<{ [dateStr: string]: NVMCDailyAssignments }>({});

  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
  const [memberSelectionContext, setMemberSelectionContext] = useState<{
    dateStr: string;
    partKey: keyof NVMCDailyAssignments; // e.g. 'presidenteId', 'fmmParte1'
    subPartKey?: 'participantId' | 'assistantId'; // For fmmParte1.participantId or fmmParte1.assistantId
    currentMemberId?: string | null;
    requiredPermissionId?: string | null;
    excludedMemberIds?: string[]; // For FMM parts, to avoid assigning same person as participant and assistant
  } | null>(null);
  
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    const yearMonthKey = formatarDataParaChave(new Date(displayYear, displayMonth, 1));
    if (allNvmcAssignments && allNvmcAssignments[yearMonthKey]) {
      setCurrentMonthAssignments(allNvmcAssignments[yearMonthKey]);
    } else {
      setCurrentMonthAssignments({}); // Clear if no data for this month/year
    }
  }, [displayMonth, displayYear, allNvmcAssignments]);

  const midweekMeetingDates = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(Date.UTC(displayYear, displayMonth, 1));
    const lastDayNum = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();

    for (let dayNum = 1; dayNum <= lastDayNum; dayNum++) {
        const currentDate = new Date(Date.UTC(displayYear, displayMonth, dayNum));
        if (currentDate.getUTCDay() === DIAS_REUNIAO.meioSemana) {
            dates.push(currentDate);
        }
    }
    return dates;
  }, [displayMonth, displayYear]);

  const getMemberName = (memberId: string | null | undefined): string => {
    if (!memberId) return 'Selecionar';
    const member = allMembers.find(m => m.id === memberId);
    return member ? member.nome : 'Desconhecido';
  };

  const handleInputChange = (dateStr: string, partKey: keyof NVMCDailyAssignments, field: 'customTitle' | 'vidaCristaParte1CustomTitle', value: string) => {
    setCurrentMonthAssignments(prev => {
      const dayAssignments = { ...(prev[dateStr] || {}) };
      if (NVMC_ASSIGNABLE_PARTS_CONFIG[partKey]?.isFmmPart) {
        const fmmPart = { ...(dayAssignments[partKey] as NVMCParticipantAssignment | undefined) };
        fmmPart.customTitle = value;
        dayAssignments[partKey] = fmmPart as any; // Needs type assertion due to dynamic key
      } else if (partKey === 'vidaCristaParte1Id' && field === 'vidaCristaParte1CustomTitle') {
         (dayAssignments as NVMCDailyAssignments).vidaCristaParte1CustomTitle = value;
      }
      return { ...prev, [dateStr]: dayAssignments };
    });
  };
  
  const handleOpenMemberSelection = (
    dateStr: string, 
    partKey: keyof NVMCDailyAssignments, 
    subPartKey?: 'participantId' | 'assistantId'
  ) => {
    const assignmentsForDay = currentMonthAssignments[dateStr] || {};
    let currentMemberId: string | null | undefined = null;
    let excludedMemberIds: string[] = [];
    const config = NVMC_ASSIGNABLE_PARTS_CONFIG[partKey];

    if (config?.isFmmPart && subPartKey) {
      const fmmAssignment = assignmentsForDay[partKey] as NVMCParticipantAssignment | undefined;
      currentMemberId = fmmAssignment?.[subPartKey];
      if (subPartKey === 'participantId' && fmmAssignment?.assistantId) excludedMemberIds.push(fmmAssignment.assistantId);
      if (subPartKey === 'assistantId' && fmmAssignment?.participantId) excludedMemberIds.push(fmmAssignment.participantId);
    } else {
      currentMemberId = assignmentsForDay[partKey] as string | null | undefined;
    }
    
    setMemberSelectionContext({ 
      dateStr, 
      partKey, 
      subPartKey, 
      currentMemberId: currentMemberId ?? null,
      requiredPermissionId: config?.requiredPermissionId ?? null, // Pass null if no specific permission
      excludedMemberIds
    });
    setIsMemberSelectionOpen(true);
  };

  const handleSelectMember = (selectedMemberId: string) => {
    if (memberSelectionContext) {
      const { dateStr, partKey, subPartKey } = memberSelectionContext;
      setCurrentMonthAssignments(prev => {
        const dayAssignments = JSON.parse(JSON.stringify(prev[dateStr] || {})) as NVMCDailyAssignments; // Deep copy
        
        if (NVMC_ASSIGNABLE_PARTS_CONFIG[partKey]?.isFmmPart && subPartKey) {
          let fmmPart = (dayAssignments[partKey] as NVMCParticipantAssignment | undefined) || {};
          fmmPart[subPartKey] = selectedMemberId;
          dayAssignments[partKey] = fmmPart as any;
        } else {
          (dayAssignments as any)[partKey] = selectedMemberId;
        }
        return { ...prev, [dateStr]: dayAssignments };
      });
    }
    setIsMemberSelectionOpen(false);
    setMemberSelectionContext(null);
  };
  
  const handleSaveChanges = () => {
    onSaveNvmcAssignments(currentMonthAssignments, displayMonth, displayYear);
  };

  const renderAssignablePart = (dateStr: string, partKey: keyof NVMCDailyAssignments, config: typeof NVMC_ASSIGNABLE_PARTS_CONFIG[string]) => {
    const assignmentForDay = currentMonthAssignments[dateStr] || {};
    
    if (config.isFmmPart) {
      const fmmAssignment = (assignmentForDay[partKey] as NVMCParticipantAssignment) || {};
      return (
        <div className="space-y-2 mb-3 p-3 border rounded-md bg-muted/30">
          <Label className="font-semibold">{config.label}</Label>
          <Input
            placeholder="Tema/Título da Parte (opcional)"
            value={fmmAssignment.customTitle || ''}
            onChange={(e) => handleInputChange(dateStr, partKey, 'customTitle', e.target.value)}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-20">Participante:</span>
            <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, partKey, 'participantId')}>
              {getMemberName(fmmAssignment.participantId)}
            </Button>
          </div>
          {config.needsAssistant && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20">Ajudante:</span>
              <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, partKey, 'assistantId')}>
                {getMemberName(fmmAssignment.assistantId)}
              </Button>
            </div>
          )}
        </div>
      );
    } else {
      // For simple assignments (like presidenteId, leituraBibliaId)
      let memberId: string | null = null;
      if (partKey in assignmentForDay) {
         memberId = (assignmentForDay as any)[partKey] as string | null;
      }
      return (
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor={`${partKey}-${dateStr}`} className="w-1/3 whitespace-nowrap">{config.label}:</Label>
          <Button variant="outline" size="sm" id={`${partKey}-${dateStr}`} className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, partKey)}>
             {getMemberName(memberId)}
          </Button>
        </div>
      );
    }
  };
  
  const renderVidaCristaPart1 = (dateStr: string) => {
    const assignmentForDay = currentMonthAssignments[dateStr] || {};
    const config = NVMC_ASSIGNABLE_PARTS_CONFIG.vidaCristaParte1Id;
    return (
        <div className="space-y-2 mb-3 p-3 border rounded-md bg-muted/30">
            <Label className="font-semibold">{config.label}</Label>
             <Input
                placeholder="Título da Parte (e.g., Necessidades Locais)"
                value={assignmentForDay.vidaCristaParte1CustomTitle || ''}
                onChange={(e) => handleInputChange(dateStr, 'vidaCristaParte1Id', 'vidaCristaParte1CustomTitle', e.target.value)}
                className="text-sm"
            />
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Designado:</span>
                <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, 'vidaCristaParte1Id')}>
                    {getMemberName(assignmentForDay.vidaCristaParte1Id)}
                </Button>
            </div>
        </div>
    );
  };


  const groupedParts = Object.entries(NVMC_ASSIGNABLE_PARTS_CONFIG).reduce((acc, [key, config]) => {
    const section = config.section || 'Outros';
    if (!acc[section]) acc[section] = [];
    acc[section].push({ key: key as keyof NVMCDailyAssignments, ...config });
    return acc;
  }, {} as Record<string, Array<{key: keyof NVMCDailyAssignments} & typeof NVMC_ASSIGNABLE_PARTS_CONFIG[string]>>);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookUser className="mr-2 h-5 w-5 text-primary" /> Designações NVMC (Vida e Ministério)
        </CardTitle>
        <CardDescription>
          Configure as designações para a reunião de meio de semana de {obterNomeMes(displayMonth)} de {displayYear}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
          <div className="flex-1">
            <Label htmlFor={`selectNvmcMes-${initialYear}-${initialMonth}`}>Mês</Label>
            <Select value={displayMonth.toString()} onValueChange={(val) => setDisplayMonth(parseInt(val))}>
              <SelectTrigger id={`selectNvmcMes-${initialYear}-${initialMonth}`}>
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
            <Label htmlFor={`selectNvmcAno-${initialYear}-${initialMonth}`}>Ano</Label>
            <Select value={displayYear.toString()} onValueChange={(val) => setDisplayYear(parseInt(val))}>
              <SelectTrigger id={`selectNvmcAno-${initialYear}-${initialMonth}`}>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {yearsForSelect.map(yearVal => (
                  <SelectItem key={yearVal} value={yearVal.toString()}>{yearVal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button onClick={handleSaveChanges} className="w-full sm:w-auto">
            Salvar Alterações de {obterNomeMes(displayMonth)}
          </Button>
        </div>

        {midweekMeetingDates.length === 0 && (
           <p className="text-muted-foreground text-center py-4">
            Nenhuma reunião de meio de semana em {obterNomeMes(displayMonth)} de {displayYear}.
          </p>
        )}

        {midweekMeetingDates.map((dateObj, index) => {
          const dateStr = formatarDataCompleta(dateObj);
          const dayAbrev = NOMES_DIAS_SEMANA_ABREV[dateObj.getUTCDay()];
          const formattedDateDisplay = `${dayAbrev} ${dateObj.getUTCDate().toString().padStart(2, '0')}/${(dateObj.getUTCMonth() + 1).toString().padStart(2, '0')}`;
          
          return (
            <div key={dateStr} className="mb-6">
              <h3 className="text-xl font-semibold text-primary mb-3 sticky top-0 bg-background py-2 z-10 border-b">
                {formattedDateDisplay} - {obterNomeMes(dateObj.getUTCMonth())} de {dateObj.getUTCFullYear()}
              </h3>
              <div className="space-y-4">
                {Object.entries(groupedParts).map(([sectionName, parts]) => (
                  <div key={sectionName}>
                    <h4 className="text-md font-medium text-foreground mb-2 mt-3">{sectionName}</h4>
                    {parts.map(partConfig => {
                       if (partConfig.key === 'vidaCristaParte1Id') { // Special rendering for vidaCristaParte1
                           return renderVidaCristaPart1(dateStr);
                       }
                       // Skip rendering vidaCristaParte1CustomTitle directly as it's handled by renderVidaCristaPart1
                       if (partConfig.key === 'vidaCristaParte1CustomTitle') return null;

                       return renderAssignablePart(dateStr, partConfig.key, partConfig);
                    })}
                  </div>
                ))}
              </div>
              {index < midweekMeetingDates.length - 1 && <Separator className="my-8" />}
            </div>
          );
        })}
         {midweekMeetingDates.length > 0 && (
            <div className="mt-8 flex justify-end">
                 <Button onClick={handleSaveChanges} className="w-full sm:w-auto">
                    Salvar Alterações de {obterNomeMes(displayMonth)}
                </Button>
            </div>
        )}
      </CardContent>

      {memberSelectionContext && (
        <MemberSelectionDialog
          isOpen={isMemberSelectionOpen}
          onOpenChange={setIsMemberSelectionOpen}
          allMembers={allMembers}
          // Pass role or permission needed for filtering
          targetRole={null} // Let's pass requiredPermissionId directly
          requiredPermissionId={memberSelectionContext.requiredPermissionId}
          currentDate={memberSelectionContext.dateStr}
          onSelectMember={handleSelectMember}
          currentlyAssignedMemberId={memberSelectionContext.currentMemberId}
          excludedMemberId={null} // Simplified for now, can be enhanced for FMM later
          excludedMemberIds={memberSelectionContext.excludedMemberIds}
        />
      )}
    </Card>
  );
}
