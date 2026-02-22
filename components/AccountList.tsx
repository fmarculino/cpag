
import React, { useState, useEffect, useMemo } from 'react';
import { Account, AccountStatus, SystemSettings } from '../types';
import { reportService } from '../services/report';
import {
  Edit2, Trash2, CheckCircle, Clock, Search, ChevronUp, ChevronDown,
  Calendar, Filter, X, XCircle, ListFilter, FileText, ChevronLeft, ChevronRight, AlertTriangle, Paperclip
} from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  systemSettings: SystemSettings;
  onEdit: (account: Account) => void;
  onDelete: (ids: string[]) => void;
  onUpdateStatus: (ids: string[], status: AccountStatus) => void;
}

const ITEMS_PER_PAGE = 15;

const AccountList: React.FC<AccountListProps> = ({ accounts, systemSettings, onEdit, onDelete, onUpdateStatus }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Account>('vencimento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estados para filtros
  const [dateFilterField, setDateFilterField] = useState<'vencimento' | 'dataMovimento'>('vencimento');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [hidePaid, setHidePaid] = useState(true);

  // Estado de Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Limpar seleção se os itens selecionados não existirem mais na lista de contas
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => accounts.some(acc => acc.id === id)));
  }, [accounts]);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter, dateFilterField, hidePaid]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedAccounts.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setHidePaid(false);
  };

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(a => {
        const matchesSearch =
          a.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.empresa.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

        if (hidePaid && a.status === AccountStatus.PAGO) {
          matchesStatus = false;
        }

        const targetDate = a[dateFilterField];
        let matchesDate = true;

        if (startDate) {
          matchesDate = matchesDate && targetDate >= startDate;
        }
        if (endDate) {
          matchesDate = matchesDate && targetDate <= endDate;
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [accounts, searchTerm, statusFilter, dateFilterField, startDate, endDate, sortField, sortOrder, hidePaid]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAccounts, currentPage]);

  const toggleSort = (field: keyof Account) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleBulkDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.length === 0) return;
    onDelete(selectedIds);
  };

  const handleIndividualDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete([id]);
  };

  const handleBulkStatusUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.length === 0) return;
    onUpdateStatus(selectedIds, AccountStatus.PAGO);
    setSelectedIds([]);
  };

  const handleExportPDF = () => {
    reportService.generateAccountReport(filteredAccounts);
  };

  const getStatusBadge = (status: AccountStatus | string) => {
    switch (status) {
      case AccountStatus.PAGO:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3 mr-1" /> Pago
          </span>
        );
      case AccountStatus.CANCELADO:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <XCircle className="w-3 h-3 mr-1" /> Cancelado
          </span>
        );
      default:
        const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Pendente';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" /> {displayStatus}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-300">
      {/* Table Header / Toolbar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar fornecedor, título ou empresa..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {(startDate || endDate || statusFilter !== 'ALL') && !showFilters && (
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredAccounts.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hidePaid}
                    onChange={(e) => setHidePaid(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 peer-checked:bg-red-500 peer-checked:border-red-500 transition-all flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Oculta Pagas</span>
              </label>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">{selectedIds.length} selecionados</span>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold"
              >
                <CheckCircle className="w-4 h-4" /> Marcar Pago
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-bold"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          )}
        </div>

        {/* Extended Date & Status Filters */}
        {showFilters && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Campo de Data</label>
              <select
                value={dateFilterField}
                onChange={(e) => setDateFilterField(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="vencimento">Vencimento</option>
                <option value="dataMovimento">Movimento</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Data Início</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Data Fim</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Status</label>
              <div className="relative">
                <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  {systemSettings.accountStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={!startDate && !endDate && statusFilter === 'ALL'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" /> Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  onChange={handleSelectAll}
                  checked={selectedIds.length === paginatedAccounts.length && paginatedAccounts.length > 0}
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer group" onClick={() => toggleSort('vencimento')}>
                <div className="flex items-center gap-1">
                  Vencimento {sortField === 'vencimento' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer" onClick={() => toggleSort('fornecedor')}>Fornecedor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer" onClick={() => toggleSort('titulo')}>Título</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer text-right" onClick={() => toggleSort('valor')}>
                <div className="flex items-center justify-end gap-1">
                  Valor {sortField === 'valor' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Alerta</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center"><Paperclip className="w-4 h-4 mx-auto" /></th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedAccounts.map((account) => {
              const isUnpaid = account.status !== AccountStatus.PAGO && account.status !== AccountStatus.CANCELADO;
              const isOverdue = isUnpaid && account.vencimento < new Date().toISOString().split('T')[0];
              const isDueToday = isUnpaid && account.vencimento === new Date().toISOString().split('T')[0];

              return (
                <tr key={account.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(account.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${isOverdue ? 'bg-red-50/20 dark:bg-red-900/10' : ''} ${isDueToday ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.includes(account.id)}
                      onChange={() => handleSelectOne(account.id)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-200">{new Date(account.vencimento).toLocaleDateString('pt-BR')}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Mov: {new Date(account.dataMovimento).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{account.fornecedor}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">{account.empresa}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {account.titulo}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap text-right">
                    {account.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(account.status)}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const isUnpaid = account.status !== AccountStatus.PAGO && account.status !== AccountStatus.CANCELADO;
                      if (!isUnpaid) return null;
                      const today = new Date().toISOString().split('T')[0];
                      if (account.vencimento < today) {
                        return (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Atrasado</span>
                          </div>
                        );
                      }
                      if (account.vencimento === today) {
                        return (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Hoje</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {account.anexos && account.anexos.length > 0 && (
                      <div className="flex items-center justify-center">
                        <Paperclip className="w-4 h-4 text-blue-500" title={`${account.anexos.length} anexo(s)`} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(account)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-slate-600"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleIndividualDelete(e, account.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm border border-transparent hover:border-red-100 dark:hover:border-slate-600"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedAccounts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>
                      {searchTerm || startDate || endDate || statusFilter !== 'ALL'
                        ? "Nenhum registro encontrado para os filtros aplicados."
                        : "Nenhum registro cadastrado."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredAccounts.length > 0 && (
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Exibindo <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAccounts.length)}</span> de <span className="font-bold text-slate-700 dark:text-slate-200">{filteredAccounts.length}</span> registros
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-600"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;

                // Lógica simples para mostrar páginas ao redor da atual se houver muitas
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-black transition-all ${currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 mx-1">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-600"
              title="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountList;
