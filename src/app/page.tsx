
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMemberManagement } from '@/hooks/congregacao/useMemberManagement';
import { useScheduleManagement } from '@/hooks/congregacao/useScheduleManagement';
import { usePublicMeetingAssignments } from '@/hooks/congregacao/usePublicMeetingAssignments'; // Novo Hook
import { MemberManagementCard } from '@/components/congregacao/MemberManagementCard';
import { ScheduleGenerationCard } from '@/components/congregacao/ScheduleGenerationCard';
import { PublicMeetingAssignmentsCard } from '@/components/congregacao/PublicMeetingAssignmentsCard';
import { NvmcAssignmentsCard } from '@/components/congregacao/NvmcAssignmentsCard';
import { FieldServiceAssignmentsCard } from '@/components/congregacao/FieldServiceAssignmentsCard';
import { MemberFormDialog } from '@/components/congregacao/MemberFormDialog';
import { BulkAddDialog } from '@/components/congregacao/BulkAddDialog';
import { ConfirmClearDialog } from '@/components/congregacao/ConfirmClearDialog';
import { SubstitutionDialog } from '@/components/congregacao/SubstitutionDialog';
import { CongregationIcon } from '@/components/icons/CongregationIcon';
import type { Membro, DesignacoesFeitas, SubstitutionDetails, AllNVMCAssignments, NVMCDailyAssignments, AllFieldServiceAssignments, FieldServiceMonthlyData } from '@/lib/congregacao/types';
import { APP_NAME, NOMES_MESES } from '@/lib/congregacao/constants';
import { 
  carregarNVMCAssignments,
  salvarNVMCAssignments,
  limparNVMCAssignments as limparStorageNVMCAssignments,
  carregarFieldServiceAssignments,
  salvarFieldServiceAssignments,
  limparFieldServiceAssignments as limparStorageFieldServiceAssignments
} from '@/lib/congregacao/storage';
import { formatarDataParaChave } from '@/lib/congregacao/utils';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, History, Users, Settings2, ListChecks, BookUser, BookOpen, ClipboardList } from 'lucide-react';


export default function Home() {
  const {
    membros,
    isMemberFormOpen,
    setIsMemberFormOpen,
    memberToEdit,
    isBulkAddOpen,
    setIsBulkAddOpen,
    openNewMemberForm,
    openEditMemberForm,
    handleSaveMember,
    handleDeleteMember,
    handleBulkAddMembers,
    handleExportMembers,
    handleImportMembers: hookHandleImportMembers,
    updateMemberHistory,
    persistMembros: hookPersistMembros,
  } = useMemberManagement();
  
  const scheduleManagement = useScheduleManagement({ membros, updateMemberHistory }); 
  const {
    status, 
    salvarDesignacoes, 
    finalizarCronograma,
    carregarDesignacoes, 
  } = scheduleManagement;

  const {
    publicAssignmentsData,
    savePublicAssignments,
    clearPublicAssignments,
  } = usePublicMeetingAssignments();
  
  const [allNvmcAssignmentsData, setAllNvmcAssignmentsData] = useState<AllNVMCAssignments | null>(null);
  const [allFieldServiceAssignmentsData, setAllFieldServiceAssignmentsData] = useState<AllFieldServiceAssignments | null>(null);
  
  const [publicMeetingCardKey, setPublicMeetingCardKey] = useState(0);

  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [clearType, setClearType] = useState<'history' | 'all' | 'public_meeting' | 'nvmc' | 'field_service' | 'main_schedule' | null>(null);
  const [memberIdForAdvancedOptions, setMemberIdForAdvancedOptions] = useState<string | null>(null);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);
  const [substitutionDetails, setSubstitutionDetails] = useState<SubstitutionDetails | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setAllNvmcAssignmentsData(carregarNVMCAssignments());
    setAllFieldServiceAssignmentsData(carregarFieldServiceAssignments());
  }, []);


  const handleLimparCachePrincipal = useCallback(() => {
    scheduleManagement.clearMainScheduleAndCache();
  }, [scheduleManagement]);


  const limparCacheDesignacoesPublicMeetingCallback = useCallback(() => {
    clearPublicAssignments();
    setPublicMeetingCardKey(prev => prev + 1); 
  }, [clearPublicAssignments]);

  const limparCacheNVMCAssignments = useCallback(() => {
    setAllNvmcAssignmentsData(null);
    limparStorageNVMCAssignments();
  }, []);

  const limparCacheFieldService = useCallback(() => {
    setAllFieldServiceAssignmentsData(null);
    limparStorageFieldServiceAssignments();
  }, []);

  const handleImportMembersWithUICallback = (file: File) => {
    hookHandleImportMembers(file, () => {
        handleLimparCachePrincipal(); 
        limparCacheDesignacoesPublicMeetingCallback(); 
        limparCacheNVMCAssignments(); 
        limparCacheFieldService();
    });
  };

  const handleScheduleGeneratedCallback = async (mes: number, ano: number) => {
    const { success, error, generatedSchedule } = await scheduleManagement.generateNewSchedule(mes, ano);
    if (success && generatedSchedule) {
      toast({ title: "Designações Geradas", description: `Cronograma para ${NOMES_MESES[mes]} de ${ano} gerado com sucesso.` });
    } else if (error) {
      toast({ title: "Erro ao Gerar Designações", description: error, variant: "destructive" });
    }
    return { success, error };
  };
  
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


  const handleSaveFieldServiceAssignments = (
    monthAssignments: FieldServiceMonthlyData,
    mes: number,
    ano: number
  ) => {
    const yearMonthKey = formatarDataParaChave(new Date(ano, mes, 1));
    const updatedAllAssignments = {
      ...(allFieldServiceAssignmentsData || {}),
      [yearMonthKey]: monthAssignments,
    };
    setAllFieldServiceAssignmentsData(updatedAllAssignments);
    salvarFieldServiceAssignments(updatedAllAssignments);
    toast({ title: "Sucesso", description: "Designações do Serviço de Campo salvas." });
  };


  const handleOpenAdvancedOptions = (memberId: string | null) => {
    setMemberIdForAdvancedOptions(memberId);
    setIsMemberFormOpen(false); 
    setIsConfirmClearOpen(true);
  };

  const handleClearMemberHistory = () => {
    if (memberIdForAdvancedOptions) {
        const membro = membros.find(m => m.id === memberIdForAdvancedOptions);
        if (membro) {
            const membrosAtualizados = membros.map(m =>
                m.id === memberIdForAdvancedOptions ? { ...m, historicoDesignacoes: {} } : m
            );
            hookPersistMembros(membrosAtualizados); 
            toast({ title: "Histórico Limpo", description: `Histórico de ${membro.nome} foi limpo.` });
        }
    } else { 
        const membrosAtualizados = membros.map(m => ({ ...m, historicoDesignacoes: {} }));
        hookPersistMembros(membrosAtualizados);
        toast({ title: "Histórico Limpo", description: "Histórico de designações de TODOS os membros foi limpo." });
    }
    setMemberIdForAdvancedOptions(null);
  };

  const handleClearAllData = () => {
    hookPersistMembros([]); 
    handleLimparCachePrincipal();
    limparCacheDesignacoesPublicMeetingCallback();
    limparCacheNVMCAssignments();
    limparCacheFieldService();
    toast({ title: "Todos os Dados Limpos", description: "Todos os dados da aplicação foram removidos.", variant: "destructive" });
  };

  const handleOpenSubstitutionModal = (details: SubstitutionDetails) => {
    setSubstitutionDetails(details);
    setIsSubstitutionModalOpen(true);
  };

  const handleConfirmSubstitution = (newMemberId: string) => {
    if (!substitutionDetails || scheduleManagement.scheduleData === null || scheduleManagement.scheduleMes === null || scheduleManagement.scheduleAno === null) {
      toast({ title: "Erro", description: "Não foi possível processar a substituição. Dados do cronograma ausentes.", variant: "destructive" });
      return;
    }
  
    const { date, functionId, originalMemberId } = substitutionDetails;
    const isNewDesignation = !originalMemberId || originalMemberId === '';

    scheduleManagement.confirmManualAssignmentOrSubstitution(
      date,
      functionId,
      newMemberId,
      originalMemberId,
      scheduleManagement.scheduleData,
      scheduleManagement.scheduleMes,
      scheduleManagement.scheduleAno
    );
  
    toast({ 
      title: isNewDesignation ? "Designação Realizada" : "Substituição Realizada", 
      description: isNewDesignation ? "A designação foi atribuída com sucesso." : "A designação foi atualizada com sucesso." 
    });
    setIsSubstitutionModalOpen(false);
    setSubstitutionDetails(null);
  };

  const handleDirectAssignAV = (
    date: string,
    functionId: string,
    newMemberId: string | null,
    originalMemberId: string | null
  ) => {
    if (scheduleManagement.scheduleData === null || scheduleManagement.scheduleMes === null || scheduleManagement.scheduleAno === null) {
      toast({ title: "Erro", description: "Não foi possível processar a designação AV. Dados do cronograma ausentes.", variant: "destructive" });
      return;
    }
  
    scheduleManagement.confirmManualAssignmentOrSubstitution(
      date,
      functionId,
      newMemberId,
      originalMemberId,
      scheduleManagement.scheduleData,
      scheduleManagement.scheduleMes,
      scheduleManagement.scheduleAno
    );
  
    toast({ 
      title: "Designação AV Atualizada", 
      description: "A designação de Áudio/Vídeo foi atualizada com sucesso." 
    });
  };

  const handleSaveProgressClick = () => {
    const { success, error } = salvarDesignacoes();
    if (success) {
      toast({ title: "Sucesso", description: "Progresso salvo com sucesso." });
    } else if (error) { 
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
       toast({ title: "Erro", description: "Erro ao salvar progresso.", variant: "destructive" });
    }
  };

  const handleFinalizeScheduleClick = async () => {
    const result = await finalizarCronograma(); 
    if (result.success) {
      toast({ title: "Sucesso", description: "Cronograma finalizado com sucesso." });
    } else if (result.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    }
  };

  const handleMonthYearChangeRequest = useCallback((newMes: number, newAno: number) => {
    if (scheduleManagement.scheduleMes !== newMes || scheduleManagement.scheduleAno !== newAno) {
         carregarDesignacoes(newMes, newAno);
         // Opcionalmente, adicionar um toast aqui se um rascunho/finalizado for carregado.
         // Isso pode ser feito verificando o 'status' retornado pelo hook após a carga.
    }
  }, [scheduleManagement, carregarDesignacoes]);


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
        <Accordion type="multiple" defaultValue={['item-2']} className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-xl font-semibold py-4 px-6 bg-card rounded-t-lg hover:bg-secondary transition-colors data-[state=open]:border-b">
                <Users className="mr-3 h-6 w-6 text-primary" />
                Gerenciar Membros
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0 rounded-b-lg">
              <MemberManagementCard
                members={membros}
                onAddMember={openNewMemberForm}
                onEditMember={openEditMemberForm}
                onDeleteMember={handleDeleteMember}
                onBulkAdd={() => setIsBulkAddOpen(true)}
                onExportMembers={handleExportMembers}
                onImportMembers={handleImportMembersWithUICallback}
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
                <TabsList className="mx-4 mb-2 overflow-x-auto">
                  <TabsTrigger value="indicadores-volantes-av-limpeza">Indicadores/Volantes/AV/Limpeza</TabsTrigger>
                  <TabsTrigger value="reuniao-publica">Reunião Pública</TabsTrigger>
                  <TabsTrigger value="nvmc">NVMC</TabsTrigger>
                  <TabsTrigger value="servico-de-campo">Serviço de Campo</TabsTrigger>
                </TabsList>
                <TabsContent value="indicadores-volantes-av-limpeza" className="pt-0">
                  <ScheduleGenerationCard
                    membros={membros}
                    onScheduleGenerated={handleScheduleGeneratedCallback}
                    currentSchedule={scheduleManagement.scheduleData}
                    currentMes={scheduleManagement.scheduleMes}
                    currentAno={scheduleManagement.scheduleAno}
                    onOpenSubstitutionModal={handleOpenSubstitutionModal}
                    onDirectAssignAV={handleDirectAssignAV}
                    onLimpezaChange={scheduleManagement.updateLimpezaAssignment}
                    status={status} 
                    onSaveProgress={handleSaveProgressClick} 
                    onFinalizeSchedule={handleFinalizeScheduleClick}
                    onMonthYearChangeRequest={handleMonthYearChangeRequest} 
                  />
                </TabsContent>
                <TabsContent value="reuniao-publica" className="pt-0">
                  <PublicMeetingAssignmentsCard
                    key={`public-meeting-card-${publicMeetingCardKey}`}
                    allMembers={membros}
                    allPublicAssignments={publicAssignmentsData} 
                    currentScheduleForMonth={scheduleManagement.scheduleData} 
                    initialMonth={scheduleManagement.scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleManagement.scheduleAno ?? new Date().getFullYear()}
                    onSaveAssignments={savePublicAssignments} 
                    onOpenSubstitutionModal={handleOpenSubstitutionModal}
                  />
                </TabsContent>
                 <TabsContent value="nvmc" className="pt-0">
                  <NvmcAssignmentsCard
                    allMembers={membros}
                    allNvmcAssignments={allNvmcAssignmentsData}
                    initialMonth={scheduleManagement.scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleManagement.scheduleAno ?? new Date().getFullYear()}
                    onSaveNvmcAssignments={handleSaveNvmcAssignments}
                  />
                </TabsContent>
                <TabsContent value="servico-de-campo" className="pt-0">
                  <FieldServiceAssignmentsCard
                    allFieldServiceAssignments={allFieldServiceAssignmentsData}
                    initialMonth={scheduleManagement.scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleManagement.scheduleAno ?? new Date().getFullYear()}
                    onSaveFieldServiceAssignments={handleSaveFieldServiceAssignments}
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
                <Button variant="outline" onClick={() => { setClearType('main_schedule'); handleOpenAdvancedOptions(null);}}>
                     <ListChecks className="mr-2 h-4 w-4" /> Limpar Designações (Indicadores/Volantes/AV/Limpeza)
                </Button>
                 <Button variant="outline" onClick={() => { setClearType('history'); handleOpenAdvancedOptions(null);}}>
                    <History className="mr-2 h-4 w-4" /> Limpar Histórico de Todos
                </Button>
                <Button variant="outline" onClick={() => { setClearType('public_meeting'); handleOpenAdvancedOptions(null);}}>
                    <BookOpen className="mr-2 h-4 w-4" /> Limpar Dados da Reunião Pública
                </Button>
                <Button variant="outline" onClick={() => { setClearType('nvmc'); handleOpenAdvancedOptions(null);}}>
                    <BookUser className="mr-2 h-4 w-4" /> Limpar Dados NVMC
                </Button>
                <Button variant="outline" onClick={() => { setClearType('field_service'); handleOpenAdvancedOptions(null);}}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Limpar Dados do Serviço de Campo
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
        onClearHistory={handleClearMemberHistory}
        onClearAllData={handleClearAllData}
        onClearMainScheduleData={() => {
          handleLimparCachePrincipal();
          toast({ title: "Dados Limpos", description: "Designações de Indicadores/Volantes/AV/Limpeza foram limpas." });
        }}
        onClearPublicMeetingData={() => {
          limparCacheDesignacoesPublicMeetingCallback(); 
          toast({ title: "Dados Limpos", description: "Dados da Reunião Pública foram limpos." });
        }}
        onClearNvmcData={() => { 
          limparCacheNVMCAssignments();
          toast({ title: "Dados Limpos", description: "Dados NVMC foram limpos." });
        }}
        onClearFieldServiceData={() => {
          limparCacheFieldService();
          toast({ title: "Dados Limpos", description: "Dados do Serviço de Campo foram limpos." });
        }}
        clearType={clearType}
        targetMemberName={memberIdForAdvancedOptions ? membros.find(m=>m.id === memberIdForAdvancedOptions)?.nome : null}
      />
       {isSubstitutionModalOpen && substitutionDetails && scheduleManagement.scheduleData && (
        <SubstitutionDialog
          isOpen={isSubstitutionModalOpen}
          onOpenChange={setIsSubstitutionModalOpen}
          substitutionDetails={substitutionDetails}
          allMembers={membros}
          currentAssignmentsForMonth={scheduleManagement.scheduleData}
          onConfirmSubstitution={handleConfirmSubstitution}
        />
      )}
    </div>
  );
}
    
