
import React from 'react';
import { X, PieChart as PieIcon, Github, Info, LifeBuoy, ShieldCheck, Heart } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
        
        <div className="p-8 relative">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/40 transform -rotate-3">
                <PieIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  FinancePro
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200/50 dark:border-blue-800/50">
                    Versão 0.0.1-beta
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Produção VPS</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Gestão inteligente e automatizada de contas a pagar. Desenvolvido para oferecer máxima clareza e controle sobre as suas obrigações financeiras.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 group hover:border-blue-500/30 transition-all duration-300">
                <LifeBuoy className="w-6 h-6 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Suporte Digital</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Entre em contato para dúvidas técnicas ou bugs.</p>
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 group hover:border-blue-500/30 transition-all duration-300">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Segurança Total</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Seus dados estão protegidos e criptografados.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      U{i}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-400">+50 usuários ativos</span>
              </div>
              
              <div className="flex items-center gap-2">
                <a href="#" className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                  <Info className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/30 p-4 flex items-center justify-center gap-2">
           <Heart className="w-3 h-3 text-red-500 fill-red-500" />
           <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
             Feito com carinho para FinancePro
           </span>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
