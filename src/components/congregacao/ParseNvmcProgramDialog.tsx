
'use client';

import React, { useState } from 'react';
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
import { FileText } from 'lucide-react';

interface ParseNvmcProgramDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onParseText: (text: string) => void;
  currentMeetingDate: string; // YYYY-MM-DD format for display
}

export function ParseNvmcProgramDialog({ 
  isOpen, 
  onOpenChange, 
  onParseText,
  currentMeetingDate 
}: ParseNvmcProgramDialogProps) {
  const [programText, setProgramText] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (programText.trim() === '') {
      toast({
        title: "Texto Vazio",
        description: "Por favor, cole o texto do programa da semana.",
        variant: "default",
      });
      return;
    }
    onParseText(programText);
    onOpenChange(false);
    setProgramText(''); // Clear textarea after processing
  };

  const formattedDate = new Date(currentMeetingDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Importar Programa NVMC para {formattedDate}
          </DialogTitle>
          <DialogDescription>
            Cole o texto completo do programa da reunião de meio de semana (NVMC) abaixo. 
            O sistema tentará extrair os títulos das partes. Os campos "Sua resposta" serão ignorados.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="nvmcProgramText">Texto do Programa Semanal</Label>
          <Textarea
            id="nvmcProgramText"
            value={programText}
            onChange={(e) => setProgramText(e.target.value)}
            rows={15}
            placeholder="Cole o texto do programa da semana aqui..."
            className="text-xs leading-relaxed"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setProgramText('');}}>Cancelar</Button>
          <Button onClick={handleSubmit}>Processar Texto e Preencher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
