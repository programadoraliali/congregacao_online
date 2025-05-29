
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Membro, PermissaoBase } from '@/lib/congregacao/types';
import { PERMISSOES_BASE, NOMES_MESES } from '@/lib/congregacao/constants';
import { agruparPermissoes, formatarDataParaChave } from '@/lib/congregacao/utils';
import { PlusCircle, Trash2 } from 'lucide-react';

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
  const [impedimentoMes, setImpedimentoMes] = useState<string>(new Date().getMonth().toString());
  const [impedimentoAno, setImpedimentoAno] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (memberToEdit && isOpen) {
      // Ensure all base permissions are present, defaulting to false if not in memberToEdit
      const currentPermissoes = PERMISSOES_BASE.reduce((acc, p) => {
        acc[p.id] = memberToEdit.permissoesBase[p.id] || false;
        return acc;
      }, {} as Record<string, boolean>);
      
      setMemberData({ ...memberToEdit, permissoesBase: currentPermissoes });
    } else if (!isOpen) {
      // Only reset if not editing AND dialog is closing
      // This prevents data loss if dialog is closed then reopened for a new member while edit data was present
      if (!memberToEdit) {
        setMemberData(initialMemberState);
      }
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
    const ano = parseInt(impedimentoAno, 10);
    const mes = parseInt(impedimentoMes, 10);
    if (isNaN(ano) || isNaN(mes) || mes < 0 || mes > 11) {
      alert("Por favor, selecione um mês e ano válidos para o impedimento.");
      return;
    }
    const impedimentoStr = formatarDataParaChave(new Date(ano, mes)); // YYYY-MM
    if (!memberData.impedimentos.includes(impedimentoStr)) {
      setMemberData(prev => ({
        ...prev,
        impedimentos: [...prev.impedimentos, impedimentoStr].sort(),
      }));
    }
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
    onSave(memberData as Membro); // ID will be handled by parent or utils
    onOpenChange(false);
  };

  const agrupamentosPermissoes = agruparPermissoes(PERMISSOES_BASE);
  const currentYear = new Date().getFullYear();
  const yearsForSelect = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setMemberData(initialMemberState); // Reset on close
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{memberToEdit ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          {memberToEdit && <DialogDescription>Modifique os dados do membro.</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-grow min-h-0"> {/* Ensure ScrollArea can shrink and grow */}
          <form onSubmit={handleSubmit} id="member-form-dialog" className="space-y-6 py-4 pr-3"> {/* Added id for submit button */}
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
                <div key={grupo} className="p-2 border rounded-md"> {/* Reduced padding from p-3 */}
                  <h4 className="font-semibold mb-2 text-foreground">{grupo}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1"> {/* More columns on md, adjusted gap */}
                    {permissoes.map((p: PermissaoBase) => (
                      <div key={p.id} className="flex items-center space-x-1.5"> {/* Reduced space-x from 2 */}
                        <Checkbox
                          id={`perm-${p.id}`} // Ensure unique ID for checkbox
                          checked={memberData.permissoesBase[p.id] || false}
                          onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                        />
                        <Label htmlFor={`perm-${p.id}`} className="font-normal">{p.nome}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">Impedimentos Temporários (Mês Indisponível)</h3>
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label htmlFor="impedimentoMes">Mês</Label>
                  <Select value={impedimentoMes} onValueChange={setImpedimentoMes}>
                    <SelectTrigger id="impedimentoMes">
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
                  <Label htmlFor="impedimentoAno">Ano</Label>
                   <Select value={impedimentoAno} onValueChange={setImpedimentoAno}>
                    <SelectTrigger id="impedimentoAno">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsForSelect.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={adicionarImpedimento} className="shrink-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </div>
              {memberData.impedimentos.length > 0 && (
                <div className="space-y-1">
                  <Label>Impedimentos adicionados:</Label>
                  <ul className="list-disc list-inside pl-1 text-sm">
                    {memberData.impedimentos.map(imp => {
                        const [year, monthNum] = imp.split('-');
                        const monthName = NOMES_MESES[parseInt(monthNum,10)-1];
                        return (
                            <li key={imp} className="flex justify-between items-center">
                                <span>{monthName} de {year}</span>
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
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          {memberToEdit && (
            <Button variant="destructive" type="button" onClick={() => onOpenAdvancedOptions(memberToEdit.id)} className="mr-auto">
              Opções Avançadas
            </Button>
          )}
          <Button variant="outline" type="button" onClick={() => { onOpenChange(false); }}>Cancelar</Button>
          <Button type="submit" form="member-form-dialog" onClick={handleSubmit}>Salvar Membro</Button> {/* Matched form id */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

