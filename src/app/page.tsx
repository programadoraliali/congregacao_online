
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MemberManagementCard } from '@/components/congregacao/MemberManagementCard';
import { ScheduleGenerationCard } from '@/components/congregacao/ScheduleGenerationCard';
import { MemberFormDialog } from '@/components/congregacao/MemberFormDialog';
import { BulkAddDialog } from '@/components/congregacao/BulkAddDialog';
import { ConfirmClearDialog } from '@/components/congregacao/ConfirmClearDialog';
import { SubstitutionDialog } from '@/components/congregacao/SubstitutionDialog'; // Novo
import { CongregationIcon } from '@/components/icons/CongregationIcon';
import type { Membro, DesignacoesFeitas, SubstitutionDetails } from '@/lib/congregacao/types';
import { APP_NAME, NOMES_MESES } from '@/lib/congregacao/constants';
import { validarEstruturaMembro, gerarIdMembro } from '@/lib/congregacao/utils';
import { carregarMembrosLocalmente, salvarMembrosLocalmente, carregarCacheDesignacoes, salvarCacheDesignacoes, limparCacheDesignacoes } from '@/lib/congregacao/storage';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Trash2, History, UserCog } from 'lucide-react';


export default function Home() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [designacoesMensaisCache, setDesignacoesMensaisCache] = useState<DesignacoesFeitas | null>(null);
  const [cachedScheduleInfo, setCachedScheduleInfo] = useState<{mes: number, ano: number} | null>(null);

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Membro | null>(null);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [clearType, setClearType] = useState<'history' | 'all' | null>(null);
  const [memberIdForAdvancedOptions, setMemberIdForAdvancedOptions] = useState<string | null>(null);

  // Estado para o modal de substituição
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);
  const [substitutionDetails, setSubstitutionDetails] = useState<SubstitutionDetails | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setMembros(carregarMembrosLocalmente());
    const cachedData = carregarCacheDesignacoes(); 
    if (cachedData && typeof cachedData === 'object' && 'schedule' in cachedData && 'mes' in cachedData && 'ano' in cachedData) {
        setDesignacoesMensaisCache((cachedData as any).schedule);
        setCachedScheduleInfo({mes: (cachedData as any).mes, ano: (cachedData as any).ano});
    }
  }, []);

  const persistMembros = (novosMembros: Membro[]) => {
    const membrosOrdenados = novosMembros.sort((a, b) => a.nome.localeCompare(b.nome));
    setMembros(membrosOrdenados);
    salvarMembrosLocalmente(membrosOrdenados);
  };

  const handleSaveMember = (memberData: Membro) => {
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
  };
  
  const handleEditMember = (member: Membro) => {
    setMemberToEdit(member);
    setIsMemberFormOpen(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este membro?')) {
      const membro = membros.find(m => m.id === memberId);
      persistMembros(membros.filter(m => m.id !== memberId));
      toast({ title: "Membro Excluído", description: `Membro ${membro?.nome || ''} excluído com sucesso.` });
    }
  };

  const handleBulkAddMembers = (names: string[]) => {
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
  };

  const handleExportMembers = () => {
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
  };

  const handleImportMembers = (file: File) => {
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
        limparResultadoMensal(); 
        toast({ title: "Importado", description: `${membrosValidosImportados.length} membros importados com sucesso.` });
      } catch (err: any) {
        console.error("Erro ao importar membros:", err);
        toast({ title: "Erro de Importação", description: err.message || "Falha ao processar o arquivo JSON.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleScheduleGenerated = (designacoes: DesignacoesFeitas, mes: number, ano: number) => {
    setDesignacoesMensaisCache(designacoes);
    setCachedScheduleInfo({mes, ano});
    
    const novosMembros = [...membros].map(m => {
        const membroAtualizado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } }; 
        Object.entries(designacoes).forEach(([dataStr, funcoesDoDia]) => {
            const dataObj = new Date(dataStr + "T00:00:00");
            if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
                 Object.entries(funcoesDoDia).forEach(([funcaoId, membroId]) => {
                    if (membroId === m.id) {
                        membroAtualizado.historicoDesignacoes[dataStr] = funcaoId;
                    } else {
                        if (membroAtualizado.historicoDesignacoes[dataStr] === funcaoId) {
                           delete membroAtualizado.historicoDesignacoes[dataStr];
                        }
                    }
                });
            }
        });
        return membroAtualizado;
    });
    persistMembros(novosMembros);
    salvarCacheDesignacoes({schedule: designacoes, mes, ano}); // Passa o objeto completo
  };

  const limparResultadoMensal = () => {
    setDesignacoesMensaisCache(null);
    setCachedScheduleInfo(null);
    limparCacheDesignacoes();
  };

  const handleOpenAdvancedOptions = (memberId: string | null) => {
    setMemberIdForAdvancedOptions(memberId);
    setIsMemberFormOpen(false); 
    setIsConfirmClearOpen(true);
  };
  
  const handleClearHistory = () => {
    if (memberIdForAdvancedOptions) { 
        const membro = membros.find(m => m.id === memberIdForAdvancedOptions);
        if (membro) {
            const membrosAtualizados = membros.map(m => 
                m.id === memberIdForAdvancedOptions ? { ...m, historicoDesignacoes: {} } : m
            );
            persistMembros(membrosAtualizados);
            toast({ title: "Histórico Limpo", description: `Histórico de ${membro.nome} foi limpo.` });
        }
    } else { 
        const membrosAtualizados = membros.map(m => ({ ...m, historicoDesignacoes: {} }));
        persistMembros(membrosAtualizados);
        toast({ title: "Histórico Limpo", description: "Histórico de todos os membros foi limpo." });
    }
    setMemberIdForAdvancedOptions(null);
  };

  const handleClearAllData = () => {
    persistMembros([]);
    limparResultadoMensal();
    toast({ title: "Todos os Dados Limpos", description: "Todos os dados da aplicação foram removidos.", variant: "destructive" });
  };

  // Funções para o modal de substituição
  const handleOpenSubstitutionModal = (details: SubstitutionDetails) => {
    setSubstitutionDetails(details);
    setIsSubstitutionModalOpen(true);
  };

  const handleConfirmSubstitution = (newMemberId: string) => {
    if (!substitutionDetails || !designacoesMensaisCache || cachedScheduleInfo === null) {
      toast({ title: "Erro", description: "Não foi possível processar a substituição. Dados ausentes.", variant: "destructive" });
      return;
    }

    const { date, functionId, originalMemberId } = substitutionDetails;
    const { mes, ano } = cachedScheduleInfo;

    // 1. Atualizar designacoesMensaisCache
    const novasDesignacoes = JSON.parse(JSON.stringify(designacoesMensaisCache)) as DesignacoesFeitas;
    if (novasDesignacoes[date]) {
      novasDesignacoes[date][functionId] = newMemberId;
    } else {
      novasDesignacoes[date] = { [functionId]: newMemberId };
    }
    setDesignacoesMensaisCache(novasDesignacoes);

    // 2. Atualizar histórico dos membros
    const membrosAtualizados = membros.map(m => {
      const membroModificado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } };
      if (m.id === originalMemberId) {
        // Se o membro original tinha esta designação no histórico, remover/alterar.
        // No contexto de substituição, assumimos que ele estava designado, então removemos.
        // Se ele não estivesse (o que seria estranho), nada acontece aqui.
        if (membroModificado.historicoDesignacoes[date] === functionId) {
             delete membroModificado.historicoDesignacoes[date];
        }
      }
      if (m.id === newMemberId) {
        membroModificado.historicoDesignacoes[date] = functionId;
      }
      return membroModificado;
    });
    persistMembros(membrosAtualizados);

    // 3. Salvar o cache de designações atualizado
    salvarCacheDesignacoes({schedule: novasDesignacoes, mes, ano});

    toast({ title: "Substituição Realizada", description: "A designação foi atualizada com sucesso." });
    setIsSubstitutionModalOpen(false);
    setSubstitutionDetails(null);
  };


  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <CongregationIcon className="mr-3 h-10 w-10" />
          {APP_NAME}
        </h1>
        <p className="text-muted-foreground">Sistema de Designações Mensais da Congregação</p>
      </header>

      <main className="flex-grow space-y-6">
        <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-xl font-semibold py-4 px-6 bg-card rounded-t-lg hover:bg-secondary transition-colors data-[state=open]:border-b">
                Gerenciar Membros
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0 rounded-b-lg">
              <MemberManagementCard
                members={membros}
                onAddMember={() => { setMemberToEdit(null); setIsMemberFormOpen(true); }}
                onEditMember={handleEditMember}
                onDeleteMember={handleDeleteMember}
                onBulkAdd={() => setIsBulkAddOpen(true)}
                onExportMembers={handleExportMembers}
                onImportMembers={handleImportMembers}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-xl font-semibold py-4 px-6 bg-card rounded-t-lg hover:bg-secondary transition-colors data-[state=open]:border-b">
                 Gerar Designações
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0 rounded-b-lg">
              <ScheduleGenerationCard 
                membros={membros} 
                onScheduleGenerated={handleScheduleGenerated}
                currentSchedule={designacoesMensaisCache}
                currentMes={cachedScheduleInfo?.mes ?? null}
                currentAno={cachedScheduleInfo?.ano ?? null}
                onOpenSubstitutionModal={handleOpenSubstitutionModal} // Passa a função
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <Card>
            <CardHeader>
                <CardTitle>Opções de Limpeza de Dados</CardTitle>
                <CardDescription>Use com cuidado. Estas ações são irreversíveis.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => { setClearType('history'); handleOpenAdvancedOptions(null);}}>
                    <History className="mr-2 h-4 w-4" /> Limpar Histórico de Todos
                </Button>
                <Button variant="destructive" onClick={() => { setClearType('all'); handleOpenAdvancedOptions(null);}}>
                    <Trash2 className="mr-2 h-4 w-4" /> Limpar TODOS os Dados
                </Button>
            </CardContent>
        </Card>

      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground py-4 border-t">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. Desenvolvido com Next.js e Tailwind CSS.</p>
      </footer>

      <MemberFormDialog
        isOpen={isMemberFormOpen}
        onOpenChange={setIsMemberFormOpen}
        onSave={handleSaveMember}
        memberToEdit={memberToEdit}
        onOpenAdvancedOptions={(memberId) => { setClearType('history'); handleOpenAdvancedOptions(memberId);}}
      />
      <BulkAddDialog
        isOpen={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        onSaveBulk={handleBulkAddMembers}
      />
      <ConfirmClearDialog
        isOpen={isConfirmClearOpen}
        onOpenChange={setIsConfirmClearOpen}
        onClearHistory={handleClearHistory}
        onClearAllData={handleClearAllData}
        clearType={clearType}
        targetMemberName={memberIdForAdvancedOptions ? membros.find(m=>m.id === memberIdForAdvancedOptions)?.nome : null}
      />
       {isSubstitutionModalOpen && substitutionDetails && designacoesMensaisCache && (
        <SubstitutionDialog
          isOpen={isSubstitutionModalOpen}
          onOpenChange={setIsSubstitutionModalOpen}
          substitutionDetails={substitutionDetails}
          allMembers={membros}
          currentAssignmentsForMonth={designacoesMensaisCache}
          onConfirmSubstitution={handleConfirmSubstitution}
        />
      )}
    </div>
  );
}
