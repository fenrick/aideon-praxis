'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { cn } from 'design-system/lib/utils';
import { createContext, type HTMLAttributes, useContext, useEffect } from 'react';

const formatDate = (date: Date, timeZone: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(
    'en-US',
    options ?? {
      dateStyle: 'long',
      timeZone,
    },
  ).format(date);

const formatTime = (date: Date, timeZone: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(
    'en-US',
    options ?? {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
    },
  ).format(date);

interface RelativeTimeContextType {
  time: Date;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
  timeFormatOptions?: Intl.DateTimeFormatOptions;
}

const RelativeTimeContext = createContext<RelativeTimeContextType>({
  time: new Date(),
  dateFormatOptions: {
    dateStyle: 'long',
  },
  timeFormatOptions: {
    hour: '2-digit',
    minute: '2-digit',
  },
});

export type RelativeTimeProps = HTMLAttributes<HTMLDivElement> & {
  time?: Date;
  defaultTime?: Date;
  onTimeChange?: (time: Date) => void;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
  timeFormatOptions?: Intl.DateTimeFormatOptions;
};

export const RelativeTime = ({
  time: controlledTime,
  defaultTime = new Date(),
  onTimeChange,
  dateFormatOptions,
  timeFormatOptions,
  className,
  ...properties
}: RelativeTimeProps) => {
  const [time, setTime] = useControllableState<Date>({
    defaultProp: defaultTime,
    prop: controlledTime,
    onChange: onTimeChange,
  });

  useEffect(() => {
    if (controlledTime) {
      return;
    }

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [setTime, controlledTime]);

  return (
    <RelativeTimeContext.Provider
      value={{
        time: time ?? defaultTime,
        dateFormatOptions,
        timeFormatOptions,
      }}
    >
      <div className={cn('grid gap-2', className)} {...properties} />
    </RelativeTimeContext.Provider>
  );
};

export type RelativeTimeZoneProps = HTMLAttributes<HTMLDivElement> & {
  zone: string;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
  timeFormatOptions?: Intl.DateTimeFormatOptions;
};

export interface RelativeTimeZoneContextType {
  zone: string;
}

const RelativeTimeZoneContext = createContext<RelativeTimeZoneContextType>({
  zone: 'UTC',
});

export const RelativeTimeZone = ({ zone, className, ...properties }: RelativeTimeZoneProps) => (
  <RelativeTimeZoneContext.Provider value={{ zone }}>
    <div
      className={cn('flex items-center justify-between gap-1.5 text-xs', className)}
      {...properties}
    />
  </RelativeTimeZoneContext.Provider>
);

export type RelativeTimeZoneDisplayProps = HTMLAttributes<HTMLDivElement>;

export const RelativeTimeZoneDisplay = ({
  className,
  ...properties
}: RelativeTimeZoneDisplayProps) => {
  const { time, timeFormatOptions } = useContext(RelativeTimeContext);
  const { zone } = useContext(RelativeTimeZoneContext);
  const display = formatTime(time, zone, timeFormatOptions);

  return (
    <div className={cn('text-muted-foreground pl-8 tabular-nums', className)} {...properties}>
      {display}
    </div>
  );
};

export type RelativeTimeZoneDateProps = HTMLAttributes<HTMLDivElement>;

export const RelativeTimeZoneDate = ({ className, ...properties }: RelativeTimeZoneDateProps) => {
  const { time, dateFormatOptions } = useContext(RelativeTimeContext);
  const { zone } = useContext(RelativeTimeZoneContext);
  const display = formatDate(time, zone, dateFormatOptions);

  return <div {...properties}>{display}</div>;
};

export type RelativeTimeZoneLabelProps = HTMLAttributes<HTMLDivElement>;

export const RelativeTimeZoneLabel = ({ className, ...properties }: RelativeTimeZoneLabelProps) => (
  <div
    className={cn(
      'bg-secondary flex h-4 items-center justify-center rounded-xs px-1.5 font-mono',
      className,
    )}
    {...properties}
  />
);
