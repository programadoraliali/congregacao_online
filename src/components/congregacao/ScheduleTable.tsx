
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Designacao, Membro } from '@/lib/congregacao/types'; // Adicionado Membro
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Adicionado Button

interface ScheduleTableProps {
  title: string;
  data: Designacao[];
  columns: { key: string; label: string }[];
  allMembers: Membro[]; // Para encontrar o nome do membro a partir do ID
  onNameClick?: (date: string, functionId: string, originalMemberId: string, originalMemberName: string | null, functionGroupId: string) => void;
  currentFullDateStrings: string[]; // Array de "YYYY-MM-DD" para as linhas da tabela
}

export function ScheduleTable({ title, data, columns, allMembers, onNameClick, currentFullDateStrings }: ScheduleTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="flex-1 min-w-[300px]">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Nenhuma designação para exibir.</p>
        </CardContent>
      </Card>
    );
  }
  
  const getMemberName = (memberId: string | null): string | null => {
    if (!memberId) return null;
    const member = allMembers.find(m => m.id === memberId);
    return member ? member.nome : 'Desconhecido';
  };

  return (
    <Card className="flex-1 min-w-[300px]">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col) => {
                    const memberId = row[col.key] as string | null;
                    const memberName = getMemberName(memberId);
                    const fullDateStr = currentFullDateStrings[rowIndex]; // "YYYY-MM-DD"

                    return (
                      <TableCell key={col.key}>
                        {col.key === 'data' ? (
                          <div className="flex items-center space-x-2">
                             <span>{row.data.split(' ')[0]}</span>
                             <Badge variant="outline" className={row.diaSemanaBadgeColor}>{row.data.split(' ')[1]}</Badge>
                          </div>
                        ) : (
                          memberName ? (
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm font-normal text-primary hover:underline"
                              onClick={() => {
                                if (onNameClick && memberId && fullDateStr) {
                                  onNameClick(fullDateStr, col.key, memberId, memberName, title);
                                }
                              }}
                            >
                              {memberName}
                            </Button>
                          ) : '--'
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
