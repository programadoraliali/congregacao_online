'use client';

import React, { useRef } from 'react';
import type { Membro } from '@/lib/congregacao/types';
import { BADGE_COLORS, PERMISSOES_BASE } from '@/lib/congregacao/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Upload, Download, Users, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface MemberManagementCardProps {
  members: Membro[];
  onAddMember: () => void;
  onEditMember: (member: Membro) => void;
  onDeleteMember: (memberId: string) => void;
  onBulkAdd: () => void;
  onExportMembers: () => void;
  onImportMembers: (file: File) => void;
}

export function MemberManagementCard({
  members,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onBulkAdd,
  onExportMembers,
  onImportMembers,
}: MemberManagementCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportMembers(file);
      event.target.value = ''; // Reset file input
    }
  };
  
  const getMemberPermissionsBadges = (member: Membro) => {
    const activePermissions = PERMISSOES_BASE.filter(p => member.permissoesBase[p.id]);
    if (activePermissions.length === 0) return <span className="text-muted-foreground text-xs">Nenhuma</span>;
    
    // Group permissions by their base name (e.g. Indicador, Volante)
    const groupedDisplay: Record<string, string[]> = {};
    activePermissions.forEach(p => {
      const baseName = p.grupo; // Or a more generic part of p.nome
      if (!groupedDisplay[baseName]) groupedDisplay[baseName] = [];
      if (p.nome.includes('(Qui)')) groupedDisplay[baseName].push('Qui');
      if (p.nome.includes('(Dom)')) groupedDisplay[baseName].push('Dom');
    });

    return Object.entries(groupedDisplay).map(([groupName, days]) => {
      const uniqueDays = [...new Set(days)]; // Ensure unique days like Qui, Dom
      const badgeColor = BADGE_COLORS[groupName] || BADGE_COLORS.default;
      return (
         <Badge key={groupName} variant="outline" className={`mr-1 mb-1 text-xs ${badgeColor}`}>
          {groupName} {uniqueDays.length > 0 && `(${uniqueDays.join('/')})`}
        </Badge>
      );
    });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary" /> Gerenciar Membros</CardTitle>
          <Badge variant="secondary" className="text-sm">Total: {members.length}</Badge>
        </div>
        <CardDescription>Adicione, edite, ou remova membros da congregação.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={onAddMember}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro</Button>
          <Button variant="outline" onClick={onBulkAdd}><Users className="mr-2 h-4 w-4" /> Adicionar em Massa</Button>
          <Button variant="outline" onClick={onExportMembers}><Download className="mr-2 h-4 w-4" /> Exportar Membros</Button>
          <Button variant="outline" onClick={handleImportClick}><Upload className="mr-2 h-4 w-4" /> Importar Membros</Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
        </div>

        {members.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum membro cadastrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Nome</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <button onClick={() => onEditMember(member)} className="hover:underline text-primary">
                        {member.nome}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{getMemberPermissionsBadges(member)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditMember(member)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteMember(member.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
