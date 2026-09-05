import React, { useState, useEffect, useRef } from 'react';
import overdeskLogo from './logo.svg';
import { MinimizedReminderView } from './components/MinimizedReminderView';
import { Glass } from './components/Glass';
import GooeyNav, { triggerGooeyParticles } from './components/GooeyNav';
import { CalendarReminderView, TaskReminder } from './components/CalendarReminderView';

import wallpaperExecutiveArt from './assets/images/wallpaper_executive_art_1784998270755.jpg';
import wallpaperCyberSkull from './assets/images/wallpaper_cyber_skull_1784998284302.jpg';
import wallpaperOfficePurple from './assets/images/wallpaper_office_purple_1784998297786.jpg';
import wallpaperFieryBeast from './assets/images/wallpaper_fiery_beast_1784998309493.jpg';

const PRESET_WALLPAPERS = [
  { id: 'executive_art', name: 'Executive Boardroom', url: wallpaperExecutiveArt },
  { id: 'cyber_skull', name: 'Cyber Neon Skull', url: wallpaperCyberSkull },
  { id: 'office_purple', name: 'Executive Office', url: wallpaperOfficePurple },
  { id: 'fiery_beast', name: 'Fiery Beast', url: wallpaperFieryBeast },
];

// Declaration to access global Electron API from preload script
declare global {
  interface Window {
    electronAPI?: {
      checkLicense?: () => Promise<{
        ok: boolean;
        type?: 'lifetime' | 'annual' | 'trial' | 'none' | 'expired' | 'trial_expired';
        isLifetime?: boolean;
        expiresAt?: number | null;
        trialActive?: boolean;
        trialUsed?: boolean;
        trialDaysLeft?: number;
        expiredMessage?: string;
        key?: string;
      }>;
      startTrial?: () => Promise<{
        ok: boolean;
        trialStartedAt?: number;
        trialExpiresAt?: number;
        daysLeft?: number;
        trialUsed?: boolean;
        error?: string;
      }>;
      validateLicense?: (key: string) => Promise<{
        ok: boolean;
        test?: boolean;
        type?: 'lifetime' | 'annual' | 'trial' | 'trial_expired' | 'expired';
        isLifetime?: boolean;
        trialActive?: boolean;
        trialUsed?: boolean;
        trialDaysLeft?: number;
        expiresAt?: number | null;
        error?: string;
      }>;
      closeApp?: () => void;
      setHeight?: (height: number) => void;
      cardBounds?: (bounds: { x: number; y: number; w?: number; h?: number; width?: number; height?: number; scale?: number }) => void;
      scaleStart?: () => void;
      scaleEnd?: (scale: number) => void;
      setIgnoreMouseEvents?: (ignore: boolean, options?: { forward: boolean }) => void;
      saveIcon?: (dataUrl: string) => void;
      installUpdate?: () => void;
      checkForUpdates?: () => Promise<{ ok: boolean; version?: string; error?: string }>;
      onUpdateAvailable?: (cb: (version: string) => void) => void;
      onUpdateDownloaded?: (cb: () => void) => void;
      onUpdateNotAvailable?: (cb: () => void) => void;
      onUpdateError?: (cb: (err: string) => void) => void;
      getAutoLaunch?: () => Promise<boolean>;
      setAutoLaunch?: (enabled: boolean) => Promise<boolean>;
      minimizeToTray?: () => void;
      minimize?: () => void;
      close?: () => void;
      quit?: () => void;
      setAlwaysOnTop?: (state: boolean) => void;
      onShowCalendar?: (cb: () => void) => void;
      showNotification?: (opts: { title: string; body: string }) => void;
    };
  }
}

// Icon Definitions Dictionary
const ICON_LIBRARY: Record<string, { label: string; svg: React.ReactNode }> = {
  // --- Business Icons ---
  briefcase: {
    label: 'Business',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  building: {
    label: 'Office',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <line x1="9" y1="14" x2="9" y2="14.01" />
        <line x1="15" y1="14" x2="15" y2="14.01" />
        <path d="M10 22v-4h4v4" />
      </svg>
    ),
  },
  handshake: {
    label: 'Deal',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
        <path d="m7 21 1.6-1.4c.4-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.8a2 2 0 0 0-2.8-2.8l-2.6 2.6" />
        <path d="m2 12 3.6-3.6c.8-.8 1.8-1.2 2.8-1.2h3.2" />
        <path d="M16 5 19 8" />
      </svg>
    ),
  },
  users: {
    label: 'Team',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  presentation: {
    label: 'Meeting',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h20" />
        <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
        <path d="m7 21 5-5 5 5" />
      </svg>
    ),
  },
  invoice: {
    label: 'Invoice',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  file_text: {
    label: 'Doc',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
  },
  target: {
    label: 'Target',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  growth: {
    label: 'Growth',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  megaphone: {
    label: 'Market',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 18-5v12L3 13v-2z" />
        <path d="M11.6 16.8 a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
  },

  // --- Everyday To-Do Life Icons ---
  home: {
    label: 'Home',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  shopping_cart: {
    label: 'Shopping',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  heart: {
    label: 'Health',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  coffee: {
    label: 'Coffee',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  calendar: {
    label: 'Calendar',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  bell: {
    label: 'Alerts',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  utensils: {
    label: 'Meals',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
      </svg>
    ),
  },
  book: {
    label: 'Reading',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  smile: {
    label: 'Personal',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  clock: {
    label: 'Clock',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 15.5" />
      </svg>
    ),
  },
  sparkles: {
    label: 'Chores',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    ),
  },
  map_pin: {
    label: 'Errands',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  checklist: {
    label: 'Tasks',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="11" x2="21" y2="11" />
        <line x1="9" y1="17" x2="21" y2="17" />
        <line x1="9" y1="5" x2="21" y2="5" />
        <polyline points="4 11 2 13 4 15" />
        <polyline points="4 5 2 7 4 9" />
      </svg>
    ),
  },

  // --- PC & Workstation Icons ---
  laptop: {
    label: 'PC / Laptop',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  monitor: {
    label: 'Desktop',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  terminal: {
    label: 'Terminal',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  cpu: {
    label: 'Hardware',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="15" x2="23" y2="15" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="15" x2="4" y2="15" />
      </svg>
    ),
  },
  folder: {
    label: 'Files',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  wifi: {
    label: 'Network',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13a10 10 0 0 1 14 0" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    ),
  },
  database: {
    label: 'Database',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  download: {
    label: 'Downloads',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  gamepad: {
    label: 'Gaming',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <circle cx="15" cy="13" r="1" />
        <circle cx="18" cy="11" r="1" />
        <rect x="2" y="6" width="20" height="12" rx="6" />
      </svg>
    ),
  },
  shield: {
    label: 'DND',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  wrench: {
    label: 'Setup',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },

  // --- Utility & Extra Icons ---
  lock: {
    label: 'Lock',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  star: {
    label: 'Star',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  flag: {
    label: 'Flag',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  bookmark: {
    label: 'Saves',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  layers: {
    label: 'Layers',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  settings: {
    label: 'Config',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  fire: {
    label: 'Hot',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
};

// Colors Palettes
const COLOR_PRESETS = [
  { accent: 'rgba(215,25,75,0.9)', soft: 'rgba(255,40,100,0.16)', hex: '#d7194b' },
  { accent: 'rgba(140,0,225,0.9)', soft: 'rgba(170,0,255,0.16)', hex: '#8c00e1' },
  { accent: 'rgba(205,15,95,0.9)', soft: 'rgba(255,30,110,0.16)', hex: '#cd0f5f' },
  { accent: 'rgba(110,0,210,0.9)', soft: 'rgba(130,0,255,0.16)', hex: '#6e00d2' },
  { accent: 'rgba(0,180,155,0.9)', soft: 'rgba(0,210,180,0.18)', hex: '#00b49b' },
  { accent: 'rgba(220,100,0,0.9)', soft: 'rgba(255,140,0,0.18)', hex: '#dc6400' },
  { accent: 'rgba(30,140,255,0.9)', soft: 'rgba(60,170,255,0.18)', hex: '#1e8cff' },
  { accent: 'rgba(0,190,80,0.9)', soft: 'rgba(0,230,100,0.16)', hex: '#00be50' },
  { accent: 'rgba(200,170,0,0.9)', soft: 'rgba(255,220,0,0.16)', hex: '#c8aa00' },
];

function hexToAccent(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    accent: `rgba(${r},${g},${b},0.9)`,
    soft: `rgba(${r},${g},${b},0.18)`,
  };
}

interface ModeDetail {
  title: string;
  accent: string;
  soft: string;
  defaultAccent: string;
  defaultSoft: string;
  options: string[];
  baseOptions?: string[];
}

const isVideoUrl = (url: string): boolean => {
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

const DEFAULT_MODES: Record<string, ModeDetail> = {
  business: {
    title: 'Business',
    accent: 'rgba(30, 140, 255, 0.9)',
    soft: 'rgba(60, 170, 255, 0.18)',
    defaultAccent: 'rgba(30, 140, 255, 0.9)',
    defaultSoft: 'rgba(60, 170, 255, 0.18)',
    options: ['Review client proposals', 'Team sync & project status', 'Approve pending invoices', 'Quarterly goal check-in'],
    baseOptions: ['Review client proposals', 'Team sync & project status', 'Approve pending invoices', 'Quarterly goal check-in'],
  },
  life: {
    title: 'Everyday Life',
    accent: 'rgba(0, 190, 80, 0.9)',
    soft: 'rgba(0, 230, 100, 0.16)',
    defaultAccent: 'rgba(0, 190, 80, 0.9)',
    defaultSoft: 'rgba(0, 230, 100, 0.16)',
    options: ['Morning coffee & planning', 'Grocery list & errands', '30 min workout or walk', 'Evening downtime & book'],
    baseOptions: ['Morning coffee & planning', 'Grocery list & errands', '30 min workout or walk', 'Evening downtime & book'],
  },
  pc: {
    title: 'PC & Workstation',
    accent: 'rgba(140, 0, 225, 0.9)',
    soft: 'rgba(170, 0, 255, 0.16)',
    defaultAccent: 'rgba(140, 0, 225, 0.9)',
    defaultSoft: 'rgba(170, 0, 255, 0.16)',
    options: ['Clean desktop & downloads', 'System & security updates', 'Backup important files', 'Organize workspace tabs'],
    baseOptions: ['Clean desktop & downloads', 'System & security updates', 'Backup important files', 'Organize workspace tabs'],
  },
  sync: {
    title: 'Focus & DND',
    accent: 'rgba(215, 25, 75, 0.9)',
    soft: 'rgba(255, 40, 100, 0.16)',
    defaultAccent: 'rgba(215, 25, 75, 0.9)',
    defaultSoft: 'rgba(255, 40, 100, 0.16)',
    options: ['Deep work block', 'Mute phone & chat alerts', 'Close distraction tabs', 'Single-task until finished'],
    baseOptions: ['Deep work block', 'Mute phone & chat alerts', 'Close distraction tabs', 'Single-task until finished'],
  },
  alerts: {
    title: 'Daily Schedule',
    accent: 'rgba(220, 100, 0, 0.9)',
    soft: 'rgba(255, 140, 0, 0.18)',
    defaultAccent: 'rgba(220, 100, 0, 0.9)',
    defaultSoft: 'rgba(255, 140, 0, 0.18)',
    options: ["Check today's calendar", 'Review top 3 priorities', 'Follow up on key emails', 'End-of-day summary'],
    baseOptions: ["Check today's calendar", 'Review top 3 priorities', 'Follow up on key emails', 'End-of-day summary'],
  },
};

// Play the high-quality Princess Bell MP3 chime repeated 3 times with 3-second intervals
const playModernChime = () => {
  try {
    let playCount = 0;
    const playNext = () => {
      if (playCount >= 3) return;
      const audio = new Audio("https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/princess_bell.mp3");
      audio.volume = 0.8;
      audio.addEventListener('ended', () => {
        playCount++;
        if (playCount < 3) {
          setTimeout(playNext, 3000);
        }
      });
      audio.play().catch((err) => {
        console.warn("Audio play failed or was blocked by browser autoplay restrictions:", err);
      });
    };
    playNext();
  } catch (e) {
    console.error('Failed to play bell audio:', e);
  }
};

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  // ── State ──
  const [currentMode, setCurrentMode] = useState<string>('business');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isLight, setIsLight] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);

  // Countdown Timer State
  const [showCountdown, setShowCountdown] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_show_countdown');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [countdownDuration, setCountdownDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_countdown_duration');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed > 0) return parsed;
      }
    } catch (e) {}
    return 300; // defaults to 5 minutes
  });

  const [countdownTimeLeft, setCountdownTimeLeft] = useState<number>(countdownDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isEditingTimer, setIsEditingTimer] = useState<boolean>(false);
  const [editHH, setEditHH] = useState<string>('00');
  const [editMM, setEditMM] = useState<string>('00');
  const [editSS, setEditSS] = useState<string>('00');

  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_alarm_enabled');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [animateMinimizedText, setAnimateMinimizedText] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_animate_minimized_text');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [autoMoveCompleted, setAutoMoveCompleted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_auto_move_completed');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const handleShowCountdownChange = (val: boolean) => {
    setShowCountdown(val);
    localStorage.setItem('fm_show_countdown', String(val));
  };

  const handleCountdownDurationChange = (val: number) => {
    setCountdownDuration(val);
    setCountdownTimeLeft(val);
    setIsTimerRunning(false);
    localStorage.setItem('fm_countdown_duration', String(val));
  };

  const handleAlarmEnabledChange = (val: boolean) => {
    setAlarmEnabled(val);
    localStorage.setItem('fm_alarm_enabled', String(val));
  };

  const handleAnimateMinimizedTextChange = (val: boolean) => {
    setAnimateMinimizedText(val);
    localStorage.setItem('fm_animate_minimized_text', String(val));
  };

  const handleAutoMoveCompletedChange = (val: boolean) => {
    setAutoMoveCompleted(val);
    localStorage.setItem('fm_auto_move_completed', String(val));
    if (val && currentMode && modes[currentMode]) {
      const currentOptions = modes[currentMode].options || [];
      const activeSel = selections[currentMode] || [];
      if (currentOptions.length > 0 && activeSel.length > 0) {
        const uncheckedIdxs = currentOptions.map((_, i) => i).filter((i) => !activeSel.includes(i));
        const checkedIdxs = currentOptions.map((_, i) => i).filter((i) => activeSel.includes(i));
        const finalOrderIdxs = [...uncheckedIdxs, ...checkedIdxs];

        const newOptions = finalOrderIdxs.map((i) => currentOptions[i]);
        const newSel = Array.from({ length: checkedIdxs.length }, (_, i) => uncheckedIdxs.length + i);

        const updatedModes = {
          ...modes,
          [currentMode]: {
            ...modes[currentMode],
            options: newOptions,
          },
        };
        setModes(updatedModes);
        localStorage.setItem('fm_modes', JSON.stringify(updatedModes));

        const nextSelections = { ...selections, [currentMode]: newSel };
        setSelections(nextSelections);
        localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(newSel));
      }
    }
  };

  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_animations_enabled');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScrollAreaScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!animationsEnabled) {
      document.body.classList.add('animations-disabled');
    } else {
      document.body.classList.remove('animations-disabled');
    }
  }, [animationsEnabled]);

  // ── Task Reminders & Calendar State ──
  const [startOnBoot, setStartOnBoot] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_start_on_boot');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  // Query native PC startup setting from Electron on boot
  useEffect(() => {
    if (window.electronAPI?.getAutoLaunch) {
      window.electronAPI.getAutoLaunch().then((enabled) => {
        setStartOnBoot(enabled);
        localStorage.setItem('fm_start_on_boot', String(enabled));
      }).catch((err) => {
        console.error('Error reading auto-launch state from Electron:', err);
      });
    }
  }, []);

  const [showAutostartGuideModal, setShowAutostartGuideModal] = useState<boolean>(false);

  const handleToggleStartOnBoot = (val: boolean) => {
    setStartOnBoot(val);
    localStorage.setItem('fm_start_on_boot', String(val));
    if (window.electronAPI?.setAutoLaunch) {
      window.electronAPI.setAutoLaunch(val).catch((err) => {
        console.error('Error toggling auto-launch in Electron:', err);
      });
    } else if (val) {
      // In web browser preview mode, show manual startup helper guide
      setShowAutostartGuideModal(true);
    }
  };

  const downloadWindowsAutostartBat = () => {
    const currentUrl = window.location.href;
    const batContent = `@echo off
:: OverDesk Auto-Start Script for Windows Startup
:: Place this file in your Windows Startup Folder (press Win+R -> type shell:startup -> press Enter)
title Launching OverDesk...
start "" "${currentUrl}"
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OverDesk-AutoStart.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [taskReminders, setTaskReminders] = useState<Record<string, TaskReminder>>(() => {
    try {
      const saved = localStorage.getItem('fm_task_reminders');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [taskAlarmsEnabled, setTaskAlarmsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_task_alarms_enabled');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [activeCalendarTask, setActiveCalendarTask] = useState<{ modeKey: string; taskText: string; taskIdx: number } | null>(null);
  const [activeAlarmModal, setActiveAlarmModal] = useState<TaskReminder | null>(null);

  const handleToggleTaskAlarmsEnabled = (val: boolean) => {
    setTaskAlarmsEnabled(val);
    localStorage.setItem('fm_task_alarms_enabled', String(val));
  };

  const handleSaveTaskReminder = (reminderData: Omit<TaskReminder, 'id'>) => {
    const remKey = `${reminderData.modeKey}_${reminderData.taskIdx}`;
    if (!reminderData.time || reminderData.time.trim() === '') {
      handleDeleteTaskReminder(reminderData.taskIdx, reminderData.modeKey);
      return;
    }
    const newRem: TaskReminder = {
      ...reminderData,
      id: remKey,
    };
    const updated = {
      ...taskReminders,
      [remKey]: newRem,
    };
    setTaskReminders(updated);
    localStorage.setItem('fm_task_reminders', JSON.stringify(updated));
  };

  const handleDeleteTaskReminder = (taskIdx: number, mKey?: string) => {
    const targetMode = mKey || activeCalendarTask?.modeKey || currentMode;
    if (!targetMode) return;
    const remKey = `${targetMode}_${taskIdx}`;
    const targetTaskText =
      (activeCalendarTask?.modeKey === targetMode && activeCalendarTask.taskIdx === taskIdx)
        ? activeCalendarTask.taskText
        : (modes[targetMode]?.options?.[taskIdx] || activeCalendarTask?.taskText);

    const updated = { ...taskReminders };

    Object.keys(updated).forEach((k) => {
      const r = updated[k];
      if (
        k === remKey ||
        (r && r.modeKey === targetMode && r.taskIdx === taskIdx) ||
        (r && targetTaskText && r.modeKey === targetMode && r.taskText === targetTaskText) ||
        (r && r.modeKey === targetMode && !modes[targetMode]?.options?.[r.taskIdx])
      ) {
        delete updated[k];
      }
    });

    setTaskReminders(updated);
    localStorage.setItem('fm_task_reminders', JSON.stringify(updated));
  };

  const handleDeleteAllTaskReminders = () => {
    setTaskReminders({});
    localStorage.setItem('fm_task_reminders', JSON.stringify({}));
  };

  const handleSnoozeAlarm = (minutes = 5) => {
    if (!activeAlarmModal) return;
    const rem = activeAlarmModal;
    const remKey = `${rem.modeKey}_${rem.taskIdx}`;

    const now = new Date();
    const snoozeDate = new Date(now.getTime() + minutes * 60 * 1000);
    const snoozeYMD = `${snoozeDate.getFullYear()}-${String(snoozeDate.getMonth() + 1).padStart(2, '0')}-${String(snoozeDate.getDate()).padStart(2, '0')}`;
    const snoozeTime = `${String(snoozeDate.getHours()).padStart(2, '0')}:${String(snoozeDate.getMinutes()).padStart(2, '0')}`;

    const updatedRem: TaskReminder = {
      ...rem,
      date: snoozeYMD,
      time: snoozeTime,
      enabled: true,
      triggered: false,
    };

    setTaskReminders((prev) => {
      const next = {
        ...prev,
        [remKey]: updatedRem,
      };
      localStorage.setItem('fm_task_reminders', JSON.stringify(next));
      return next;
    });

    setActiveAlarmModal(null);
    playSoundChime('check');
  };

  const markTaskDoneFromAlarm = (modeKey: string, taskText: string) => {
    if (!modes[modeKey]) return;
    const currentOptions = modes[modeKey].options || [];
    let idx = currentOptions.findIndex((opt) => opt === taskText);
    if (idx === -1) return;

    setSelections((prevSelMap) => {
      const activeList = prevSelMap[modeKey] || [];
      if (activeList.includes(idx)) {
        return prevSelMap; // Already checked
      }

      const updated = [...activeList, idx];
      playSoundChime('check');

      if (autoMoveCompleted) {
        const uncheckedIdxs = currentOptions.map((_, i) => i).filter((i) => !updated.includes(i));
        const checkedIdxs = currentOptions.map((_, i) => i).filter((i) => updated.includes(i));

        const otherChecked = checkedIdxs.filter((i) => i !== idx);
        const finalCheckedIdxs = [...otherChecked, idx];

        const finalOrderIdxs = [...uncheckedIdxs, ...finalCheckedIdxs];
        const newOptions = finalOrderIdxs.map((i) => currentOptions[i]);
        const newSelIndices = Array.from({ length: finalCheckedIdxs.length }, (_, i) => uncheckedIdxs.length + i);

        setModes((prevModes) => {
          const updatedModes = {
            ...prevModes,
            [modeKey]: {
              ...prevModes[modeKey],
              options: newOptions,
            },
          };
          localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
          return updatedModes;
        });

        const nextSelMap = { ...prevSelMap, [modeKey]: newSelIndices };
        localStorage.setItem('fm_sel_' + modeKey, JSON.stringify(newSelIndices));
        return nextSelMap;
      } else {
        const nextSelMap = { ...prevSelMap, [modeKey]: updated };
        localStorage.setItem('fm_sel_' + modeKey, JSON.stringify(updated));
        return nextSelMap;
      }
    });
  };

  // Alarm trigger interval checking (checks every 1 second)
  useEffect(() => {
    if (!taskAlarmsEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const curYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      Object.entries(taskReminders).forEach(([remKey, remValue]) => {
        const rem = remValue as TaskReminder;
        if (rem.enabled && !rem.triggered && rem.date === curYMD && rem.time === curTime) {
          playModernChime(); // Rings 3 times
          setActiveAlarmModal(rem);

          // Mark task done and move down if autoMoveCompleted is enabled
          markTaskDoneFromAlarm(rem.modeKey, rem.taskText);

          setTaskReminders((prev) => {
            const next = {
              ...prev,
              [remKey]: { ...(prev[remKey] as TaskReminder), triggered: true },
            };
            localStorage.setItem('fm_task_reminders', JSON.stringify(next));
            return next;
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [taskAlarmsEnabled, taskReminders, autoMoveCompleted]);

  const handleAnimationsEnabledChange = (val: boolean) => {
    setAnimationsEnabled(val);
    localStorage.setItem('fm_animations_enabled', String(val));
  };

  // Wallpaper Background State & Handlers
  const [wallpaperUrl, setWallpaperUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fm_wallpaper_url');
      return saved !== null ? saved : wallpaperExecutiveArt;
    } catch (e) {
      return wallpaperExecutiveArt;
    }
  });

  const [customWallpapers, setCustomWallpapers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fm_custom_wallpapers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // If there's an existing saved custom wallpaperUrl not in PRESET_WALLPAPERS, populate it
    const initialUrl = localStorage.getItem('fm_wallpaper_url');
    if (initialUrl && !PRESET_WALLPAPERS.some((wp) => wp.url === initialUrl)) {
      return [initialUrl];
    }
    return [];
  });

  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_wallpaper_opacity');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch (e) {}
    return 60;
  });

  const wallpaperFileInputRef = useRef<HTMLInputElement>(null);

  const handleWallpaperUrlChange = (url: string) => {
    setWallpaperUrl(url);
    localStorage.setItem('fm_wallpaper_url', url);
  };

  const handleWallpaperOpacityChange = (val: number) => {
    setWallpaperOpacity(val);
    localStorage.setItem('fm_wallpaper_opacity', String(val));
  };

  const MAX_WALLPAPER_SIZE = 3 * 1024 * 1024; // 3MB

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_WALLPAPER_SIZE) {
      setImportStatus({
        type: 'error',
        message: `File size exceeds 3MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please choose a file under 3MB.`,
      });
      setTimeout(() => setImportStatus(null), 4500);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomWallpapers((prev) => {
          const updated = [result, ...prev.filter((url) => url !== result)].slice(0, 8);
          try {
            localStorage.setItem('fm_custom_wallpapers', JSON.stringify(updated));
          } catch (err) {
            console.warn('LocalStorage quota reached for custom wallpapers', err);
          }
          return updated;
        });
        handleWallpaperUrlChange(result);
        const isVid = file.type.startsWith('video/') || isVideoUrl(result);
        setImportStatus({
          type: 'success',
          message: isVid ? 'Video wallpaper applied! ✓' : 'Wallpaper image applied! ✓',
        });
        setTimeout(() => setImportStatus(null), 3500);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteCustomWallpaper = (e: React.MouseEvent, urlToDelete: string) => {
    e.stopPropagation();
    setCustomWallpapers((prev) => {
      const updated = prev.filter((url) => url !== urlToDelete);
      try {
        localStorage.setItem('fm_custom_wallpapers', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    if (wallpaperUrl === urlToDelete) {
      handleWallpaperUrlChange(wallpaperExecutiveArt);
    }
  };

  // Import & Export Checklist State & Handlers
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExportChecklist = () => {
    try {
      let txtContent = ``;

      Object.entries(modes).forEach(([_, mVal]) => {
        const detail = mVal as ModeDetail;
        txtContent += `[${detail.title}]\n`;
        detail.options.forEach((opt) => {
          txtContent += `- ${opt}\n`;
        });
        txtContent += `\n`;
      });

      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txtContent.trim());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `overdesk_checklist_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({ type: 'success', message: 'Exported checklist to .txt successfully!' });
      setTimeout(() => setImportStatus(null), 3500);
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Export failed.' });
    }
  };

  const generateChecklistTemplate = () => {
    try {
      const templateTxt = `[Work & Office]
- Review client proposals
- Team sync & project status
- Approve pending invoices
- Quarterly goal check-in

[Everyday Life]
- Morning coffee & planning
- Grocery list & errands
- 30 min workout or walk
- Evening downtime & book

[PC & Workstation]
- Clean desktop & downloads
- System & security updates
- Backup important files
- Organize workspace tabs

[Focus & DND]
- Deep work block
- Mute phone & chat alerts
- Close distraction tabs
- Single-task until finished

[Daily Schedule]
- Check today's calendar
- Review top 3 priorities
- Follow up on key emails
- End-of-day summary
`;

      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(templateTxt.trim());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'checklist_template.txt');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({ type: 'success', message: 'Standard 5-mode template downloaded! Edit & import anytime.' });
      setTimeout(() => setImportStatus(null), 3500);
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Failed to download template.' });
    }
  };

  const handleImportChecklistFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = (event.target?.result as string) || '';

        const itemsToProcess: Array<{
          id: string;
          heading: string;
          items: string[];
          accent?: string;
          soft?: string;
          icon?: string;
        }> = [];

        // Check if content looks like JSON
        let isJson = false;
        try {
          const trimmed = content.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            const parsed = JSON.parse(content);
            isJson = true;

            if (Array.isArray(parsed.checklists)) {
              parsed.checklists.forEach((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return;
                const id = item.id || item.key || `mode_${idx + 1}`;
                const rawHeading = String(item.heading || item.title || item.name || `Checklist ${idx + 1}`).trim();
                const heading = rawHeading.slice(0, 30) || `Checklist ${idx + 1}`;
                const rawItems = item.items || item.options || item.tasks || [];
                const items = Array.isArray(rawItems)
                  ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                  : [];
                itemsToProcess.push({
                  id,
                  heading,
                  items: items.length > 0 ? items : ['New task item'],
                  accent: item.accent,
                  soft: item.soft,
                  icon: item.icon,
                });
              });
            } else if (parsed.modes && typeof parsed.modes === 'object') {
              Object.entries(parsed.modes).forEach(([mKey, mVal]: [string, any]) => {
                if (!mVal || typeof mVal !== 'object') return;
                const rawHeading = String(mVal.title || mVal.heading || mVal.name || 'Custom Mode').trim();
                const heading = rawHeading.slice(0, 30) || 'Custom Mode';
                const rawItems = mVal.options || mVal.items || mVal.tasks || [];
                const items = Array.isArray(rawItems)
                  ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                  : [];
                itemsToProcess.push({
                  id: mKey,
                  heading,
                  items: items.length > 0 ? items : ['New task item'],
                  accent: mVal.accent,
                  soft: mVal.soft,
                  icon: mVal.icon || (parsed.iconAssignments ? parsed.iconAssignments[mKey] : undefined),
                });
              });
            } else if (Array.isArray(parsed)) {
              if (parsed.every((x) => typeof x === 'string')) {
                itemsToProcess.push({
                  id: 'imported',
                  heading: 'Imported Checklist',
                  items: parsed.map((s) => String(s).trim().slice(0, 100)).filter(Boolean),
                });
              } else {
                parsed.forEach((item: any, idx: number) => {
                  if (!item || typeof item !== 'object') return;
                  const id = item.id || item.key || `mode_${idx + 1}`;
                  const rawHeading = String(item.heading || item.title || item.name || `Checklist ${idx + 1}`).trim();
                  const heading = rawHeading.slice(0, 30) || `Checklist ${idx + 1}`;
                  const rawItems = item.items || item.options || item.tasks || [];
                  const items = Array.isArray(rawItems)
                    ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                    : [];
                  itemsToProcess.push({
                    id,
                    heading,
                    items: items.length > 0 ? items : ['New task item'],
                    accent: item.accent,
                    soft: item.soft,
                    icon: item.icon,
                  });
                });
              }
            }
          }
        } catch {
          isJson = false;
        }

        // If not JSON or JSON produced no items, parse as plain .txt format!
        if (!isJson || itemsToProcess.length === 0) {
          const lines = content.split(/\r?\n/);
          let currentHeading = 'Imported Checklist';
          let currentId = 'imported';
          let currentItems: string[] = [];
          let modeCount = 0;

          const flushCurrent = () => {
            if (currentItems.length > 0 || modeCount > 0) {
              const cleanHeading = currentHeading.replace(/^\[+|\]+$/g, '').trim().slice(0, 30) || 'Checklist';
              itemsToProcess.push({
                id: currentId,
                heading: cleanHeading,
                items: currentItems.length > 0 ? currentItems : ['New task item'],
              });
            }
          };

          lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Strict comment line filter: Ignore ANY line starting with #, //, or --
            if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('--')) {
              return;
            }

            // Heading match 1: [Heading Name]
            const bracketMatch = trimmed.match(/^\[([^\]]+)\]$/);
            // Heading match 2: Colon heading like "Work & Projects:" (short, under 32 chars)
            const colonMatch = trimmed.length <= 32 ? trimmed.match(/^([A-Za-z0-9\s&'-]{2,32}):$/) : null;
            // Heading match 3: MODE: Heading Name
            const modePrefixMatch = trimmed.match(/^(?:MODE|LIST|CHECKLIST)\s*:\s*(.+)$/i);

            const matchedHeading = bracketMatch
              ? bracketMatch[1].trim()
              : (colonMatch
                  ? colonMatch[1].trim()
                  : (modePrefixMatch
                      ? modePrefixMatch[1].trim()
                      : null));

            if (matchedHeading) {
              if (currentItems.length > 0 || modeCount > 0) {
                flushCurrent();
              }
              modeCount++;
              const cleanH = matchedHeading.replace(/^\[+|\]+$/g, '').trim().slice(0, 30);
              currentHeading = cleanH || `Checklist ${modeCount}`;
              currentId = cleanH.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `mode_${modeCount}`;
              currentItems = [];
            } else {
              // Regular item line - clean leading bullet formatting (- *, •, 1., [ ], [x], etc.)
              let cleanItem = trimmed.replace(/^([-*•+]|\[[ xX]?\]|\d+[\.\)])\s*/, '').trim();
              if (cleanItem) {
                currentItems.push(cleanItem.slice(0, 100));
              }
            }
          });

          if (currentItems.length > 0 || (modeCount > 0 && itemsToProcess.length === 0)) {
            flushCurrent();
          }
        }

        // Strict 5 mode requirement check
        if (itemsToProcess.length !== 5) {
          setImportStatus({
            type: 'error',
            message: `Import failed: Standard 5 modes required (found ${itemsToProcess.length}). Files with fewer or more modes cannot be imported.`,
          });
          return;
        }

        const standardKeys = ['work', 'life', 'pc', 'sync', 'alerts'];
        const importedModes: Record<string, ModeDetail> = {};
        const importedSelections: Record<string, number[]> = {};
        const importedIcons: Record<string, string> = { ...iconAssignments };

        itemsToProcess.forEach((item, index) => {
          const mKey = standardKeys[index] || `mode_${index + 1}`;
          const existingModeData = modes[mKey];
          const defaultAccentList = [
            'rgba(30, 140, 255, 0.9)',
            'rgba(0, 190, 80, 0.9)',
            'rgba(140, 0, 225, 0.9)',
            'rgba(215, 25, 75, 0.9)',
            'rgba(220, 100, 0, 0.9)',
          ];
          const defaultSoftList = [
            'rgba(60, 170, 255, 0.18)',
            'rgba(0, 230, 100, 0.16)',
            'rgba(170, 0, 255, 0.16)',
            'rgba(255, 40, 100, 0.16)',
            'rgba(255, 140, 0, 0.18)',
          ];
          const defaultIcons = ['briefcase', 'home', 'laptop', 'shield', 'calendar'];

          const accent = item.accent || existingModeData?.accent || defaultAccentList[index % defaultAccentList.length];
          const soft = item.soft || existingModeData?.soft || defaultSoftList[index % defaultSoftList.length];

          importedModes[mKey] = {
            title: item.heading,
            accent,
            soft,
            defaultAccent: existingModeData?.defaultAccent || accent,
            defaultSoft: existingModeData?.defaultSoft || soft,
            options: item.items,
          };

          importedSelections[mKey] = [];

          if (item.icon) {
            importedIcons[mKey] = item.icon;
          } else if (iconAssignments[mKey]) {
            importedIcons[mKey] = iconAssignments[mKey];
          } else {
            importedIcons[mKey] = defaultIcons[index % defaultIcons.length];
          }
        });

        setModes(importedModes);
        setSelections(importedSelections);
        setIconAssignments(importedIcons);

        localStorage.setItem('fm_modes', JSON.stringify(importedModes));
        localStorage.setItem('fm_icons', JSON.stringify(importedIcons));
        Object.keys(importedModes).forEach((k) => {
          localStorage.setItem('fm_sel_' + k, JSON.stringify(importedSelections[k] || []));
        });

        const firstKey = standardKeys[0];
        if (firstKey) {
          setCurrentMode(firstKey);
        }

        playSoundChime('complete');
        setImportStatus({
          type: 'success',
          message: `Imported standard 5-mode checklist successfully! ✓`,
        });
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Failed to parse text file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset App logic (Double click to confirm)
  const [resetConfirming, setResetConfirming] = useState<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performAppReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }

    setModes(JSON.parse(JSON.stringify(DEFAULT_MODES)));
    setIconAssignments({
      business: 'briefcase',
      life: 'coffee',
      pc: 'pc',
      sync: 'sync',
      alerts: 'bell',
    });
    setCustomIcons({});
    setCurrentMode('business');
    setEditMode(false);
    setIsLight(false);
    setMinimized(false);
    setScale(1);
    setShowCountdown(true);
    setCountdownDuration(300);
    setCountdownTimeLeft(300);
    setIsTimerRunning(false);
    setAlarmEnabled(true);
    setAnimateMinimizedText(true);
    setAutoMoveCompleted(true);
    setAnimationsEnabled(true);
    setWallpaperUrl(wallpaperExecutiveArt);
    setCustomWallpapers([]);
    setWallpaperOpacity(60);
    setResetConfirming(false);
    setImportStatus({ type: 'success', message: 'App reset to default settings successfully! ✓' });
    setTimeout(() => setImportStatus(null), 3500);
  };

  const handleResetAppClick = () => {
    if (resetConfirming) {
      performAppReset();
    } else {
      setResetConfirming(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setResetConfirming(false);
      }, 3500);
    }
  };

  const handleResetAppDoubleClick = () => {
    performAppReset();
  };

  // Everyday Reminder State (Minimized Mode - Max 16 words & 100 chars)
  const clampWords = (text: string, maxWords: number = 16, maxChars: number = 100) => {
    let trimmed = text.trim();
    if (trimmed.length > maxChars) {
      trimmed = trimmed.slice(0, maxChars);
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      return words.slice(0, maxWords).join(' ');
    }
    return trimmed;
  };

  const [reminderText, setReminderText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fm_reminder_text');
      const text = saved || 'Focus on what matters today. 💡';
      return clampWords(text, 16);
    } catch (e) {
      return 'Focus on what matters today. 💡';
    }
  });
  const [isEditingReminder, setIsEditingReminder] = useState<boolean>(false);
  const [tempReminderText, setTempReminderText] = useState<string>('');

  const handleSaveReminder = () => {
    const trimmed = tempReminderText.trim() || 'Focus on what matters today. 💡';
    const clamped = clampWords(trimmed, 16);
    setReminderText(clamped);
    setIsEditingReminder(false);
    localStorage.setItem('fm_reminder_text', clamped);
  };

  const getReminderFontSize = (textStr: string) => {
    const len = textStr.length;
    if (len > 60) return '14px';
    if (len > 30) return '17px';
    return '21px';
  };

  // License & Trial State
  const [licenseActive, setLicenseActive] = useState<boolean>(() => {
    try {
      const cachedActive = localStorage.getItem('fm_license_active');
      if (cachedActive === '1') return true;

      const localKey = localStorage.getItem('fm_license_key');
      const localType = localStorage.getItem('fm_license_type');
      const localExp = localStorage.getItem('fm_license_expires_at');
      const localTrialStart = localStorage.getItem('fm_trial_start');

      if (localKey) {
        if (localType === 'lifetime' || !localExp) return true;
        const expMs = parseInt(localExp, 10);
        if (!isNaN(expMs) && Date.now() <= expMs) return true;
      } else if (localTrialStart) {
        const startMs = parseInt(localTrialStart, 10);
        const expMs = startMs + 5 * 24 * 60 * 60 * 1000;
        if (Date.now() <= expMs) return true;
      }
    } catch (e) {}
    return false;
  });
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [licenseError, setLicenseError] = useState<boolean>(false);
  const [licenseAPIErrorText, setLicenseAPIErrorText] = useState<string>('');
  const [trialUsed, setTrialUsed] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('fm_trial_used') === '1') return true;
      const trialStart = localStorage.getItem('fm_trial_start');
      if (trialStart) {
        const startMs = parseInt(trialStart, 10);
        if (!isNaN(startMs) && Date.now() > startMs + (5 * 24 * 60 * 60 * 1000)) return true;
      }
    } catch (e) {}
    return false;
  });
  const [licenseType, setLicenseType] = useState<'lifetime' | 'annual' | 'trial' | 'none'>(() => {
    try {
      const savedType = localStorage.getItem('fm_license_type') as any;
      if (savedType === 'lifetime' || savedType === 'annual' || savedType === 'trial') {
        return savedType;
      }
      const savedKey = localStorage.getItem('fm_license_key');
      if (savedKey) {
        const exp = localStorage.getItem('fm_license_expires_at');
        return exp ? 'annual' : 'lifetime';
      }
      const trialStart = localStorage.getItem('fm_trial_start');
      if (trialStart) {
        return 'trial';
      }
    } catch (e) {}
    return 'none';
  });
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(() => {
    try {
      const savedType = localStorage.getItem('fm_license_type');
      if (savedType === 'lifetime' || savedType === 'annual') return null;
      const trialStart = localStorage.getItem('fm_trial_start');
      if (trialStart) {
        const startMs = parseInt(trialStart, 10);
        const expMs = startMs + 5 * 24 * 60 * 60 * 1000;
        if (Date.now() <= expMs) {
          return Math.max(1, Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24)));
        }
      }
    } catch (e) {}
    return null;
  });

  // Drag reorder states
  const isDraggingModeRef = useRef<boolean>(false);
  const [modeDragState, setModeDragState] = useState<{
    activeKey: string;
    fromIdx: number;
    currentIdx: number;
    startX: number;
    currentX: number;
  } | null>(null);
  const draggedModeIdxRef = useRef<number | null>(null);
  const [draggedModeIdx, setDraggedModeIdx] = useState<number | null>(null);
  const [dragOverModeIdx, setDragOverModeIdx] = useState<number | null>(null);
  const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);
  const isDraggingOptionRef = useRef<boolean>(false);
  const [optionDragState, setOptionDragState] = useState<{
    fromIdx: number;
    currentIdx: number;
    startY: number;
    currentY: number;
  } | null>(null);

  // Modular Modes Storage
  const [modes, setModes] = useState<Record<string, ModeDetail>>(() => {
    try {
      const saved = localStorage.getItem('fm_modes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          const mergedObj: Record<string, ModeDetail> = {};
          Object.keys(parsed).forEach((k) => {
            const def = DEFAULT_MODES[k];
            const opts = Array.isArray(parsed[k]?.options) ? parsed[k].options : (def?.options || []);
            const baseOpts = Array.isArray(parsed[k]?.baseOptions) ? parsed[k].baseOptions : (def?.baseOptions || [...opts]);
            mergedObj[k] = {
              title: parsed[k]?.title || def?.title || k,
              accent: parsed[k]?.accent || def?.accent || 'rgba(30, 140, 255, 0.9)',
              soft: parsed[k]?.soft || def?.soft || 'rgba(60, 170, 255, 0.18)',
              defaultAccent: parsed[k]?.defaultAccent || def?.defaultAccent || 'rgba(30, 140, 255, 0.9)',
              defaultSoft: parsed[k]?.defaultSoft || def?.defaultSoft || 'rgba(60, 170, 255, 0.18)',
              options: opts,
              baseOptions: baseOpts,
            };
          });
          // Ensure default modes exist if not deleted
          Object.keys(DEFAULT_MODES).forEach((k) => {
            if (!mergedObj[k]) {
              mergedObj[k] = DEFAULT_MODES[k];
            }
          });
          if (Object.keys(mergedObj).length > 0) return mergedObj;
        }
      }
    } catch (e) {}
    return DEFAULT_MODES;
  });

  // Current selections for each mode
  const [selections, setSelections] = useState<Record<string, number[]>>(() => {
    const defaultSels: Record<string, number[]> = {};
    let modeKeys = Object.keys(DEFAULT_MODES);
    try {
      const savedModes = localStorage.getItem('fm_modes');
      if (savedModes) {
        const parsed = JSON.parse(savedModes);
        if (parsed && typeof parsed === 'object') {
          modeKeys = Array.from(new Set([...modeKeys, ...Object.keys(parsed)]));
        }
      }
    } catch (e) {}

    modeKeys.forEach((m) => {
      try {
        const savedS = localStorage.getItem('fm_sel_' + m);
        if (savedS) {
          defaultSels[m] = JSON.parse(savedS);
        } else {
          defaultSels[m] = [];
        }
      } catch (e) {
        defaultSels[m] = [];
      }
    });
    return defaultSels;
  });

  // Mode customizer icons assignment
  const [iconAssignments, setIconAssignments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('fm_icons');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      business: 'briefcase',
      life: 'home',
      pc: 'laptop',
      sync: 'shield',
      alerts: 'calendar',
    };
  });

  // Custom uploaded icons state
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [customIcons, setCustomIcons] = useState<Record<string, { label: string; src: string; format: 'svg' | 'png' }>>(() => {
    try {
      const saved = localStorage.getItem('fm_custom_icons');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  // Scale tracking (from localStorage)
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_scale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= 0.4 && parsed <= 2.2) return parsed;
      }
    } catch (e) {}
    return 1.0;
  });

  // Card Vertical Extension Extra Height (Max +50% base length down, 0 minimum)
  const [extraHeight, setExtraHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_extra_height');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 0;
  });

  // Customizer picker state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerTargetMode, setPickerTargetMode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Title focus, item editing tracking
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState<string>('');

  // Mode completion water splash state
  const [completedSplashMode, setCompletedSplashMode] = useState<string | null>(null);
  const splashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCompletedSplash = (modeKey: string) => {
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    setCompletedSplashMode(modeKey);
    splashTimerRef.current = setTimeout(() => {
      setCompletedSplashMode(null);
    }, 3000);
  };

  // Auto Updater State
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateInstalling, setUpdateInstalling] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');

  // Card Draggability (pointer-based with long press) State
  const [translate, setTranslate] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return { x: 0, y: 0 };
    }
    try {
      const saved = localStorage.getItem('fm_translate');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  });
  const [isGripped, setIsGripped] = useState<boolean>(false);

  const dragPointerRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startTX: number;
    startTY: number;
    timer: NodeJS.Timeout | null;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTX: 0,
    startTY: 0,
    timer: null,
  });

  const justDraggedRef = useRef<boolean>(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const lastMinimizedRef = useRef<boolean>(minimized);
  const lastUnminimizedHeightRef = useRef<number>(480);
  const transitionTimerRef = useRef<any>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);

  const isDraggable = (target: HTMLElement): boolean => {
    let curr: HTMLElement | null = target;
    while (curr && curr !== cardRef.current) {
      if (
        curr.classList?.contains('no-drag') ||
        ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(curr.tagName) ||
        curr.closest('button') ||
        curr.closest('input') ||
        curr.closest('.icon-btn') ||
        curr.closest('.icon-wrap') ||
        curr.closest('.mode-drag-handle') ||
        curr.closest('.edit-toggle') ||
        curr.closest('.settings-toggle') ||
        curr.closest('.settings-body') ||
        curr.closest('.setting-section') ||
        curr.closest('.wallpaper-opacity-slider') ||
        curr.closest('.countdown-timer') ||
        curr.closest('.countdown-timer-edit') ||
        curr.closest('#countdown-timer-widget') ||
        curr.closest('.close-btn') ||
        curr.closest('.add-btn') ||
        curr.closest('.theme-switch') ||
        curr.closest('.minimize-pill') ||
        curr.closest('.minimize-bar') ||
        curr.closest('.resize-handle') ||
        curr.closest('.reset-wrap') ||
        curr.closest('.color-swatch') ||
        curr.closest('.color-custom-wrap') ||
        curr.closest('.picker-grid') ||
        curr.closest('.check-box') ||
        curr.closest('.del-btn')
      ) {
        return false;
      }
      curr = curr.parentElement;
    }
    return true;
  };

  const handleModePointerDown = (e: React.PointerEvent, mKey: string, mIdx: number) => {
    if (!editMode) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    isDraggingModeRef.current = false;

    setModeDragState({
      activeKey: mKey,
      fromIdx: mIdx,
      currentIdx: mIdx,
      startX,
      currentX: startX,
    });

    const modeKeys = Object.keys(modes);
    const totalCount = modeKeys.length;
    const itemWidth = 58; // 50px icon width + 8px gap

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      if (Math.abs(deltaX) > 4) {
        isDraggingModeRef.current = true;
      }

      const rawStep = Math.round(deltaX / itemWidth);
      const targetIdx = Math.max(0, Math.min(totalCount - 1, mIdx + rawStep));

      setModeDragState({
        activeKey: mKey,
        fromIdx: mIdx,
        currentIdx: targetIdx,
        startX,
        currentX: moveEv.clientX,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setModeDragState((prev) => {
        if (prev) {
          if (prev.currentIdx !== prev.fromIdx) {
            moveMode(prev.fromIdx, prev.currentIdx);
          }
          setEditingTitle(false);
          setEditingItemIdx(null);
          setCurrentMode(prev.activeKey);
        }
        return null;
      });

      setTimeout(() => {
        isDraggingModeRef.current = false;
      }, 100);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleOptionPointerDown = (e: React.PointerEvent, optionIdx: number) => {
    if (!editMode) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('.check-box') ||
      target.closest('.del-btn') ||
      target.closest('.reorder-item-btn') ||
      target.closest('.option-clock-btn')
    ) {
      return;
    }
    e.stopPropagation();

    const startY = e.clientY;
    isDraggingOptionRef.current = false;

    setOptionDragState({
      fromIdx: optionIdx,
      currentIdx: optionIdx,
      startY,
      currentY: startY,
    });

    const totalOptions = modes[currentMode]?.options.length || 0;
    const itemHeight = 49; // item height + margin-bottom

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaY = moveEv.clientY - startY;
      if (Math.abs(deltaY) > 3) {
        isDraggingOptionRef.current = true;
      }

      const rawStep = Math.round(deltaY / itemHeight);
      const targetIdx = Math.max(0, Math.min(totalOptions - 1, optionIdx + rawStep));

      setOptionDragState({
        fromIdx: optionIdx,
        currentIdx: targetIdx,
        startY,
        currentY: moveEv.clientY,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setOptionDragState((prev) => {
        if (prev) {
          if (prev.currentIdx !== prev.fromIdx) {
            moveOption(prev.fromIdx, prev.currentIdx);
          }
        }
        return null;
      });

      setTimeout(() => {
        isDraggingOptionRef.current = false;
      }, 100);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.electronAPI) return; // Native -webkit-app-region: drag handles physical layout movement in Electron
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (!isDraggable(target)) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startTX = translate.x;
    const startTY = translate.y;

    if (dragPointerRef.current.timer) {
      clearTimeout(dragPointerRef.current.timer);
    }

    let isDraggingActive = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;

      if (!isDraggingActive) {
        if (Math.hypot(dx, dy) >= 3) {
          isDraggingActive = true;
          setIsGripped(true);
          dragPointerRef.current.dragging = true;
        } else {
          return;
        }
      }

      setTranslate({
        x: startTX + dx,
        y: startTY + dy,
      });
    };

    const onPointerUp = () => {
      if (isDraggingActive) {
        isDraggingActive = false;
        setIsGripped(false);
        dragPointerRef.current.dragging = false;
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 80);
      }

      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  };

  const handleCardPointerMove = () => {
    // Handled globally at window level for complete robustness
  };

  const handleCardPointerUp = () => {
    // Handled globally at window level for complete robustness
  };

  // ── Audio Tone Synthesizer Chimes ──
  const playSoundChime = (type: 'check' | 'complete' | 'reset') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'complete') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'check') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'reset') {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  // ── Sync states on load ──
  useEffect(() => {
    // Ensure state version flag is recorded without wiping user data
    if (!localStorage.getItem('fm_state_ver')) {
      localStorage.setItem('fm_state_ver', '4.0');
    }

    // Determine stored Theme
    const isLightStored = localStorage.getItem('fm_theme') === '1';
    setIsLight(isLightStored);

    // Initial check license and trial trigger
    if (window.electronAPI) {
      document.body.classList.add('electron');
      window.electronAPI.checkLicense().then((res) => {
        if (res.ok) {
          setLicenseActive(true);
          localStorage.setItem('fm_license_active', '1');
          const type = res.type || 'lifetime';
          setLicenseType(type);
          if (type === 'lifetime' || type === 'annual') {
            setTrialDaysLeft(null);
            localStorage.removeItem('fm_trial_start');
          } else if (res.trialDaysLeft !== undefined) {
            setTrialDaysLeft(res.trialDaysLeft);
          }
          if (res.trialUsed) {
            setTrialUsed(true);
            localStorage.setItem('fm_trial_used', '1');
          }
        } else {
          setLicenseActive(false);
          localStorage.setItem('fm_license_active', '0');
          setLicenseType('none');
          if (res.trialUsed) {
            setTrialUsed(true);
            localStorage.setItem('fm_trial_used', '1');
          }
          if (res.expiredMessage) {
            setLicenseAPIErrorText(res.expiredMessage);
          }
        }
      });

      // Hook up Electron automatic updater listeners (silent background updates)
      window.electronAPI.onUpdateAvailable((version) => {
        setUpdateVersion(version);
        setUpdateAvailable(true);
        setUpdateStatusText(`Update found (v${version}). Downloading & installing automatically...`);
      });

      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateVersion((prev) => prev + ' (Installing)');
        setUpdateStatusText('Update downloaded! Installing and restarting automatically...');
      });

      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatusText('You are using the latest version (v1.3.2).');
      });

      window.electronAPI.onUpdateError(() => {
        setUpdateStatusText('App is up to date (v1.3.2).');
      });
    } else {
      // Web / browser preview fallback
      const localKey = localStorage.getItem('fm_license_key');
      const localType = localStorage.getItem('fm_license_type') as 'lifetime' | 'annual' | 'trial' | null;
      const localExp = localStorage.getItem('fm_license_expires_at');
      const localTrialStart = localStorage.getItem('fm_trial_start');
      const localTrialUsed = localStorage.getItem('fm_trial_used') === '1';

      if (localTrialUsed) setTrialUsed(true);

      if (localKey) {
        if (localType === 'lifetime' || (!localExp && localType !== 'trial')) {
          setLicenseActive(true);
          localStorage.setItem('fm_license_active', '1');
          setLicenseType('lifetime');
          setTrialDaysLeft(null);
          localStorage.removeItem('fm_trial_start');
        } else {
          const expMs = parseInt(localExp || '0', 10);
          if (!isNaN(expMs) && Date.now() <= expMs) {
            setLicenseActive(true);
            localStorage.setItem('fm_license_active', '1');
            const resolvedType = localType === 'trial' ? 'trial' : 'annual';
            setLicenseType(resolvedType);
            if (resolvedType === 'trial') {
              const daysLeft = Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24));
              setTrialDaysLeft(daysLeft);
              setTrialUsed(true);
              localStorage.setItem('fm_trial_used', '1');
            } else {
              setTrialDaysLeft(null);
              localStorage.removeItem('fm_trial_start');
            }
          } else {
            setLicenseActive(false);
            localStorage.setItem('fm_license_active', '0');
            setLicenseType('none');
            if (localType === 'trial') {
              setTrialUsed(true);
              localStorage.setItem('fm_trial_used', '1');
              setLicenseAPIErrorText('Your 5-day free trial has expired. Please purchase a license to continue.');
            } else {
              setLicenseAPIErrorText('Your annual license key has expired. Please enter a valid license or purchase a new one at overdesk.store.');
            }
          }
        }
      } else if (localTrialStart && !localTrialUsed) {
        const startMs = parseInt(localTrialStart, 10);
        const expMs = startMs + 5 * 24 * 60 * 60 * 1000;
        if (Date.now() <= expMs) {
          const daysLeft = Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24));
          setLicenseActive(true);
          localStorage.setItem('fm_license_active', '1');
          setLicenseType('trial');
          setTrialDaysLeft(daysLeft);
          setTrialUsed(true);
        } else {
          setLicenseActive(false);
          localStorage.setItem('fm_license_active', '0');
          localStorage.setItem('fm_trial_used', '1');
          setLicenseType('none');
          setTrialUsed(true);
          setLicenseAPIErrorText('Your 5-day free trial has expired. Please purchase a license to continue.');
        }
      } else {
        setLicenseActive(false);
        localStorage.setItem('fm_license_active', '0');
        setLicenseType('none');
        if (localTrialUsed) {
          setLicenseAPIErrorText('Your 5-day free trial has expired. Please purchase a license to continue.');
        }
      }
    }
  }, []);

  // Periodic License & Trial expiration checker loop
  useEffect(() => {
    if (!licenseActive) return;

    const checkExpiration = () => {
      if (licenseType === 'lifetime') {
        // Lifetime licenses never expire - no locking!
        return;
      }

      if (window.electronAPI) {
        window.electronAPI.checkLicense().then((res) => {
          if (!res.ok) {
            setLicenseActive(false);
            setLicenseType('none');
            setLicenseError(true);
            if (res.trialUsed) {
              setTrialUsed(true);
              localStorage.setItem('fm_trial_used', '1');
            }
            if (res.expiredMessage) {
              setLicenseAPIErrorText(res.expiredMessage);
            } else if (licenseType === 'trial') {
              setLicenseAPIErrorText('Your 5-day free trial has expired. Please purchase a license to continue.');
            } else {
              setLicenseAPIErrorText('Your license key has expired. Please enter a valid license at overdesk.store.');
            }
          } else {
            if (res.type === 'lifetime' || res.type === 'annual') {
              setTrialDaysLeft(null);
              localStorage.removeItem('fm_trial_start');
            } else if (res.trialDaysLeft !== undefined) {
              setTrialDaysLeft(res.trialDaysLeft);
            }
          }
        });
      } else {
        // Web fallback expiration check
        if (licenseType === 'trial') {
          const startStr = localStorage.getItem('fm_trial_start');
          if (startStr) {
            const startMs = parseInt(startStr, 10);
            const expMs = startMs + 5 * 24 * 60 * 60 * 1000;
            if (Date.now() > expMs) {
              setLicenseActive(false);
              localStorage.setItem('fm_license_active', '0');
              localStorage.setItem('fm_trial_used', '1');
              setLicenseType('none');
              setTrialUsed(true);
              setLicenseError(true);
              setLicenseAPIErrorText('Your 5-day free trial has expired. Please purchase a license to continue.');
            } else {
              const daysLeft = Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24));
              setTrialDaysLeft(daysLeft);
            }
          }
        } else if (licenseType === 'annual') {
          const expStr = localStorage.getItem('fm_license_expires_at');
          if (expStr) {
            const expMs = parseInt(expStr, 10);
            if (!isNaN(expMs) && Date.now() > expMs) {
              setLicenseActive(false);
              setLicenseType('none');
              setLicenseError(true);
              setLicenseAPIErrorText('Your annual license key has expired. Please enter a valid license or purchase a new one at overdesk.store.');
            }
          }
        }
      }
    };

    const interval = setInterval(checkExpiration, 30000);
    return () => clearInterval(interval);
  }, [licenseActive, licenseType]);

  // Set card accent variables dynamically on change
  useEffect(() => {
    if (cardRef.current) {
      const modeData = modes[currentMode];
      if (modeData) {
        cardRef.current.style.setProperty('--accent', modeData.accent);
        cardRef.current.style.setProperty('--accent-soft', modeData.soft);
      }
    }
  }, [currentMode, modes]);

  // Persist items & configuration on updates
  useEffect(() => {
    localStorage.setItem('fm_modes', JSON.stringify(modes));
    localStorage.setItem('fm_state_ver', '4.0');
  }, [modes]);

  useEffect(() => {
    Object.keys(selections).forEach((m) => {
      localStorage.setItem('fm_sel_' + m, JSON.stringify(selections[m] || []));
    });
  }, [selections]);

  useEffect(() => {
    localStorage.setItem('fm_theme', isLight ? '1' : '0');
  }, [isLight]);

  useEffect(() => {
    localStorage.setItem('fm_icons', JSON.stringify(iconAssignments));
  }, [iconAssignments]);

  useEffect(() => {
    localStorage.setItem('fm_custom_icons', JSON.stringify(customIcons));
  }, [customIcons]);

  useEffect(() => {
    localStorage.setItem('fm_scale', scale.toString());
  }, [scale]);

  useEffect(() => {
    localStorage.setItem('fm_extra_height', extraHeight.toString());
  }, [extraHeight]);

  useEffect(() => {
    localStorage.setItem('fm_translate', JSON.stringify(translate));
  }, [translate]);

  useEffect(() => {
    document.body.classList.toggle('editing', editMode);
    return () => {
      document.body.classList.remove('editing');
    };
  }, [editMode]);

  // Countdown Timer ticking loop
  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = setInterval(() => {
      setCountdownTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          if (alarmEnabled) {
            playModernChime();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, alarmEnabled]);

  // Dynamic custom high-resolution system-tray & window icon canvas render pipeline
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = overdeskLogo;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 256, 256);
            ctx.drawImage(img, 0, 0, 256, 256);
            const dataUrl = canvas.toDataURL('image/png');
            (window as any).electronAPI.saveIcon(dataUrl);
          }
        };
        img.onerror = (err) => {
          console.error('Failed to load SVG logo for dynamic tray icon:', err);
        };
      } catch (err) {
        console.error('Error auto-generating and saving dynamic logo:', err);
      }
    }
  }, []);

  // Handle reporting dynamic visual bounding box to Electron to prevent clipping with ResizeObserver
  useEffect(() => {
    if (!cardRef.current) return;

    const reportBounds = (forceHeight?: number) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const h = forceHeight !== undefined ? forceHeight : cardRef.current.offsetHeight;

      // Update our saved unminimized height ref if we are currently expanded
      if (!minimized && cardRef.current.offsetHeight > 100) {
        lastUnminimizedHeightRef.current = cardRef.current.offsetHeight;
      }

      if (window.electronAPI) {
        window.electronAPI.cardBounds({
          x: rect.left,
          y: rect.top,
          w: 320, // Standard exact card width constant
          h,
          scale,
        });
      }
    };

    const isMinimizedTransition = lastMinimizedRef.current !== minimized;
    lastMinimizedRef.current = minimized;

    if (isMinimizedTransition) {
      isTransitioningRef.current = true;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      if (!minimized) {
        // Expanding (Unminimizing): Instantly expand Electron window to target tall unminimized size
        reportBounds(lastUnminimizedHeightRef.current);
        transitionTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          reportBounds();
        }, 360);
      } else {
        // Collapsing (Minimizing): Keep window size as is during collapse visual, then shrink after transition
        transitionTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          reportBounds();
        }, 365);
      }
    }

    const observer = new ResizeObserver(() => {
      // Ignore intermediate size shifts during active minimize/unminimize CSS transitions
      if (isTransitioningRef.current) return;
      
      // Checklist edits, list item additions, theme changes, or dynamic height changes report instantly
      reportBounds();
    });

    observer.observe(cardRef.current);

    // If not transitioning, adjust immediately
    if (!isTransitioningRef.current) {
      reportBounds();
    }

    return () => {
      observer.disconnect();
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [scale, minimized]);

  // ── Programmatic Scaling Configurations ──
  const sizingRef = useRef({ dragging: false, startX: 0, startScale: 1.0 });
  const handleSizingMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sizingRef.current = { dragging: true, startX: e.clientX, startScale: scale };
    if (window.electronAPI) {
      window.electronAPI.scaleStart();
    }

    const handlePointerMove = (moveEvt: MouseEvent | PointerEvent) => {
      if (!sizingRef.current.dragging) return;
      const deltaX = moveEvt.clientX - sizingRef.current.startX;
      let newScale = sizingRef.current.startScale + (deltaX / 180);
      newScale = Math.max(0.4, Math.min(2.0, Math.round(newScale * 100) / 100));
      setScale(newScale);
    };

    const handlePointerUp = () => {
      if (sizingRef.current.dragging) {
        sizingRef.current.dragging = false;
        if (window.electronAPI) {
          window.electronAPI.scaleEnd(scale);
        }
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const bottomSizingRef = useRef({ dragging: false, startY: 0, startExtra: 0 });

  const handleBottomSizingMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Base card height without current extra extension
    const currentCardH = cardRef.current ? cardRef.current.offsetHeight : 360;
    const baseCardH = currentCardH - extraHeight;
    // Max extension allowed is 0.5 (50%) of base card length
    const maxAllowedExtra = Math.round(baseCardH * 0.5);

    bottomSizingRef.current = { dragging: true, startY: e.clientY, startExtra: extraHeight };
    if (window.electronAPI) {
      window.electronAPI.scaleStart();
    }

    const handlePointerMove = (moveEvt: MouseEvent | PointerEvent) => {
      if (!bottomSizingRef.current.dragging) return;
      const deltaY = (moveEvt.clientY - bottomSizingRef.current.startY) / scale;
      let newExtra = bottomSizingRef.current.startExtra + deltaY;
      newExtra = Math.max(0, Math.min(maxAllowedExtra, Math.round(newExtra)));
      setExtraHeight(newExtra);
    };

    const handlePointerUp = () => {
      if (bottomSizingRef.current.dragging) {
        bottomSizingRef.current.dragging = false;
        if (window.electronAPI) {
          window.electronAPI.scaleEnd(scale);
        }
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleScaleChange = (val: number) => {
    setScale(val);
    if (window.electronAPI) {
      window.electronAPI.scaleStart();
      setTimeout(() => {
        window.electronAPI?.scaleEnd(val);
      }, 50);
    }
  };

  // Handle click-through transparency for regions outside the Visual Card element
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const padding = 6; // micro-padding buffer
      const isInsideRect =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      const isOverCard = isInsideRect || cardRef.current.contains(e.target as Node);
      
      // If we are actively resizing, dragging, we must capture mouse events absolutely
      const forceCapture = isGripped || sizingRef.current?.dragging || bottomSizingRef.current?.dragging;

      if (isOverCard || forceCapture) {
        window.electronAPI.setIgnoreMouseEvents(false);
      } else {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
    };
  }, [isGripped]);

  // ── Gumroad License & Trial Activation ──
  const handleLicenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseInput(e.target.value);
  };

  const handleStartTrial = async () => {
    setLicenseAPIErrorText('');
    setLicenseError(false);

    const hasUsedTrial = trialUsed || localStorage.getItem('fm_trial_used') === '1' || (() => {
      const startStr = localStorage.getItem('fm_trial_start');
      if (!startStr) return false;
      const startMs = parseInt(startStr, 10);
      return !isNaN(startMs) && Date.now() > startMs + (5 * 24 * 60 * 60 * 1000);
    })();

    if (hasUsedTrial) {
      setTrialUsed(true);
      localStorage.setItem('fm_trial_used', '1');
      setLicenseError(true);
      setLicenseAPIErrorText('Your free trial has already been used. Please purchase a license to continue.');
      return;
    }

    if (window.electronAPI && window.electronAPI.startTrial) {
      const res = await window.electronAPI.startTrial();
      if (res.ok) {
        setLicenseActive(true);
        localStorage.setItem('fm_license_active', '1');
        setLicenseType('trial');
        setTrialDaysLeft(5);
        setTrialUsed(true);
        localStorage.setItem('fm_trial_used', '1');
      } else {
        setTrialUsed(true);
        localStorage.setItem('fm_trial_used', '1');
        setLicenseError(true);
        setLicenseAPIErrorText(res.error || 'Your free trial has already been used. Please purchase a license to continue.');
      }
    } else {
      // Fallback on web preview
      const now = Date.now();
      localStorage.setItem('fm_trial_start', now.toString());
      localStorage.setItem('fm_trial_used', '1');
      localStorage.setItem('fm_license_active', '1');
      setLicenseActive(true);
      setLicenseType('trial');
      setTrialDaysLeft(5);
      setTrialUsed(true);
    }
  };

  const attemptActivation = async () => {
    const cleaned = licenseInput.trim();
    if (cleaned.length < 4) {
      setLicenseError(true);
      setLicenseAPIErrorText('Please enter a valid license key.');
      setTimeout(() => setLicenseError(false), 1200);
      return;
    }

    setLicenseAPIErrorText('Verifying license key with Gumroad API...');
    if (window.electronAPI) {
      const resp = await window.electronAPI.validateLicense(cleaned);
      if (resp.ok) {
        setLicenseActive(true);
        localStorage.setItem('fm_license_active', '1');
        const finalType = resp.type || (resp.isLifetime ? 'lifetime' : 'annual');
        setLicenseType(finalType);
        localStorage.setItem('fm_license_key', cleaned);
        localStorage.setItem('fm_license_type', finalType);
        if (resp.expiresAt) {
          localStorage.setItem('fm_license_expires_at', resp.expiresAt.toString());
        } else {
          localStorage.removeItem('fm_license_expires_at');
        }

        if (finalType === 'lifetime' || finalType === 'annual') {
          // Clear trial so the app is unlocked as full license
          localStorage.removeItem('fm_trial_start');
          setTrialDaysLeft(null);
          setTrialUsed(true);
          localStorage.setItem('fm_trial_used', '1');
        } else if (resp.trialDaysLeft !== undefined) {
          setTrialDaysLeft(resp.trialDaysLeft);
          setTrialUsed(true);
          localStorage.setItem('fm_trial_used', '1');
        }

        setLicenseAPIErrorText('');
        setLicenseError(false);
      } else {
        setLicenseError(true);
        if (resp.trialUsed || resp.type === 'trial_expired') {
          setTrialUsed(true);
          localStorage.setItem('fm_trial_used', '1');
        }
        const err = resp.error || '';
        if (err.includes('refunded')) {
          setLicenseAPIErrorText('This license has been refunded and is no longer valid.');
        } else if (err.includes('already activated') || err.includes('another device')) {
          setLicenseAPIErrorText('This license key is already activated on another device. Contact support to transfer.');
        } else if (err.includes('expired')) {
          setLicenseAPIErrorText(err);
        } else {
          setLicenseAPIErrorText(err || 'Invalid license key. Purchase a valid key at overdesk.store');
        }
      }
    } else {
      // Fallback web preview test key activation
      const lower = cleaned.toLowerCase();

      const hasUsedTrial = trialUsed || localStorage.getItem('fm_trial_used') === '1' || (() => {
        const startStr = localStorage.getItem('fm_trial_start');
        if (!startStr) return false;
        const startMs = parseInt(startStr, 10);
        return !isNaN(startMs) && Date.now() > startMs + (5 * 24 * 60 * 60 * 1000);
      })();

      const isTrialKey = lower.includes('trial');
      const isAnnualKey = lower.includes('annual');
      const isLifetimeKey = lower.includes('lifetime') || (!isTrialKey && !isAnnualKey);

      if (isTrialKey) {
        if (hasUsedTrial || lower.includes('trial-expired')) {
          setLicenseError(true);
          setTrialUsed(true);
          localStorage.setItem('fm_trial_used', '1');
          setLicenseAPIErrorText('Your 5-day free trial has already expired on this device. Please purchase a lifetime or annual license at overdesk.store.');
          return;
        }
      }

      const type: 'lifetime' | 'annual' | 'trial' = isTrialKey ? 'trial' : (isAnnualKey ? 'annual' : 'lifetime');
      const expiresAt = isTrialKey
        ? Date.now() + (5 * 24 * 60 * 60 * 1000)
        : (isAnnualKey ? Date.now() + (365 * 24 * 60 * 60 * 1000) : null);

      localStorage.setItem('fm_license_key', cleaned);
      localStorage.setItem('fm_license_type', type);
      localStorage.setItem('fm_license_active', '1');
      if (expiresAt) {
        localStorage.setItem('fm_license_expires_at', expiresAt.toString());
      } else {
        localStorage.removeItem('fm_license_expires_at');
      }

      if (isTrialKey) {
        setTrialDaysLeft(5);
        setTrialUsed(true);
        localStorage.setItem('fm_trial_used', '1');
        localStorage.setItem('fm_trial_start', Date.now().toString());
      } else {
        // Genuine Lifetime or Annual key: clear trial completely
        localStorage.removeItem('fm_trial_start');
        setTrialDaysLeft(null);
        setTrialUsed(true);
        localStorage.setItem('fm_trial_used', '1');
      }

      setLicenseActive(true);
      setLicenseType(type);
      setLicenseAPIErrorText('');
      setLicenseError(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatusText('Checking for updates...');
    if (window.electronAPI && window.electronAPI.checkForUpdates) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        if (!res.ok) {
          setUpdateStatusText('You are using the latest version (v1.3.2).');
        }
      } catch (err) {
        setUpdateStatusText('You are using the latest version (v1.3.2).');
      } finally {
        setCheckingUpdate(false);
      }
    } else {
      setTimeout(() => {
        setCheckingUpdate(false);
        setUpdateStatusText('You are using the latest version (v1.3.2).');
      }, 1000);
    }
  };

  // ── Switch Active Tab Tab Modes ──
  const handleModeIconClick = (mode: string) => {
    if (editingTitle) {
      const nextVal = titleInputValue.trim() || modes[currentMode]?.title || currentMode;
      const updatedModes = {
        ...modes,
        [currentMode]: {
          ...modes[currentMode],
          title: nextVal,
        },
      };
      setModes(updatedModes);
      localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
      setEditingTitle(false);
    }
    if (editingItemIdx !== null && modes[currentMode]) {
      const idx = editingItemIdx;
      const oldVal = modes[currentMode].options[idx];
      const listCopy = [...modes[currentMode].options];
      const finalVal = editingItemValue.trim() || listCopy[idx];
      listCopy[idx] = finalVal;

      const baseCopy = [...(modes[currentMode].baseOptions || modes[currentMode].options)];
      const baseIdx = baseCopy.indexOf(oldVal);
      if (baseIdx !== -1) {
        baseCopy[baseIdx] = finalVal;
      } else if (idx < baseCopy.length) {
        baseCopy[idx] = finalVal;
      }

      const updatedModes = {
        ...modes,
        [currentMode]: {
          ...modes[currentMode],
          options: listCopy,
          baseOptions: baseCopy,
        },
      };
      setModes(updatedModes);
      localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
      setEditingItemIdx(null);
    }

    setCurrentMode(mode);
    if (editMode) {
      // Toggle mode visual configuration overlay
      setPickerTargetMode(mode);
      setPickerOpen(true);
    }
  };

  // ── Selection checklist Toggling ──
  const handleOptionToggle = (idx: number) => {
    if (justDraggedRef.current) {
      return;
    }

    if (editMode) {
      // Item editing trigger
      setEditingItemIdx(idx);
      setEditingItemValue(modes[currentMode].options[idx]);
      setTimeout(() => listInputRef.current?.focus(), 60);
      return;
    }

    let activeList = selections[currentMode] || [];
    let updated: number[];
    let isNowChecked = false;
    if (activeList.includes(idx)) {
      updated = activeList.filter((v) => v !== idx);
      playSoundChime('check');
    } else {
      updated = [...activeList, idx];
      isNowChecked = true;
      playSoundChime('check');
      const totalOptionsCount = modes[currentMode].options.length;
      if (updated.length === totalOptionsCount && totalOptionsCount > 0) {
        setTimeout(() => playSoundChime('complete'), 150);
        triggerCompletedSplash(currentMode);
      }
    }

    if (autoMoveCompleted) {
      const currentOptions = modes[currentMode]?.options || [];
      if (currentOptions.length > 0) {
        const uncheckedIdxs = currentOptions.map((_, i) => i).filter((i) => !updated.includes(i));
        const checkedIdxs = currentOptions.map((_, i) => i).filter((i) => updated.includes(i));

        let finalCheckedIdxs = checkedIdxs;
        if (isNowChecked) {
          const otherChecked = checkedIdxs.filter((i) => i !== idx);
          finalCheckedIdxs = [...otherChecked, idx];
        }

        const finalOrderIdxs = [...uncheckedIdxs, ...finalCheckedIdxs];
        const newOptions = finalOrderIdxs.map((i) => currentOptions[i]);
        const newSelIndices = Array.from({ length: finalCheckedIdxs.length }, (_, i) => uncheckedIdxs.length + i);

        const currentBase = modes[currentMode]?.baseOptions || currentOptions;
        const updatedModes = {
          ...modes,
          [currentMode]: {
            ...modes[currentMode],
            options: newOptions,
            baseOptions: currentBase,
          },
        };
        setModes(updatedModes);
        localStorage.setItem('fm_modes', JSON.stringify(updatedModes));

        const nextSelections = { ...selections, [currentMode]: newSelIndices };
        setSelections(nextSelections);
        localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(newSelIndices));
        return;
      }
    }

    const nextSelections = { ...selections, [currentMode]: updated };
    setSelections(nextSelections);
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(updated));
  };

  // ── Reset entire checklist indices ──
  const triggerResetChecklist = () => {
    if (editMode) {
      // In edit mode - reset all checkboxes of ALL modes to blank empty values and re-arrange options to original order
      const emptyChecklists: Record<string, number[]> = {};
      const updatedModes = { ...modes };
      Object.keys(modes).forEach((m) => {
        emptyChecklists[m] = [];
        localStorage.setItem('fm_sel_' + m, JSON.stringify([]));
        const base = modes[m]?.baseOptions || modes[m]?.options || [];
        updatedModes[m] = {
          ...modes[m],
          options: [...base],
          baseOptions: [...base],
        };
      });
      setSelections(emptyChecklists);
      setModes(updatedModes);
      localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    } else {
      // Reset checkboxes of ONLY the selected current mode block and re-arrange options to original order
      const nextSelections = { ...selections, [currentMode]: [] };
      setSelections(nextSelections);
      localStorage.setItem('fm_sel_' + currentMode, JSON.stringify([]));

      const base = modes[currentMode]?.baseOptions || modes[currentMode]?.options || [];
      const updatedModes = {
        ...modes,
        [currentMode]: {
          ...modes[currentMode],
          options: [...base],
          baseOptions: [...base],
        },
      };
      setModes(updatedModes);
      localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    }
    playSoundChime('reset');
  };

  // ── Edit operations: Rename mode titles ──
  const startEditingTitle = () => {
    if (!editMode) return;
    setTitleInputValue(modes[currentMode].title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 60);
  };

  const commitTitleEditing = () => {
    if (!editingTitle || !modes[currentMode]) return;
    const nextVal = titleInputValue.trim() || modes[currentMode].title || currentMode;
    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        title: nextVal,
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    setEditingTitle(false);
  };

  // ── Edit operations: Rename items ──
  const commitItemEditing = (idx: number) => {
    if (editingItemIdx === null) return;
    const oldVal = modes[currentMode].options[idx];
    const listCopy = [...modes[currentMode].options];
    const finalVal = editingItemValue.trim() || listCopy[idx];
    listCopy[idx] = finalVal;

    const baseCopy = [...(modes[currentMode].baseOptions || modes[currentMode].options)];
    const baseIdx = baseCopy.indexOf(oldVal);
    if (baseIdx !== -1) {
      baseCopy[baseIdx] = finalVal;
    } else if (idx < baseCopy.length) {
      baseCopy[idx] = finalVal;
    }

    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        options: listCopy,
        baseOptions: baseCopy,
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    setEditingItemIdx(null);
  };

  // ── Delete item ──
  const deleteItemOption = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (modes[currentMode].options.length <= 1) return; // cannot delete of size 1

    const deletedText = modes[currentMode].options[idx];
    const updatedOptions = modes[currentMode].options.filter((_, i) => i !== idx);
    let updatedBase = (modes[currentMode].baseOptions || modes[currentMode].options).filter((item) => item !== deletedText);
    if (updatedBase.length === 0) updatedBase = [...updatedOptions];

    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        options: updatedOptions,
        baseOptions: updatedBase,
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));

    // Re-adjust check offset mappings on item deletion
    const currentChecked = selections[currentMode] || [];
    const reassignedChecked = currentChecked
      .map((oldIdx) => {
        if (oldIdx === idx) return -1;
        if (oldIdx > idx) return oldIdx - 1;
        return oldIdx;
      })
      .filter((v) => v !== -1);

    setSelections((prev) => ({ ...prev, [currentMode]: reassignedChecked }));
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(reassignedChecked));
  };

  // ── Add dynamic item option checklist ──
  const addNewItemOption = () => {
    const listCopy = [...modes[currentMode].options, 'New option'];
    const baseCopy = [...(modes[currentMode].baseOptions || modes[currentMode].options), 'New option'];
    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        options: listCopy,
        baseOptions: baseCopy,
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));

    const nextIdx = listCopy.length - 1;
    setEditingItemIdx(nextIdx);
    setEditingItemValue('New option');
    setTimeout(() => {
      listInputRef.current?.focus();
      listInputRef.current?.select();
    }, 60);
  };

  // ── Re-order modes sequence ──
  const moveMode = (fromIdx: number, toIdx: number) => {
    const keys = Object.keys(modes);
    if (fromIdx < 0 || fromIdx >= keys.length || toIdx < 0 || toIdx >= keys.length || fromIdx === toIdx) return;

    const newKeys = [...keys];
    const [movedKey] = newKeys.splice(fromIdx, 1);
    newKeys.splice(toIdx, 0, movedKey);

    const updatedModes: Record<string, ModeDetail> = {};
    newKeys.forEach((k) => {
      updatedModes[k] = modes[k];
    });

    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    localStorage.setItem('fm_state_ver', '4.0');
  };

  // ── Re-order checklist options within active mode ──
  const moveOption = (fromIdx: number, toIdx: number) => {
    if (!currentMode || !modes[currentMode]) return;
    const oldOptions = [...modes[currentMode].options];
    if (fromIdx < 0 || fromIdx >= oldOptions.length || toIdx < 0 || toIdx >= oldOptions.length || fromIdx === toIdx) return;

    const newOptions = [...oldOptions];
    const [movedItem] = newOptions.splice(fromIdx, 1);
    newOptions.splice(toIdx, 0, movedItem);

    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        options: newOptions,
        baseOptions: [...newOptions],
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    localStorage.setItem('fm_state_ver', '4.0');

    // Remap selections array for current mode so checked state stays with item text
    const oldSel = selections[currentMode] || [];
    const newSel: number[] = [];

    oldSel.forEach((idx) => {
      if (idx === fromIdx) {
        newSel.push(toIdx);
      } else if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) {
        newSel.push(idx - 1);
      } else if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) {
        newSel.push(idx + 1);
      } else {
        newSel.push(idx);
      }
    });

    const updatedSelections = {
      ...selections,
      [currentMode]: newSel,
    };
    setSelections(updatedSelections);
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(newSel));
  };

  // ── Mode customized color-picker operations ──
  const assignModeColor = (targetMode: string, accent: string, soft: string) => {
    setModes((prev) => {
      const updated = {
        ...prev,
        [targetMode]: {
          ...prev[targetMode],
          accent,
          soft,
        },
      };
      localStorage.setItem('fm_modes', JSON.stringify(updated));
      return updated;
    });
  };

  const resetModeColorToDefault = (targetMode: string) => {
    const defaults = DEFAULT_MODES[targetMode];
    if (defaults) {
      assignModeColor(targetMode, defaults.defaultAccent, defaults.defaultSoft);
    }
  };

  const assignModeIcon = (targetMode: string, iconKey: string) => {
    setIconAssignments((prev) => {
      const updated = {
        ...prev,
        [targetMode]: iconKey,
      };
      localStorage.setItem('fm_icons', JSON.stringify(updated));
      return updated;
    });
    setPickerOpen(false);
    setPickerTargetMode(null);
  };

  // Custom Icon File Upload Handler
  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const labelName = file.name.replace(/\.[^/.]+$/, '').slice(0, 10) || 'Custom';
    const reader = new FileReader();

    if (isSvg) {
      reader.readAsText(file);
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content && content.includes('<svg')) {
          const customKey = 'custom_' + Date.now();
          setCustomIcons((prev) => ({
            ...prev,
            [customKey]: {
              label: labelName,
              src: content,
              format: 'svg',
            },
          }));
          if (pickerTargetMode) {
            assignModeIcon(pickerTargetMode, customKey);
          }
          playSoundChime('check');
        } else {
          // Fallback to Data URL
          const urlReader = new FileReader();
          urlReader.readAsDataURL(file);
          urlReader.onload = (dataEvt) => {
            const dataUrl = dataEvt.target?.result as string;
            if (dataUrl) {
              const customKey = 'custom_' + Date.now();
              setCustomIcons((prev) => ({
                ...prev,
                [customKey]: {
                  label: labelName,
                  src: dataUrl,
                  format: 'png',
                },
              }));
              if (pickerTargetMode) {
                assignModeIcon(pickerTargetMode, customKey);
              }
              playSoundChime('check');
            }
          };
        }
      };
    } else {
      reader.readAsDataURL(file);
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) {
          const customKey = 'custom_' + Date.now();
          setCustomIcons((prev) => ({
            ...prev,
            [customKey]: {
              label: labelName,
              src: dataUrl,
              format: 'png',
            },
          }));
          if (pickerTargetMode) {
            assignModeIcon(pickerTargetMode, customKey);
          }
          playSoundChime('check');
        }
      };
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const deleteCustomIcon = (e: React.MouseEvent, customKey: string) => {
    e.stopPropagation();
    setCustomIcons((prev) => {
      const updated = { ...prev };
      delete updated[customKey];
      return updated;
    });
    setIconAssignments((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((mKey) => {
        if (updated[mKey] === customKey) {
          updated[mKey] = mKey === 'business' ? 'briefcase' : 'home';
        }
      });
      return updated;
    });
    playSoundChime('reset');
  };

  // Helper renderer for built-in or custom icons
  const renderIcon = (iconKey: string) => {
    if (iconKey && customIcons[iconKey]) {
      const item = customIcons[iconKey];
      if (item.format === 'svg' && item.src.trim().startsWith('<svg')) {
        return (
          <span
            className="custom-svg-icon"
            style={{ display: 'inline-flex', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: item.src }}
          />
        );
      }
      return (
        <img
          src={item.src}
          alt={item.label || 'Custom'}
          style={{ width: '22px', height: '22px', objectFit: 'contain', display: 'block' }}
        />
      );
    }
    if (iconKey && ICON_LIBRARY[iconKey]?.svg) {
      return ICON_LIBRARY[iconKey].svg;
    }
    return ICON_LIBRARY.briefcase?.svg || ICON_LIBRARY.home?.svg;
  };

  const triggerAppShutdown = () => {
    if (window.electronAPI) {
      window.electronAPI.closeApp();
    } else {
      // Direct Web hide emulation
      if (cardRef.current) {
        cardRef.current.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
        cardRef.current.style.opacity = '0';
        cardRef.current.style.transform = 'scale(0.88)';
        setTimeout(() => {
          if (cardRef.current) cardRef.current.style.display = 'none';
        }, 290);
      }
    }
  };

  // Auto Updater triggers
  const executeUpdateInstall = () => {
    setUpdateInstalling(true);
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  // ── Render Helpers: Liquid Wave Path Calculation ──
  const compileLiquidWaveData = (modeKey: string) => {
    const totalOptions = modes[modeKey]?.options.length || 0;
    const checkedOptions = selections[modeKey]?.length || 0;
    const pct = totalOptions > 0 ? checkedOptions / totalOptions : 0;

    const accentRaw = modes[modeKey]?.accent || 'rgba(110,0,210,0.9)';
    const m = accentRaw.match(/[\d.]+/g) || ['110', '0', '210'];
    const r = parseInt(m[0]),
      g = parseInt(m[1]),
      b = parseInt(m[2]);

    const baseColor = `rgba(${r},${g},${b},0.5)`;
    const gradientHigh = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 60, 255)},${Math.min(b + 80, 255)},0.75)`;

    const size = 50;
    const waterY = size * (1 - pct);
    const amp = pct > 0.02 && pct < 0.98 ? 3.5 : 0;

    const waveWidth = size + 30; // 80px wide
    const startX = -15;
    const steps = 60;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const x = startX + (waveWidth / steps) * i;
      const y = waterY + amp * Math.sin((i / steps) * Math.PI * 4);
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }

    const wavePath = pts.join(' ') + ` L${startX + waveWidth},50 L${startX},50 Z`;

    return {
      pct,
      baseColor,
      gradientHigh,
      waterY,
      wavePath,
    };
  };

  // Calculations for current selected Mode items totals
  const totalModeOptions = modes[currentMode]?.options.length || 0;
  const totalModeChecked = selections[currentMode]?.length || 0;

  return (
    <div
      className="app-container"
      style={{
        width: '440px',
        height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '30px 60px 60px 60px',
        background: 'transparent',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Main checklist canvas card widget */}
      <div
        className={`card ${isLight ? 'light' : ''} ${minimized ? 'minimized' : ''} ${isGripped ? 'gripped' : ''} ${!licenseActive ? 'license-mode' : ''}`}
        id="card"
        ref={cardRef}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
        onDragStart={(e) => e.preventDefault()}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${isGripped ? 1.035 : 1})`,
          boxShadow: !licenseActive ? 'none' : (isGripped ? `0 20px 50px -5px ${modes[currentMode]?.soft || 'var(--accent-soft)'}, 0 8px 24px -2px rgba(0, 0, 0, 0.45)` : undefined),
          transition: isGripped ? 'transform 0s, box-shadow 0.2s ease' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, padding 0.35s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: isGripped ? 'grabbing' : undefined,
          minHeight: (settingsOpen && !minimized) ? `${420 + extraHeight}px` : undefined,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scale Drag Handle */}
        <div
          className="resize-handle no-drag"
          onPointerDown={handleSizingMouseDown}
          onMouseDown={handleSizingMouseDown}
          title="Drag left/right to scale window"
        />
        {/* Bottom Height Extension Drag Handle */}
        {!minimized && (
          <div
            className="bottom-resize-handle no-drag"
            onPointerDown={handleBottomSizingMouseDown}
            onMouseDown={handleBottomSizingMouseDown}
            title="Drag down to extend list length (up to +50%)"
          />
        )}
        {/* Wallpaper Background Layer */}
        {wallpaperUrl && (
          <div
            className="wallpaper-layer"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              overflow: 'hidden',
              opacity: !licenseActive ? Math.min((wallpaperOpacity / 100) * 0.75, 0.6) : (wallpaperOpacity / 100),
              zIndex: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.25s ease',
            }}
          >
            {isVideoUrl(wallpaperUrl) ? (
              <>
                <video
                  src={wallpaperUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    inset: 0,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isLight
                      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.58) 100%)'
                      : 'linear-gradient(180deg, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.55) 100%)',
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `linear-gradient(180deg, ${isLight ? 'rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.58) 100%' : 'rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.55) 100%'}), url("${wallpaperUrl}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>
        )}

        {!licenseActive ? (
          <div className="license-card-inner">
            <img 
              className="license-logo" 
              src={overdeskLogo} 
              alt="Overdesk Everyone Logo" 
              style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '0px' }}
              referrerPolicy="no-referrer"
            />
            <div className="license-title">Overdesk Everyone</div>

            {/* License Input Top */}
            <input
              className={`license-input ${licenseError ? 'error' : ''}`}
              id="license-input"
              type="text"
              placeholder="Enter License Key"
              maxLength={100}
              value={licenseInput}
              onChange={handleLicenseInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attemptActivation();
              }}
            />
            {licenseAPIErrorText && (
              <div 
                className="license-api-feedback"
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: licenseError ? '#ff4d4d' : (isLight ? '#0284c7' : '#38bdf8'),
                  textAlign: 'center',
                  marginTop: '-4px',
                  marginBottom: '2px',
                  padding: '0 8px',
                  wordBreak: 'break-word',
                  lineHeight: '1.3'
                }}
              >
                {licenseAPIErrorText}
              </div>
            )}
            <button className="license-btn" onClick={attemptActivation}>
              Activate License
            </button>

            <div className="license-divider">— OR —</div>

            {/* Trial Access Flow Under */}
            {!trialUsed ? (
              <div className="trial-wrap">
                <button className="trial-btn" onClick={handleStartTrial}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Start 5-Day Free Trial
                </button>
              </div>
            ) : (
              <div className="trial-used-box">
                ⚠️ Trial expired. Enter a key to continue.
              </div>
            )}
            
            {/* Purchase Direct Link */}
            <div className="license-hint">
              Need a key? Get one at{' '}
              <a 
                href="https://overdesk.store" 
                target="_blank" 
                rel="noreferrer"
                style={{ textDecoration: 'underline', fontWeight: 700 }}
              >
                overdesk.store
              </a>
            </div>
          </div>
        ) : (
          <>
        {/* Automatic updates banner notifier */}
        <div className={`update-banner ${updateAvailable ? 'show' : ''}`} id="update-banner">
          <div className="update-banner-text">
            Update available
            <span id="update-version">{updateVersion}</span>
          </div>
          <button className="update-install-btn" id="update-install-btn" onClick={executeUpdateInstall}>
            {updateInstalling ? 'Installing...' : 'Install'}
          </button>
        </div>

        {/* Top Header Controls row */}
        <div className="top-bar" id="top-bar">
          {/* Left Theme toggle button */}
          <div
            className="theme-switch"
            id="theme-switch"
            onClick={() => {
              setIsLight(!isLight);
              localStorage.setItem('fm_theme', !isLight ? '1' : '0');
            }}
          >
            <div
              className="theme-switch-knob"
              id="theme-knob"
              style={{
                transform: isLight ? 'translateX(18px)' : 'translateX(0px)',
              }}
            >
              {isLight ? (
                // Moon Icon
                <svg id="theme-icon" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                // Sun Icon
                <svg id="theme-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </div>
          </div>

          {/* Center Minimize Pill */}
          <div
            className="minimize-bar"
            onClick={() => {
              const nextMinimized = !minimized;
              setMinimized(nextMinimized);
              if (nextMinimized) {
                if (editMode) setEditMode(false);
                if (settingsOpen) setSettingsOpen(false);
                if (pickerOpen) setPickerOpen(false);
              }
            }}
          >
            <div className="minimize-pill"></div>
          </div>

          {/* Right toggle configurations */}
          <div className="top-bar-right">
            <button className="close-btn" id="close-btn" onClick={triggerAppShutdown} title="Shutdown App">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              className={`settings-toggle ${settingsOpen ? 'on' : ''}`}
              id="settings-toggle"
              onClick={() => {
                if (minimized) setMinimized(false);
                setSettingsOpen(!settingsOpen);
                setPickerOpen(false);
                setEditMode(false);
              }}
              title="Global Settings"
            >
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              className={`edit-toggle ${editMode ? 'on' : ''}`}
              id="edit-toggle"
              onClick={() => {
                if (minimized) setMinimized(false);
                setEditMode(!editMode);
                setSettingsOpen(false);
                setEditingTitle(false);
                setEditingItemIdx(null);
              }}
              title="Edit List Configurations"
            >
              {editMode ? (
                // Checked Done Icon in edit mode
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                // Pencil Icon in default view mode
                <svg viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Render Minimized Reminder View when minimized, or full Checklist View when expanded */}
        {minimized ? (
          <MinimizedReminderView
            reminderText={reminderText}
            isEditingReminder={isEditingReminder}
            tempReminderText={tempReminderText}
            isLight={isLight}
            accentSoft={modes[currentMode]?.soft}
            animateText={animateMinimizedText}
            setTempReminderText={setTempReminderText}
            setIsEditingReminder={setIsEditingReminder}
            handleSaveReminder={handleSaveReminder}
            getReminderFontSize={getReminderFontSize}
          />
        ) : (
          <>
            {/* Tab mode selection icons row */}
            <div
              className="icons"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '16px',
                flexShrink: 0,
                width: '100%',
                position: 'relative',
                zIndex: 5,
                padding: 0,
                margin: 0,
              }}
            >
              {Object.keys(modes).map((mKey, mIdx) => {
                const hasLiquidFill = selections[mKey]?.length > 0;
                const isSelected = mKey === currentMode;
                const waveParams = compileLiquidWaveData(mKey);
                const modeAccent = modes[mKey]?.accent || 'var(--accent)';

                let translateX = 0;
                let isBeingDragged = false;

                if (modeDragState) {
                  if (modeDragState.activeKey === mKey) {
                    isBeingDragged = true;
                    translateX = modeDragState.currentX - modeDragState.startX;
                  } else {
                    const from = modeDragState.fromIdx;
                    const current = modeDragState.currentIdx;
                    if (mIdx > from && mIdx <= current) {
                      translateX = -58;
                    } else if (mIdx < from && mIdx >= current) {
                      translateX = 58;
                    }
                  }
                }

                return (
                  <div
                    key={mKey}
                    className={`icon-wrap ${completedSplashMode === mKey ? 'splash-active' : ''} ${isSelected ? 'active-mode' : 'inactive-mode'}`}
                    style={{
                      '--splash-color': modeAccent,
                      position: 'relative',
                      zIndex: isBeingDragged ? 20 : (isSelected ? 6 : 5),
                      cursor: editMode ? 'grab' : 'pointer',
                      opacity: 1,
                      transform: `translateX(${translateX}px)`,
                      transition: isBeingDragged ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)',
                      userSelect: 'none',
                      touchAction: 'none',
                    } as React.CSSProperties}
                    onPointerDown={(e) => handleModePointerDown(e, mKey, mIdx)}
                  >
                    {/* Re-order Mode Drag Handle in Edit Mode (Grip Dots Only) */}
                    {editMode && (
                      <div
                        className="mode-drag-handle"
                        title="Drag to reorder mode"
                        style={{
                          position: 'absolute',
                          top: '-11px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.96)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '999px',
                          padding: '3px 7px',
                          zIndex: 12,
                          border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.25)'),
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          color: isLight ? '#0f172a' : '#ffffff',
                          cursor: 'grab',
                          userSelect: 'none',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                    )}
                    <Glass
                      isLight={isLight}
                      className="mode-icon-glass"
                      borderRadius={25}
                      width={50}
                      height={50}
                      variant={isSelected ? "default" : "subtle"}
                      backgroundOpacity={isSelected ? (isLight ? 0.35 : 0.18) : (isLight ? 0.15 : 0.08)}
                      style={{
                        borderRadius: '50%',
                        transform: 'scale(1.0)',
                        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                        boxShadow: isSelected 
                          ? `0 0 0 2px ${modeAccent}` 
                          : '0 0 0 0px transparent',
                        position: 'relative',
                      }}
                    >
                      {hasLiquidFill && (
                        <div className="liquid-container">
                          <svg viewBox="0 0 50 50">
                            <defs>
                              <clipPath id={`lc-clip-${mKey}`}>
                                <circle cx="25" cy="25" r="24.5" />
                              </clipPath>
                              <linearGradient id={`lc-grad-${mKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={waveParams.gradientHigh} />
                                <stop offset="100%" stopColor={waveParams.baseColor} />
                              </linearGradient>
                            </defs>
                            <g clipPath={`url(#lc-clip-${mKey})`}>
                              {/* Underlay color rectangle */}
                              <rect x="-15" y={waveParams.waterY} width="80" height={52 - waveParams.waterY} fill={waveParams.baseColor} />
                              {/* Floating wave overlay using CSS math slosh animation */}
                              <g style={{ animation: 'liquidBob 3.2s ease-in-out infinite' }}>
                                <path
                                  style={{
                                    animation: 'liquidSlosh 3.8s ease-in-out infinite',
                                    transformOrigin: 'center center',
                                  }}
                                  d={waveParams.wavePath}
                                  fill={`url(#lc-grad-${mKey})`}
                                />
                              </g>
                            </g>
                          </svg>
                        </div>
                      )}
                      {completedSplashMode === mKey && (
                        <div className="icon-splash-droplets">
                          <span className="i-drop d1" style={{ backgroundColor: waveParams.gradientHigh }} />
                          <span className="i-drop d2" style={{ backgroundColor: '#ffffff' }} />
                          <span className="i-drop d3" style={{ backgroundColor: waveParams.gradientHigh }} />
                          <span className="i-drop d4" style={{ backgroundColor: '#ffffff' }} />
                          <span className="i-drop d5" style={{ backgroundColor: waveParams.gradientHigh }} />
                        </div>
                      )}
                      <button
                        className={`icon-btn ${isSelected ? 'active' : ''} ${hasLiquidFill ? 'has-liquid' : ''}`}
                        data-mode={mKey}
                        onClick={() => {
                          if (!isDraggingModeRef.current) {
                            handleModeIconClick(mKey);
                          }
                        }}
                        style={{
                          backgroundColor: !hasLiquidFill
                            ? (isSelected ? (modes[mKey]?.accent || 'var(--accent)') : 'transparent')
                            : 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                          width: '100%',
                          height: '100%',
                          transform: 'none',
                        }}
                      >
                        {renderIcon(iconAssignments[mKey])}
                      </button>
                    </Glass>
                  </div>
                );
              })}
            </div>

        {/* Tab Mode configuration Picker overlay */}
        {pickerOpen && pickerTargetMode && (
          <div className={`icon-picker open`} id="icon-picker">
            <div className="picker-header">
              <span className="picker-title">Config Mode</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="picker-done"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerTargetMode(null);
                  }}
                  title="Done"
                >
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done
                </button>
                <button
                  className="picker-close"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerTargetMode(null);
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Accent selection row */}
            <div className="color-row">
              {/* Reset to base accent button */}
              <div
                className="color-swatch color-reset"
                title="Reset default color"
                style={{ background: DEFAULT_MODES[pickerTargetMode]?.accent }}
                onClick={() => resetModeColorToDefault(pickerTargetMode)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                </svg>
              </div>

              {/* presets */}
              {COLOR_PRESETS.map((colorObj, idx) => (
                <div
                  className={`color-swatch ${modes[pickerTargetMode]?.accent === colorObj.accent ? 'active' : ''}`}
                  key={idx}
                  style={{ background: colorObj.accent }}
                  onClick={() => assignModeColor(pickerTargetMode, colorObj.accent, colorObj.soft)}
                ></div>
              ))}

              {/* Custom input color element */}
              <div className="color-custom-wrap" title="Custom hex color">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <input
                  className="color-custom-input"
                  type="color"
                  defaultValue="#6e00d2"
                  onChange={(e) => {
                    const parsed = hexToAccent(e.target.value);
                    assignModeColor(pickerTargetMode, parsed.accent, parsed.soft);
                  }}
                />
              </div>
            </div>

            {/* Hidden File Input for Custom SVG / PNG Upload */}
            <input
              type="file"
              ref={iconFileInputRef}
              accept=".svg, .png, .jpg, .jpeg, .webp, image/svg+xml, image/png"
              onChange={handleCustomIconUpload}
              style={{ display: 'none' }}
            />

            {/* Icon grid options list selector */}
            <div className="picker-grid">
              {/* Custom Icon Upload Tile */}
              <div
                className="picker-item picker-upload"
                title="Upload custom SVG or PNG icon file"
                onClick={(e) => {
                  triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                  iconFileInputRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload SVG/PNG</span>
              </div>

              {/* Custom uploaded icons */}
              {Object.entries(customIcons).map(([cKey, cDef]) => {
                const item = cDef as { label: string; src: string; format: string };
                return (
                  <div
                    className={`picker-item custom-picker-item ${iconAssignments[pickerTargetMode] === cKey ? 'current' : ''}`}
                    key={cKey}
                    onClick={(e) => {
                      triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                      assignModeIcon(pickerTargetMode, cKey);
                    }}
                    style={{ position: 'relative' }}
                  >
                    <button
                      className="picker-item-delete"
                      title="Delete custom icon"
                      onClick={(e) => deleteCustomIcon(e, cKey)}
                    >
                      ×
                    </button>
                    {renderIcon(cKey)}
                    <span>{item.label}</span>
                  </div>
                );
              })}

              {/* Built-in icons */}
              {Object.entries(ICON_LIBRARY).map(([libKey, def]) => (
                <div
                  className={`picker-item ${iconAssignments[pickerTargetMode] === libKey ? 'current' : ''}`}
                  key={libKey}
                  onClick={(e) => {
                    triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                    assignModeIcon(pickerTargetMode, libKey);
                  }}
                >
                  {def.svg}
                  <span>{def.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Settings Panel overlay */}
        {settingsOpen && (
          <div
            className="icon-picker open"
            id="settings-panel"
          >
            <div className="picker-header" style={{ flexDirection: 'column', alignItems: 'center', marginBottom: '4px', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  className="picker-done"
                  onClick={() => setSettingsOpen(false)}
                  title="Done"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', marginRight: '4px' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done
                </button>
              </div>
              <span className="picker-title" style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '0.14em', fontWeight: 700 }}>Settings</span>
            </div>

            <div
              className="settings-body no-scrollbar"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px 16px', flex: 1, minHeight: 0 }}
            >
              {/* License Status Header Section */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 2px 10px',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <span
                  style={{
                    fontSize: '9.5px',
                    color: isLight ? 'rgba(0,0,0,0.55)' : '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                  }}
                >
                  License Status
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: licenseType === 'lifetime'
                      ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.16)')
                      : licenseType === 'annual'
                      ? (isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.16)')
                      : licenseType === 'trial' && licenseActive
                      ? (isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.16)')
                      : (isLight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.16)'),
                    border: licenseType === 'lifetime'
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : licenseType === 'annual'
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : licenseType === 'trial' && licenseActive
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.4)',
                    color: licenseType === 'lifetime'
                      ? '#10b981'
                      : licenseType === 'annual'
                      ? '#3b82f6'
                      : licenseType === 'trial' && licenseActive
                      ? '#f59e0b'
                      : '#ef4444',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'currentColor',
                      display: 'inline-block',
                      boxShadow: '0 0 6px currentColor',
                    }}
                  />
                  <span>
                    {licenseType === 'lifetime'
                      ? 'LIFETIME UNLOCKED'
                      : licenseType === 'annual'
                      ? 'ANNUAL UNLOCKED'
                      : licenseType === 'trial' && licenseActive
                      ? `${trialDaysLeft > 0 ? trialDaysLeft : 1} DAYS TRIAL`
                      : 'TRIAL EXPIRED'}
                  </span>
                </div>
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Move Checked to Bottom</span>
                <GooeyNav
                  items={[
                    { label: 'On', onClick: () => handleAutoMoveCompletedChange(true) },
                    { label: 'Off', onClick: () => handleAutoMoveCompletedChange(false) },
                  ]}
                  activeIndex={autoMoveCompleted ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Window Scale</span>
                <GooeyNav
                  items={[
                    { label: 'x2', onClick: () => handleScaleChange(2) },
                    { label: 'x1.5', onClick: () => handleScaleChange(1.5) },
                    { label: 'x1.2', onClick: () => handleScaleChange(1.2) },
                    { label: 'x1', onClick: () => handleScaleChange(1) },
                    { label: 'x0.7', onClick: () => handleScaleChange(0.7) },
                    { label: 'x0.5', onClick: () => handleScaleChange(0.5) },
                  ]}
                  activeIndex={[2, 1.5, 1.2, 1, 0.7, 0.5].findIndex((v) => Math.abs(scale - v) < 0.01)}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Countdown Display</span>
                <GooeyNav
                  items={[
                    { label: 'Shown', onClick: () => handleShowCountdownChange(true) },
                    { label: 'Hidden', onClick: () => handleShowCountdownChange(false) },
                  ]}
                  activeIndex={showCountdown ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Completion Alarm</span>
                <GooeyNav
                  items={[
                    { label: 'Alarm On', onClick: () => handleAlarmEnabledChange(true) },
                    { label: 'Alarm Off', onClick: () => handleAlarmEnabledChange(false) },
                  ]}
                  activeIndex={alarmEnabled ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>App Animations</span>
                <GooeyNav
                  items={[
                    { label: 'Enabled', onClick: () => handleAnimationsEnabledChange(true) },
                    { label: 'Disabled', onClick: () => handleAnimationsEnabledChange(false) },
                  ]}
                  activeIndex={animationsEnabled ? 0 : 1}
                  particleCount={animationsEnabled ? 12 : 0}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Minimized Text Animation</span>
                <GooeyNav
                  items={[
                    { label: 'Animated', onClick: () => handleAnimateMinimizedTextChange(true) },
                    { label: 'Static', onClick: () => handleAnimateMinimizedTextChange(false) },
                  ]}
                  activeIndex={animateMinimizedText ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Launch on PC Startup</span>
                <GooeyNav
                  items={[
                    { label: 'Enabled', onClick: () => handleToggleStartOnBoot(true) },
                    { label: 'Disabled', onClick: () => handleToggleStartOnBoot(false) },
                  ]}
                  activeIndex={startOnBoot ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>





              {/* Wallpaper Background Settings */}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                    Wallpaper Background
                  </span>
                  {wallpaperUrl && (
                    <button
                      onClick={() => handleWallpaperUrlChange('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff5252',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="Remove background wallpaper"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Wallpaper Gallery (Presets + Custom Uploads) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%', maxHeight: '120px', overflowY: 'auto', paddingRight: '2px' }}>
                  {(() => {
                    const galleryWallpapers = [
                      ...PRESET_WALLPAPERS.map((wp) => ({ ...wp, isCustom: false })),
                      ...customWallpapers.map((url, idx) => ({
                        id: `custom_wp_${idx}`,
                        name: `Uploaded ${idx + 1}`,
                        url,
                        isCustom: true,
                      })),
                    ];

                    if (wallpaperUrl && !galleryWallpapers.some((wp) => wp.url === wallpaperUrl)) {
                      galleryWallpapers.push({
                        id: 'active_custom_wp',
                        name: 'Uploaded',
                        url: wallpaperUrl,
                        isCustom: true,
                      });
                    }

                    return galleryWallpapers.map((wp) => {
                      const isSelected = wallpaperUrl === wp.url;
                      return (
                        <div key={wp.id} style={{ position: 'relative' }}>
                          <button
                            onClick={() => handleWallpaperUrlChange(wp.url)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '52px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: isSelected ? '2px solid var(--accent)' : '1px solid ' + (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'),
                              padding: 0,
                              cursor: 'pointer',
                              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isSelected ? '0 0 12px ' + (modes[currentMode]?.soft || 'rgba(0,180,255,0.4)') : 'none',
                              display: 'block',
                            }}
                            title={wp.name}
                          >
                            {isVideoUrl(wp.url) ? (
                              <video
                                src={wp.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <img
                                src={wp.url}
                                alt={wp.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {isVideoUrl(wp.url) && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  left: '3px',
                                  background: 'rgba(0,0,0,0.75)',
                                  borderRadius: '4px',
                                  padding: '1px 4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  zIndex: 5,
                                }}
                                title="Video Wallpaper"
                              >
                                <svg viewBox="0 0 24 24" width="7" height="7" fill="#fff">
                                  <polygon points="5,3 19,12 5,21" />
                                </svg>
                                <span style={{ fontSize: '6px', color: '#fff', fontWeight: 'bold', letterSpacing: '0.04em' }}>VID</span>
                              </div>
                            )}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 70%)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                padding: '2px 3px',
                              }}
                            >
                              <span style={{ fontSize: '7.5px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {wp.name}
                              </span>
                            </div>
                          </button>

                          {wp.isCustom && (
                            <button
                              onClick={(e) => handleDeleteCustomWallpaper(e, wp.url)}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: 'rgba(235, 45, 45, 0.88)',
                                color: '#fff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                lineHeight: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                              }}
                              title="Remove uploaded wallpaper"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Custom Wallpaper Upload Button */}
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <button
                    onClick={() => wallpaperFileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      borderRadius: '10px',
                      background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                      color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    title="Upload custom wallpaper image or video file (Max 3MB)"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Upload Image/Video (≤3MB)
                  </button>
                  <input
                    ref={wallpaperFileInputRef}
                    type="file"
                    accept="image/*,video/*,.mp4,.webm,.ogg,.mov,.m4v,.mkv,.avi"
                    style={{ display: 'none' }}
                    onChange={handleCustomWallpaperUpload}
                  />
                </div>

                {/* Wallpaper Opacity Slider */}
                {wallpaperUrl && (
                  <div
                    className="no-drag wallpaper-opacity-slider"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '10px', border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)') }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                        Wallpaper Opacity
                      </span>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--accent)' }}>
                        {wallpaperOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      className="no-drag"
                      min="1"
                      max="100"
                      value={wallpaperOpacity}
                      onChange={(e) => handleWallpaperOpacityChange(parseInt(e.target.value, 10))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        height: '4px',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                  Checklist Data & Template
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                    <button
                      onClick={handleExportChecklist}
                      style={{
                        flex: 1,
                        padding: '6px 2px',
                        borderRadius: '10px',
                        background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                        color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                        fontWeight: '600',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      title="Export current checklist as .txt file"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Export .TXT
                    </button>

                    <button
                      onClick={generateChecklistTemplate}
                      style={{
                        flex: 1,
                        padding: '6px 2px',
                        borderRadius: '10px',
                        background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                        color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                        fontWeight: '600',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      title="Download editable .txt template"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 18 15 15" />
                      </svg>
                      Template .TXT
                    </button>
                  </div>

                  <button
                    onClick={() => importFileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '7px 2px',
                      borderRadius: '10px',
                      background: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    title="Upload and import checklist .txt file"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Import Checklist (.txt)
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".txt,.json,text/plain,application/json"
                    style={{ display: 'none' }}
                    onChange={handleImportChecklistFile}
                  />

                  {importStatus && (
                    <div
                      style={{
                        fontSize: '9.5px',
                        fontWeight: '600',
                        textAlign: 'center',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        color: importStatus.type === 'success' ? '#00e676' : '#ff5252',
                        background: importStatus.type === 'success' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.12)',
                        border: '1px solid ' + (importStatus.type === 'success' ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 82, 82, 0.25)'),
                      }}
                    >
                      {importStatus.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Reset App Section */}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                  Reset App & Local Data
                </span>
                <button
                  onClick={handleResetAppClick}
                  onDoubleClick={handleResetAppDoubleClick}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: resetConfirming ? 'rgba(255, 50, 50, 0.22)' : (isLight ? 'rgba(255, 50, 50, 0.08)' : 'rgba(255, 70, 70, 0.12)'),
                    border: '1px solid ' + (resetConfirming ? 'rgba(255, 50, 50, 0.8)' : 'rgba(255, 70, 70, 0.3)'),
                    color: resetConfirming ? '#ff3333' : '#ff5252',
                    fontWeight: '700',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  title="Double click to reset all app settings and data back to factory defaults"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  {resetConfirming ? '⚠️ Click again or Double-Click to Reset' : 'Double-Click to Reset App'}
                </button>
              </div>

              {/* App Version & Silent Update Check at bottom of Settings */}
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '10px', marginTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
                    Overdesk Everyone v1.3.2
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={checkingUpdate}
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '600',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid ' + (isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.3)'),
                      color: isLight ? '#0284c7' : '#38bdf8',
                      cursor: checkingUpdate ? 'wait' : 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                  </button>
                </div>
                {updateStatusText && (
                  <div style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', fontWeight: '500', textAlign: 'center' }}>
                    {updateStatusText}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PC Autostart Setup & Helper Modal */}
        {showAutostartGuideModal && (
          <div
            onClick={() => setShowAutostartGuideModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0, 0, 0, 0.68)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeInScale 0.2s ease',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '440px',
                background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(12, 18, 30, 0.96)',
                backdropFilter: 'blur(30px) saturate(200%)',
                borderRadius: '24px',
                border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.22)',
                boxShadow: isLight ? '0 20px 50px rgba(0, 0, 0, 0.2)' : '0 24px 60px rgba(0, 0, 0, 0.8)',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                color: isLight ? '#0f172a' : '#ffffff',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              className="no-scrollbar"
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                      PC Startup & Auto-Launch
                    </h3>
                    <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: 500 }}>
                      Run OverDesk automatically on system boot
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAutostartGuideModal(false)}
                  style={{
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: startOnBoot ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid ' + (startOnBoot ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
                }}
              >
                <span style={{ fontSize: '14px' }}>{startOnBoot ? '✅' : '⚡'}</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: startOnBoot ? '#10b981' : '#f59e0b' }}>
                  {startOnBoot ? 'Startup Mode Active in App Settings' : 'Startup Preference Configured'}
                </span>
              </div>

              {/* Option 1: 1-Click Windows Batch Script */}
              <div
                style={{
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800 }}>Option 1: Windows 1-Click Startup Shortcut</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 800 }}>Recommended</span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, lineHeight: 1.4 }}>
                  Download the startup batch script, then press <code style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '4px' }}>Win + R</code>, type <code style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '4px' }}>shell:startup</code>, and drag the downloaded file into that folder.
                </p>
                <button
                  type="button"
                  onClick={downloadWindowsAutostartBat}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download OverDesk-AutoStart.bat
                </button>
              </div>

              {/* Option 2: Browser PWA Auto-Launch on Login */}
              <div
                style={{
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800 }}>Option 2: Browser App (Chrome / Edge PWA)</span>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', opacity: 0.8, lineHeight: 1.5 }}>
                  <li>Click the <strong>Install / App icon</strong> in your browser address bar.</li>
                  <li>In Chrome/Edge settings or app management page (<code style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '4px' }}>chrome://apps</code>), right-click OverDesk.</li>
                  <li>Check <strong>"Start app when you sign in to your computer"</strong>.</li>
                </ol>
              </div>

              {/* Option 3: macOS / Linux */}
              <div
                style={{
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 800 }}>Mac / Linux Autostart</span>
                <p style={{ margin: 0, fontSize: '10.5px', opacity: 0.75, lineHeight: 1.4 }}>
                  On macOS: Open <em>System Settings → General → Login Items</em> and add Chrome/Safari open to this page URL.
                </p>
              </div>

              {/* Footer Button */}
              <button
                type="button"
                onClick={() => setShowAutostartGuideModal(false)}
                style={{
                  background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.14)',
                  color: 'inherit',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Calendar Reminder View Overlay */}
        {activeCalendarTask && (
          <CalendarReminderView
            modeKey={activeCalendarTask.modeKey}
            taskText={activeCalendarTask.taskText}
            taskIdx={activeCalendarTask.taskIdx}
            existingReminder={
              taskReminders[`${activeCalendarTask.modeKey}_${activeCalendarTask.taskIdx}`] ||
              (Object.values(taskReminders).find(
                (r) => (r as TaskReminder).modeKey === activeCalendarTask.modeKey && (r as TaskReminder).taskText === activeCalendarTask.taskText
              ) as TaskReminder | undefined)
            }
            allReminders={taskReminders}
            isLight={isLight}
            accentSoft={modes[currentMode]?.soft}
            modeColor={modes[activeCalendarTask.modeKey]?.accent || '#38bdf8'}
            wallpaperUrl={wallpaperUrl}
            wallpaperOpacity={wallpaperOpacity}
            onSaveReminder={handleSaveTaskReminder}
            onDeleteReminder={handleDeleteTaskReminder}
            onDeleteAllReminders={handleDeleteAllTaskReminders}
            onClose={() => setActiveCalendarTask(null)}
          />
        )}

        {/* Active Alarm Ringing Alert Glassy Popup Modal */}
        {activeAlarmModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              borderRadius: '32px',
              animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '310px',
                background: isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 23, 42, 0.8)',
                border: isLight ? '1px solid rgba(255, 255, 255, 0.7)' : '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '26px',
                padding: '24px 20px',
                boxShadow: isLight
                  ? '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                  : '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15) inset',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                color: isLight ? '#0f172a' : '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                gap: '10px',
              }}
            >
              {/* Top ambient glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${modes[activeAlarmModal.modeKey]?.accent || '#3b82f6'} 0%, transparent 70%)`,
                  opacity: 0.25,
                  pointerEvents: 'none',
                }}
              />

              {/* Glowing Icon Capsule */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${modes[activeAlarmModal.modeKey]?.accent || '#3b82f6'}, #f59e0b)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 22px ${(modes[activeAlarmModal.modeKey]?.accent || '#3b82f6')}50`,
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  position: 'relative',
                  zIndex: 1,
                  color: '#ffffff',
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>

              {/* Header Badge */}
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: modes[activeAlarmModal.modeKey]?.accent || '#3b82f6',
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '99px',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.12)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Task Reminder
              </div>

              {/* Animated Task Text */}
              <h3
                className="no-scrollbar"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: isLight ? '#0f172a' : '#f8fafc',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  animation: 'taskPopOnce 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {activeAlarmModal.taskText}
              </h3>

              {/* Note preview if present */}
              {activeAlarmModal.note && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.04)' : '1px solid rgba(255, 255, 255, 0.08)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    maxWidth: '100%',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  "{activeAlarmModal.note}"
                </p>
              )}

              {/* Timestamp */}
              <span
                style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  color: isLight ? '#64748b' : '#94a3b8',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Set for {activeAlarmModal.date} at {activeAlarmModal.time}
              </span>

              {/* Action Buttons: Snooze 5 Min & Dismiss Alarm */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '4px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveAlarmModal(null)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${modes[activeAlarmModal.modeKey]?.accent || '#2563eb'}, #1d4ed8)`,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: `0 6px 18px ${(modes[activeAlarmModal.modeKey]?.accent || '#2563eb')}50`,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  Dismiss Alarm
                </button>

                <button
                  type="button"
                  onClick={() => handleSnoozeAlarm(5)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '14px',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.18)',
                    background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.09)',
                    color: isLight ? '#1e293b' : '#f1f5f9',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.09)')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Snooze (5 min)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text Header Mode Descriptions */}
        <div className="mode-row">
          <p className="mode-label" style={{ margin: 0 }}>Mode</p>
          {showCountdown && (
            isEditingTimer ? (
              <div
                className="countdown-timer-edit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: 'none',
                  userSelect: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  maxLength={2}
                  value={editHH}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditHH(val);
                  }}
                  onBlur={() => {
                    setEditHH((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Hours"
                  onFocus={(e) => e.target.select()}
                />
                <span style={{ opacity: 0.5 }}>:</span>
                <input
                  type="text"
                  maxLength={2}
                  value={editMM}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditMM(val);
                  }}
                  onBlur={() => {
                    setEditMM((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Minutes"
                  onFocus={(e) => e.target.select()}
                />
                <span style={{ opacity: 0.5 }}>:</span>
                <input
                  type="text"
                  maxLength={2}
                  value={editSS}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditSS(val);
                  }}
                  onBlur={() => {
                    setEditSS((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Seconds"
                  onFocus={(e) => e.target.select()}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px', borderLeft: '1px solid ' + (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'), paddingLeft: '6px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)',
                      opacity: 0.9,
                      transition: 'opacity 0.15s',
                    }}
                    title="Save"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTimer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
                      opacity: 0.8,
                      transition: 'opacity 0.15s',
                    }}
                    title="Cancel"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`countdown-timer ${isTimerRunning ? 'running' : 'paused'}`}
                id="countdown-timer-widget"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: 'none',
                  userSelect: 'none',
                  transition: 'background 0.18s, color 0.18s',
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? "Pause timer" : "Start timer"}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.04em',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatTime(countdownTimeLeft)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(!isTimerRunning);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.8,
                      transition: 'opacity 0.15s',
                    }}
                    title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                  >
                    {isTimerRunning ? (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <rect x="5" y="4" width="4" height="16" rx="1" />
                        <rect x="15" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(false);
                      setCountdownTimeLeft(countdownDuration);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.5,
                      transition: 'opacity 0.15s',
                    }}
                    title="Reset Timer"
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(false);
                      const h = Math.floor(countdownDuration / 3600);
                      const m = Math.floor((countdownDuration % 3600) / 60);
                      const s = countdownDuration % 60;
                      setEditHH(String(h).padStart(2, '0'));
                      setEditMM(String(m).padStart(2, '0'));
                      setEditSS(String(s).padStart(2, '0'));
                      setIsEditingTimer(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.5,
                      transition: 'opacity 0.15s',
                    }}
                    title="Edit Duration"
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
        <div className="title-wrap">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="title-input"
              style={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: titleInputValue.length > 22 ? '18px' : titleInputValue.length > 15 ? '21px' : '25px',
                width: '100%',
                flex: 1,
                minWidth: 0,
                boxSizing: 'border-box',
              }}
              type="text"
              value={titleInputValue}
              onChange={(e) => setTitleInputValue(e.target.value)}
              onBlur={commitTitleEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitleEditing();
              }}
            />
          ) : (
            <div className={`title-container-editable ${editMode ? 'can-edit' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {(() => {
                const titleStr = modes[currentMode]?.title || 'Precision';
                const dynamicFontSize = titleStr.length > 22 ? '18px' : titleStr.length > 15 ? '21px' : '25px';
                return (
                  <h1
                    className={`title ${editMode ? 'editable' : ''}`}
                    id="mode-title"
                    onClick={startEditingTitle}
                    onMouseDown={(e) => {
                      if (editMode) {
                        e.stopPropagation();
                        startEditingTitle();
                      }
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                      lineHeight: '38px',
                      height: '38px',
                      paddingBottom: '0',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: dynamicFontSize,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {titleStr}
                  </h1>
                );
              })()}
              {editMode && (
                <button
                  className="edit-title-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingTitle();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startEditingTitle();
                  }}
                  title="Rename Mode"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.6,
                    color: 'var(--text)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <span className="mode-counter" id="mode-counter">
            {totalModeChecked}/{totalModeOptions}
          </span>
        </div>

        <div className="divider"></div>

        {/* Dynamic Items list area */}
        <div className="card-body">
          <div
            className={`scroll-area ${isScrolling ? 'is-scrolling' : ''}`}
            onScroll={handleScrollAreaScroll}
            style={{
              height: `${176 + extraHeight}px`,
              minHeight: `${176 + extraHeight}px`,
              maxHeight: `${176 + extraHeight}px`,
            }}
          >
            <ul className="options" id="options-list">
              {modes[currentMode]?.options.map((itemText, optionIdx) => {
                const isItemChecked = (selections[currentMode] || []).includes(optionIdx);
                const isEditingItem = editingItemIdx === optionIdx;
                const totalOptionsCount = modes[currentMode]?.options.length || 0;
                const itemReminderKey = `${currentMode}_${optionIdx}`;
                const itemReminder = taskReminders[itemReminderKey] || Object.values(taskReminders).find(r => (r as TaskReminder).modeKey === currentMode && (r as TaskReminder).taskText === itemText) as TaskReminder | undefined;

                let translateY = 0;
                let isBeingDragged = false;
                if (optionDragState) {
                  if (optionDragState.fromIdx === optionIdx) {
                    isBeingDragged = true;
                    translateY = optionDragState.currentY - optionDragState.startY;
                  } else {
                    const from = optionDragState.fromIdx;
                    const current = optionDragState.currentIdx;
                    if (optionIdx > from && optionIdx <= current) {
                      translateY = -49;
                    } else if (optionIdx < from && optionIdx >= current) {
                      translateY = 49;
                    }
                  }
                }

                return (
                  <li
                    className={`option ${isItemChecked ? 'selected' : ''} ${isBeingDragged || draggedOptionIdx === optionIdx ? 'dragging-option' : ''}`}
                    key={optionIdx}
                    onClick={() => {
                      if (isDraggingOptionRef.current) return;
                      handleOptionToggle(optionIdx);
                    }}
                    onPointerDown={(e) => handleOptionPointerDown(e, optionIdx)}
                    style={{
                      cursor: editMode ? 'grab' : 'pointer',
                      position: 'relative',
                      zIndex: isBeingDragged ? 50 : 6,
                      transform: `translateY(${translateY}px) ${isBeingDragged ? 'scale(1.02)' : 'scale(1)'}`,
                      transition: isBeingDragged ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                      boxShadow: isBeingDragged ? '0 12px 30px rgba(0, 0, 0, 0.6)' : undefined,
                      userSelect: 'none',
                      touchAction: 'none',
                    }}
                  >
                    {/* Drag handle icon in edit mode */}
                    {editMode && (
                      <span
                        className="drag-handle-icon"
                        title="Drag or use arrows to reorder item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
                          cursor: 'grab',
                          marginRight: '2px',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </span>
                    )}

                    {/* Tick box checkbox circle */}
                    <span className="check-box">
                      <svg viewBox="0 0 16 16">
                        <polyline points="2,8 6,12 14,4" />
                      </svg>
                    </span>

                    {isEditingItem ? (
                      <input
                        ref={listInputRef}
                        className="opt-input"
                        style={{ display: 'block' }}
                        type="text"
                        value={editingItemValue}
                        onChange={(e) => setEditingItemValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => commitItemEditing(optionIdx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitItemEditing(optionIdx);
                        }}
                      />
                    ) : (
                      <span className="opt-text">{itemText}</span>
                    )}

                    {/* Clock Icon button to open Calendar Reminder page */}
                    {!isEditingItem && (() => {
                      const modeAccent = modes[currentMode]?.accent || '#3b82f6';
                      const hasActiveReminder = !!(itemReminder && itemReminder.enabled && itemReminder.time && itemReminder.time.trim() !== '');
                      return (
                        <button
                          className={`option-clock-btn ${hasActiveReminder ? 'has-reminder' : ''}`}
                          title={
                            hasActiveReminder
                              ? `Reminder set for ${itemReminder.date} at ${itemReminder.time}${itemReminder.note ? ` (${itemReminder.note})` : ''}`
                              : 'Set calendar date & time reminder'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCalendarTask({ modeKey: currentMode, taskText: itemText, taskIdx: optionIdx });
                          }}
                          style={{
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            lineHeight: 1,
                            ...(hasActiveReminder
                              ? {
                                  color: modeAccent,
                                  border: 'none',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: isLight ? '#ffffff' : 'rgba(0,0,0,0.35)',
                                  boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.08)' : '0 1px 4px rgba(0, 0, 0, 0.25)',
                                }
                              : {})
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: modeAccent, flexShrink: 0, display: 'block' }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {hasActiveReminder && (
                            <span className="reminder-time-badge" style={{ color: modeAccent, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{itemReminder.time}</span>
                          )}
                        </button>
                      );
                    })()}

                    {/* Action reorder & delete buttons in edit mode */}
                    {editMode && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          marginLeft: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="reorder-item-btn"
                          disabled={optionIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOption(optionIdx, optionIdx - 1);
                          }}
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'),
                            color: isLight ? '#0f172a' : '#ffffff',
                            opacity: optionIdx === 0 ? 0.25 : 0.85,
                            cursor: optionIdx === 0 ? 'default' : 'pointer',
                            padding: '2px 5px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move item up"
                        >
                          ▲
                        </button>
                        <button
                          className="reorder-item-btn"
                          disabled={optionIdx === totalOptionsCount - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOption(optionIdx, optionIdx + 1);
                          }}
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'),
                            color: isLight ? '#0f172a' : '#ffffff',
                            opacity: optionIdx === totalOptionsCount - 1 ? 0.25 : 0.85,
                            cursor: optionIdx === totalOptionsCount - 1 ? 'default' : 'pointer',
                            padding: '2px 5px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move item down"
                        >
                          ▼
                        </button>
                        <button className="del-btn animate-fade-in" style={{ display: 'flex' }} onClick={(e) => deleteItemOption(e, optionIdx)} title="Delete option">
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {editMode && (
              <button className="add-btn" style={{ display: 'flex' }} onClick={addNewItemOption}>
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add option
              </button>
            )}
          </div>

          {/* Reset tab-checkboxes trigger */}
          <div className="reset-wrap font-sans" onClick={triggerResetChecklist} style={{ userSelect: 'none' }}>
            <button className="reset-btn" tabIndex={-1}>
              <svg viewBox="0 0 24 24">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
              </svg>
              <span id="reset-label">{editMode ? 'Reset all columns' : 'Reset active column'}</span>
            </button>
          </div>
        </div>
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
