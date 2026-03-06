// Dashboard principal - KPIs et graphiques
import { TrendingUp, TrendingDown, Car, FileText, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useQuery } from '../../components/hooks/useQuery';
import { dashboardApi } from '../../services/api';
import { formatFCFA, formatDate, getStatutReservationColor, STATUT_LABELS, METHODE_LABELS } from '../../utils/format';

// Composant KPI Card
function KpiCard({
  title,
  value,
  icon: Icon,
  variation,
  subtitle,
  color = 'green'
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variation?: number;
  subtitle?: string;
  color?: 'green' | 'gold' | 'blue' | 'purple';
}) {
  const colors = {
    green: 'bg-green-50 text-asm-vert',
    gold: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {variation !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              variation >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {variation >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(variation)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Couleurs pour le camembert
const PIE_COLORS = ['#1B5E20', '#F9A825', '#2196F3', '#9C27B0', '#FF5722', '#607D8B'];

export function DashboardPage() {

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['dashboard-stats'],
    () => dashboardApi.getStats(),
    { refetchInterval: 30000 }
  );

  const { data: revenusData } = useQuery(
    ['dashboard-revenus'],
    () => dashboardApi.getRevenus('mois')
  );

  const { data: alertesData } = useQuery(
    ['dashboard-alertes'],
    () => dashboardApi.getAlertes(),
    { refetchInterval: 60000 }
  );

  const { data: reservationsData } = useQuery(
    ['dashboard-reservations'],
    () => dashboardApi.getRecentesReservations()
  );

  const { data: paiementsStatsData } = useQuery(
    ['paiements-stats'],
    () => import('../../services/api').then(m => m.paiementsApi.getStats())
  );

  const stats = statsData?.data;
  const revenus = revenusData?.data || [];
  const alertes = alertesData?.data || [];
  const reservations = reservationsData?.data || [];
  const paiementsStats = paiementsStatsData?.data || [];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-asm-vert border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Formater les données de revenus pour Recharts
  const revenusFormatted = revenus.map((r: { periode: string; montant: number }) => ({
    mois: r.periode,
    montant: r.montant,
  }));

  const vehiculesStatut = [
    { name: 'Disponibles', value: stats?.vehiculesDisponibles || 0, color: '#1B5E20' },
    { name: 'Loués', value: stats?.vehiculesLoues || 0, color: '#F9A825' },
    { name: 'Maintenance', value: stats?.vehiculesMaintenance || 0, color: '#FF5722' },
  ].filter(v => v.value > 0);

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vue d'ensemble de l'activité ASM Multi-Services
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Revenus du mois"
          value={formatFCFA(stats?.revenusMois || 0)}
          icon={DollarSign}
          variation={stats?.variationRevenus}
          subtitle={`Mois précédent: ${formatFCFA(stats?.revenusMoisPrecedent || 0)}`}
          color="green"
        />
        <KpiCard
          title="Véhicules disponibles"
          value={`${stats?.vehiculesDisponibles || 0} / ${stats?.totalVehicules || 0}`}
          icon={Car}
          subtitle={`${stats?.vehiculesLoues || 0} loués, ${stats?.vehiculesMaintenance || 0} en maint.`}
          color="blue"
        />
        <KpiCard
          title="Réservations actives"
          value={stats?.reservationsActives || 0}
          icon={FileText}
          subtitle={`${stats?.contratsActifs || 0} contrats en cours`}
          color="gold"
        />
        <KpiCard
          title="Taux d'occupation"
          value={`${stats?.tauxOccupation || 0}%`}
          icon={TrendingUp}
          subtitle={`${stats?.nouveauxClients || 0} nouveaux clients ce mois`}
          color="purple"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique revenus 12 mois */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Revenus - 12 derniers mois
          </h2>
          {revenusFormatted.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenusFormatted}>
                <defs>
                  <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1B5E20" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="mois"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.split('-').slice(1).join('/')}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatFCFA(value), 'Revenus']}
                />
                <Area
                  type="monotone"
                  dataKey="montant"
                  stroke="#1B5E20"
                  strokeWidth={2}
                  fill="url(#colorMontant)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Graphique statuts véhicules */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Parc automobile
          </h2>
          {vehiculesStatut.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={vehiculesStatut}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {vehiculesStatut.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 w-full mt-2">
                {vehiculesStatut.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Aucun véhicule
            </div>
          )}
        </div>
      </div>

      {/* Méthodes de paiement + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition paiements */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Répartition des paiements
          </h2>
          {paiementsStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paiementsStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="methode"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => METHODE_LABELS[v] || v}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatFCFA(value), 'Total']}
                  labelFormatter={(label) => METHODE_LABELS[label] || label}
                />
                <Bar dataKey="total" fill="#F9A825" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Aucun paiement enregistré
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Alertes ({alertes.length})
          </h2>
          <div className="space-y-3 max-h-52 overflow-y-auto">
            {alertes.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                Aucune alerte active
              </div>
            ) : (
              alertes.map((alerte: {
                id: string;
                type: string;
                message: string;
                severite: string;
              }) => (
                <div
                  key={alerte.id}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    alerte.severite === 'ERROR'
                      ? 'bg-red-50 border-l-4 border-red-500'
                      : alerte.severite === 'WARNING'
                      ? 'bg-yellow-50 border-l-4 border-yellow-500'
                      : 'bg-blue-50 border-l-4 border-blue-500'
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      alerte.severite === 'ERROR'
                        ? 'text-red-500'
                        : alerte.severite === 'WARNING'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                    }`}
                  />
                  <p className="text-gray-700 text-xs line-clamp-2">{alerte.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dernières réservations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-asm-vert" />
            Dernières réservations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N°</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Période</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">
                    Aucune réservation récente
                  </td>
                </tr>
              ) : (
                reservations.map((res: {
                  id: string;
                  numeroReservation: string;
                  client: { nom: string; prenom: string };
                  vehicule: { marque: string; modele: string; immatriculation: string };
                  dateDebut: string;
                  dateFin: string;
                  statut: string;
                  prixTotal: number;
                }) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      #{res.numeroReservation?.slice(-8)}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {res.client?.prenom} {res.client?.nom}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {res.vehicule?.marque} {res.vehicule?.modele}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {formatDate(res.dateDebut)} → {formatDate(res.dateFin)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatutReservationColor(res.statut)}`}>
                        {STATUT_LABELS[res.statut] || res.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatFCFA(res.prixTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
