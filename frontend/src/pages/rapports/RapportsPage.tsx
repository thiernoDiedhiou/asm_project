import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Car, Users, FileText, DollarSign, Calendar } from 'lucide-react';
import { useQuery } from '../../components/hooks/useQuery';
import { dashboardApi } from '../../services/api';
import { formatFCFA } from '../../utils/format';

const COLORS = ['#1B5E20', '#F9A825', '#1565C0', '#C62828', '#6A1B9A'];

const PERIODS = [
  { label: '7 derniers jours', value: 'semaine' },
  { label: '30 derniers jours', value: 'mois' },
  { label: '12 derniers mois', value: 'annee' },
];

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export function RapportsPage() {
  const [period, setPeriod] = useState('mois');

  const { data: statsData } = useQuery(['dashboard-stats'], () => dashboardApi.getStats());
  const { data: revenusData } = useQuery(['revenus', period], () => dashboardApi.getRevenus(period));
  const { data: perfData } = useQuery(['vehicules-perf'], () => dashboardApi.getVehiculesPerformance());

  const stats = statsData?.data || {};
  const revenus: { mois: string; montant: number }[] = (revenusData?.data || []).map((r: { periode: string; montant: number }) => ({ mois: r.periode, montant: r.montant }));
  const vehiclesPerf: { marque: string; modele: string; immatriculation: string; nombreLocations: number; revenuTotal: number; tauxOccupation: number }[] = perfData?.data || [];

  const totalRevenu = revenus.reduce((s, r) => s + (r.montant || 0), 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d'ensemble des performances de l'activité</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          <Download className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Car} label="Véhicules" value={stats.totalVehicules ?? '—'} sub={`${stats.vehiculesDisponibles || 0} disponibles`} color="bg-green-100 text-green-700" />
        <KpiCard icon={Users} label="Clients" value={stats.totalClients ?? '—'} sub="Clients enregistrés" color="bg-blue-100 text-blue-700" />
        <KpiCard icon={FileText} label="Réservations" value={stats.reservationsActives ?? '—'} sub="En cours actuellement" color="bg-orange-100 text-orange-700" />
        <KpiCard icon={DollarSign} label="Revenus (période)" value={formatFCFA(totalRevenu)} sub={PERIODS.find(p => p.value === period)?.label} color="bg-yellow-100 text-yellow-700" />
      </div>

      {/* Sélecteur de période */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-asm-vert" />
            <h2 className="text-base font-semibold text-gray-900">Évolution des revenus</h2>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === p.value ? 'bg-white text-asm-vert shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {revenus.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [formatFCFA(v), 'Revenus']} />
              <Line type="monotone" dataKey="montant" stroke="#1B5E20" strokeWidth={2} dot={{ fill: '#1B5E20', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aucune donnée disponible</div>
        )}
      </div>

      {/* Performance véhicules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top véhicules revenus */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Car className="h-5 w-5 text-asm-vert" />
            <h2 className="text-base font-semibold text-gray-900">Top véhicules (revenus)</h2>
          </div>
          {vehiclesPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vehiclesPerf.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="immatriculation" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [formatFCFA(v), 'Revenus']} />
                <Bar dataKey="revenuTotal" fill="#1B5E20" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aucune donnée</div>
          )}
        </div>

        {/* Taux d'occupation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-asm-or" />
            <h2 className="text-base font-semibold text-gray-900">Taux d'occupation (%)</h2>
          </div>
          {vehiclesPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={vehiclesPerf.slice(0, 5).map(v => ({ name: v.immatriculation, value: Math.round(v.tauxOccupation || 0) }))}
                  cx="50%" cy="50%" outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {vehiclesPerf.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Occupation']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Tableau de performance véhicules */}
      {vehiclesPerf.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Détail performance véhicules</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Véhicule</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Locations</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenus</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Occupation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehiclesPerf.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{v.marque} {v.modele}</div>
                    <div className="text-xs text-gray-400">{v.immatriculation}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{v.nombreLocations}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatFCFA(v.revenuTotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-asm-vert h-1.5 rounded-full" style={{ width: `${Math.min(100, v.tauxOccupation || 0)}%` }} />
                      </div>
                      <span className="text-sm text-gray-700">{Math.round(v.tauxOccupation || 0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
