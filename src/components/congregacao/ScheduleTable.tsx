'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Designacao } from '@/lib/congregacao/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScheduleTableProps {
  title: string;
  data: Designacao[];
  columns: { key: string; label: string }[];
  // onNameClick?: (memberId: string, date: string, functionId: string) => void; // For substitution, future
}

export function ScheduleTable({ title, data, columns }: ScheduleTableProps) {
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
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.key === 'data' ? (
                        <div className="flex items-center space-x-2">
                           <span>{row.data.split(' ')[0]}</span> {/* Just the number part of "DD Day" */}
                           <Badge variant="outline" className={row.diaSemanaBadgeColor}>{row.data.split(' ')[1]}</Badge>
                        </div>
                      ) : (
                        // For substitution, names could be buttons/links
                        // For now, just text. If null/undefined, show "--"
                        row[col.key] || '--'
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
