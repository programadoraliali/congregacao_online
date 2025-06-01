
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Membro, PublicMeetingAssignment, AllPublicMeetingAssignments, DesignacoesFeitas, SubstitutionDetails } from '@/lib/congregacao/types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV, FUNCOES_DESIGNADAS, APP_NAME } from '@/lib/congregacao/constants';
import { formatarDataCompleta, formatarDataParaChave, obterNomeMes } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, BookOpenText, FileText, Edit3 } from 'lucide-react';
import { MemberSelectionDialog } from './MemberSelectionDialog';
import { useToast } from "@/hooks/use-toast";
import { generatePublicMeetingPdf } from '@/lib/congregacao/pdf-generator';

interface PublicMeetingAssignmentsCardProps {
  allMembers: Membro[];
  allPublicAssignments: AllPublicMeetingAssignments | null;
  currentScheduleForMonth: DesignacoesFeitas | null;
  initialMonth: number;
  initialYear: number;
  onSaveAssignments: (
    updatedMonthAssignments: { [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> },
    month: number,
    year: number
  ) => void;
  onOpenSubstitutionModal: (details: SubstitutionDetails) => void;
}

type EditableField = 'tema' | 'orador' | 'congregacaoOrador';
type MemberRole = 'dirigente';

export function PublicMeetingAssignmentsCard({
  allMembers,
  allPublicAssignments,
  currentScheduleForMonth,
  initialMonth,
  initialYear,
  onSaveAssignments,
  onOpenSubstitutionModal,
}: PublicMeetingAssignmentsCardProps) {
  const [displayMonth, setDisplayMonth] = useState<number>(initialMonth ?? new Date().getMonth());
  const [displayYear, setDisplayYear] = useState<number>(initialYear ?? new Date().getFullYear());
  const [assignments, setAssignments] = useState<{ [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> }>({});

  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
  const [memberSelectionContext, setMemberSelectionContext] = useState<{
    dateStr: string;
    role: MemberRole;
    currentMemberId?: string | null;
  } | null>(null);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const sundaysInMonth = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(Date.UTC(displayYear, displayMonth, 1));
    const lastDayMonth = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();

    for (let dayNum = 1; dayNum <= lastDayMonth; dayNum++) {
        const currentDate = new Date(Date.UTC(displayYear, displayMonth, dayNum));
        if (currentDate.getUTCDay() === DIAS_REUNIAO.publica) {
            dates.push(currentDate);
        }
    }
    return dates;
  }, [displayMonth, displayYear]);

  useEffect(() => {
    const newAssignmentsState: { [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> } = {};
    const yearMonthKey = formatarDataParaChave(new Date(displayYear, displayMonth, 1));

    if (allPublicAssignments === null) {
      sundaysInMonth.forEach(dateObj => {
        const dateStr = formatarDataCompleta(dateObj);
        newAssignmentsState[dateStr] = {
          tema: '',
          orador: '',
          congregacaoOrador: '',
          dirigenteId: null,
        };
      });
    } else {
      const monthDataFromProp = allPublicAssignments[yearMonthKey] || {};
      sundaysInMonth.forEach(dateObj => {
        const dateStr = formatarDataCompleta(dateObj);
        const dataForThisSunday = monthDataFromProp[dateStr] || {};
        const { leitorId, ...rest } = dataForThisSunday;

        newAssignmentsState[dateStr] = {
          tema: rest.tema || '',
          orador: rest.orador || '',
          congregacaoOrador: rest.congregacaoOrador || '',
          dirigenteId: rest.dirigenteId || null,
        };
      });
    }
    setAssignments(newAssignmentsState);

  }, [displayMonth, displayYear, allPublicAssignments, sundaysInMonth]);


  const handleInputChange = (dateStr: string, field: EditableField, value: string) => {
    setAssignments(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || { tema: '', orador: '', congregacaoOrador: '', dirigenteId: null }),
        [field]: value,
      },
    }));
  };

  const handleOpenMemberSelection = (dateStr: string, role: MemberRole) => {
    const currentAssignment = assignments[dateStr];
    const currentMemberId = currentAssignment?.dirigenteId;
    setMemberSelectionContext({ dateStr, role, currentMemberId });
    setIsMemberSelectionOpen(true);
  };

  const handleSelectMember = (selectedMemberId: string) => {
    if (memberSelectionContext && memberSelectionContext.role === 'dirigente') {
      const { dateStr } = memberSelectionContext;
      setAssignments(prev => ({
        ...prev,
        [dateStr]: {
          ...(prev[dateStr] || { tema: '', orador: '', congregacaoOrador: '', dirigenteId: null }),
          dirigenteId: selectedMemberId,
        },
      }));
    }
    setIsMemberSelectionOpen(false);
    setMemberSelectionContext(null);
  };

  const getMemberName = (memberId: string | null | undefined): string => {
    if (!memberId) return 'A ser designado';
    const member = allMembers.find(m => m.id === memberId);
    return member ? member.nome : 'Desconhecido';
  };

  const handleSaveChanges = () => {
    onSaveAssignments(assignments, displayMonth, displayYear);
  };

  const handleExportPublicMeetingPDF = () => {
    if (sundaysInMonth.length === 0 || Object.keys(assignments).length === 0) {
        toast({
            title: "Sem Dados",
            description: "Não há dados de reunião pública para exportar para este mês.",
            variant: "default",
        });
        return;
    }
    try {
        generatePublicMeetingPdf(
            assignments,
            currentScheduleForMonth, // Pass main schedule for leitor info
            allMembers,
            displayMonth,
            displayYear
        );
        toast({ title: "PDF Gerado", description: "O download do PDF da Reunião Pública deve iniciar em breve." });
    } catch (e: any) {
        console.error("Erro ao gerar PDF da Reunião Pública:", e);
        toast({ title: "Erro ao Gerar PDF", description: e.message || "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  const handleOpenLeitorSubstitution = (dateStr: string, leitorId: string | null) => {
     const leitor = allMembers.find(m => m.id === leitorId);
     const leitorNome = leitor ? leitor.nome : "Ninguém Designado";
     const funcaoLeitorDom = FUNCOES_DESIGNADAS.find(f => f.id === 'leitorDom');
     const grupoFuncao = funcaoLeitorDom?.grupo || "Leitura/Presidência";

     onOpenSubstitutionModal({
         date: dateStr,
         functionId: 'leitorDom',
         originalMemberId: leitorId || '',
         originalMemberName: leitorNome,
         currentFunctionGroupId: grupoFuncao
     });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpenText className="mr-2 h-5 w-5 text-primary" /> Designações da Reunião Pública
        </CardTitle>
        <CardDescription>
          Configure os temas, oradores e participantes para as reuniões públicas de {obterNomeMes(displayMonth)} de {displayYear}.
          O Leitor de A Sentinela é designado automaticamente; use "Designar/Alterar" se necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
          <div className="flex-1">
            <Label htmlFor={`selectPublicMeetingMes-${initialYear}-${initialMonth}`}>Mês</Label>
            <Select value={displayMonth.toString()} onValueChange={(val) => setDisplayMonth(parseInt(val))}>
              <SelectTrigger id={`selectPublicMeetingMes-${initialYear}-${initialMonth}`}>
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
            <Label htmlFor={`selectPublicMeetingAno-${initialYear}-${initialMonth}`}>Ano</Label>
            <Select value={displayYear.toString()} onValueChange={(val) => setDisplayYear(parseInt(val))}>
              <SelectTrigger id={`selectPublicMeetingAno-${initialYear}-${initialMonth}`}>
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

        {sundaysInMonth.length === 0 && (
           <p className="text-muted-foreground text-center py-4">
            Não há domingos em {obterNomeMes(displayMonth)} de {displayYear}.
          </p>
        )}

        {sundaysInMonth.map((dateObj, index) => {
          const dateStr = formatarDataCompleta(dateObj);
          const dayAssignment = assignments[dateStr] || {}; 
          const leitorDesignadoId = currentScheduleForMonth?.[dateStr]?.['leitorDom'] || null;
          const nomeLeitorDesignado = getMemberName(leitorDesignadoId);

          const dayAbrev = NOMES_DIAS_SEMANA_ABREV[dateObj.getUTCDay()];
          const formattedDateDisplay = `${dayAbrev} ${dateObj.getUTCDate().toString().padStart(2, '0')}/${(dateObj.getUTCMonth() + 1).toString().padStart(2, '0')}`;

          return (
            <div key={dateStr}>
              <h3 className="text-lg font-semibold text-primary mb-3">{formattedDateDisplay} - {obterNomeMes(dateObj.getUTCMonth())} de {dateObj.getUTCFullYear()}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <Label htmlFor={`tema-${dateStr}`}>Tema do Discurso</Label>
                  <Input
                    id={`tema-${dateStr}`}
                    value={dayAssignment.tema || ''}
                    onChange={(e) => handleInputChange(dateStr, 'tema', e.target.value)}
                    placeholder="Digite o tema"
                  />
                </div>
                <div>
                  <Label htmlFor={`orador-${dateStr}`}>Orador</Label>
                  <Input
                    id={`orador-${dateStr}`}
                    value={dayAssignment.orador || ''}
                    onChange={(e) => handleInputChange(dateStr, 'orador', e.target.value)}
                    placeholder="Nome do orador"
                  />
                </div>
                <div>
                  <Label htmlFor={`congregacao-${dateStr}`}>Congregação do Orador (se visitante)</Label>
                  <Input
                    id={`congregacao-${dateStr}`}
                    value={dayAssignment.congregacaoOrador || ''}
                    onChange={(e) => handleInputChange(dateStr, 'congregacaoOrador', e.target.value)}
                    placeholder="Congregação (opcional)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Dirigente de A Sentinela</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex-grow p-2 border rounded-md bg-muted/50 min-h-[38px] text-sm flex items-center">
                      {getMemberName(dayAssignment.dirigenteId)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleOpenMemberSelection(dateStr, 'dirigente')}>
                      <UserPlus className="mr-1.5 h-4 w-4" /> {dayAssignment.dirigenteId ? 'Alterar' : 'Selecionar'}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Leitor de A Sentinela</Label>
                   <div className="flex items-center gap-2 mt-1">
                    <span className="flex-grow p-2 border rounded-md bg-muted/50 min-h-[38px] text-sm flex items-center">
                       {nomeLeitorDesignado}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleOpenLeitorSubstitution(dateStr, leitorDesignadoId)}>
                      <Edit3 className="mr-1.5 h-4 w-4" /> {leitorDesignadoId ? 'Alterar' : 'Designar'}
                    </Button>
                  </div>
                </div>
              </div>
              {index < sundaysInMonth.length - 1 && <Separator className="my-6" />}
            </div>
          );
        })}
        {sundaysInMonth.length > 0 && (
            <div className="mt-8 flex justify-end">
            <Button 
                variant="outline" 
                onClick={handleExportPublicMeetingPDF}
                disabled={sundaysInMonth.length === 0 || Object.keys(assignments).length === 0}
            >
                <FileText className="mr-2 h-4 w-4" />
                Exportar como PDF
            </Button>
            </div>
        )}
      </CardContent>

      {memberSelectionContext && (
        <MemberSelectionDialog
          isOpen={isMemberSelectionOpen}
          onOpenChange={setIsMemberSelectionOpen}
          allMembers={allMembers}
          targetRole={memberSelectionContext.role}
          currentDate={memberSelectionContext.dateStr}
          onSelectMember={handleSelectMember}
          currentlyAssignedMemberId={memberSelectionContext.currentMemberId}
          excludedMemberId={null}
        />
      )}
    </Card>
  );
}
