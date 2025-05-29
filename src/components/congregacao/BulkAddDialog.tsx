
'use client';

import React, { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";

interface BulkAddDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveBulk: (names: string[]) => void;
}

export function BulkAddDialog({ isOpen, onOpenChange, onSaveBulk }: BulkAddDialogProps) {
  const [namesText, setNamesText] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const names = namesText
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
      
    if (names.length > 0) {
      onSaveBulk(names);
      setNamesText(''); // Clear textarea after save
      onOpenChange(false);
    } else {
      toast({
        title: "Nenhum nome válido",
        description: "Por favor, insira pelo menos um nome separado por vírgula.",
        variant: "default",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membros em Massa</DialogTitle>
          <DialogDescription>
            Insira os nomes dos membros separados por vírgula. 
            Membros com nomes duplicados (já existentes ou na lista) não serão adicionados.
            Novos membros são adicionados sem permissões.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="bulk-add-form" className="py-4 space-y-4">
          <div>
            <Label htmlFor="bulkNames">Nomes dos Membros (separados por vírgula)</Label>
            <Textarea
              id="bulkNames"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              rows={6}
              placeholder="João Silva,Maria Oliveira,Pedro Santos"
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="bulk-add-form">Salvar em Massa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
