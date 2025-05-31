
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Membro } from '@/lib/congregacao/types';
import { 
  carregarMembrosLocalmente, 
  salvarMembrosLocalmente,
  limparCacheDesignacoes,
  limparPublicMeetingAssignments,
  limparNVMCAssignments,
  limparFieldServiceAssignments
} from '@/lib/congregacao/storage';
import { validarEstruturaMembro, gerarIdMembro } from '@/lib/congregacao/utils';
import { useToast } from "@/hooks/use-toast";

export function useMemberManagement() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Membro | null>(null);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMembros(carregarMembrosLocalmente());
  }, []);

  const persistMembros = useCallback((novosMembros: Membro[]) => {
    const membrosOrdenados = novosMembros.sort((a, b) => a.nome.localeCompare(b.nome));
    setMembros(membrosOrdenados);
    salvarMembrosLocalmente(membrosOrdenados);
  }, []);

  const openNewMemberForm = () => {
    setMemberToEdit(null);
    setIsMemberFormOpen(true);
  };

  const openEditMemberForm = (member: Membro) => {
    setMemberToEdit(member);
    setIsMemberFormOpen(true);
  };

  const handleSaveMember = useCallback((memberData: Membro) => {
    let novosMembros;
    const membroExistentePeloNome = membros.find(m => m.nome.toLowerCase() === memberData.nome.toLowerCase() && m.id !== memberData.id);
    if (membroExistentePeloNome) {
        toast({ title: "Erro", description: `Já existe um membro com o nome '${memberData.nome}'.`, variant: "destructive" });
        return;
    }

    if (memberData.id) {
      novosMembros = membros.map(m => m.id === memberData.id ? validarEstruturaMembro(memberData, false) : m);
    } else {
      const novoMembro = validarEstruturaMembro({ ...memberData, id: gerarIdMembro() }, false);
      if(novoMembro) novosMembros = [...membros, novoMembro];
      else {
        toast({ title: "Erro", description: "Não foi possível criar o membro.", variant: "destructive" });
        return;
      }
    }
    persistMembros(novosMembros.filter(Boolean) as Membro[]);
    toast({ title: "Sucesso", description: `Membro ${memberData.id ? 'atualizado' : 'adicionado'} com sucesso.` });
    setIsMemberFormOpen(false);
    setMemberToEdit(null);
  }, [membros, persistMembros, toast]);

  const handleDeleteMember = useCallback((memberId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este membro?')) {
      const membro = membros.find(m => m.id === memberId);
      persistMembros(membros.filter(m => m.id !== memberId));
      toast({ title: "Membro Excluído", description: `Membro ${membro?.nome || ''} excluído com sucesso.` });
    }
  }, [membros, persistMembros, toast]);

  const handleBulkAddMembers = useCallback((names: string[]) => {
    const nomesExistentes = new Set(membros.map(m => m.nome.toLowerCase()));
    let adicionadosCount = 0;
    const novosMembrosParaAdicionar: Membro[] = [];

    names.forEach(nome => {
      if (nome.trim() && !nomesExistentes.has(nome.toLowerCase())) {
        const novoMembro = validarEstruturaMembro({ nome, permissoesBase: {}, historicoDesignacoes: {}, impedimentos: [] }, true);
        if (novoMembro) {
          novosMembrosParaAdicionar.push(novoMembro);
          nomesExistentes.add(nome.toLowerCase());
          adicionadosCount++;
        }
      }
    });
    persistMembros([...membros, ...novosMembrosParaAdicionar]);
    toast({ title: "Membros Adicionados", description: `${adicionadosCount} membros adicionados em massa.` });
    setIsBulkAddOpen(false);
  }, [membros, persistMembros, toast]);

  const handleExportMembers = useCallback(() => {
    if (membros.length === 0) {
        toast({ title: "Sem Dados", description: "Nenhum membro para exportar.", variant: "default" });
        return;
    }
    const jsonData = JSON.stringify(membros, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `membros_congregacao_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "Dados dos membros exportados." });
  }, [membros, toast]);

  const handleImportMembers = useCallback((file: File, onImportSuccessCallback: () => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedData)) {
          throw new Error("O arquivo JSON não é um array válido.");
        }

        if (membros.length > 0 && !window.confirm("Isso substituirá todos os dados de membros existentes. Deseja continuar?")) {
            return;
        }

        const nomesUnicosNoArquivo = new Set<string>();
        const membrosValidosImportados = importedData.map(obj => {
            const membroValidado = validarEstruturaMembro(obj, true);
            if (membroValidado && !nomesUnicosNoArquivo.has(membroValidado.nome.toLowerCase())) {
                nomesUnicosNoArquivo.add(membroValidado.nome.toLowerCase());
                return membroValidado;
            }
            if(membroValidado) console.warn(`Membro duplicado no arquivo ou inválido: ${obj.nome}, pulando.`);
            return null;
        }).filter(Boolean) as Membro[];

        persistMembros(membrosValidosImportados);
        
        // Limpa apenas os caches de storage, o callback cuidará do estado da UI
        limparCacheDesignacoes(); 
        limparPublicMeetingAssignments(); 
        limparNVMCAssignments(); 
        limparFieldServiceAssignments();

        onImportSuccessCallback(); // Callback para page.tsx limpar seus estados de UI
        
        toast({ title: "Importado", description: `${membrosValidosImportados.length} membros importados com sucesso.` });
      } catch (err: any) {
        console.error("Erro ao importar membros:", err);
        toast({ title: "Erro de Importação", description: err.message || "Falha ao processar o arquivo JSON.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }, [membros, persistMembros, toast]);
  
  const updateMemberHistory = useCallback((updatedMembers: Membro[]) => {
    persistMembros(updatedMembers);
  }, [persistMembros]);


  return {
    membros,
    isMemberFormOpen,
    setIsMemberFormOpen,
    memberToEdit,
    setMemberToEdit,
    isBulkAddOpen,
    setIsBulkAddOpen,
    openNewMemberForm,
    openEditMemberForm,
    handleSaveMember,
    handleDeleteMember,
    handleBulkAddMembers,
    handleExportMembers,
    handleImportMembers,
    updateMemberHistory, // Exportar para que page.tsx possa atualizar o histórico
    persistMembros, // Exportar para que page.tsx possa limpar histórico de todos
  };
}
