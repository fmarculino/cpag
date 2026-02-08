
import React, { useRef, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Account, AccountStatus } from '../types';

interface DashboardProps {
  accounts: Account[];
}

const COLORS = ['#10b981', '#f59e0b', '#94a3b8']; // Green, Amber, Slate

const Dashboard: React.FC<DashboardProps> = ({ accounts }) => {
  const stats = accounts.reduce((acc, curr) => {
    if (curr.status === AccountStatus.PAGO) {
      acc.pago += curr.valor;
      acc.countPago += 1;
    } else if (curr.status === AccountStatus.PENDENTE) {
      acc.pendente += curr.valor;
      acc.countPendente += 1;
    } else if (curr.status === AccountStatus.CANCELADO) {
      acc.countCancelado += 1;
    }
    return acc;
  }, { pago: 0, pendente: 0, countPago: 0, countPendente: 0, countCancelado: 0 });

  const pieData = [
    { name: 'Pago', value: stats.pago },
    { name: 'Pendente', value: stats.pendente },
  ].filter(d => d.value > 0);

  // Agrupar por categoria
  const categoryData = accounts
    .filter(a => a.status !== AccountStatus.CANCELADO)
    .reduce((acc: any, curr) => {
      const existing = acc.find((i: any) => i.name === curr.categoria);
      if (existing) {
        existing.value += curr.valor;
      } else {
        acc.push({ name: curr.categoria, value: curr.valor });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.value - a.value);

  // Agrupar por mês de vencimento (últimos 6 meses)
  const monthlyData = accounts
    .filter(a => a.status !== AccountStatus.CANCELADO)
    .reduce((acc: any, curr) => {
      const date = new Date(curr.vencimento);
      const month = date.toLocaleString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      const label = `${month}/${year}`;

      const existing = acc.find((i: any) => i.label === label);
      if (existing) {
        existing.total += curr.valor;
      } else {
        acc.push({ label, total: curr.valor, rawDate: date });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => a.rawDate.getTime() - b.rawDate.getTime())
    .sort((a: any, b: any) => a.rawDate.getTime() - b.rawDate.getTime());

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current && monthlyData.length > 0) {
      const now = new Date();
      const currentMonthLabel = `${now.toLocaleString('pt-BR', { month: 'short' })}/${now.getFullYear()}`;

      const currentIndex = monthlyData.findIndex((item: any) => item.label === currentMonthLabel);

      if (currentIndex !== -1) {
        const barWidth = 100; // Largura estimada de cada barra + espaço
        const containerWidth = scrollContainerRef.current.clientWidth;
        const scrollPos = (currentIndex * barWidth) - (containerWidth / 2) + (barWidth / 2);

        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollPos),
          behavior: 'smooth'
        });
      } else {
        // Se não encontrar o mês atual, rola para o final (mais recente)
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth'
        });
      }
    }
  }, [monthlyData]);

  return (
    <div className="space-y-6 mb-8">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pago</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500">R$ {stats.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg">{stats.countPago} títulos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pendente</span>
          <span className="text-2xl font-black text-amber-500 dark:text-amber-400">R$ {stats.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg">{stats.countPendente} títulos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Projeção Total</span>
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100">R$ {(stats.pago + stats.pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold rounded-lg">{stats.countPago + stats.countPendente} ativos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cancelados</span>
          <span className="text-2xl font-black text-slate-400 dark:text-slate-600">{stats.countCancelado}</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-[10px] font-bold rounded-lg">Fora de fluxo</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução Mensal */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 min-h-[350px]">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
            Fluxo de Despesas (Mensal)
          </h3>
          <div
            ref={scrollContainerRef}
            className="h-64 mt-4 overflow-x-auto overflow-y-hidden pb-2"
          >
            <div style={{ minWidth: `${Math.max(100, monthlyData.length * 100)}px`, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `R$${val / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [
                      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                      'Total'
                    ]}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfico de Categorias */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
            Por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.slice(0, 3).map((cat: any, index: number) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{cat.name}</span>
                </div>
                <span className="text-slate-900 dark:text-slate-100 font-bold">R$ {cat.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
