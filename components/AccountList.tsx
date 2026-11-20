import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  ListFilter,
  Loader2,
  Paperclip,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { fileService } from '../services/fileService';
import { reportService } from '../services/report';
import { Account, AccountStatus, Attachment, SystemSettings } from '../types';

interface AccountListProps {
  accounts: Account[];
  systemSettings: SystemSettings;
  canManage: boolean;
  onEdit: (account: Account) => void;
  onDelete: (ids: string[]) => void;
  onUpdateStatus: (ids: string[], status: AccountStatus) => void;
}

const ITEMS_PER_PAGE = 15;

const AccountList: React.FC<AccountListProps> = ({
  accounts,
  systemSettings,
  canManage,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Account>('vencimento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [dateFilterField, setDateFilterField] = useState<'vencimento' | 'dataMovimento'>(
    'vencimento'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [hidePaid, setHidePaid] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [attachmentModalAccount, setAttachmentModalAccount] = useState<Account | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => accounts.some((acc) => acc.id === id)));
  }, [accounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter, dateFilterField, hidePaid]);

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((a) => {
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
        if (valA === undefined && valB === undefined) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    accounts,
    searchTerm,
    statusFilter,
    dateFilterField,
    startDate,
    endDate,
    sortField,
    sortOrder,
    hidePaid,
  ]);

  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAccounts, currentPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage) return;
    if (e.target.checked) {
      setSelectedIds(paginatedAccounts.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (!canManage) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setHidePaid(false);
  };

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
    if (!canManage || selectedIds.length === 0) return;
    onDelete(selectedIds);
  };

  const handleIndividualDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canManage) return;
    onDelete([id]);
  };

  const handleBulkStatusUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canManage || selectedIds.length === 0) return;
    onUpdateStatus(selectedIds, AccountStatus.PAGO);
    setSelectedIds([]);
  };

  const handleExportPDF = () => {
    reportService.generateAccountReport(filteredAccounts);
  };

  const openSingleAttachment = async (attachment: Attachment) => {
    setAttachmentError(null);
    setOpeningPath(attachment.path);
    try {
      const signedUrl = await fileService.getSignedUrl(attachment.path);
      if (!fileService.isSafeHttpUrl(signedUrl)) {
        throw new Error('URL do anexo bloqueada por política de segurança.');
      }
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setAttachmentError((error as Error).message || 'Não foi possível abrir o anexo.');
    } finally {
      setOpeningPath(null);
    }
  };

  const handleAttachmentCellClick = (account: Account) => {
    const anexos = account.anexos || [];
    if (anexos.length === 0) return;
    setAttachmentError(null);
    if (anexos.length === 1) {
      void openSingleAttachment(anexos[0]);
    } else {
      setAttachmentModalAccount(account);
    }
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
      default: {
        const displayStatus = status
          ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
          : 'Pendente';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" /> {displayStatus}
          </span>
        );
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
        {attachmentError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-300">
            <span>{attachmentError}</span>
            <button
              type="button"
              onClick={() => setAttachmentError(null)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none p-2 rounded-xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                  showFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                {(startDate || endDate || statusFilter !== 'ALL') && !showFilters && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={filteredAccounts.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-red-500" />
                <span className="sm:inline">PDF</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pl-0 sm:pl-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
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
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Oculta Pagas
                </span>
              </label>
            </div>
          </div>

          {canManage && selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-1 w-full sm:w-auto">
                {selectedIds.length} selecionados
              </span>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold"
              >
                <CheckCircle className="w-4 h-4" /> Pagar
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-bold"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                Campo de Data
              </label>
              <select
                value={dateFilterField}
                onChange={(e) =>
                  setDateFilterField(e.target.value as 'vencimento' | 'dataMovimento')
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="vencimento">Vencimento</option>
                <option value="dataMovimento">Movimento</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                Data Início
              </label>
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
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                Data Fim
              </label>
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
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                Status
              </label>
              <div className="relative">
                <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'ALL')}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  {systemSettings.accountStatuses.map((status) => (
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
              {canManage && (
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={
                      selectedIds.length === paginatedAccounts.length &&
                      paginatedAccounts.length > 0
                    }
                  />
                </th>
              )}
              <th
                className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer group"
                onClick={() => toggleSort('vencimento')}
              >
                <div className="flex items-center gap-1">
                  Vencimento{' '}
                  {sortField === 'vencimento' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </div>
              </th>
              <th
                className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer"
                onClick={() => toggleSort('fornecedor')}
              >
                Fornecedor
              </th>
              <th
                className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer"
                onClick={() => toggleSort('titulo')}
              >
                Título
              </th>
              <th
                className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer text-right"
                onClick={() => toggleSort('valor')}
              >
                <div className="flex items-center justify-end gap-1">
                  Valor{' '}
                  {sortField === 'valor' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Alerta
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">
                <Paperclip className="w-4 h-4 mx-auto" />
              </th>
              {canManage && (
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedAccounts.map((account) => {
              const isUnpaid =
                account.status !== AccountStatus.PAGO &&
                account.status !== AccountStatus.CANCELADO;
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = isUnpaid && account.vencimento < today;
              const isDueToday = isUnpaid && account.vencimento === today;
              const hasAttachments = Boolean(account.anexos && account.anexos.length > 0);
              const isOpeningThis =
                account.anexos?.length === 1 && openingPath === account.anexos[0].path;

              return (
                <tr
                  key={account.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                    selectedIds.includes(account.id)
                      ? 'bg-blue-50/30 dark:bg-blue-900/10'
                      : ''
                  } ${isOverdue ? 'bg-red-50/20 dark:bg-red-900/10' : ''} ${
                    isDueToday ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''
                  }`}
                >
                  {canManage && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.includes(account.id)}
                        onChange={() => handleSelectOne(account.id)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        {new Date(account.vencimento).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                        Mov: {new Date(account.dataMovimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {account.fornecedor}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">
                        {account.empresa}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {account.titulo}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap text-right">
                    {account.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(account.status)}</td>
                  <td className="px-6 py-4">
                    {isUnpaid && isOverdue && (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          Atrasado
                        </span>
                      </div>
                    )}
                    {isUnpaid && isDueToday && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          Hoje
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {hasAttachments && (
                      <button
                        type="button"
                        onClick={() => handleAttachmentCellClick(account)}
                        disabled={isOpeningThis}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        title={`${account.anexos!.length} anexo(s) — clique para abrir`}
                      >
                        {isOpeningThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                  {canManage && (
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
                  )}
                </tr>
              );
            })}
            {paginatedAccounts.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 9 : 7}
                  className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>
                      {searchTerm || startDate || endDate || statusFilter !== 'ALL'
                        ? 'Nenhum registro encontrado para os filtros aplicados.'
                        : 'Nenhum registro cadastrado.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredAccounts.length > 0 && (
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Exibindo{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{' '}
            a{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredAccounts.length)}
            </span>{' '}
            de{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {filteredAccounts.length}
            </span>{' '}
            registros
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-600"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }

                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-black transition-all ${
                      currentPage === pageNum
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
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-600"
              title="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {attachmentModalAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Anexos da Conta
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {attachmentModalAccount.fornecedor} — {attachmentModalAccount.titulo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachmentModalAccount(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
              {(attachmentModalAccount.anexos || []).map((file, idx) => (
                <button
                  type="button"
                  key={`${file.path}-${idx}`}
                  onClick={() => openSingleAttachment(file)}
                  disabled={openingPath === file.path}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {openingPath === file.path ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    ) : file.type.includes('image') ? (
                      <ImageIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountList;
