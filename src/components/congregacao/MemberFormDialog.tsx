
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
import { ptBR } from 'date-fns/locale';
import type { Membro, PermissaoBase } from '@/lib/congregacao/types';
import { PERMISSOES_BASE, NOMES_MESES } from '@/lib/congregacao/constants';
import { agruparPermissoes, formatarDataCompleta as formatarDataParaStorage } from '@/lib/congregacao/utils';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';

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
  impedimentos: [],
};

export function MemberFormDialog({ isOpen, onOpenChange, onSave, memberToEdit, onOpenAdvancedOptions }: MemberFormDialogProps) {
  const [memberData, setMemberData] = useState<Omit<Membro, 'id'> & { id?: string }>(initialMemberState);
  const [impedimentoDia, setImpedimentoDia] = useState<Date | undefined>();

  useEffect(() => {
    if (memberToEdit && isOpen) {
      const currentPermissoes = PERMISSOES_BASE.reduce((acc, p) => {
        acc[p.id] = memberToEdit.permissoesBase[p.id] || false;
        return acc;
      }, {} as Record<string, boolean>);
      
      setMemberData({ ...memberToEdit, permissoesBase: currentPermissoes });
    } else if (!isOpen) {
      // Reset form state when dialog closes, unless it was closed after opening for edit
      if (!memberToEdit) { 
        setMemberData(initialMemberState);
      }
      setImpedimentoDia(undefined); // Always reset impediment date picker
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
    if (!impedimentoDia) {
      alert("Por favor, selecione uma data para o impedimento.");
      return;
    }
    const impedimentoStr = formatarDataParaStorage(impedimentoDia); // "YYYY-MM-DD"
    if (!memberData.impedimentos.includes(impedimentoStr)) {
      setMemberData(prev => ({
        ...prev,
        impedimentos: [...prev.impedimentos, impedimentoStr].sort(),
      }));
    }
    setImpedimentoDia(undefined); // Reset picker after adding
  };

  const removerImpedimento = (impedimentoARemover: string) => {
    setMemberData(prev => ({
      ...prev,
      impedimentos: prev.impedimentos.filter(imp => imp !== impedimentoARemover),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!memberData.nome.trim()) {
      alert('O nome do membro é obrigatório.');
      return;
    }
    onSave(memberData as Membro); 
    onOpenChange(false);
  };

  const agrupamentosPermissoes = agruparPermissoes(PERMISSOES_BASE);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // If closing and not just opened for edit, reset fully
        if (!memberToEdit || (memberToEdit && !isOpen)) { 
          setMemberData(initialMemberState);
        }
        setImpedimentoDia(undefined);
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
              <div key={grupo} className="p-2 border rounded-md">
                <h4 className="font-semibold mb-2 text-foreground">{grupo}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-1">
                  {permissoes.map((p: PermissaoBase) => (
                    <div key={p.id} className="flex items-center space-x-1">
                      <Checkbox
                        id={`perm-${p.id}`}
                        checked={memberData.permissoesBase[p.id] || false}
                        onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                      />
                      <Label htmlFor={`perm-${p.id}`} className="font-normal text-sm">{p.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Impedimentos Temporários (Dias Específicos)</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1 min-w-[150px] sm:min-w-0">
                <Label htmlFor="impedimentoDataPicker">Data do Impedimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="impedimentoDataPicker"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !impedimentoDia && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {impedimentoDia ? format(impedimentoDia, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={impedimentoDia}
                      onSelect={setImpedimentoDia}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} // Disable past dates
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
                <ul className="list-disc list-inside pl-1 text-sm max-h-32 overflow-y-auto">
                  {memberData.impedimentos.map(imp => {
                      // imp is "YYYY-MM-DD"
                      const dateParts = imp.split('-').map(Number);
                      // Create date as UTC to avoid timezone shifts when only displaying
                      const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
                      return (
                          <li key={imp} className="flex justify-between items-center py-0.5">
                              <span>{format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                              <Button variant="ghost" size="sm" onClick={() => removerImpedimento(imp)} aria-label={`Remover impedimento ${imp}`}>
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
