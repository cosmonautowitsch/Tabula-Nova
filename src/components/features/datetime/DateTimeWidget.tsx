
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { AdditionalTimezoneSetting, WeatherData } from '@/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AdditionalTimeDisplayProps extends AdditionalTimezoneSetting {}

const FallbackWeatherData: WeatherData = {
  city: "Not Set",
  temperature: null,
  description: "Configure in settings.",
  icon: "01d", 
  humidity: null,
  windSpeed: null,
  feelsLike: null,
  unit: 'metric',
};

function AdditionalTimeDisplay({ label, offset }: AdditionalTimeDisplayProps) {
  const [additionalTime, setAdditionalTime] = useState(() => {
    const currentInstant = new Date();
    return new Date(currentInstant.valueOf() + (offset * 3600000));
  });

  useEffect(() => {
    const timerId = setInterval(() => {
      const currentInstant = new Date();
      setAdditionalTime(new Date(currentInstant.valueOf() + (offset * 3600000)));
    }, 1000);
    return () => clearInterval(timerId);
  }, [offset]);

  const formattedTime = additionalTime.toLocaleTimeString([], {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={cn("text-xs text-center text-neutral-600 dark:text-neutral-400")}>
      <span className="font-medium">{label || `UTC${offset >= 0 ? '+' : ''}${offset}`}:</span> {formattedTime}
    </div>
  );
}

interface DateTimeWidgetProps {
  timezoneOffset: number;
  mainTimezoneDstActive?: boolean;
  additionalTimezones: AdditionalTimezoneSetting[];
  timeFormat?: '12h' | '24h';
  showSeconds?: boolean;
  city: string;
  apiKey: string;
  unit: 'metric' | 'imperial';
}

export function DateTimeWidget({
  timezoneOffset,
  mainTimezoneDstActive,
  additionalTimezones,
  timeFormat = '24h',
  showSeconds = false,
  city,
  apiKey,
  unit,
}: DateTimeWidgetProps) {
  const [mainCurrentTime, setMainCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!city || !apiKey) {
      setWeather(FallbackWeatherData);
      setWeatherError("City or API key is not configured.");
      setLoadingWeather(false);
      return;
    }

    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${unit}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setWeather({
        city: data.name,
        temperature: data.main?.temp !== undefined ? Math.round(data.main.temp) : null,
        description: data.weather?.[0]?.description || "N/A",
        icon: data.weather?.[0]?.icon || "01d",
        humidity: data.main?.humidity !== undefined ? data.main.humidity : null,
        windSpeed: data.wind?.speed !== undefined ? data.wind.speed : null,
        feelsLike: data.main?.feels_like !== undefined ? Math.round(data.main.feels_like) : null,
        unit: unit,
      });
    } catch (e: any) {
      console.error("Failed to fetch weather:", e);
      setWeatherError(e.message || "Failed to load weather data.");
      setWeather(null); 
    } finally {
      setLoadingWeather(false);
    }
  }, [city, apiKey, unit]);

  useEffect(() => {
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000);
    return () => clearInterval(weatherInterval);
  }, [fetchWeather]);

  useEffect(() => {
    const calculateTargetTime = () => {
      const currentInstant = new Date();
      let effectiveOffset = timezoneOffset ?? 0;
      if (mainTimezoneDstActive) {
        effectiveOffset += 1;
      }
      return new Date(currentInstant.valueOf() + (effectiveOffset * 3600000));
    };

    setMainCurrentTime(calculateTargetTime());

    const timerId = setInterval(() => {
      setMainCurrentTime(calculateTargetTime());
    }, 1000);

    return () => clearInterval(timerId);
  }, [timezoneOffset, mainTimezoneDstActive]);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
    hour12: timeFormat === '12h',
    timeZone: 'UTC',
  };
  
  const displayWeather = weather || (weatherError ? FallbackWeatherData : null);
  const tempUnit = displayWeather?.unit === 'metric' ? '°C' : '°F';
  const formattedMainTime = mainCurrentTime.toLocaleTimeString([], timeOptions);
  const dayName = mainCurrentTime.toLocaleDateString([], { weekday: 'long', timeZone: 'UTC' });
  const formattedMainDate = mainCurrentTime.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' });
  
  const handleTimeClick = () => console.log("Time section clicked");
  const handleDateClick = () => console.log("Date section clicked");
  const handleWeatherClick = () => console.log("Weather section clicked");

  return (
    <div className="flex flex-col md:flex-row items-stretch w-fit bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl transition-all duration-300 overflow-hidden group shadow-sm">
      {/* 1. Time Section */}
      <div 
        onClick={handleTimeClick} 
        className="px-4 py-4 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="text-5xl font-bold text-neutral-800 dark:text-white tracking-tighter tabular-nums">
          {formattedMainTime}
        </div>
      </div>

      {/* 2. Date Section */}
      <div 
        onClick={handleDateClick}
        className="px-4 py-4 flex flex-col justify-center border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 leading-tight text-center">{dayName}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 text-center">{formattedMainDate}</div>
         {additionalTimezones && additionalTimezones.length > 0 && (
            <div className="mt-1 space-y-0.5">
                {additionalTimezones.map(tz => (
                    <AdditionalTimeDisplay key={tz.id} label={tz.label} offset={tz.offset} id={tz.id} />
                ))}
            </div>
        )}
      </div>

      {/* 3. Weather Section */}
      <div 
        onClick={handleWeatherClick}
        className="px-4 py-4 flex items-center gap-2 border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
          {loadingWeather ? (
               <div className="flex items-center justify-center w-8 h-8 text-neutral-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
               </div>
          ) : weatherError ? (
               <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Error</span>
              </div>
          ) : displayWeather && (
              <>
                  <div className="w-10 h-10 relative">
                      <Image src={`http://openweathermap.org/img/wn/${displayWeather.icon}@2x.png`} alt={displayWeather.description} width={40} height={40} data-ai-hint="weather icon" />
                  </div>
                  <div className="flex flex-col">
                      <div className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 leading-none">
                          {displayWeather.temperature !== null ? `${displayWeather.temperature}${tempUnit}` : `--${tempUnit}`}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold">
                          {displayWeather.description}
                      </div>
                  </div>
              </>
          )}
      </div>
    </div>
  );
}
