'use client';

import { getDay, getDaysInMonth, isSameDay } from 'date-fns';
import { Button } from 'design-system/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'design-system/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from 'design-system/components/ui/popover';
import { cn } from 'design-system/lib/utils';
import { atom, useAtom } from 'jotai';
import { Check, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDown } from 'lucide-react';
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface CalendarState {
  month: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  year: number;
}

const monthAtom = atom<CalendarState['month']>(new Date().getMonth() as CalendarState['month']);
const yearAtom = atom<CalendarState['year']>(new Date().getFullYear());

export const useCalendarMonth = () => useAtom(monthAtom);
export const useCalendarYear = () => useAtom(yearAtom);

interface CalendarContextProperties {
  locale: Intl.LocalesArgument;
  startDay: number;
}

const CalendarContext = createContext<CalendarContextProperties>({
  locale: 'en-US',
  startDay: 0,
});

export interface Status {
  id: string;
  name: string;
  color: string;
}

export interface Feature {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: Status;
}

interface ComboboxProperties {
  value: string;
  setValue: (value: string) => void;
  data: {
    value: string;
    label: string;
  }[];
  labels: {
    button: string;
    empty: string;
    search: string;
  };
  className?: string;
}

export const monthsForLocale = (
  localeName: Intl.LocalesArgument,
  monthFormat: Intl.DateTimeFormatOptions['month'] = 'long',
) => {
  const format = new Intl.DateTimeFormat(localeName, { month: monthFormat }).format;

  return [...Array.from({ length: 12 }).keys()].map((m) => format(new Date(Date.UTC(2021, m, 2))));
};

export const daysForLocale = (locale: Intl.LocalesArgument, startDay: number) => {
  const weekdays: string[] = [];
  const baseDate = new Date(2024, 0, startDay);

  for (let index = 0; index < 7; index++) {
    weekdays.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(baseDate));
    baseDate.setDate(baseDate.getDate() + 1);
  }

  return weekdays;
};

const Combobox = ({ value, setValue, data, labels, className }: ComboboxProperties) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn('w-40 justify-between capitalize', className)}
          variant="outline"
        >
          {value ? data.find((item) => item.value === value)?.label : labels.button}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0">
        <Command
          filter={(value, search) => {
            const label = data.find((item) => item.value === value)?.label;

            return label?.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={labels.search} />
          <CommandList>
            <CommandEmpty>{labels.empty}</CommandEmpty>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  className="capitalize"
                  key={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                  value={item.value}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface OutOfBoundsDayProperties {
  day: number;
}

const OutOfBoundsDay = ({ day }: OutOfBoundsDayProperties) => (
  <div className="bg-secondary text-muted-foreground relative h-full w-full p-1 text-xs">{day}</div>
);

export interface CalendarBodyProperties {
  features: Feature[];
  children: (properties: { feature: Feature }) => ReactNode;
}

export const CalendarBody = ({ features, children }: CalendarBodyProperties) => {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const { startDay } = useContext(CalendarContext);

  // Memoize expensive date calculations
  const currentMonthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => getDaysInMonth(currentMonthDate), [currentMonthDate]);
  const firstDay = useMemo(
    () => (getDay(currentMonthDate) - startDay + 7) % 7,
    [currentMonthDate, startDay],
  );

  // Memoize previous month calculations
  const previousMonthData = useMemo(() => {
    const previousMonth = month === 0 ? 11 : month - 1;
    const previousMonthYear = month === 0 ? year - 1 : year;
    const previousMonthDays = getDaysInMonth(new Date(previousMonthYear, previousMonth, 1));
    const previousMonthDaysArray = Array.from(
      { length: previousMonthDays },
      (_, index) => index + 1,
    );
    return { prevMonthDays: previousMonthDays, prevMonthDaysArray: previousMonthDaysArray };
  }, [month, year]);

  // Memoize next month calculations
  const nextMonthData = useMemo(() => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthDays = getDaysInMonth(new Date(nextMonthYear, nextMonth, 1));
    const nextMonthDaysArray = Array.from({ length: nextMonthDays }, (_, index) => index + 1);
    return { nextMonthDaysArray };
  }, [month, year]);

  // Memoize features filtering by day to avoid recalculating on every render
  const featuresByDay = useMemo(() => {
    const result: Record<number, Feature[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      result[day] = features.filter((feature) => {
        return isSameDay(new Date(feature.endAt), new Date(year, month, day));
      });
    }
    return result;
  }, [features, daysInMonth, year, month]);

  const days: ReactNode[] = [];

  for (let index = 0; index < firstDay; index++) {
    const day =
      previousMonthData.prevMonthDaysArray[previousMonthData.prevMonthDays - firstDay + index];

    if (day) {
      days.push(<OutOfBoundsDay day={day} key={`prev-${index}`} />);
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const featuresForDay = featuresByDay[day] || [];

    days.push(
      <div
        className="text-muted-foreground relative flex h-full w-full flex-col gap-1 p-1 text-xs"
        key={day}
      >
        {day}
        <div>{featuresForDay.slice(0, 3).map((feature) => children({ feature }))}</div>
        {featuresForDay.length > 3 && (
          <span className="text-muted-foreground block text-xs">
            +{featuresForDay.length - 3} more
          </span>
        )}
      </div>,
    );
  }

  const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
  if (remainingDays < 7) {
    for (let index = 0; index < remainingDays; index++) {
      const day = nextMonthData.nextMonthDaysArray[index];

      if (day) {
        days.push(<OutOfBoundsDay day={day} key={`next-${index}`} />);
      }
    }
  }

  return (
    <div className="grid flex-grow grid-cols-7">
      {days.map((day, index) => (
        <div
          className={cn(
            'relative aspect-square overflow-hidden border-t border-r',
            index % 7 === 6 && 'border-r-0',
          )}
          key={index}
        >
          {day}
        </div>
      ))}
    </div>
  );
};

export interface CalendarDatePickerProperties {
  className?: string;
  children: ReactNode;
}

export const CalendarDatePicker = ({ className, children }: CalendarDatePickerProperties) => (
  <div className={cn('flex items-center gap-1', className)}>{children}</div>
);

export interface CalendarMonthPickerProperties {
  className?: string;
}

export const CalendarMonthPicker = ({ className }: CalendarMonthPickerProperties) => {
  const [month, setMonth] = useCalendarMonth();
  const { locale } = useContext(CalendarContext);

  // Memoize month data to avoid recalculating date formatting
  const monthData = useMemo(() => {
    return monthsForLocale(locale).map((month, index) => ({
      value: index.toString(),
      label: month,
    }));
  }, [locale]);

  return (
    <Combobox
      className={className}
      data={monthData}
      labels={{
        button: 'Select month',
        empty: 'No month found',
        search: 'Search month',
      }}
      setValue={(value) => {
        setMonth(Number.parseInt(value, 10) as CalendarState['month']);
      }}
      value={month.toString()}
    />
  );
};

export interface CalendarYearPickerProperties {
  className?: string;
  start: number;
  end: number;
}

export const CalendarYearPicker = ({ className, start, end }: CalendarYearPickerProperties) => {
  const [year, setYear] = useCalendarYear();

  return (
    <Combobox
      className={className}
      data={Array.from({ length: end - start + 1 }, (_, index) => ({
        value: (start + index).toString(),
        label: (start + index).toString(),
      }))}
      labels={{
        button: 'Select year',
        empty: 'No year found',
        search: 'Search year',
      }}
      setValue={(value) => {
        setYear(Number.parseInt(value, 10));
      }}
      value={year.toString()}
    />
  );
};

export interface CalendarDatePaginationProperties {
  className?: string;
}

export const CalendarDatePagination = ({ className }: CalendarDatePaginationProperties) => {
  const [month, setMonth] = useCalendarMonth();
  const [year, setYear] = useCalendarYear();

  const handlePreviousMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth((month - 1) as CalendarState['month']);
    }
  }, [month, year, setMonth, setYear]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth((month + 1) as CalendarState['month']);
    }
  }, [month, year, setMonth, setYear]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button onClick={handlePreviousMonth} size="icon" variant="ghost">
        <ChevronLeftIcon size={16} />
      </Button>
      <Button onClick={handleNextMonth} size="icon" variant="ghost">
        <ChevronRightIcon size={16} />
      </Button>
    </div>
  );
};

export interface CalendarDateProperties {
  children: ReactNode;
}

export const CalendarDate = ({ children }: CalendarDateProperties) => (
  <div className="flex items-center justify-between p-3">{children}</div>
);

export interface CalendarHeaderProperties {
  className?: string;
}

export const CalendarHeader = ({ className }: CalendarHeaderProperties) => {
  const { locale, startDay } = useContext(CalendarContext);

  // Memoize days data to avoid recalculating date formatting
  const daysData = useMemo(() => {
    return daysForLocale(locale, startDay);
  }, [locale, startDay]);

  return (
    <div className={cn('grid flex-grow grid-cols-7', className)}>
      {daysData.map((day) => (
        <div className="text-muted-foreground p-3 text-right text-xs" key={day}>
          {day}
        </div>
      ))}
    </div>
  );
};

export interface CalendarItemProperties {
  feature: Feature;
  className?: string;
}

export const CalendarItem = memo(({ feature, className }: CalendarItemProperties) => (
  <div className={cn('flex items-center gap-2', className)}>
    <div
      className="h-2 w-2 shrink-0 rounded-full"
      style={{
        backgroundColor: feature.status.color,
      }}
    />
    <span className="truncate">{feature.name}</span>
  </div>
));

CalendarItem.displayName = 'CalendarItem';

export interface CalendarProviderProperties {
  locale?: Intl.LocalesArgument;
  startDay?: number;
  children: ReactNode;
  className?: string;
}

export const CalendarProvider = ({
  locale = 'en-US',
  startDay = 0,
  children,
  className,
}: CalendarProviderProperties) => (
  <CalendarContext.Provider value={{ locale, startDay }}>
    <div className={cn('relative flex flex-col', className)}>{children}</div>
  </CalendarContext.Provider>
);
