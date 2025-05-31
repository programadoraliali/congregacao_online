
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AllFieldServiceAssignments, FieldServiceMeetingSlot, FieldServiceMonthlyData, ManagedListItem } from '@/lib/congregacao/types';
import { NOMES_MESES, NOMES_DIAS_SEMANA_COMPLETOS, FIELD_SERVICE_TIME_OPTIONS } from '@/lib/congregacao/constants';
import { formatarDataParaChave, formatarDataCompleta } from '@/lib/congregacao/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, PlusCircle, Trash2, Settings2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ManageFieldServiceListsDialog } from './ManageFieldServiceListsDialog';
import { carregarModalidades, carregarLocaisBase } from '@/lib/congregacao/storage';


interface FieldServiceAssignmentsCardProps {
  allFieldServiceAssignments: AllFieldServiceAssignments | null;
  initialMonth: number; // 0-11
  initialYear: number;
  onSaveFieldServiceAssignments: (
    updatedMonthAssignments: FieldServiceMonthlyData,
    month: number,
    year: number
  ) => void;
}

const generateSlotId = () => `slot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function FieldServiceAssignmentsCard({
  allFieldServiceAssignments,
  initialMonth,
  initialYear,
  onSaveFieldServiceAssignments,
}: FieldServiceAssignmentsCardProps) {
  const [displayMonth, setDisplayMonth] = useState<number>(initialMonth);
  const [displayYear, setDisplayYear] = useState<number>(initialYear);
  const [currentMonthData, setCurrentMonthData] = useState<FieldServiceMonthlyData>({});
  const { toast } = useToast();

  const [isManageListsDialogOpen, setIsManageListsDialogOpen] = useState(false);
  const [modalidadesList, setModalidadesList] = useState<ManagedListItem[]>([]);
  const [locaisBaseList, setLocaisBaseList] = useState<ManagedListItem[]>([]);

  const currentYearValue = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYearValue - 2 + i);

  const loadManagedLists = useCallback(() => {
    setModalidadesList(carregarModalidades());
    setLocaisBaseList(carregarLocaisBase());
  }, []);

  useEffect(() => {
    loadManagedLists();
  }, [loadManagedLists]);


  const generateMeetingDatesForSlot = useCallback((dayOfWeek: number, year: number, month: number) => {
    const dates = [];
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDayNum = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    for (let dayNum = 1; dayNum <= lastDayNum; dayNum++) {
      const currentDate = new Date(Date.UTC(year, month, dayNum));
      if (currentDate.getUTCDay() === dayOfWeek) {
        dates.push({
          specificDateKey: formatarDataCompleta(currentDate),
          leaderName: '',
          specialNote: '',
        });
      }
    }
    return dates;
  }, []);

  useEffect(() => {
    const yearMonthKey = formatarDataParaChave(new Date(displayYear, displayMonth, 1));
    const loadedMonthData = allFieldServiceAssignments?.[yearMonthKey] || {};
    
    const initializedMonthData: FieldServiceMonthlyData = {};
    for (let i = 0; i < 7; i++) { // 0 (Sun) to 6 (Sat)
        const dayOfWeekStr = i.toString();
        const existingDaySlots = loadedMonthData[dayOfWeekStr]?.slots || [];
        
        initializedMonthData[dayOfWeekStr] = {
            slots: existingDaySlots.map(slot => {
                const validModalityId = modalidadesList.some(m => m.id === slot.modalityId) ? slot.modalityId : null;
                const validBaseLocationId = locaisBaseList.some(l => l.id === slot.baseLocationId) ? slot.baseLocationId : null;

                return {
                    ...slot,
                    id: slot.id || generateSlotId(),
                    time: slot.time || (FIELD_SERVICE_TIME_OPTIONS.length > 0 ? FIELD_SERVICE_TIME_OPTIONS[0].value : '00:00'), 
                    modalityId: validModalityId,
                    baseLocationId: validBaseLocationId,
                    additionalDetails: slot.additionalDetails || '',
                    assignedDates: slot.assignedDates && slot.assignedDates.length > 0 
                                    ? slot.assignedDates 
                                    : generateMeetingDatesForSlot(i, displayYear, displayMonth)
                };
            })
        };
    }
    setCurrentMonthData(initializedMonthData);
  }, [displayMonth, displayYear, allFieldServiceAssignments, generateMeetingDatesForSlot, modalidadesList, locaisBaseList]);


  const handleAddSlot = (dayOfWeek: number) => {
    const dayOfWeekStr = dayOfWeek.toString();
    const newSlot: FieldServiceMeetingSlot = {
      id: generateSlotId(),
      time: FIELD_SERVICE_TIME_OPTIONS.length > 0 ? FIELD_SERVICE_TIME_OPTIONS[0].value : '00:00',
      modalityId: null,
      baseLocationId: null,
      additionalDetails: '',
      assignedDates: generateMeetingDatesForSlot(dayOfWeek, displayYear, displayMonth),
    };
    setCurrentMonthData(prev => ({
      ...prev,
      [dayOfWeekStr]: {
        slots: [...(prev[dayOfWeekStr]?.slots || []), newSlot],
      },
    }));
  };

  const handleRemoveSlot = (dayOfWeek: number, slotId: string) => {
    const dayOfWeekStr = dayOfWeek.toString();
    setCurrentMonthData(prev => ({
      ...prev,
      [dayOfWeekStr]: {
        slots: prev[dayOfWeekStr]?.slots.filter(slot => slot.id !== slotId) || [],
      },
    }));
  };

  const handleSlotInputChange = (
    dayOfWeek: number, 
    slotId: string, 
    field: keyof Pick<FieldServiceMeetingSlot, 'time' | 'modalityId' | 'baseLocationId' | 'additionalDetails'>, 
    value: string | null
    ) => {
    const dayOfWeekStr = dayOfWeek.toString();
    setCurrentMonthData(prev => ({
      ...prev,
      [dayOfWeekStr]: {
        slots: prev[dayOfWeekStr]?.slots.map(slot =>
          slot.id === slotId ? { ...slot, [field]: value === "" && (field === 'modalityId' || field === 'baseLocationId') ? null : value } : slot
        ) || [],
      },
    }));
  };

  const handleDateEntryInputChange = (
    dayOfWeek: number,
    slotId: string,
    specificDateKey: string,
    field: 'leaderName' | 'specialNote',
    value: string
  ) => {
    const dayOfWeekStr = dayOfWeek.toString();
    setCurrentMonthData(prev => ({
      ...prev,
      [dayOfWeekStr]: {
        slots: prev[dayOfWeekStr]?.slots.map(slot =>
          slot.id === slotId
            ? {
                ...slot,
                assignedDates: slot.assignedDates.map(dateEntry =>
                  dateEntry.specificDateKey === specificDateKey
                    ? { ...dateEntry, [field]: value }
                    : dateEntry
                ),
              }
            : slot
        ) || [],
      },
    }));
  };

  const handleSaveChanges = () => {
    onSaveFieldServiceAssignments(currentMonthData, displayMonth, displayYear);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardList className="mr-2 h-5 w-5 text-primary" /> Designações do Serviço de Campo
        </CardTitle>
        <CardDescription>
          Organize os pontos de encontro, horários e dirigentes para o serviço de campo de {NOMES_MESES[displayMonth]} de {displayYear}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
          <div className="flex-1">
            <Label htmlFor="selectFieldServiceMes">Mês</Label>
            <Select value={displayMonth.toString()} onValueChange={(val) => setDisplayMonth(parseInt(val))}>
              <SelectTrigger id="selectFieldServiceMes">
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
            <Label htmlFor="selectFieldServiceAno">Ano</Label>
            <Select value={displayYear.toString()} onValueChange={(val) => setDisplayYear(parseInt(val))}>
              <SelectTrigger id="selectFieldServiceAno">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {yearsForSelect.map(yearVal => (
                  <SelectItem key={yearVal} value={yearVal.toString()}>{yearVal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveChanges} className="w-full sm:w-auto whitespace-nowrap">
            Salvar Designações de Campo
          </Button>
           <Button 
            variant="outline" 
            onClick={() => setIsManageListsDialogOpen(true)} 
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Settings2 className="mr-2 h-4 w-4" /> Gerenciar Listas
          </Button>
        </div>

        {NOMES_DIAS_SEMANA_COMPLETOS.map((dayName, dayOfWeekIndex) => (
          <div key={dayOfWeekIndex} className="space-y-4 p-4 border rounded-lg shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-primary">{dayName}</h3>
              <Button variant="outline" size="sm" onClick={() => handleAddSlot(dayOfWeekIndex)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Ponto de Encontro
              </Button>
            </div>
            {(currentMonthData[dayOfWeekIndex.toString()]?.slots || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum ponto de encontro para {dayName.toLowerCase()}.</p>
            )}
            {(currentMonthData[dayOfWeekIndex.toString()]?.slots || []).map((slot, slotIndex) => (
              <Card key={slot.id} className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-md">Ponto de Encontro #{slotIndex + 1}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(dayOfWeekIndex, slot.id)} className="text-destructive h-7 w-7">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 pb-4 px-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`slot-time-${slot.id}`}>Horário</Label>
                      <Select
                        value={slot.time}
                        onValueChange={(value) => handleSlotInputChange(dayOfWeekIndex, slot.id, 'time', value)}
                      >
                        <SelectTrigger id={`slot-time-${slot.id}`} className="h-9">
                          <SelectValue placeholder="Horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_SERVICE_TIME_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`slot-modality-${slot.id}`}>Modalidade</Label>
                      <Select
                        value={slot.modalityId || ""}
                        onValueChange={(value) => handleSlotInputChange(dayOfWeekIndex, slot.id, 'modalityId', value)}
                      >
                        <SelectTrigger id={`slot-modality-${slot.id}`} className="h-9">
                          <SelectValue placeholder="Modalidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {modalidadesList.map(mod => (
                            <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`slot-baseLocation-${slot.id}`}>Local Base</Label>
                      <Select
                        value={slot.baseLocationId || ""}
                        onValueChange={(value) => handleSlotInputChange(dayOfWeekIndex, slot.id, 'baseLocationId', value)}
                      >
                        <SelectTrigger id={`slot-baseLocation-${slot.id}`} className="h-9">
                          <SelectValue placeholder="Local Base" />
                        </SelectTrigger>
                        <SelectContent>
                          {locaisBaseList.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`slot-details-${slot.id}`}>Grupos / Detalhes Adicionais</Label>
                    <Input
                      id={`slot-details-${slot.id}`}
                      value={slot.additionalDetails || ''} 
                      onChange={(e) => handleSlotInputChange(dayOfWeekIndex, slot.id, 'additionalDetails', e.target.value)}
                      placeholder="Ex: Grupos 1,2 ou 1º Sábado"
                      className="h-9"
                    />
                  </div>

                  {slot.assignedDates.length > 0 && <Separator className="my-3" />}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {slot.assignedDates.map((dateEntry) => {
                      const dateObj = new Date(dateEntry.specificDateKey + 'T00:00:00');
                      const formattedDate = `${dateObj.getUTCDate().toString().padStart(2, '0')}/${(dateObj.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                      return (
                        <div key={dateEntry.specificDateKey} className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-medium w-12 text-right pr-1">{formattedDate}:</span>
                          <Input
                            value={dateEntry.leaderName}
                            onChange={(e) => handleDateEntryInputChange(dayOfWeekIndex, slot.id, dateEntry.specificDateKey, 'leaderName', e.target.value)}
                            placeholder="Dirigente"
                            className="h-8"
                          />
                          <Input
                            value={dateEntry.specialNote}
                            onChange={(e) => handleDateEntryInputChange(dayOfWeekIndex, slot.id, dateEntry.specificDateKey, 'specialNote', e.target.value)}
                            placeholder="Observação (Ex: Congresso)"
                            className="h-8"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </CardContent>
      <ManageFieldServiceListsDialog 
        isOpen={isManageListsDialogOpen}
        onOpenChange={setIsManageListsDialogOpen}
        onListsUpdated={loadManagedLists}
      />
    </Card>
  );
}
    

    

    