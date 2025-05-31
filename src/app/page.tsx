
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMemberManagement } from '@/hooks/congregacao/useMemberManagement';
import { useScheduleManagement } from '@/hooks/congregacao/useScheduleManagement'; // Novo Hook
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
import type { Membro, DesignacoesFeitas, SubstitutionDetails, AllPublicMeetingAssignments, PublicMeetingAssignment, AllNVMCAssignments, NVMCDailyAssignments, AllFieldServiceAssignments, FieldServiceMonthlyData } from '@/lib/congregacao/types';
import { APP_NAME } from '@/lib/congregacao/constants';
import { formatarDataParaChave } from '@/lib/congregacao/utils';
import { 
  carregarPublicMeetingAssignments,
  salvarPublicMeetingAssignments,
  limparPublicMeetingAssignments as limparStoragePublicMeetingAssignments,
  carregarNVMCAssignments,
  salvarNVMCAssignments,
  limparNVMCAssignments as limparStorageNVMCAssignments,
  carregarFieldServiceAssignments,
  salvarFieldServiceAssignments,
  limparFieldServiceAssignments as limparStorageFieldServiceAssignments
} from '@/lib/congregacao/storage';
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

  const {
    scheduleData,
    scheduleMes,
    scheduleAno,
    generateNewSchedule,
    confirmManualAssignmentOrSubstitution,
    updateLimpezaAssignment,
    clearMainScheduleAndCache,
  } = useScheduleManagement({ membros, updateMemberHistory });

  const [allPublicMeetingAssignmentsData, setAllPublicMeetingAssignmentsData] = useState<AllPublicMeetingAssignments | null>(null);
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
    setAllPublicMeetingAssignmentsData(carregarPublicMeetingAssignments());
    setAllNvmcAssignmentsData(carregarNVMCAssignments());
    setAllFieldServiceAssignmentsData(carregarFieldServiceAssignments());
  }, []);


  const handleLimparCachePrincipal = useCallback(() => {
    clearMainScheduleAndCache();
    // Se a limpeza do cache principal implicar limpeza de histórico de membros,
    // uma chamada a hookPersistMembros com o histórico zerado para o mês seria necessária aqui.
    // Por ora, o hook `useScheduleManagement` não faz isso automaticamente.
    // A lógica de `internalUpdateMemberHistoryForMonth` no hook é para *popular* o histórico.
    // Limpar o histórico relacionado a esta aba pode ser uma ação separada se necessário.
  }, [clearMainScheduleAndCache]);


  const limparCacheDesignacoesPublicMeeting = useCallback(() => {
    setAllPublicMeetingAssignmentsData(null);
    limparStoragePublicMeetingAssignments();
    setPublicMeetingCardKey(prev => prev + 1);
  }, []);

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
        limparCacheDesignacoesPublicMeeting(); 
        limparCacheNVMCAssignments(); 
        limparCacheFieldService();
    });
  };

  const handleScheduleGeneratedCallback = async (mes: number, ano: number) => {
    const { success, error, generatedSchedule } = await generateNewSchedule(mes, ano);
    if (success && generatedSchedule) {
      toast({ title: "Designações Geradas", description: `Cronograma para ${NOMES_MESES[mes]} de ${ano} gerado com sucesso.` });
    } else if (error) {
      toast({ title: "Erro ao Gerar Designações", description: error, variant: "destructive" });
    }
    return { success, error };
  };
  
  const handleSavePublicMeetingAssignments = (
    monthAssignments: { [dateStr: string]: Omit<PublicMeetingAssignment, 'leitorId'> },
    mes: number,
    ano: number
  ) => {
    const yearMonthKey = formatarDataParaChave(new Date(ano, mes, 1));
    
    const existingDataForMonth = (allPublicMeetingAssignmentsData || {})[yearMonthKey] || {};
    const updatedMonthAssignmentsWithExistingLeitor: { [dateStr: string]: PublicMeetingAssignment } = {};

    Object.keys(monthAssignments).forEach(dateStr => {
      updatedMonthAssignmentsWithExistingLeitor[dateStr] = {
        ...(existingDataForMonth[dateStr] || {}), 
        ...monthAssignments[dateStr], 
      };
    });
    Object.keys(existingDataForMonth).forEach(dateStr => {
        if (!updatedMonthAssignmentsWithExistingLeitor[dateStr]) {
            updatedMonthAssignmentsWithExistingLeitor[dateStr] = existingDataForMonth[dateStr];
        }
    });

    const updatedAllAssignments = {
      ...(allPublicMeetingAssignmentsData || {}),
      [yearMonthKey]: updatedMonthAssignmentsWithExistingLeitor,
    };

    setAllPublicMeetingAssignmentsData(updatedAllAssignments);
    salvarPublicMeetingAssignments(updatedAllAssignments);
    toast({ title: "Sucesso", description: "Designações da Reunião Pública salvas." });
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
            hookPersistMembros(membrosAtualizados); // Persiste todos os membros (hook atualiza o estado e localStorage)
            toast({ title: "Histórico Limpo", description: `Histórico de ${membro.nome} foi limpo.` });
        }
    } else { // Limpar histórico de todos
        const membrosAtualizados = membros.map(m => ({ ...m, historicoDesignacoes: {} }));
        hookPersistMembros(membrosAtualizados);
        toast({ title: "Histórico Limpo", description: "Histórico de designações de TODOS os membros foi limpo." });
    }
    setMemberIdForAdvancedOptions(null);
  };

  const handleClearAllData = () => {
    hookPersistMembros([]); 
    handleLimparCachePrincipal();
    limparCacheDesignacoesPublicMeeting();
    limparCacheNVMCAssignments();
    limparCacheFieldService();
    toast({ title: "Todos os Dados Limpos", description: "Todos os dados da aplicação foram removidos.", variant: "destructive" });
  };

  const handleOpenSubstitutionModal = (details: SubstitutionDetails) => {
    setSubstitutionDetails(details);
    setIsSubstitutionModalOpen(true);
  };

  const handleConfirmSubstitution = (newMemberId: string) => {
    if (!substitutionDetails || scheduleData === null || scheduleMes === null || scheduleAno === null) {
      toast({ title: "Erro", description: "Não foi possível processar a substituição. Dados do cronograma ausentes.", variant: "destructive" });
      return;
    }
  
    const { date, functionId, originalMemberId } = substitutionDetails;
    const isNewDesignation = !originalMemberId || originalMemberId === '';

    confirmManualAssignmentOrSubstitution(
      date,
      functionId,
      newMemberId,
      originalMemberId,
      scheduleData,
      scheduleMes,
      scheduleAno
    );
  
    toast({ 
      title: isNewDesignation ? "Designação Realizada" : "Substituição Realizada", 
      description: isNewDesignation ? "A designação foi atribuída com sucesso." : "A designação foi atualizada com sucesso." 
    });
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
                    currentSchedule={scheduleData}
                    currentMes={scheduleMes}
                    currentAno={scheduleAno}
                    onOpenSubstitutionModal={handleOpenSubstitutionModal}
                    onLimpezaChange={updateLimpezaAssignment}
                  />
                </TabsContent>
                <TabsContent value="reuniao-publica" className="pt-0">
                  <PublicMeetingAssignmentsCard
                    key={`public-meeting-card-${publicMeetingCardKey}`}
                    allMembers={membros}
                    allPublicAssignments={allPublicMeetingAssignmentsData}
                    currentScheduleForMonth={scheduleData} 
                    initialMonth={scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleAno ?? new Date().getFullYear()}
                    onSaveAssignments={handleSavePublicMeetingAssignments}
                    onOpenSubstitutionModal={handleOpenSubstitutionModal}
                  />
                </TabsContent>
                 <TabsContent value="nvmc" className="pt-0">
                  <NvmcAssignmentsCard
                    allMembers={membros}
                    allNvmcAssignments={allNvmcAssignmentsData}
                    initialMonth={scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleAno ?? new Date().getFullYear()}
                    onSaveNvmcAssignments={handleSaveNvmcAssignments}
                  />
                </TabsContent>
                <TabsContent value="servico-de-campo" className="pt-0">
                  <FieldServiceAssignmentsCard
                    allFieldServiceAssignments={allFieldServiceAssignmentsData}
                    initialMonth={scheduleMes ?? new Date().getMonth()}
                    initialYear={scheduleAno ?? new Date().getFullYear()}
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
          limparCacheDesignacoesPublicMeeting();
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
       {isSubstitutionModalOpen && substitutionDetails && scheduleData && (
        <SubstitutionDialog
          isOpen={isSubstitutionModalOpen}
          onOpenChange={setIsSubstitutionModalOpen}
          substitutionDetails={substitutionDetails}
          allMembers={membros}
          currentAssignmentsForMonth={scheduleData}
          onConfirmSubstitution={handleConfirmSubstitution}
        />
      )}
    </div>
  );
}
