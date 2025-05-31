
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Settings } from 'lucide-react';
import type { ManagedListItem } from '@/lib/congregacao/types';
import { 
  carregarModalidades, 
  salvarModalidades, 
  carregarLocaisBase, 
  salvarLocaisBase 
} from '@/lib/congregacao/storage';
import { useToast } from "@/hooks/use-toast";

interface ManageFieldServiceListsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Callback for when lists are updated, so parent can refresh if needed
  onListsUpdated?: () => void; 
}

const generateListItemId = () => `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function ManageFieldServiceListsDialog({ 
  isOpen, 
  onOpenChange,
  onListsUpdated 
}: ManageFieldServiceListsDialogProps) {
  const [modalidades, setModalidades] = useState<ManagedListItem[]>([]);
  const [locaisBase, setLocaisBase] = useState<ManagedListItem[]>([]);
  const [newModalidadeName, setNewModalidadeName] = useState('');
  const [newLocalBaseName, setNewLocalBaseName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setModalidades(carregarModalidades());
      setLocaisBase(carregarLocaisBase());
    }
  }, [isOpen]);

  const handleAddItem = (
    listType: 'modalidade' | 'localBase', 
    name: string, 
    setList: React.Dispatch<React.SetStateAction<ManagedListItem[]>>,
    currentList: ManagedListItem[],
    saveFunction: (items: ManagedListItem[]) => void,
    setNewName: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!name.trim()) {
      toast({ title: "Nome Inválido", description: `O nome da ${listType} não pode ser vazio.`, variant: "default" });
      return;
    }
    if (currentList.some(item => item.name.toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: "Item Duplicado", description: `Esta ${listType} já existe.`, variant: "default" });
      return;
    }
    const newItem: ManagedListItem = { id: generateListItemId(), name: name.trim() };
    const updatedList = [...currentList, newItem].sort((a, b) => a.name.localeCompare(b.name));
    setList(updatedList);
    saveFunction(updatedList);
    setNewName('');
    toast({ title: `${listType.charAt(0).toUpperCase() + listType.slice(1)} Adicionada`, description: `"${name.trim()}" adicionada com sucesso.` });
    if (onListsUpdated) onListsUpdated();
  };

  const handleRemoveItem = (
    listType: 'modalidade' | 'localBase', 
    idToRemove: string,
    setList: React.Dispatch<React.SetStateAction<ManagedListItem[]>>,
    currentList: ManagedListItem[],
    saveFunction: (items: ManagedListItem[]) => void
  ) => {
    const itemToRemove = currentList.find(item => item.id === idToRemove);
    const updatedList = currentList.filter(item => item.id !== idToRemove);
    setList(updatedList);
    saveFunction(updatedList);
    toast({ title: `${listType.charAt(0).toUpperCase() + listType.slice(1)} Removida`, description: `"${itemToRemove?.name}" removida.`, variant: "destructive" });
    if (onListsUpdated) onListsUpdated();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Gerenciar Listas do Serviço de Campo
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova modalidades e locais base para os pontos de encontro do serviço de campo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto py-4 px-1">
          {/* Seção de Modalidades */}
          <div className="space-y-4 p-3 border rounded-lg shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-primary">Modalidades</h3>
            <div className="flex gap-2">
              <Input
                value={newModalidadeName}
                onChange={(e) => setNewModalidadeName(e.target.value)}
                placeholder="Nova modalidade (ex: TPL)"
                className="flex-1 h-9"
              />
              <Button 
                size="sm" 
                onClick={() => handleAddItem('modalidade', newModalidadeName, setModalidades, modalidades, salvarModalidades, setNewModalidadeName)}
                className="shrink-0 h-9"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Adicionar
              </Button>
            </div>
            <ScrollArea className="flex-1 h-48 rounded-md border">
              <div className="p-3 space-y-1.5">
                {modalidades.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhuma modalidade cadastrada.</p>}
                {modalidades.map(modalidade => (
                  <div key={modalidade.id} className="flex items-center justify-between text-sm p-1.5 bg-muted/30 rounded-md">
                    <span>{modalidade.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem('modalidade', modalidade.id, setModalidades, modalidades, salvarModalidades)}
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Seção de Locais Base */}
          <div className="space-y-4 p-3 border rounded-lg shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-primary">Locais Base</h3>
            <div className="flex gap-2">
              <Input
                value={newLocalBaseName}
                onChange={(e) => setNewLocalBaseName(e.target.value)}
                placeholder="Novo local (ex: Metrô Paraíso)"
                className="flex-1 h-9"
              />
              <Button 
                size="sm" 
                onClick={() => handleAddItem('localBase', newLocalBaseName, setLocaisBase, locaisBase, salvarLocaisBase, setNewLocalBaseName)}
                className="shrink-0 h-9"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Adicionar
              </Button>
            </div>
            <ScrollArea className="flex-1 h-48 rounded-md border">
              <div className="p-3 space-y-1.5">
                {locaisBase.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum local base cadastrado.</p>}
                {locaisBase.map(local => (
                  <div key={local.id} className="flex items-center justify-between text-sm p-1.5 bg-muted/30 rounded-md">
                    <span>{local.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem('localBase', local.id, setLocaisBase, locaisBase, salvarLocaisBase)}
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
