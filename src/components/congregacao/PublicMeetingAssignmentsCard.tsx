
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Membro, PublicMeetingAssignment, AllPublicMeetingAssignments } from '@/lib/congregacao/types';
import { NOMES_MESES, DIAS_REUNIAO, NOMES_DIAS_SEMANA_ABREV } from '@/lib/congregacao/constants';
import { formatarDataCompleta, formatarDataParaChave, obterNomeMes } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, BookOpenText, Save } from 'lucide-react';
import { MemberSelectionDialog } from './MemberSelectionDialog';
import { useToast } from "@/hooks/use-toast";

interface PublicMeetingAssignmentsCardProps {
  allMembers: Membro[];
  allPublicAssignments: AllPublicMeetingAssignments | null;
  initialMonth: number; // 0-11
  initialYear: number;
  onSaveAssignments: (
    updatedMonthAssignments: { [dateStr: string]: PublicMeetingAssignment },
    month: number,
    year: number
  ) => void;
}

type EditableField = 'tema' | 'orador' | 'congregacaoOrador';
type MemberRole = 'dirigente' | 'leitor';

export function PublicMeetingAssignmentsCard({
  allMembers,
  allPublicAssignments,
  initialMonth,
  initialYear,
  onSaveAssignments,
}: PublicMeetingAssignmentsCardProps) {
  const [displayMonth, setDisplayMonth] = useState<number>(initialMonth);
  const [displayYear, setDisplayYear] = useState<number>(initialYear);
  const [assignments, setAssignments] = useState<{ [dateStr: string]: PublicMeetingAssignment }>({});
  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
  const [memberSelectionContext, setMemberSelectionContext] = useState<{
    dateStr: string;
    role: MemberRole;
    currentMemberId?: string | null;
  } | null>(null);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    if (allPublicAssignments) {
      const yearMonthKey = formatarDataParaChave(new Date(displayYear, displayMonth, 1));
      setAssignments(allPublicAssignments[yearMonthKey] || {});
    } else {
      setAssignments({});
    }
  }, [displayMonth, displayYear, allPublicAssignments]);

  const sundaysInMonth = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(Date.UTC(displayYear, displayMonth, 1));
    const lastDay = new Date(Date.UTC(displayYear, displayMonth + 1, 0));
    for (let day = new Date(firstDay); day <= lastDay; day.setUTCDate(day.getUTCDate() + 1)) {
      if (day.getUTCDay() === DIAS_REUNIAO.publica) { // Domingo
        dates.push(new Date(day));
      }
    }
    return dates;
  }, [displayMonth, displayYear]);

  const handleInputChange = (dateStr: string, field: EditableField, value: string) => {
    setAssignments(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [field]: value,
      },
    }));
  };

  const handleOpenMemberSelection = (dateStr: string, role: MemberRole) => {
    const currentAssignment = assignments[dateStr];
    const currentMemberId = role === 'dirigente' ? currentAssignment?.dirigenteId : currentAssignment?.leitorId;
    setMemberSelectionContext({ dateStr, role, currentMemberId });
    setIsMemberSelectionOpen(true);
  };

  const handleSelectMember = (selectedMemberId: string) => {
    if (memberSelectionContext) {
      const { dateStr, role } = memberSelectionContext;
      setAssignments(prev => ({
        ...prev,
        [dateStr]: {
          ...(prev[dateStr] || {}),
          [role === 'dirigente' ? 'dirigenteId' : 'leitorId']: selectedMemberId,
        },
      }));
    }
    setIsMemberSelectionOpen(false);
    setMemberSelectionContext(null);
  };

  const getMemberName = (memberId: string | null | undefined): string => {
    if (!memberId) return 'Nenhum selecionado';
    const member = allMembers.find(m => m.id === memberId);
    return member ? member.nome : 'Desconhecido';
  };
  
  const handleSaveChanges = () => {
    onSaveAssignments(assignments, displayMonth, displayYear);
    // O toast de sucesso já é dado em page.tsx
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpenText className="mr-2 h-5 w-5 text-primary" /> Designações da Reunião Pública
        </CardTitle>
        <CardDescription>
          Configure os temas, oradores e participantes para as reuniões públicas.
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
        </div>

        {sundaysInMonth.length === 0 && (
           <p className="text-muted-foreground text-center py-4">
            Não há domingos em {obterNomeMes(displayMonth)} de {displayYear}.
          </p>
        )}

        {sundaysInMonth.map((dateObj, index) => {
          const dateStr = formatarDataCompleta(dateObj);
          const dayAssignment = assignments[dateStr] || {};
          const dayAbrev = NOMES_DIAS_SEMANA_ABREV[dateObj.getUTCDay()];
          const formattedDateDisplay = `${dayAbrev} ${dateObj.getUTCDate()}/${(dateObj.getUTCMonth() + 1).toString().padStart(2, '0')}`;
          
          return (
            <div key={dateStr}>
              <h3 className="text-lg font-semibold text-primary mb-3">{formattedDateDisplay} - {obterNomeMes(displayMonth)} {displayYear}</h3>
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
                       {getMemberName(dayAssignment.leitorId)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleOpenMemberSelection(dateStr, 'leitor')}>
                      <UserPlus className="mr-1.5 h-4 w-4" /> {dayAssignment.leitorId ? 'Alterar' : 'Selecionar'}
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
            <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Designações da Reunião Pública
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
          excludedMemberId={
            memberSelectionContext.role === 'dirigente' 
            ? assignments[memberSelectionContext.dateStr]?.leitorId 
            : assignments[memberSelectionContext.dateStr]?.dirigenteId
          }
        />
      )}
    </Card>
  );
}

    