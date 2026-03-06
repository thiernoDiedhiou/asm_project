import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Car, ChevronRight as ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../components/hooks/useQuery';
import { reservationsApi } from '../../services/api';
import { formatDate, STATUT_LABELS, getStatutReservationColor } from '../../utils/format';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface Reservation {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  client?: { nom: string; prenom: string };
  vehicule?: { marque: string; modele: string; immatriculation: string };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun → convert to Mon-based
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function CalendrierPage() {
  const today = new Date();
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data, isLoading } = useQuery(
    ['calendrier', String(currentMonth + 1), String(currentYear)],
    () => reservationsApi.getCalendrier(currentMonth + 1, currentYear)
  );

  const reservations: Reservation[] = data?.data || [];

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  function getReservationsForDay(day: number): Reservation[] {
    const date = new Date(currentYear, currentMonth, day);
    return reservations.filter((r) => {
      const debut = new Date(r.dateDebut);
      const fin = new Date(r.dateFin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return date >= debut && date <= fin;
    });
  }

  const selectedReservations = selectedDay ? getReservationsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendrier des réservations</h1>
        <p className="text-gray-500 text-sm mt-1">Vue mensuelle des locations et disponibilités</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button aria-label="Mois précédent" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">{MOIS[currentMonth]} {currentYear}</h2>
            <button aria-label="Mois suivant" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 mb-2">
            {JOURS.map((j) => (
              <div key={j} className="text-center text-xs font-semibold text-gray-400 py-2">{j}</div>
            ))}
          </div>

          {/* Grille jours */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asm-vert" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Cellules vides début */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14" />
              ))}

              {/* Jours */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayReservations = getReservationsForDay(day);
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const isSelected = selectedDay === day;
                const hasActive = dayReservations.some(r => ['EN_COURS', 'CONFIRMEE'].includes(r.statut));

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-14 rounded-lg flex flex-col items-center justify-start pt-1.5 relative transition-colors ${
                      isSelected ? 'bg-asm-vert text-white' :
                      isToday ? 'bg-asm-vert-pale border-2 border-asm-vert text-asm-vert' :
                      'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : isToday ? 'text-asm-vert' : 'text-gray-700'}`}>{day}</span>
                    {dayReservations.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayReservations.slice(0, 3).map((_, ri) => (
                          <div key={ri} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : hasActive ? 'bg-asm-vert' : 'bg-gray-300'}`} />
                        ))}
                        {dayReservations.length > 3 && <div className={`text-[9px] ${isSelected ? 'text-white' : 'text-gray-400'}`}>+{dayReservations.length - 3}</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Légende */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-asm-vert rounded-full" /> Réservation active</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-gray-300 rounded-full" /> Autre statut</div>
          </div>
        </div>

        {/* Panneau détail */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {selectedDay ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-asm-vert" />
                <h3 className="font-semibold text-gray-900">
                  {selectedDay} {MOIS[currentMonth]} {currentYear}
                </h3>
              </div>
              {selectedReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune réservation ce jour</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedReservations.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => navigate(`/reservations/${r.id}`)}
                      className="w-full text-left border border-gray-100 rounded-lg p-3 hover:border-asm-vert/40 hover:bg-asm-vert-pale/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {r.client?.prenom} {r.client?.nom}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Car className="h-3 w-3 flex-shrink-0" />
                            {r.vehicule?.marque} {r.vehicule?.modele}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${getStatutReservationColor(r.statut)}`}>
                            {STATUT_LABELS[r.statut] || r.statut}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-asm-vert transition-colors" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Sélectionnez un jour</p>
              <p className="text-xs mt-1">pour voir les réservations</p>
            </div>
          )}

          {/* Résumé du mois */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Résumé du mois</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total réservations</span>
                <span className="font-medium text-gray-900">{reservations.length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>En cours</span>
                <span className="font-medium text-green-700">{reservations.filter(r => r.statut === 'EN_COURS').length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Confirmées</span>
                <span className="font-medium text-blue-700">{reservations.filter(r => r.statut === 'CONFIRMEE').length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>En attente</span>
                <span className="font-medium text-yellow-700">{reservations.filter(r => r.statut === 'EN_ATTENTE').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
