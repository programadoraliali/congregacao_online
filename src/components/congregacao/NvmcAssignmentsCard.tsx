
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Membro, AllNVMCAssignments, NVMCDailyAssignments, NVMCParticipantDynamic, NVCVidaCristaDynamicPart, ParsedNvmcProgram } from '@/lib/congregacao/types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, NVMC_PART_SECTIONS, NVMC_FIXED_PARTS_CONFIG } from '@/lib/congregacao/constants';
import { formatarDataCompleta, formatarDataParaChave, obterNomeMes, parseNvmcProgramText } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, BookUser, Edit3, PlusCircle, Trash2, UploadCloud } from 'lucide-react';
import { MemberSelectionDialog } from './MemberSelectionDialog';
import { ParseNvmcProgramDialog } from './ParseNvmcProgramDialog';
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

const generatePartId = () => `part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function NvmcAssignmentsCard({
  allMembers,
  allNvmcAssignments,
  initialMonth,
  initialYear,
  onSaveNvmcAssignments,
}: NvmcAssignmentsCardProps) {
  const [displayMonth, setDisplayMonth] = useState<number>(initialMonth ?? new Date().getMonth());
  const [displayYear, setDisplayYear] = useState<number>(initialYear ?? new Date().getFullYear());
  
  const [currentMonthAssignments, setCurrentMonthAssignments] = useState<{ [dateStr: string]: NVMCDailyAssignments }>({});

  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
  const [memberSelectionContext, setMemberSelectionContext] = useState<{
    dateStr: string;
    partKeyOrId: string; 
    dynamicPartType?: 'fmm' | 'vc'; 
    roleInPart?: 'participantId' | 'assistantId'; 
    currentMemberId?: string | null;
    requiredPermissionId?: string | null;
    excludedMemberIds?: string[];
  } | null>(null);

  const [isParseProgramDialogOpen, setIsParseProgramDialogOpen] = useState(false);
  const [dateForProgramImport, setDateForProgramImport] = useState<string | null>(null);
  
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const ensureDayAssignmentsStructure = (assignments: NVMCDailyAssignments | undefined): NVMCDailyAssignments => {
    return {
      comentariosIniciaisDetalhes: assignments?.comentariosIniciaisDetalhes,
      presidenteId: assignments?.presidenteId,
      oracaoInicialId: assignments?.oracaoInicialId,
      tesourosDiscursoId: assignments?.tesourosDiscursoId,
      tesourosDiscursoCustomTitle: assignments?.tesourosDiscursoCustomTitle,
      joiasEspirituaisId: assignments?.joiasEspirituaisId,
      joiasEspirituaisCustomTitle: assignments?.joiasEspirituaisCustomTitle,
      leituraBibliaId: assignments?.leituraBibliaId,
      leituraBibliaCustomTitle: assignments?.leituraBibliaCustomTitle,
      fmmParts: Array.isArray(assignments?.fmmParts) ? assignments.fmmParts.map(p => ({...p, id: p.id || generatePartId(), partName: p.partName || '', partTheme: p.partTheme })) : [],
      vidaCristaParts: Array.isArray(assignments?.vidaCristaParts) ? assignments.vidaCristaParts.map(p => ({...p, id: p.id || generatePartId(), partName: p.partName || '', partTheme: p.partTheme })) : [],
      ebcDirigenteId: assignments?.ebcDirigenteId,
      ebcLeitorId: assignments?.ebcLeitorId,
      ebcCustomTitle: assignments?.ebcCustomTitle,
      comentariosFinaisDetalhes: assignments?.comentariosFinaisDetalhes,
      oracaoFinalId: assignments?.oracaoFinalId,
    };
  };

  useEffect(() => {
    const yearMonthKey = formatarDataParaChave(new Date(displayYear, displayMonth, 1));
    const loadedAssignments = allNvmcAssignments ? allNvmcAssignments[yearMonthKey] : null;
    const sanitizedAssignments: { [dateStr: string]: NVMCDailyAssignments } = {};

    if (loadedAssignments) {
      for (const dateStr in loadedAssignments) {
        sanitizedAssignments[dateStr] = ensureDayAssignmentsStructure(loadedAssignments[dateStr]);
      }
    }
    setCurrentMonthAssignments(sanitizedAssignments);
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


  const handleUpdateFixedPartAssignment = (dateStr: string, partKey: keyof NVMCDailyAssignments, memberId: string | null) => {
    setCurrentMonthAssignments(prev => ({
      ...prev,
      [dateStr]: {
        ...ensureDayAssignmentsStructure(prev[dateStr]),
        [partKey]: memberId,
      },
    }));
  };

  const handleDynamicPartThemeChange = ( // Renamed from handleDynamicPartChange
    dateStr: string, 
    partType: 'fmm' | 'vc', 
    partId: string, 
    value: string
  ) => {
    setCurrentMonthAssignments(prev => {
      const dayAssignments = ensureDayAssignmentsStructure(prev[dateStr]);
      
      if (partType === 'fmm') {
        const partIndex = dayAssignments.fmmParts.findIndex(p => p.id === partId);
        if (partIndex > -1) {
          dayAssignments.fmmParts[partIndex].partTheme = value; // Update partTheme
        }
      } else if (partType === 'vc') {
        const partIndex = dayAssignments.vidaCristaParts.findIndex(p => p.id === partId);
        if (partIndex > -1) {
          dayAssignments.vidaCristaParts[partIndex].partTheme = value; // Update partTheme
        }
      }
      return { ...prev, [dateStr]: dayAssignments };
    });
  };
  
  const handleDynamicPartNeedsAssistantChange = (
    dateStr: string,
    partId: string,
    needsAssistant: boolean
  ) => {
     setCurrentMonthAssignments(prev => {
      const dayAssignments = ensureDayAssignmentsStructure(prev[dateStr]);
      const partIndex = dayAssignments.fmmParts.findIndex(p => p.id === partId);
      if (partIndex > -1) {
        dayAssignments.fmmParts[partIndex].needsAssistant = needsAssistant;
        if (!needsAssistant) {
          dayAssignments.fmmParts[partIndex].assistantId = null; 
        }
      }
      return { ...prev, [dateStr]: dayAssignments };
    });
  };


  const addDynamicPart = (dateStr: string, partType: 'fmm' | 'vc') => {
    const newPartId = generatePartId();
    setCurrentMonthAssignments(prev => {
      const dayAssignments = ensureDayAssignmentsStructure(prev[dateStr]);
      
      if (partType === 'fmm') {
        dayAssignments.fmmParts = [...dayAssignments.fmmParts, { id: newPartId, partName: 'Nova Parte FMM', partTheme: '', needsAssistant: false, participantId: null, assistantId: null }];
      } else if (partType === 'vc') {
        dayAssignments.vidaCristaParts = [...dayAssignments.vidaCristaParts, { id: newPartId, partName: 'Nova Parte Vida Cristã', partTheme: '', participantId: null }];
      }
      return { ...prev, [dateStr]: dayAssignments };
    });
  };

  const removeDynamicPart = (dateStr: string, partType: 'fmm' | 'vc', partId: string) => {
    setCurrentMonthAssignments(prev => {
      const dayAssignments = ensureDayAssignmentsStructure(prev[dateStr]);
      
      if (partType === 'fmm') {
        dayAssignments.fmmParts = dayAssignments.fmmParts.filter(p => p.id !== partId);
      } else if (partType === 'vc') {
        dayAssignments.vidaCristaParts = dayAssignments.vidaCristaParts.filter(p => p.id !== partId);
      }
      return { ...prev, [dateStr]: dayAssignments };
    });
  };
  
  const handleOpenMemberSelection = (
    dateStr: string, 
    partKeyOrId: string, 
    dynamicPartType?: 'fmm' | 'vc',
    roleInPart?: 'participantId' | 'assistantId' 
  ) => {
    const assignmentsForDay = ensureDayAssignmentsStructure(currentMonthAssignments[dateStr]);
    let currentMemberId: string | null | undefined = null;
    let requiredPermissionId: string | null = null;
    let excludedMemberIds: string[] = [];
    let partNameForDialog: string | undefined;
    let partThemeForDialog: string | undefined;


    if (dynamicPartType === 'fmm' && roleInPart) { 
        const fmmPart = assignmentsForDay.fmmParts.find(p => p.id === partKeyOrId);
        if (fmmPart) {
            currentMemberId = fmmPart[roleInPart];
            partNameForDialog = fmmPart.partName;
            partThemeForDialog = fmmPart.partTheme;
            if (roleInPart === 'participantId' && fmmPart.assistantId) excludedMemberIds.push(fmmPart.assistantId);
            if (roleInPart === 'assistantId' && fmmPart.participantId) excludedMemberIds.push(fmmPart.participantId);
        }
    } else if (dynamicPartType === 'vc') { 
        const vcPart = assignmentsForDay.vidaCristaParts.find(p => p.id === partKeyOrId);
        if(vcPart) {
            currentMemberId = vcPart?.participantId;
            partNameForDialog = vcPart.partName;
            partThemeForDialog = vcPart.partTheme;
            const isDirigentePart = vcPart?.partName.toLowerCase().includes("estudo bíblico de congregação");
            requiredPermissionId = isDirigentePart ? 'presidente' : null; 
        }
    } else { 
        currentMemberId = (assignmentsForDay as any)[partKeyOrId];
        requiredPermissionId = NVMC_FIXED_PARTS_CONFIG[partKeyOrId]?.requiredPermissionId || null;
        partNameForDialog = NVMC_FIXED_PARTS_CONFIG[partKeyOrId]?.label;
    }
    
    setMemberSelectionContext({ 
      dateStr, 
      partKeyOrId, 
      dynamicPartType,
      roleInPart,
      currentMemberId: currentMemberId ?? null,
      requiredPermissionId,
      excludedMemberIds
    });
    setIsMemberSelectionOpen(true);
  };

 const handleSelectMember = (selectedMemberId: string) => {
    if (!memberSelectionContext) return;
    const { dateStr, partKeyOrId, dynamicPartType, roleInPart } = memberSelectionContext;

    setCurrentMonthAssignments(prev => {
        const dayAssignments = ensureDayAssignmentsStructure(prev[dateStr]);

        if (dynamicPartType === 'fmm' && roleInPart) {
            const partIndex = dayAssignments.fmmParts.findIndex(p => p.id === partKeyOrId);
            if (partIndex > -1) {
                dayAssignments.fmmParts[partIndex][roleInPart] = selectedMemberId;
            }
        } else if (dynamicPartType === 'vc') {
            const partIndex = dayAssignments.vidaCristaParts.findIndex(p => p.id === partKeyOrId);
            if (partIndex > -1) {
                dayAssignments.vidaCristaParts[partIndex].participantId = selectedMemberId;
            }
        } else if (!dynamicPartType) { 
            (dayAssignments as any)[partKeyOrId] = selectedMemberId;
        }
        return { ...prev, [dateStr]: dayAssignments };
    });
    
    setIsMemberSelectionOpen(false);
    setMemberSelectionContext(null);
  };
  
  const handleSaveChanges = () => {
    onSaveNvmcAssignments(currentMonthAssignments, displayMonth, displayYear);
  };

  const handleOpenParseDialog = (dateStr: string) => {
    setDateForProgramImport(dateStr);
    setIsParseProgramDialogOpen(true);
  };

  const handleProgramTextParsed = (text: string) => {
    if (!dateForProgramImport) return;
    
    const parsedProgram = parseNvmcProgramText(text);
    
    setCurrentMonthAssignments(prev => {
      const dayAssignments = ensureDayAssignmentsStructure(prev[dateForProgramImport]);

      dayAssignments.comentariosIniciaisDetalhes = parsedProgram.comentariosIniciaisDetalhes;
      
      dayAssignments.fmmParts = parsedProgram.fmmParts.map(p => ({
        id: generatePartId(),
        partName: p.partName, 
        partTheme: p.partTheme || '', 
        needsAssistant: false, 
        participantId: null,
        assistantId: null,
      }));

      dayAssignments.vidaCristaParts = parsedProgram.vidaCristaParts.map(p => ({
        id: generatePartId(),
        partName: p.partName,
        partTheme: p.partTheme || '',
        participantId: null,
      }));
      
      dayAssignments.leituraBibliaCustomTitle = parsedProgram.leituraBibliaTema;
      dayAssignments.ebcCustomTitle = parsedProgram.ebcTema;
      dayAssignments.tesourosDiscursoCustomTitle = parsedProgram.tesourosDiscursoTema;
      dayAssignments.joiasEspirituaisCustomTitle = parsedProgram.joiasEspirituaisTema;
      dayAssignments.comentariosFinaisDetalhes = parsedProgram.comentariosFinaisDetalhes;

      return { ...prev, [dateForProgramImport]: dayAssignments };
    });

    toast({ title: "Programa Importado", description: `Estrutura da reunião para ${new Date(dateForProgramImport + 'T00:00:00').toLocaleDateString('pt-BR')} foi preenchida. Atribua os membros.`});
    setDateForProgramImport(null);
  };


  const renderFixedPart = (dateStr: string, partKey: keyof NVMCDailyAssignments, config: typeof NVMC_FIXED_PARTS_CONFIG[string]) => {
    const assignmentForDay = ensureDayAssignmentsStructure(currentMonthAssignments[dateStr]);
    const memberId = (assignmentForDay as any)[partKey] as string | null;
    
    let customTitle: string | undefined = undefined;
    if (partKey === 'leituraBibliaId') {
        customTitle = assignmentForDay.leituraBibliaCustomTitle;
    } else if (partKey === 'ebcDirigenteId' || partKey === 'ebcLeitorId') {
        customTitle = assignmentForDay.ebcCustomTitle;
    } else if (partKey === 'tesourosDiscursoId') {
        customTitle = assignmentForDay.tesourosDiscursoCustomTitle;
    } else if (partKey === 'joiasEspirituaisId') {
        customTitle = assignmentForDay.joiasEspirituaisCustomTitle;
    }


    return (
      <div className="mb-2">
        <div className="flex items-center gap-2">
            <Label htmlFor={`${partKey}-${dateStr}`} className="w-2/5 whitespace-nowrap">{config.label}:</Label>
            <Button variant="outline" size="sm" id={`${partKey}-${dateStr}`} className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, partKey)}>
            {getMemberName(memberId)}
            </Button>
        </div>
        {customTitle && (
            <p className="text-xs text-muted-foreground mt-1 ml-[40%] pl-1">{customTitle}</p>
        )}
      </div>
    );
  };

  const renderFmmPart = (dateStr: string, part: NVMCParticipantDynamic) => {
    return (
      <div key={part.id} className="space-y-2 mb-3 p-3 border rounded-md bg-muted/30">
        <div className="flex justify-between items-center mb-1">
            <p className="text-md font-semibold text-primary flex-1 mr-2">{part.partName}</p>
            <Button variant="ghost" size="icon" onClick={() => removeDynamicPart(dateStr, 'fmm', part.id)} className="h-7 w-7 text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <Input
            placeholder="Detalhes, tempo e ref. (ex: (3 min) De casa em casa. (lmd lição 1))"
            value={part.partTheme || ''}
            onChange={(e) => handleDynamicPartThemeChange(dateStr, 'fmm', part.id, e.target.value)}
            className="text-sm flex-1 h-9 mb-2"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-24">Participante:</span>
          <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, part.id, 'fmm', 'participantId')}>
            {getMemberName(part.participantId)}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
            <Checkbox 
                id={`needsAssistant-${part.id}`} 
                checked={!!part.needsAssistant} 
                onCheckedChange={(checked) => handleDynamicPartNeedsAssistantChange(dateStr, part.id, !!checked)}
            />
            <Label htmlFor={`needsAssistant-${part.id}`} className="text-sm font-normal">Precisa de Ajudante?</Label>
        </div>
        {part.needsAssistant && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24">Ajudante:</span>
            <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, part.id, 'fmm', 'assistantId')}>
              {getMemberName(part.assistantId)}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderVidaCristaPart = (dateStr: string, part: NVCVidaCristaDynamicPart) => {
    return (
      <div key={part.id} className="space-y-2 mb-3 p-3 border rounded-md bg-muted/30">
        <div className="flex justify-between items-center mb-1">
             <p className="text-md font-semibold text-primary flex-1 mr-2">{part.partName}</p>
             <Button variant="ghost" size="icon" onClick={() => removeDynamicPart(dateStr, 'vc', part.id)} className="h-7 w-7 text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
         <Input
            placeholder="Detalhes e tempo (ex: (15 min) Necessidades locais. (Carta da filial))"
            value={part.partTheme || ''}
            onChange={(e) => handleDynamicPartThemeChange(dateStr, 'vc', part.id, e.target.value)}
            className="text-sm flex-1 h-9 mb-2"
        />
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24">Designado:</span>
            <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => handleOpenMemberSelection(dateStr, part.id, 'vc', 'participantId')}>
                {getMemberName(part.participantId)}
            </Button>
        </div>
      </div>
    );
  };

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
          const dailyAssignments = ensureDayAssignmentsStructure(currentMonthAssignments[dateStr]);
          
          return (
            <div key={dateStr} className="mb-6">
              <div className="flex justify-between items-center mb-3 sticky top-0 bg-background py-2 z-10 border-b">
                <h3 className="text-xl font-semibold text-primary">
                    {formattedDateDisplay} - {obterNomeMes(dateObj.getUTCMonth())} de {dateObj.getUTCFullYear()}
                </h3>
                <Button variant="outline" size="sm" onClick={() => handleOpenParseDialog(dateStr)}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Importar Programa (Texto)
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-foreground mb-2 mt-3">{NVMC_PART_SECTIONS.GERAL}</h4>
                  {renderFixedPart(dateStr, 'presidenteId', NVMC_FIXED_PARTS_CONFIG.presidenteId)}
                  {renderFixedPart(dateStr, 'oracaoInicialId', NVMC_FIXED_PARTS_CONFIG.oracaoInicialId)}
                  {dailyAssignments.comentariosIniciaisDetalhes && (
                    <p className="text-sm text-muted-foreground mt-2 mb-2 ml-1 pl-1"> 
                      {dailyAssignments.comentariosIniciaisDetalhes} Comentários Iniciais
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-md font-medium text-foreground mb-2 mt-3">{NVMC_PART_SECTIONS.TESOUROS}</h4>
                  {renderFixedPart(dateStr, 'tesourosDiscursoId', NVMC_FIXED_PARTS_CONFIG.tesourosDiscursoId)}
                  {renderFixedPart(dateStr, 'joiasEspirituaisId', NVMC_FIXED_PARTS_CONFIG.joiasEspirituaisId)}
                  {renderFixedPart(dateStr, 'leituraBibliaId', NVMC_FIXED_PARTS_CONFIG.leituraBibliaId)}
                </div>
                <div>
                  <h4 className="text-md font-medium text-foreground mb-2 mt-3">{NVMC_PART_SECTIONS.FMM}</h4>
                  {dailyAssignments.fmmParts.map(part => renderFmmPart(dateStr, part))}
                  <Button variant="outline" size="sm" onClick={() => addDynamicPart(dateStr, 'fmm')} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Parte (FMM)
                  </Button>
                </div>
                <div>
                  <h4 className="text-md font-medium text-foreground mb-2 mt-3">{NVMC_PART_SECTIONS.VIDA_CRISTA}</h4>
                  {dailyAssignments.vidaCristaParts.map(part => renderVidaCristaPart(dateStr, part))}
                   <Button variant="outline" size="sm" onClick={() => addDynamicPart(dateStr, 'vc')} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Parte (Vida Cristã)
                  </Button>
                  <Separator className="my-4" />
                  {renderFixedPart(dateStr, 'ebcDirigenteId', NVMC_FIXED_PARTS_CONFIG.ebcDirigenteId)}
                  {renderFixedPart(dateStr, 'ebcLeitorId', NVMC_FIXED_PARTS_CONFIG.ebcLeitorId)}
                </div>
                 <div>
                  <h4 className="text-md font-medium text-foreground mb-2 mt-3">Comentários finais</h4>
                  {dailyAssignments.comentariosFinaisDetalhes && (
                    <p className="text-sm text-muted-foreground mb-2 ml-1 pl-1">{dailyAssignments.comentariosFinaisDetalhes}</p>
                  )}
                  {renderFixedPart(dateStr, 'oracaoFinalId', NVMC_FIXED_PARTS_CONFIG.oracaoFinalId)}
                </div>
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
          targetRole={null} 
          requiredPermissionId={memberSelectionContext.requiredPermissionId}
          currentDate={memberSelectionContext.dateStr}
          onSelectMember={handleSelectMember}
          currentlyAssignedMemberId={memberSelectionContext.currentMemberId}
          excludedMemberId={null} 
          excludedMemberIds={memberSelectionContext.excludedMemberIds}
          dialogTitle={
             // Tenta obter o partName se for uma parte dinâmica, senão o label da parte fixa
             memberSelectionContext.dynamicPartType && currentMonthAssignments[memberSelectionContext.dateStr] ?
               (memberSelectionContext.dynamicPartType === 'fmm' ? 
                 currentMonthAssignments[memberSelectionContext.dateStr]?.fmmParts.find(p => p.id === memberSelectionContext.partKeyOrId)?.partName :
                 currentMonthAssignments[memberSelectionContext.dateStr]?.vidaCristaParts.find(p => p.id === memberSelectionContext.partKeyOrId)?.partName
               ) || 'Participante' // Fallback para 'Participante' se partName não for encontrado
             : NVMC_FIXED_PARTS_CONFIG[memberSelectionContext.partKeyOrId]?.label || 'Participante'
          }
          dialogDescription={
            // Tenta obter o partTheme se for uma parte dinâmica
            memberSelectionContext.dynamicPartType && currentMonthAssignments[memberSelectionContext.dateStr] ?
            (memberSelectionContext.dynamicPartType === 'fmm' ? 
              currentMonthAssignments[memberSelectionContext.dateStr]?.fmmParts.find(p => p.id === memberSelectionContext.partKeyOrId)?.partTheme :
              currentMonthAssignments[memberSelectionContext.dateStr]?.vidaCristaParts.find(p => p.id === memberSelectionContext.partKeyOrId)?.partTheme
            )
            : undefined // Nenhuma descrição adicional para partes fixas
          }
        />
      )}
      {isParseProgramDialogOpen && dateForProgramImport && (
        <ParseNvmcProgramDialog
          isOpen={isParseProgramDialogOpen}
          onOpenChange={setIsParseProgramDialogOpen}
          onParseText={handleProgramTextParsed}
          currentMeetingDate={dateForProgramImport}
        />
      )}
    </Card>
  );
}


    