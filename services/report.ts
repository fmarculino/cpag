
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Account, AccountStatus } from '../types';

export const reportService = {
  generateAccountReport: (accounts: Account[]) => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');

    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('FinancePro - Relatório de Contas', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Emitido em: ${dateStr} às ${timeStr}`, 14, 28);
    doc.text(`Total de registros: ${accounts.length}`, 14, 33);

    // Resumo Financeiro
    const totals = accounts.reduce((acc, curr) => {
      if (curr.status === AccountStatus.PAGO) acc.pago += curr.valor;
      if (curr.status === AccountStatus.PENDENTE) acc.pendente += curr.valor;
      return acc;
    }, { pago: 0, pendente: 0 });

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 38, 196, 38);

    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(`Total Pago: ${totals.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 46);
    
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text(`Total Pendente: ${totals.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, 46);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`Geral: ${(totals.pago + totals.pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, 46);
    doc.setFont('helvetica', 'normal');

    // Tabela
    const tableData = accounts.map(acc => [
      new Date(acc.vencimento).toLocaleDateString('pt-BR'),
      acc.fornecedor,
      acc.titulo,
      acc.empresa,
      acc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      acc.status
    ]);

    (doc as any).autoTable({
      startY: 55,
      head: [['Vencimento', 'Fornecedor', 'Título', 'Empresa', 'Valor', 'Status']],
      body: tableData,
      headStyles: { 
        fillColor: [37, 99, 235], // blue-600
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'center' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          const status = data.cell.raw;
          if (status === AccountStatus.PAGO) data.cell.styles.textColor = [16, 185, 129];
          if (status === AccountStatus.PENDENTE) data.cell.styles.textColor = [245, 158, 11];
          if (status === AccountStatus.CANCELADO) data.cell.styles.textColor = [148, 163, 184];
        }
      }
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado por FinancePro`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`Relatorio_FinancePro_${new Date().getTime()}.pdf`);
  }
};
