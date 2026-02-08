
import React, { useState } from 'react';
import { X, Upload, Info, AlertCircle } from 'lucide-react';
import { Account, AccountStatus, AccountType, AccountCategory } from '../types';

interface ImportModalProps {
  onImport: (accounts: Account[]) => void;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const parseCurrency = (valStr: string): number => {
    if (!valStr) return 0;
    const cleanValue = valStr.replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const processFile = () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);

        if (lines.length < 2) {
          throw new Error("Arquivo vazio ou sem dados.");
        }

        const now = Date.now();
        const imported: Account[] = lines.slice(1)
          .filter(line => line.trim().length > 0 && line.includes(';'))
          .map((line, index) => {
            const values = line.split(';').map(v => v.trim());

            const tipoStr = (values[7] || '').toUpperCase();
            const statusStr = (values[8] || '').toUpperCase();

            let finalStatus = AccountStatus.PENDENTE;
            if (statusStr.includes('PAGO')) finalStatus = AccountStatus.PAGO;
            else if (statusStr.includes('CANCEL')) finalStatus = AccountStatus.CANCELADO;

            return {
              id: `imp-${now}-${index}-${Math.random().toString(36).substr(2, 7)}`,
              dataMovimento: parseDate(values[0]),
              local: values[1] || '',
              fornecedor: values[2] || 'Não informado',
              titulo: values[3] || '',
              empresa: values[4] || '',
              vencimento: parseDate(values[5]),
              valor: parseCurrency(values[6]),
              tipo: tipoStr.includes('COMPRA') ? AccountType.COMPRA : AccountType.DESPESA,
              categoria: AccountCategory.OUTROS,
              status: finalStatus,
              observacao: values[9] || '',
              createdAt: now
            };
          });

        if (imported.length === 0) {
          throw new Error("Nenhum dado válido encontrado para importação.");
        }

        onImport(imported);
        setLoading(false);
        onClose();
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao processar o arquivo. Verifique o formato.");
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Erro ao ler o arquivo.");
      setLoading(false);
    };

    reader.readAsText(file, 'ISO-8859-1');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Importar Dados</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3 text-blue-700 dark:text-blue-300 text-sm border border-blue-100 dark:border-blue-800">
            <Info className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">Formato suportado:</p>
              <p className="opacity-80 leading-tight">
                Utilize o formato CSV delimitado por ponto e vírgula (;) seguindo o padrão da sua planilha Excel.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-2xl flex gap-3 text-red-700 text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group ${file ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/5'}`}>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
            <div className={`p-4 rounded-full transition-transform mb-4 ${file ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110'}`}>
              <Upload className="w-8 h-8" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200 text-center">
              {file ? file.name : 'Selecionar Arquivo CSV'}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500 mt-1">Clique para buscar ou arraste o arquivo</span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!file || loading}
              onClick={processFile}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : 'Iniciar Importação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
