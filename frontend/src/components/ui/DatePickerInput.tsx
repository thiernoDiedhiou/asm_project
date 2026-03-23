import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import * as Popover from '@radix-ui/react-popover';
import { Calendar } from 'lucide-react';

interface PeriodeOccupee {
  debut: string; // "YYYY-MM-DD"
  fin: string;   // "YYYY-MM-DD"
}

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  periodesOccupees?: PeriodeOccupee[];
  min?: string; // "YYYY-MM-DD", défaut = aujourd'hui
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function DatePickerInput({
  value,
  onChange,
  onBlur,
  periodesOccupees = [],
  min,
  placeholder = 'Sélectionner une date',
  disabled = false,
  'aria-label': ariaLabel,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = min ? parseISO(min) : today;
  const selectedDate = value ? parseISO(value) : undefined;

  // Fonction de désactivation : avant minDate OU dans une période occupée
  function isDisabled(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < minDate) return true;
    return periodesOccupees.some(({ debut, fin }) => {
      const start = parseISO(debut);
      const end = parseISO(fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  }

  function handleSelect(date: Date | undefined) {
    // Double sécurité : ne pas accepter une date désactivée
    if (!date || isDisabled(date)) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
    onBlur?.();
  }

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left flex items-center gap-2 bg-white focus:outline-none focus:ring-2 focus:ring-asm-vert/30 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
        >
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? format(parseISO(value), 'dd MMMM yyyy', { locale: fr }) : placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50"
          align="start"
          sideOffset={4}
        >
          <style>{`
            .rdp-day_button:disabled,
            .rdp-day_button[disabled],
            .rdp-day_button[aria-disabled="true"],
            .rdp-day[data-disabled] .rdp-day_button {
              pointer-events: none !important;
              opacity: 0.35 !important;
              cursor: not-allowed !important;
              color: #9ca3af !important;
              text-decoration: line-through !important;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={isDisabled}
            startMonth={minDate}
            locale={fr}
            showOutsideDays={false}
            style={
              {
                '--rdp-accent-color': 'var(--color-primary, #1B5E20)',
                '--rdp-accent-background-color': 'var(--color-primary-pale, #E8F5E9)',
              } as React.CSSProperties
            }
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
