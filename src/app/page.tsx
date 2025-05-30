
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MemberManagementCard } from '@/components/congregacao/MemberManagementCard';
import { ScheduleGenerationCard } from '@/components/congregacao/ScheduleGenerationCard';
import { PublicMeetingAssignmentsCard } from '@/components/congregacao/PublicMeetingAssignmentsCard';
import { NvmcAssignmentsCard } from '@/components/congregacao/NvmcAssignmentsCard'; // Novo
import { MemberFormDialog } from '@/components/congregacao/MemberFormDialog';
import { BulkAddDialog } from '@/components/congregacao/BulkAddDialog';
import { ConfirmClearDialog } from '@/components/congregacao/ConfirmClearDialog';
import { SubstitutionDialog } from '@/components/congregacao/SubstitutionDialog';
import { CongregationIcon } from '@/components/icons/CongregationIcon';
import type { Membro, DesignacoesFeitas, SubstitutionDetails, AllPublicMeetingAssignments, PublicMeetingAssignment, AllNVMCAssignments, NVMCDailyAssignments } from '@/lib/congregacao/types'; // Novo
import { APP_NAME, NOMES_MESES } from '@/lib/congregacao/constants';
import { validarEstruturaMembro, gerarIdMembro, formatarDataParaChave } from '@/lib/congregacao/utils';
import { 
  carregarMembrosLocalmente, 
  salvarMembrosLocalmente, 
  carregarCacheDesignacoes, 
  salvarCacheDesignacoes, 
  limparCacheDesignacoes,
  carregarPublicMeetingAssignments,
  salvarPublicMeetingAssignments,
  limparPublicMeetingAssignments,
  carregarNVMCAssignments, // Novo
  salvarNVMCAssignments,   // Novo
  limparNVMCAssignments    // Novo
} from '@/lib/congregacao/storage';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, History, Users, Settings2, ListChecks, BookUser, BookOpen } from 'lucide-react'; // Corrigido


export default function Home() {
  const [membros, setMembros] = useState<Membro[]>([]);
  // Cache para a primeira aba (Indicadores/Volantes)
  const [designacoesMensaisCache, setDesignacoesMensaisCache] = useState<DesignacoesFeitas | null>(null);
  const [cachedScheduleInfo, setCachedScheduleInfo] = useState<{mes: number, ano: number} | null>(null);
  // Cache para a segunda aba (Reunião Pública)
  const [allPublicMeetingAssignmentsData, setAllPublicMeetingAssignmentsData] = useState<AllPublicMeetingAssignments | null>(null);
  // Cache para a terceira aba (NVMC)
  const [allNvmcAssignmentsData, setAllNvmcAssignmentsData] = useState<AllNVMCAssignments | null>(null);


  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Membro | null>(null);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [clearType, setClearType] = useState<'history' | 'all' | 'public_meeting' | 'nvmc' | null>(null); // Novo
  const [memberIdForAdvancedOptions, setMemberIdForAdvancedOptions] = useState<string | null>(null);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);
  const [substitutionDetails, setSubstitutionDetails] = useState<SubstitutionDetails | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setMembros(carregarMembrosLocalmente());
    const cachedScheduleObject = carregarCacheDesignacoes();
    if (cachedScheduleObject) {
        setDesignacoesMensaisCache(cachedScheduleObject.schedule);
        setCachedScheduleInfo({ mes: cachedScheduleObject.mes, ano: cachedScheduleObject.ano });
    }
    setAllPublicMeetingAssignmentsData(carregarPublicMeetingAssignments());
    setAllNvmcAssignmentsData(carregarNVMCAssignments()); // Novo
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
        limparCacheDesignacoesPrimeiraAba(); 
        limparCacheDesignacoesPublicMeeting(); 
        limparCacheNVMCAssignments(); // Novo
        toast({ title: "Importado", description: `${membrosValidosImportados.length} membros importados com sucesso.` });
      } catch (err: any) {
        console.error("Erro ao importar membros:", err);
        toast({ title: "Erro de Importação", description: err.message || "Falha ao processar o arquivo JSON.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  // Para a primeira aba (Indicadores/Volantes)
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
    salvarCacheDesignacoes({schedule: designacoes, mes, ano});
  };
  
  const limparCacheDesignacoesPrimeiraAba = () => {
    setDesignacoesMensaisCache(null);
    setCachedScheduleInfo(null);
    limparCacheDesignacoes();
  };

  // Para a segunda aba (Reunião Pública)
  const handleSavePublicMeetingAssignments = (
    monthAssignments: { [dateStr: string]: PublicMeetingAssignment },
    mes: number,
    ano: number
  ) => {
    const yearMonthKey = formatarDataParaChave(new Date(ano, mes, 1));
    const updatedAllAssignments = {
      ...(allPublicMeetingAssignmentsData || {}),
      [yearMonthKey]: monthAssignments,
    };
    setAllPublicMeetingAssignmentsData(updatedAllAssignments);
    salvarPublicMeetingAssignments(updatedAllAssignments);
    toast({ title: "Sucesso", description: "Designações da Reunião Pública salvas." });
  };

  const limparCacheDesignacoesPublicMeeting = () => {
    setAllPublicMeetingAssignmentsData(null);
    limparPublicMeetingAssignments();
  };

  // Para a terceira aba (NVMC) - Novo
  const handleSaveNvmcAssignments = (
    monthAssignments: { [dateStr: string]: NVMCDailyAssignments },
    mes: number,
    ano: number
  ) => {
    const yearMonthKey = formatarDataParaChave(new Date(ano, mes, 1));
    const updatedAllAssignments = {
      ...(allNvmcAssignmentsData || {}),
      [yearMonthKey]: monthAssignments,
    };
    setAllNvmcAssignmentsData(updatedAllAssignments);
    salvarNVMCAssignments(updatedAllAssignments);
    toast({ title: "Sucesso", description: "Designações NVMC salvas." });
  };

  const limparCacheNVMCAssignments = () => {
    setAllNvmcAssignmentsData(null);
    limparNVMCAssignments();
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
    limparCacheDesignacoesPrimeiraAba();
    limparCacheDesignacoesPublicMeeting();
    limparCacheNVMCAssignments(); // Novo
    toast({ title: "Todos os Dados Limpos", description: "Todos os dados da aplicação foram removidos.", variant: "destructive" });
  };

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

    const novasDesignacoes = JSON.parse(JSON.stringify(designacoesMensaisCache)) as DesignacoesFeitas;
    if (novasDesignacoes[date]) {
      novasDesignacoes[date][functionId] = newMemberId;
    } else {
      novasDesignacoes[date] = { [functionId]: newMemberId };
    }

    setDesignacoesMensaisCache(novasDesignacoes);

    const membrosAtualizados = membros.map(m => {
      const membroModificado = { ...m, historicoDesignacoes: { ...m.historicoDesignacoes } };
      if (m.id === originalMemberId) {
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

    salvarCacheDesignacoes({schedule: novasDesignacoes, mes, ano});

    toast({ title: "Substituição Realizada", description: "A designação foi atualizada com sucesso." });
    setIsSubstitutionModalOpen(false);
    setSubstitutionDetails(null);
  };

  const currentPublicAssignmentsForSelectedMonth = cachedScheduleInfo?.mes !== null && cachedScheduleInfo?.ano !== null && allPublicMeetingAssignmentsData
    ? allPublicMeetingAssignmentsData[formatarDataParaChave(new Date(cachedScheduleInfo.ano, cachedScheduleInfo.mes, 1))]
    : null;

  const currentNvmcAssignmentsForSelectedMonth = cachedScheduleInfo?.mes !== null && cachedScheduleInfo?.ano !== null && allNvmcAssignmentsData
    ? allNvmcAssignmentsData[formatarDataParaChave(new Date(cachedScheduleInfo.ano, cachedScheduleInfo.mes, 1))]
    : null;


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
                <Users className="mr-3 h-6 w-6 text-primary" />
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
                 <ListChecks className="mr-3 h-6 w-6 text-primary" />
                 Gerar Designações
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0 rounded-b-lg">
              <Tabs defaultValue="indicadores-volantes-av-limpeza" className="w-full pt-2">
                <TabsList className="mx-4 mb-2">
                  <TabsTrigger value="indicadores-volantes-av-limpeza">Indicadores/Volantes/AV/Limpeza</TabsTrigger>
                  <TabsTrigger value="reuniao-publica">Reunião Pública</TabsTrigger>
                  <TabsTrigger value="nvmc">NVMC</TabsTrigger>
                </TabsList>
                <TabsContent value="indicadores-volantes-av-limpeza" className="pt-0">
                  <ScheduleGenerationCard
                    membros={membros}
                    onScheduleGenerated={handleScheduleGenerated}
                    currentSchedule={designacoesMensaisCache}
                    currentMes={cachedScheduleInfo?.mes ?? null}
                    currentAno={cachedScheduleInfo?.ano ?? null}
                    onOpenSubstitutionModal={handleOpenSubstitutionModal}
                  />
                </TabsContent>
                <TabsContent value="reuniao-publica" className="pt-0">
                  <PublicMeetingAssignmentsCard
                    allMembers={membros}
                    allPublicAssignments={allPublicMeetingAssignmentsData}
                    initialMonth={cachedScheduleInfo?.mes ?? new Date().getMonth()}
                    initialYear={cachedScheduleInfo?.ano ?? new Date().getFullYear()}
                    onSaveAssignments={handleSavePublicMeetingAssignments}
                  />
                </TabsContent>
                 <TabsContent value="nvmc" className="pt-0">
                  <NvmcAssignmentsCard
                    allMembers={membros}
                    allNvmcAssignments={allNvmcAssignmentsData}
                    initialMonth={cachedScheduleInfo?.mes ?? new Date().getMonth()}
                    initialYear={cachedScheduleInfo?.ano ?? new Date().getFullYear()}
                    onSaveNvmcAssignments={handleSaveNvmcAssignments}
                  />
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Settings2 className="mr-3 h-6 w-6 text-primary" />
                    Opções de Limpeza de Dados
                </CardTitle>
                <CardDescription>Use com cuidado. Estas ações são irreversíveis.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2">
                 <Button variant="outline" onClick={() => { setClearType('history'); handleOpenAdvancedOptions(null);}}>
                    <History className="mr-2 h-4 w-4" /> Limpar Histórico de Todos
                </Button>
                <Button variant="outline" onClick={() => { setClearType('public_meeting'); handleOpenAdvancedOptions(null);}}>
                    <BookOpen className="mr-2 h-4 w-4" /> Limpar Dados da Reunião Pública
                </Button>
                <Button variant="outline" onClick={() => { setClearType('nvmc'); handleOpenAdvancedOptions(null);}}>
                    <BookUser className="mr-2 h-4 w-4" /> Limpar Dados NVMC
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
        onClearPublicMeetingData={() => {
          limparCacheDesignacoesPublicMeeting();
          toast({ title: "Dados Limpos", description: "Dados da Reunião Pública foram limpos." });
        }}
        onClearNvmcData={() => { // Novo
          limparCacheNVMCAssignments();
          toast({ title: "Dados Limpos", description: "Dados NVMC foram limpos." });
        }}
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
