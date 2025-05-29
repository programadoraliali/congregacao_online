
'use client';

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { ptBR } from 'date-fns/locale';
import type { Membro, PermissaoBase, Impedimento } from '@/lib/congregacao/types';
import { PERMISSOES_BASE } from '@/lib/congregacao/constants';
import { agruparPermissoes, formatarDataCompleta as formatarDataParaStorage } from '@/lib/congregacao/utils';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface MemberFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (member: Membro) => void;
  memberToEdit?: Membro | null;
  onOpenAdvancedOptions: (memberId: string | null) => void;
}

const initialMemberState: Omit<Membro, 'id'> = {
  nome: '',
  permissoesBase: PERMISSOES_BASE.reduce((acc, p) => ({ ...acc, [p.id]: false }), {}),
  historicoDesignacoes: {},
  impedimentos: [], // Agora é Array<Impedimento>
};

export function MemberFormDialog({ isOpen, onOpenChange, onSave, memberToEdit, onOpenAdvancedOptions }: MemberFormDialogProps) {
  const [memberData, setMemberData] = useState<Omit<Membro, 'id'> & { id?: string }>(initialMemberState);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    if (memberToEdit && isOpen) {
      const currentPermissoes = PERMISSOES_BASE.reduce((acc, p) => {
        acc[p.id] = memberToEdit.permissoesBase[p.id] || false;
        return acc;
      }, {} as Record<string, boolean>);
      
      // Garante que impedimentos sejam deep copied e ordenados
      const impedimentosOrdenados = memberToEdit.impedimentos 
        ? [...memberToEdit.impedimentos].sort((a, b) => a.from.localeCompare(b.from))
        : [];

      setMemberData({ ...memberToEdit, permissoesBase: currentPermissoes, impedimentos: impedimentosOrdenados });
    } else if (!isOpen) {
      // Resetar apenas se não estiver editando ou se a dialog não estava aberta antes para o membro atual
      if (!memberToEdit || (memberToEdit && !isOpen)) {
         setMemberData(initialMemberState);
      }
      setSelectedDateRange(undefined); 
    }
  }, [memberToEdit, isOpen]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMemberData({ ...memberData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setMemberData(prev => ({
      ...prev,
      permissoesBase: { ...prev.permissoesBase, [permissionId]: checked },
    }));
  };

  const toggleTodasPermissoes = (marcar: boolean) => {
    const novasPermissoes = Object.keys(memberData.permissoesBase).reduce((acc, key) => {
      acc[key] = marcar;
      return acc;
    }, {} as Record<string, boolean>);
    setMemberData(prev => ({ ...prev, permissoesBase: novasPermissoes }));
  };
  
 const adicionarImpedimento = () => {
    if (!selectedDateRange?.from) {
      toast({ title: "Atenção", description: "Por favor, selecione uma data ou intervalo para o impedimento.", variant: "default" });
      return;
    }

    const { from, to } = selectedDateRange;
    const fromDateStr = formatarDataParaStorage(from);
    const toDateStr = to ? formatarDataParaStorage(to) : fromDateStr;

    const novoImpedimento: Impedimento = {
      from: fromDateStr <= toDateStr ? fromDateStr : toDateStr, // Garante from <= to
      to: fromDateStr <= toDateStr ? toDateStr : fromDateStr,
    };

    if (memberData.impedimentos.some(imp => imp.from === novoImpedimento.from && imp.to === novoImpedimento.to)) {
      toast({ title: "Aviso", description: "Este período de impedimento já foi adicionado.", variant: "default" });
      setSelectedDateRange(undefined);
      return;
    }

    setMemberData(prev => {
      const novosImpedimentos = [...prev.impedimentos, novoImpedimento];
      novosImpedimentos.sort((a, b) => a.from.localeCompare(b.from)); // Ordena pela data de início
      return { ...prev, impedimentos: novosImpedimentos };
    });
    setSelectedDateRange(undefined); // Reset picker after adding
  };

  const removerImpedimento = (indexToRemove: number) => {
    setMemberData(prev => ({
      ...prev,
      impedimentos: prev.impedimentos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!memberData.nome.trim()) {
      toast({ title: "Erro", description: "O nome do membro é obrigatório.", variant: "destructive"});
      return;
    }
    onSave(memberData as Membro); 
    onOpenChange(false);
  };

  const agrupamentosPermissoes = agruparPermissoes(PERMISSOES_BASE);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (!memberToEdit || (memberToEdit && !isOpen)) { 
          setMemberData(initialMemberState);
        }
        setSelectedDateRange(undefined);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{memberToEdit ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          {memberToEdit && <DialogDescription>Modifique os dados do membro.</DialogDescription>}
        </DialogHeader>
        <form 
          onSubmit={handleSubmit} 
          id="member-form-dialog" 
          className="flex-1 min-h-0 overflow-y-auto space-y-6 py-4 px-2 sm:px-4"
        >
          <div>
            <Label htmlFor="nomeMembro">Nome do Membro</Label>
            <Input id="nomeMembro" name="nome" value={memberData.nome} onChange={handleInputChange} required />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Permissões Base</h3>
            <div className="flex space-x-2 mb-2">
              <Button type="button" variant="outline" size="sm" onClick={() => toggleTodasPermissoes(true)}>Marcar Todas</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => toggleTodasPermissoes(false)}>Desmarcar Todas</Button>
            </div>
            {Object.entries(agrupamentosPermissoes).map(([grupo, permissoes]) => (
              <div key={grupo} className="p-3 border rounded-md space-y-1">
                <h4 className="font-semibold mb-2 text-foreground">{grupo}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5">
                  {permissoes.map((p: PermissaoBase) => (
                    <div key={p.id} className="flex items-center space-x-1.5">
                      <Checkbox
                        id={`perm-${p.id}`}
                        checked={memberData.permissoesBase[p.id] || false}
                        onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                      />
                      <Label htmlFor={`perm-${p.id}`} className="font-normal text-sm cursor-pointer">{p.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Impedimentos Temporários (Dias ou Intervalos)</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1 min-w-[150px] sm:min-w-0">
                <Label htmlFor="impedimentoDataPicker">Data ou Intervalo do Impedimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="impedimentoDataPicker"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDateRange?.from ? (
                        selectedDateRange.to ? (
                          <>
                            {format(selectedDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                            {format(selectedDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(selectedDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione uma data ou intervalo</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={selectedDateRange}
                      onSelect={setSelectedDateRange}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button type="button" variant="outline" onClick={adicionarImpedimento} className="shrink-0 mt-2 sm:mt-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
            {memberData.impedimentos.length > 0 && (
              <div className="space-y-1 pt-2">
                <Label>Impedimentos adicionados:</Label>
                <ul className="list-disc list-inside pl-1 text-sm max-h-32 overflow-y-auto border rounded-md p-2">
                  {memberData.impedimentos.map((imp, index) => {
                      const fromDateParts = imp.from.split('-').map(Number);
                      const fromDateObj = new Date(Date.UTC(fromDateParts[0], fromDateParts[1] - 1, fromDateParts[2]));
                      const toDateParts = imp.to.split('-').map(Number);
                      const toDateObj = new Date(Date.UTC(toDateParts[0], toDateParts[1] - 1, toDateParts[2]));

                      let displayText;
                      if (imp.from === imp.to) {
                        displayText = format(fromDateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                      } else {
                        displayText = `${format(fromDateObj, "dd/MM/yy", { locale: ptBR })} - ${format(toDateObj, "dd/MM/yy", { locale: ptBR })}`;
                      }
                      return (
                          <li key={`${imp.from}-${imp.to}-${index}`} className="flex justify-between items-center py-0.5">
                              <span>{displayText}</span>
                              <Button variant="ghost" size="sm" onClick={() => removerImpedimento(index)} aria-label={`Remover impedimento ${displayText}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </li>
                      );
                  })}
                </ul>
              </div>
            )}
          </div>
        </form>
        <DialogFooter className="pt-4 border-t">
          {memberToEdit && (
            <Button variant="destructive" type="button" onClick={() => onOpenAdvancedOptions(memberToEdit.id)} className="mr-auto">
              Opções Avançadas
            </Button>
          )}
          <Button variant="outline" type="button" onClick={() => { onOpenChange(false); }}>Cancelar</Button>
          <Button type="submit" form="member-form-dialog">Salvar Membro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
