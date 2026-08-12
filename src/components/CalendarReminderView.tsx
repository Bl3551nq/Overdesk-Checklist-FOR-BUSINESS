import React, { useState, useRef, useEffect } from 'react';

export interface TaskReminder {
  id: string; // e.g. `${modeKey}_${taskIdx}`
  modeKey: string;
  taskText: string;
  taskIdx: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  note?: string;
  enabled: boolean;
  triggered?: boolean;
}

export interface CalendarReminderViewProps {
  modeKey: string;
  taskText: string;
  taskIdx: number;
  existingReminder?: TaskReminder;
  allReminders?: Record<string, TaskReminder>;
  isLight: boolean;
  accentSoft?: string;
  modeColor?: string;
  wallpaperUrl?: string;
  wallpaperOpacity?: number;
  onSaveReminder: (reminder: Omit<TaskReminder, 'id'>) => void;
  onDeleteReminder: (taskIdx: number, modeKey?: string) => void;
  onDeleteAllReminders?: () => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    cleanUrl.endsWith('.mkv') ||
    cleanUrl.endsWith('.avi')
  );
};

// ═══════════════════════════════════════════════════════
// GLASSY SCROLL WHEEL TIME PICKER
// ═══════════════════════════════════════════════════════
const parseTimeTo12h = (time24: string) => {
  if (!time24) return { h12: 9, min: 0, period: 'AM' as const };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 9;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h12, min: m, period };
};

const format12hTo24 = (h12: number, min: number, period: 'AM' | 'PM'): string => {
  let h = h12;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const safeM = Math.max(0, Math.min(59, min));
  return `${String(h).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
};

const formatDisplay12h = (time24: string): string => {
  const { h12, min, period } = parseTimeTo12h(time24);
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
};

interface GlassyColumnProps<T extends number | string> {
  items: T[];
  selected: T;
  onSelect: (val: T) => void;
  formatItem?: (val: T) => string;
  isLight: boolean;
  modeColor: string;
}

function GlassyColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  formatItem,
  isLight,
  modeColor: _modeColor,
}: GlassyColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const idx = items.indexOf(selected);
      if (idx !== -1) {
        containerRef.current.scrollTop = idx * 36;
      }
    }
  }, [selected, items]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;
    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(scrollTop / 36)));
    if (items[idx] !== undefined && items[idx] !== selected) {
      onSelect(items[idx]);
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (containerRef.current) {
        const finalIdx = items.indexOf(selected);
        if (finalIdx !== -1) {
          containerRef.current.scrollTo({ top: finalIdx * 36, behavior: 'smooth' });
        }
      }
    }, 120);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="no-scrollbar"
      style={{
        height: '144px',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        position: 'relative',
        flex: 1,
        WebkitOverflowScrolling: 'touch',
        paddingTop: '54px',
        paddingBottom: '54px',
      }}
    >
      {items.map((item, idx) => {
        const isSelected = item === selected;
        return (
          <div
            key={String(item)}
            onClick={() => {
              onSelect(item);
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: idx * 36, behavior: 'smooth' });
              }
            }}
            style={{
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer',
              fontSize: isSelected ? '16px' : '13px',
              fontWeight: isSelected ? 800 : 500,
              color: isSelected
                ? (isLight ? '#0f172a' : '#ffffff')
                : (isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.3)'),
              transition: 'all 0.15s ease',
              userSelect: 'none',
              transform: isSelected ? 'scale(1.15)' : 'scale(0.88)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatItem ? formatItem(item) : String(item)}
          </div>
        );
      })}
    </div>
  );
}

interface GlassyWheelTimePickerProps {
  selectedTime: string;
  onSelectTime: (time24: string) => void;
  isLight: boolean;
  modeColor: string;
}

function GlassyWheelTimePicker({
  selectedTime,
  onSelectTime,
  isLight,
  modeColor,
}: GlassyWheelTimePickerProps) {
  const { h12, min, period } = parseTimeTo12h(selectedTime);

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const updateHour = (newH12: number) => {
    onSelectTime(format12hTo24(newH12, min, period));
  };

  const updateMin = (newMin: number) => {
    onSelectTime(format12hTo24(h12, newMin, period));
  };

  const updatePeriod = (newP: 'AM' | 'PM') => {
    onSelectTime(format12hTo24(h12, min, newP));
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight ? 'rgba(245, 248, 255, 0.78)' : 'rgba(8, 14, 26, 0.88)',
        backdropFilter: 'blur(25px) saturate(190%)',
        WebkitBackdropFilter: 'blur(25px) saturate(190%)',
        borderRadius: '18px',
        border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.18)',
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.05)' : '0 8px 32px rgba(0,0,0,0.5)',
        padding: '0 8px',
        overflow: 'hidden',
        userSelect: 'none',
        marginTop: '6px',
        animation: 'fadeInScale 0.18s ease-out',
      }}
    >
      {/* Center Glass Highlight Bar */}
      <div
        style={{
          position: 'absolute',
          left: '8px',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          height: '38px',
          borderRadius: '12px',
          background: isLight ? 'rgba(255, 255, 255, 0.95)' : `${modeColor}25`,
          border: isLight ? `1.5px solid ${modeColor}60` : `1.5px solid ${modeColor}80`,
          boxShadow: `0 2px 12px ${modeColor}30, inset 0 1px 1px rgba(255, 255, 255, 0.3)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top & Bottom Soft Fade Mask */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background: isLight
            ? 'linear-gradient(to bottom, rgba(245,248,255,0.88) 0%, transparent 28%, transparent 72%, rgba(245,248,255,0.88) 100%)'
            : 'linear-gradient(to bottom, rgba(8,14,26,0.92) 0%, transparent 28%, transparent 72%, rgba(8,14,26,0.92) 100%)',
        }}
      />

      {/* Columns Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Hour Column */}
        <GlassyColumn
          items={hours}
          selected={h12}
          onSelect={updateHour}
          formatItem={(h) => String(h).padStart(2, '0')}
          isLight={isLight}
          modeColor={modeColor}
        />

        {/* Separator Colon */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: modeColor,
            padding: '0 2px',
            userSelect: 'none',
            opacity: 0.9,
          }}
        >
          :
        </div>

        {/* Minute Column */}
        <GlassyColumn
          items={minutes}
          selected={min}
          onSelect={updateMin}
          formatItem={(m) => String(m).padStart(2, '0')}
          isLight={isLight}
          modeColor={modeColor}
        />

        {/* AM / PM Column */}
        <GlassyColumn
          items={['AM', 'PM']}
          selected={period}
          onSelect={(p) => updatePeriod(p as 'AM' | 'PM')}
          isLight={isLight}
          modeColor={modeColor}
        />
      </div>
    </div>
  );
}

export const CalendarReminderView: React.FC<CalendarReminderViewProps> = ({
  modeKey: _modeKey,
  taskText,
  taskIdx,
  existingReminder,
  allReminders,
  isLight,
  accentSoft = 'rgba(60, 170, 255, 0.2)',
  modeColor = '#38bdf8',
  wallpaperUrl,
  wallpaperOpacity = 100,
  onSaveReminder,
  onDeleteReminder,
  onDeleteAllReminders,
  onClose,
}) => {
  const [viewTab, setViewTab] = useState<'weekly' | 'monthly'>('weekly');
  const [showAllEvents, setShowAllEvents] = useState<boolean>(false);
  
  // Parse initial date or default to today
  const initialDateObj = existingReminder?.date ? new Date(existingReminder.date + 'T00:00:00') : new Date();
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(
    isNaN(initialDateObj.getTime()) ? new Date() : initialDateObj
  );
  
  // Time state (HH:MM format)
  const [selectedTime, setSelectedTime] = useState<string>(
    existingReminder?.time || '09:00'
  );

  // Custom Time Picker expanded state
  const [showCustomTimePicker, setShowCustomTimePicker] = useState<boolean>(false);

  // Note state (max 200 chars, no counter displayed)
  const [reminderNote, setReminderNote] = useState<string>(
    existingReminder?.note ? existingReminder.note.slice(0, 200) : ''
  );

  // Ref for note input box to handle double-click editing from preview card
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Time conversion helpers (12-hour AM/PM <-> 24-hour string)
  const parseTimeTo12h = (time24: string) => {
    if (!time24) return { h12: 9, min: 0, period: 'AM' as const };
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 9;
    let m = parseInt(mStr, 10);
    if (isNaN(m)) m = 0;
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { h12, min: m, period };
  };

  const format12hTo24 = (h12: number, min: number, period: 'AM' | 'PM'): string => {
    let h = h12;
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const safeM = Math.max(0, Math.min(59, min));
    return `${String(h).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
  };

  const formatDisplay12h = (time24: string): string => {
    const { h12, min, period } = parseTimeTo12h(time24);
    return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
  };

  // Success indicator
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Date helper utilities
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Helper to check if a given date has a scheduled reminder
  const hasReminderOnDate = (d: Date): boolean => {
    const ymd = formatYMD(d);
    if (allReminders) {
      return (Object.values(allReminders) as TaskReminder[]).some((r) => r && r.enabled && r.date === ymd);
    }
    return existingReminder?.date === ymd && existingReminder.enabled;
  };

  // Helper to retrieve all pending events sorted chronologically from current date to farthest date
  const getAllUpcomingEvents = (): TaskReminder[] => {
    const remindersMap: Record<string, TaskReminder> = allReminders || (existingReminder ? { [existingReminder.id]: existingReminder } : {});
    const list: TaskReminder[] = (Object.values(remindersMap) as TaskReminder[]).filter((r) => r && r.enabled && !r.triggered);

    list.sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time || '00:00'}`;
      const dateTimeB = `${b.date}T${b.time || '00:00'}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

    return list;
  };

  // Generate 7 days for the weekly arc view based on selected date
  const getWeeklyDays = (): Date[] => {
    const days: Date[] = [];
    const current = new Date(selectedDateObj);
    const start = new Date(current);
    start.setDate(current.getDate() - 3);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Shift week by -7 or +7 days
  const handleShiftWeek = (deltaDays: number) => {
    const next = new Date(selectedDateObj);
    next.setDate(next.getDate() + deltaDays);
    setSelectedDateObj(next);
  };

  // Generate calendar days for monthly view
  const getMonthlyDays = (): (Date | null)[] => {
    const year = selectedDateObj.getFullYear();
    const month = selectedDateObj.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, etc.
    const totalDays = lastDay.getDate();

    const grid: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      grid.push(new Date(year, month, day));
    }
    return grid;
  };

  const handleShiftMonth = (deltaMonths: number) => {
    const next = new Date(selectedDateObj);
    next.setMonth(next.getMonth() + deltaMonths);
    setSelectedDateObj(next);
  };

  const handleSave = () => {
    const ymd = formatYMD(selectedDateObj);
    onSaveReminder({
      modeKey: _modeKey,
      taskText,
      taskIdx,
      date: ymd,
      time: selectedTime || '09:00',
      note: reminderNote.slice(0, 200),
      enabled: true,
      triggered: false,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    onDeleteReminder(taskIdx);
    setReminderNote('');
    setSelectedTime('09:00');
    setShowCustomTimePicker(false);
  };

  const weeklyDays = getWeeklyDays();
  const monthName = MONTH_NAMES[selectedDateObj.getMonth()];
  const dayNumber = selectedDateObj.getDate();

  return (
    <div
      className={`calendar-view-container ${isLight ? 'light' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 18px',
        boxSizing: 'border-box',
        borderRadius: '32px',
        background: isLight ? '#f1f5f9' : '#080d1a',
        border: isLight ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: isLight
          ? '0 6px 24px rgba(0, 0, 0, 0.06), 0 0 1px 1px rgba(255, 255, 255, 0.9) inset'
          : '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 1px 1.5px rgba(255, 255, 255, 0.2) inset',
        color: isLight ? '#0f172a' : '#ffffff',
        overflow: 'hidden',
        animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Background Wallpaper Layer matching Home Page */}
      {wallpaperUrl ? (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '32px', zIndex: 0, pointerEvents: 'none' }}>
          {/* Solid base underneath wallpaper to block home page/checklist */}
          <div style={{ position: 'absolute', inset: 0, background: isLight ? '#f1f5f9' : '#080d1a' }} />
          
          <div style={{ position: 'absolute', inset: 0, opacity: (wallpaperOpacity / 100) }}>
            {isVideoUrl(wallpaperUrl) ? (
              <video
                src={wallpaperUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${wallpaperUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
          </div>
          {/* Glassy overlay without backdropFilter so underneath DOM elements don't bleed through */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isLight
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.58) 100%)'
                : 'linear-gradient(180deg, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.55) 100%)',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '32px',
            zIndex: 0,
            background: isLight
              ? 'radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.95) 0%, transparent 60%), radial-gradient(circle at 90% 90%, ' + accentSoft + ' 0%, transparent 70%), linear-gradient(145deg, rgba(235, 240, 250, 0.98) 0%, rgba(215, 225, 242, 0.95) 100%)'
              : 'radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 90% 85%, ' + accentSoft + ' 0%, transparent 65%), linear-gradient(145deg, rgba(10, 15, 26, 0.98) 0%, rgba(4, 7, 13, 0.99) 100%)',
            backdropFilter: 'blur(45px) saturate(220%)',
            WebkitBackdropFilter: 'blur(45px) saturate(220%)',
          }}
        />
      )}

      {/* Main Glass Content Wrapper */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
        {/* Top Header Navigation Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '8px',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {/* Back button */}
          <button
            onClick={onClose}
            title="Back to checklist"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '99px',
              padding: '5px 10px',
              color: 'inherit',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.18s ease',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Glossy Pill Segment Control (Weekly / Monthly) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.45)',
              borderRadius: '99px',
              padding: '3px',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <button
              onClick={() => setViewTab('weekly')}
              style={{
                padding: '4px 14px',
                borderRadius: '99px',
                border: 'none',
                background: viewTab === 'weekly'
                  ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.25)')
                  : 'transparent',
                color: viewTab === 'weekly' ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)'),
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: viewTab === 'weekly' ? (isLight ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.25)') : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewTab('monthly')}
              style={{
                padding: '4px 14px',
                borderRadius: '99px',
                border: 'none',
                background: viewTab === 'monthly'
                  ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.25)')
                  : 'transparent',
                color: viewTab === 'monthly' ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)'),
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: viewTab === 'monthly' ? (isLight ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.25)') : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Monthly
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close Calendar"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body Container for Month/Day, Calendar Grid and Bottom Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: showAllEvents ? 'hidden' : 'auto',
            paddingRight: '2px',
          }}
          className="calendar-scroll-body no-scrollbar"
        >
          {/* Target Task Title Banner & Large Typography Date - Hidden when showAllEvents is active */}
          {!showAllEvents && (
            <>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  marginBottom: '6px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: isLight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
                  border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.03)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '34px',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              >
                <span style={{ opacity: 0.65, flexShrink: 0 }}>Task:</span>
                <span
                  style={{
                    fontWeight: 800,
                    color: modeColor,
                    fontSize: '12.5px',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    textShadow: isLight ? 'none' : '0 1px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {taskText}
                </span>
              </div>

              {/* Large Typography Date Display - Month and Day together with All Events button on top right */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: '2px 0 8px',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '32px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    color: isLight ? '#0f172a' : '#ffffff',
                    textShadow: isLight ? 'none' : '0 2px 10px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                  }}
                >
                  <span>{monthName}</span>
                  <span style={{ color: modeColor, fontSize: '34px' }}>{dayNumber}</span>
                </h2>

                <button
                  onClick={() => setShowAllEvents(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '99px',
                    background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.15)',
                    color: isLight ? '#0f172a' : '#ffffff',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isLight ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                  title="View all scheduled pending events"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                  All Events
                </button>
              </div>
            </>
          )}

        {/* All Events List Panel OR Normal Calendar Grid */}
        {showAllEvents ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              height: '100%',
              minHeight: 0,
              gap: '10px',
              margin: 0,
              padding: '14px 12px',
              borderRadius: '20px',
              background: isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(8, 12, 20, 0.94)',
              border: isLight ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(20px)',
              boxShadow: isLight ? '0 2px 10px rgba(0, 0, 0, 0.03)' : '0 8px 28px rgba(0, 0, 0, 0.5)',
              animation: 'fadeInScale 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: modeColor }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Scheduled Events
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: modeColor, color: '#ffffff' }}>
                  {getAllUpcomingEvents().length}
                </span>
              </div>
              <button
                onClick={() => setShowAllEvents(false)}
                style={{
                  background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)',
                  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isLight ? '#0f172a' : '#ffffff',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div 
              className="no-scrollbar"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                flex: 1,
                minHeight: 0, 
                overflowY: 'auto', 
                paddingRight: '2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {getAllUpcomingEvents().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: isLight ? '#475569' : '#e2e8f0', fontSize: '12px', fontWeight: 700 }}>
                  No pending events scheduled
                </div>
              ) : (
                getAllUpcomingEvents().map((event, idx) => {
                  const isEventToday = event.date === formatYMD(new Date());
                  return (
                    <div
                      key={event.id || idx}
                      onClick={() => {
                        const d = new Date(event.date + 'T00:00:00');
                        if (!isNaN(d.getTime())) setSelectedDateObj(d);
                        if (event.time) setSelectedTime(event.time);
                        if (event.note) {
                          setReminderNote(event.note.slice(0, 200));
                        } else {
                          setReminderNote('');
                        }
                        setShowAllEvents(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                        border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.22)',
                        boxShadow: isLight ? '0 1px 4px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 0, 0, 0.45)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                      title="Click to select this event date in calendar"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '-0.01em', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}>
                          {event.taskText}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2.5px 8px',
                              borderRadius: '6px',
                              background: isEventToday ? modeColor : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)'),
                              color: isEventToday ? '#ffffff' : (isLight ? '#0f172a' : '#ffffff'),
                              border: '1px solid ' + (isEventToday ? modeColor : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.25)')),
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {isEventToday ? 'Today' : event.date}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteReminder(event.taskIdx, event.modeKey);
                            }}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '2px 5px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete this event reminder"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: isLight ? '#1e293b' : '#ffffff' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: modeColor }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {event.time}
                        </span>
                        {event.modeKey && (
                          <span style={{ textTransform: 'capitalize', color: isLight ? '#475569' : '#cbd5e1', fontWeight: 700 }}>
                            • {event.modeKey}
                          </span>
                        )}
                      </div>

                      {event.note && (
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: '11.5px',
                          color: isLight ? '#334155' : '#f1f5f9',
                          fontWeight: 600,
                          fontStyle: 'italic',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          maxWidth: '100%',
                          whiteSpace: 'pre-wrap',
                          boxSizing: 'border-box',
                        }}>
                          {event.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Action Bar with "Delete All" button */}
            {getAllUpcomingEvents().length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6px', borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteAllReminders) {
                      onDeleteAllReminders();
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    borderRadius: '99px',
                    padding: '5px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                    transition: 'all 0.18s ease',
                  }}
                  title="Delete all scheduled event times and reminders"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Delete All Events
                </button>
              </div>
            )}
          </div>
        ) : viewTab === 'weekly' ? (
          <div style={{ position: 'relative', margin: '2px 0 8px', width: '100%' }}>
            {/* Week navigation controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', padding: '0 4px' }}>
              <button
                onClick={() => handleShiftWeek(-7)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                ‹ Prev Week
              </button>
              <button
                onClick={() => setSelectedDateObj(new Date())}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: modeColor,
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  fontWeight: 700,
                }}
              >
                Today
              </button>
              <button
                onClick={() => handleShiftWeek(7)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Next Week ›
              </button>
            </div>

            {/* Arched translucent ribbon container */}
            <div
              style={{
                position: 'relative',
                borderRadius: '20px',
                background: isLight ? 'rgba(255, 255, 255, 0.42)' : 'rgba(15, 23, 42, 0.48)',
                border: isLight ? '1px solid rgba(255, 255, 255, 0.7)' : '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 6px 12px',
                backdropFilter: 'blur(16px)',
                boxShadow: isLight ? '0 2px 10px rgba(0, 0, 0, 0.03)' : '0 8px 24px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden',
              }}
            >
              {/* Soft curved arc line in background */}
              <svg
                viewBox="0 0 280 40"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  opacity: 0.25,
                }}
              >
                <path d="M 10 35 Q 140 5 270 35" fill="none" stroke={isLight ? '#000000' : '#ffffff'} strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>

              {/* Weekdays and dates row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                {weeklyDays.map((d, i) => {
                  const dayLabel = WEEKDAY_NAMES_SHORT[d.getDay()];
                  const dayNum = d.getDate();
                  const selected = isSameDay(d, selectedDateObj);
                  const isToday = isSameDay(d, new Date());
                  const hasReminder = hasReminderOnDate(d);
                  const isSunday = d.getDay() === 0;

                  let circleBg = 'transparent';
                  let circleColor = isSunday ? '#38bdf8' : 'inherit';
                  let circleBorder = '2px solid transparent';
                  let circleShadow = 'none';
                  let circleFontW = isSunday ? 700 : 500;

                  if (isToday) {
                    // Current date: ALWAYS FILLED CIRCLE
                    circleBg = modeColor;
                    circleColor = '#ffffff';
                    circleFontW = 800;
                    circleShadow = isLight ? 'none' : (selected ? '0 0 0 2px rgba(255,255,255,0.8)' : '0 2px 6px rgba(0, 0, 0, 0.25)');
                  } else if (hasReminder) {
                    // Reminder on date other than current date: SINGLE HOLLOWED BLUE CIRCLE
                    circleBg = selected ? (isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.12)') : 'transparent';
                    circleBorder = `2px solid ${modeColor}`;
                    circleColor = modeColor;
                    circleFontW = 800;
                    circleShadow = 'none';
                  } else if (selected) {
                    // Selected date without reminder and not today
                    circleBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.22)';
                    circleBorder = `1.5px solid ${modeColor}`;
                    circleColor = isLight ? '#0f172a' : '#ffffff';
                    circleFontW = 800;
                    circleShadow = 'none';
                  }

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDateObj(d)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: (selected || isToday || hasReminder) ? 800 : (isSunday ? 700 : 600),
                          opacity: (selected || isToday || hasReminder) ? 1 : 0.85,
                          color: (selected || isToday || hasReminder)
                            ? (isLight ? '#0f172a' : '#ffffff')
                            : (isSunday ? '#38bdf8' : 'inherit'),
                          marginBottom: '4px',
                        }}
                      >
                        {dayLabel}
                      </span>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: circleFontW,
                          background: circleBg,
                          border: circleBorder,
                          color: circleColor,
                          boxShadow: circleShadow,
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        {dayNum}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Monthly Grid View with Perfect 1:1 Proportional Circles and Blue Sunday */
          <div
            style={{
              margin: '2px 0 8px',
              borderRadius: '20px',
              background: isLight ? 'rgba(255, 255, 255, 0.42)' : 'rgba(15, 23, 42, 0.48)',
              border: isLight ? '1px solid rgba(255, 255, 255, 0.7)' : '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 8px',
              backdropFilter: 'blur(16px)',
              boxShadow: isLight ? '0 2px 10px rgba(0, 0, 0, 0.03)' : '0 8px 24px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
              <button
                onClick={() => handleShiftMonth(-1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#0f172a' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '2px 8px',
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: '11.5px', fontWeight: 800 }}>
                {MONTH_NAMES[selectedDateObj.getMonth()]} {selectedDateObj.getFullYear()}
              </span>
              <button
                onClick={() => handleShiftMonth(1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#0f172a' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '2px 8px',
                }}
              >
                ›
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    opacity: i === 0 ? 1 : 0.6,
                    color: i === 0 ? '#38bdf8' : 'inherit', // Sunday 'S' symbol in blue color
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  {h}
                </span>
              ))}
              {getMonthlyDays().map((d, i) => {
                if (!d) return <div key={i} style={{ width: '28px', height: '28px', margin: '2px auto' }} />;
                const selected = isSameDay(d, selectedDateObj);
                const isToday = isSameDay(d, new Date());
                const hasReminder = hasReminderOnDate(d);
                const isSunday = d.getDay() === 0;

                let circleBg = 'transparent';
                let circleColor = isSunday ? '#38bdf8' : 'inherit';
                let circleBorder = '2px solid transparent';
                let circleShadow = 'none';
                let circleFontW = isSunday ? 700 : 500;

                if (isToday) {
                  // Current date: ALWAYS FILLED CIRCLE
                  circleBg = modeColor;
                  circleColor = '#ffffff';
                  circleFontW = 800;
                  circleShadow = isLight ? 'none' : (selected ? '0 0 0 2px rgba(255,255,255,0.8)' : '0 2px 6px rgba(0, 0, 0, 0.25)');
                } else if (hasReminder) {
                  // Reminder on date other than current date: SINGLE HOLLOWED BLUE CIRCLE
                  circleBg = selected ? (isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.12)') : 'transparent';
                  circleBorder = `2px solid ${modeColor}`;
                  circleColor = modeColor;
                  circleFontW = 800;
                  circleShadow = 'none';
                } else if (selected) {
                  // Selected date without reminder & not today
                  circleBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.22)';
                  circleBorder = `1.5px solid ${modeColor}`;
                  circleColor = isLight ? '#0f172a' : '#ffffff';
                  circleFontW = 800;
                  circleShadow = 'none';
                }

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDateObj(d)}
                    style={{
                      width: '28px',
                      height: '28px',
                      margin: '2px auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: circleFontW,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: circleBg,
                      border: circleBorder,
                      color: circleColor,
                      boxShadow: circleShadow,
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Middle Space Note Preview for the individual checklist item */}
        {!showAllEvents && reminderNote.trim().length > 0 && (
          <div
            onDoubleClick={() => {
              if (noteInputRef.current) {
                noteInputRef.current.focus();
                noteInputRef.current.select();
              }
            }}
            onClick={() => {
              if (noteInputRef.current) {
                noteInputRef.current.focus();
              }
            }}
            title="Double-click to edit note in box below"
            style={{
              margin: '6px 0 auto',
              padding: '8px 12px',
              borderRadius: '14px',
              background: isLight ? 'rgba(255, 255, 255, 0.52)' : 'rgba(15, 23, 42, 0.58)',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.03)' : '0 4px 16px rgba(0, 0, 0, 0.35)',
              cursor: 'pointer',
              maxWidth: '100%',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.8 }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: modeColor }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isLight ? '#0f172a' : '#ffffff' }}>
                Note Detail
              </span>
              <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: 'auto', fontStyle: 'italic' }}>
                Double-click to edit
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '11.5px',
                fontWeight: 600,
                color: isLight ? '#1e293b' : '#f1f5f9',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {reminderNote}
            </p>
          </div>
        )}

        {/* Note and Time Selection Controls - Hidden when showAllEvents is active */}
        {!showAllEvents && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: reminderNote.trim().length > 0 ? '6px' : 'auto', flexShrink: 0 }}>
            {/* Note input field with pencil icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(10, 16, 28, 0.52)',
                borderRadius: '12px',
                padding: '6px 10px',
                border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.18)',
                boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.02)' : '0 4px 14px rgba(0, 0, 0, 0.25)',
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <input
                ref={noteInputRef}
                type="text"
                placeholder="Add a note or reminder detail..."
                value={reminderNote}
                maxLength={200}
                onChange={(e) => setReminderNote(e.target.value.slice(0, 200))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: isLight ? '#0f172a' : '#ffffff',
                  fontSize: '11.5px',
                  width: '100%',
                }}
              />
            </div>

            {/* Custom Time Selector & Quick Preset Chips */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: isLight ? 'rgba(255, 255, 255, 0.48)' : 'rgba(10, 16, 28, 0.55)',
                borderRadius: '16px',
                padding: '8px 10px',
                border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.18)',
                boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.02)' : '0 4px 16px rgba(0, 0, 0, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top trigger bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, color: modeColor }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span style={{ fontSize: '10.5px', opacity: 0.75, fontWeight: 700 }}>Time:</span>
                  
                  {/* Custom Time Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomTimePicker(!showCustomTimePicker)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: showCustomTimePicker
                        ? modeColor
                        : (isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.12)'),
                      color: showCustomTimePicker ? '#ffffff' : (isLight ? '#0f172a' : '#ffffff'),
                      border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.22)',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      cursor: 'pointer',
                      boxShadow: showCustomTimePicker ? `0 0 10px ${modeColor}60` : 'none',
                      transition: 'all 0.18s ease',
                    }}
                    title="Click to open time selection menu"
                  >
                    <span>{formatDisplay12h(selectedTime)}</span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showCustomTimePicker ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Quick preset time chips */}
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  {['09:00', '12:00', '15:00', '18:00', '21:00'].map((t) => {
                    const isSelected = selectedTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTime(t);
                        }}
                        style={{
                          background: isSelected
                            ? modeColor
                            : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
                          color: isSelected ? '#ffffff' : (isLight ? '#0f172a' : 'rgba(255,255,255,0.85)'),
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDisplay12h(t)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Floating Popout Time Picker Menu */}
              {showCustomTimePicker && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    onClick={() => setShowCustomTimePicker(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 89,
                      background: 'transparent',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: 0,
                      right: 0,
                      zIndex: 90,
                      background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(10, 16, 28, 0.96)',
                      backdropFilter: 'blur(30px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                      borderRadius: '18px',
                      border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.22)',
                      boxShadow: isLight
                        ? '0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.06)'
                        : '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 0, 0, 0.5)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      animation: 'fadeInScale 0.18s ease-out',
                    }}
                  >
                    {/* Header bar of popout menu */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: modeColor }}>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                          Select Time
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomTimePicker(false)}
                        style={{
                          background: modeColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '99px',
                          padding: '3px 10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: `0 2px 8px ${modeColor}50`,
                        }}
                      >
                        Done
                      </button>
                    </div>

                    {/* Wheel Picker */}
                    <GlassyWheelTimePicker
                      selectedTime={selectedTime}
                      onSelectTime={(newTime) => setSelectedTime(newTime)}
                      isLight={isLight}
                      modeColor={modeColor}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Bar (Save / Delete / Success) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px', marginBottom: '4px', paddingBottom: '8px' }}>
              {existingReminder ? (
                <button
                  onClick={() => onDeleteReminder(taskIdx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    borderRadius: '99px',
                    padding: '7px 14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Alarm
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: savedSuccess
                    ? '#10b981'
                    : `linear-gradient(135deg, ${modeColor}, #2563eb)`,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '8px 20px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isLight ? '0 2px 8px rgba(37, 99, 235, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.35)',
                  transition: 'all 0.2s ease',
                  marginLeft: 'auto',
                }}
              >
                {savedSuccess ? '✓ Saved!' : '+ Save Reminder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default CalendarReminderView;

