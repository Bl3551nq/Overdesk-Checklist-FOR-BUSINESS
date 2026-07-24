import React, { useState, useEffect, useRef } from 'react';
import overdeskLogo from './logo.svg';
import { MinimizedReminderView } from './components/MinimizedReminderView';
import { Glass } from './components/Glass';

// Declaration to access global Electron API from preload script
declare global {
  interface Window {
    electronAPI?: {
      checkLicense: () => Promise<{ ok: boolean; key?: string }>;
      validateLicense: (key: string) => Promise<{ ok: boolean; test?: boolean; error?: string }>;
      closeApp: () => void;
      setHeight: (height: number) => void;
      cardBounds: (bounds: { x: number; y: number; w: number; h: number; scale?: number }) => void;
      scaleStart: () => void;
      scaleEnd: (scale: number) => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      installUpdate: () => void;
      onUpdateAvailable: (cb: (version: string) => void) => void;
      onUpdateDownloaded: (cb: () => void) => void;
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
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
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6L12 2z" opacity="0.9" />
        <rect x="9.2" y="9" width="2" height="6" rx="0.6" fill="#fff" opacity="0.85" />
        <rect x="12.8" y="9" width="2" height="6" rx="0.6" fill="#fff" opacity="0.85" />
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
}

const DEFAULT_MODES: Record<string, ModeDetail> = {
  business: {
    title: 'Business',
    accent: 'rgba(30, 140, 255, 0.9)',
    soft: 'rgba(60, 170, 255, 0.18)',
    defaultAccent: 'rgba(30, 140, 255, 0.9)',
    defaultSoft: 'rgba(60, 170, 255, 0.18)',
    options: ['Review client proposals', 'Team sync & project status', 'Approve pending invoices', 'Quarterly goal check-in'],
  },
  life: {
    title: 'Everyday Life',
    accent: 'rgba(0, 190, 80, 0.9)',
    soft: 'rgba(0, 230, 100, 0.16)',
    defaultAccent: 'rgba(0, 190, 80, 0.9)',
    defaultSoft: 'rgba(0, 230, 100, 0.16)',
    options: ['Morning coffee & planning', 'Grocery list & errands', '30 min workout or walk', 'Evening downtime & book'],
  },
  pc: {
    title: 'PC & Workstation',
    accent: 'rgba(140, 0, 225, 0.9)',
    soft: 'rgba(170, 0, 255, 0.16)',
    defaultAccent: 'rgba(140, 0, 225, 0.9)',
    defaultSoft: 'rgba(170, 0, 255, 0.16)',
    options: ['Clean desktop & downloads', 'System & security updates', 'Backup important files', 'Organize workspace tabs'],
  },
  sync: {
    title: 'Focus & DND',
    accent: 'rgba(215, 25, 75, 0.9)',
    soft: 'rgba(255, 40, 100, 0.16)',
    defaultAccent: 'rgba(215, 25, 75, 0.9)',
    defaultSoft: 'rgba(255, 40, 100, 0.16)',
    options: ['Deep work block', 'Mute phone & chat alerts', 'Close distraction tabs', 'Single-task until finished'],
  },
  alerts: {
    title: 'Daily Schedule',
    accent: 'rgba(220, 100, 0, 0.9)',
    soft: 'rgba(255, 140, 0, 0.18)',
    defaultAccent: 'rgba(220, 100, 0, 0.9)',
    defaultSoft: 'rgba(255, 140, 0, 0.18)',
    options: ["Check today's calendar", 'Review top 3 priorities', 'Follow up on key emails', 'End-of-day summary'],
  },
};

// Play the high-quality Princess Bell MP3 chime repeated 5 times
const playModernChime = () => {
  try {
    let playCount = 0;
    const playNext = () => {
      if (playCount >= 5) return;
      const audio = new Audio("https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/princess_bell.mp3");
      audio.volume = 0.8;
      audio.addEventListener('ended', () => {
        playCount++;
        playNext();
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

  // License State
  const [licenseActive, setLicenseActive] = useState<boolean>(true); // active by default in web preview
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [licenseError, setLicenseError] = useState<boolean>(false);
  const [licenseAPIErrorText, setLicenseAPIErrorText] = useState<string>('');

  // Modular Modes Storage
  const [modes, setModes] = useState<Record<string, ModeDetail>>(() => {
    try {
      const ver = localStorage.getItem('fm_state_ver');
      if (ver === '4.0') {
        const saved = localStorage.getItem('fm_modes');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Ensure accurate merge with initial fields
          const mergedObj = { ...DEFAULT_MODES };
          Object.keys(parsed).forEach((k) => {
            if (mergedObj[k]) {
              if (typeof parsed[k].title === 'string' && parsed[k].title.length > 0) {
                mergedObj[k].title = parsed[k].title;
              }
              if (Array.isArray(parsed[k].options) && parsed[k].options.length > 0) {
                mergedObj[k].options = parsed[k].options;
              }
              if (parsed[k].accent) mergedObj[k].accent = parsed[k].accent;
              if (parsed[k].soft) mergedObj[k].soft = parsed[k].soft;
            }
          });
          return mergedObj;
        }
      }
    } catch (e) {}
    return DEFAULT_MODES;
  });

  // Current selections for each mode
  const [selections, setSelections] = useState<Record<string, number[]>>(() => {
    const defaultSels: Record<string, number[]> = {};
    Object.keys(DEFAULT_MODES).forEach((m) => {
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
      const ver = localStorage.getItem('fm_state_ver');
      if (ver === '4.0') {
        const saved = localStorage.getItem('fm_icons');
        if (saved) {
          return JSON.parse(saved);
        }
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

  // Customizer picker state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerTargetMode, setPickerTargetMode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Title focus, item editing tracking
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState<string>('');

  // Auto Updater State
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateInstalling, setUpdateInstalling] = useState<boolean>(false);

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
        curr.closest('.edit-toggle') ||
        curr.closest('.settings-toggle') ||
        curr.closest('#settings-panel') ||
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
        // If they move too much before the long press completes, cancel the timer
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (dragPointerRef.current.timer) {
            clearTimeout(dragPointerRef.current.timer);
            dragPointerRef.current.timer = null;
          }
          cleanup();
        }
        return;
      }

      setTranslate({
        x: startTX + dx,
        y: startTY + dy,
      });
    };

    const onPointerUp = () => {
      if (dragPointerRef.current.timer) {
        clearTimeout(dragPointerRef.current.timer);
        dragPointerRef.current.timer = null;
      }

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

    // 250ms long press trigger
    dragPointerRef.current.timer = setTimeout(() => {
      isDraggingActive = true;
      setIsGripped(true);
      dragPointerRef.current.dragging = true;
      playSoundChime('check');
    }, 250);

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
    // Clear stale old states if any config mismatch from legacy assets
    const ver = localStorage.getItem('fm_state_ver');
    if (ver !== '4.0') {
      localStorage.removeItem('fm_modes');
      localStorage.removeItem('fm_theme');
      localStorage.removeItem('fm_scale');
      localStorage.removeItem('fm_icons');
      Object.keys(DEFAULT_MODES).forEach((m) => localStorage.removeItem('fm_sel_' + m));
      localStorage.setItem('fm_state_ver', '4.0');
      setModes(DEFAULT_MODES);
      setSelections({
        business: [],
        life: [],
        pc: [],
        sync: [],
        alerts: [],
      });
      setIconAssignments({
        business: 'briefcase',
        life: 'home',
        pc: 'laptop',
        sync: 'shield',
        alerts: 'calendar',
      });
      setCurrentMode('business');
    }

    // Determine stored Theme
    const isLightStored = localStorage.getItem('fm_theme') === '1';
    setIsLight(isLightStored);

    // Initial check license trigger on Electron if available
    if (window.electronAPI) {
      document.body.classList.add('electron');
      window.electronAPI.checkLicense().then((res) => {
        if (!res.ok) {
          setLicenseActive(false);
        } else {
          setLicenseActive(true);
        }
      });

      // Hook up Electron automatic updater listeners
      window.electronAPI.onUpdateAvailable((version) => {
        setUpdateVersion(version);
        setUpdateAvailable(true);
      });

      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateVersion((prev) => prev + ' (Ready)');
      });
    }
  }, []);

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
  }, [modes]);

  useEffect(() => {
    localStorage.setItem('fm_theme', isLight ? '1' : '0');
  }, [isLight]);

  useEffect(() => {
    localStorage.setItem('fm_icons', JSON.stringify(iconAssignments));
  }, [iconAssignments]);

  useEffect(() => {
    localStorage.setItem('fm_scale', scale.toString());
  }, [scale]);

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
  const handleSizingMouseDown = () => {};

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
      const forceCapture = isGripped || sizingRef.current?.dragging;

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

  // ── Gumroad License verification triggering ──
  const handleLicenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseInput(e.target.value);
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
        setLicenseAPIErrorText('');
      } else {
        setLicenseError(true);
        const err = resp.error || '';
        if (err.includes('refunded')) {
          setLicenseAPIErrorText('This license has been refunded and is no longer valid.');
        } else if (err.includes('already activated') || err.includes('another device')) {
          setLicenseAPIErrorText('This license key is already activated on another device. Contact support to transfer.');
        } else {
          setLicenseAPIErrorText('Invalid Key, get key from Gumroad');
        }
      }
    } else {
      // Fallback bypass mode on standard web preview
      setLicenseActive(true);
      setLicenseAPIErrorText('');
    }
  };

  // ── Switch Active Tab Tab Modes ──
  const handleModeIconClick = (mode: string) => {
    if (editMode) {
      // Toggle mode visual configuration overlay
      setPickerTargetMode(mode);
      setPickerOpen(true);
    } else {
      setEditingTitle(false);
      setEditingItemIdx(null);
      setCurrentMode(mode);
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
    if (activeList.includes(idx)) {
      updated = activeList.filter((v) => v !== idx);
      playSoundChime('check');
    } else {
      updated = [...activeList, idx];
      playSoundChime('check');
      const totalOptionsCount = modes[currentMode].options.length;
      if (updated.length === totalOptionsCount) {
        setTimeout(() => playSoundChime('complete'), 150);
      }
    }

    const nextSelections = { ...selections, [currentMode]: updated };
    setSelections(nextSelections);
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(updated));
  };

  // ── Reset entire checklist indices ──
  const triggerResetChecklist = () => {
    if (editMode) {
      // In edit mode - reset all checkboxes of ALL modes to blank empty values
      const emptyChecklists: Record<string, number[]> = {};
      Object.keys(modes).forEach((m) => {
        emptyChecklists[m] = [];
        localStorage.setItem('fm_sel_' + m, JSON.stringify([]));
      });
      setSelections(emptyChecklists);
    } else {
      // Reset checkboxes of ONLY the selected current mode block
      const nextSelections = { ...selections, [currentMode]: [] };
      setSelections(nextSelections);
      localStorage.setItem('fm_sel_' + currentMode, JSON.stringify([]));
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
    if (!editingTitle) return;
    const nextVal = titleInputValue.trim() || modes[currentMode].title;
    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        title: nextVal,
      },
    }));
    setEditingTitle(false);
  };

  // ── Edit operations: Rename items ──
  const commitItemEditing = (idx: number) => {
    if (editingItemIdx === null) return;
    const listCopy = [...modes[currentMode].options];
    const finalVal = editingItemValue.trim() || listCopy[idx];
    listCopy[idx] = finalVal;

    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: listCopy,
      },
    }));
    setEditingItemIdx(null);
  };

  // ── Delete item ──
  const deleteItemOption = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (modes[currentMode].options.length <= 1) return; // cannot delete of size 1

    const updatedOptions = modes[currentMode].options.filter((_, i) => i !== idx);
    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: updatedOptions,
      },
    }));

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
    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: listCopy,
      },
    }));

    const nextIdx = listCopy.length - 1;
    setEditingItemIdx(nextIdx);
    setEditingItemValue('New option');
    setTimeout(() => {
      listInputRef.current?.focus();
      listInputRef.current?.select();
    }, 60);
  };

  // ── Mode customized color-picker operations ──
  const assignModeColor = (targetMode: string, accent: string, soft: string) => {
    setModes((prev) => ({
      ...prev,
      [targetMode]: {
        ...prev[targetMode],
        accent,
        soft,
      },
    }));
  };

  const resetModeColorToDefault = (targetMode: string) => {
    const defaults = DEFAULT_MODES[targetMode];
    assignModeColor(targetMode, defaults.defaultAccent, defaults.defaultSoft);
  };

  const assignModeIcon = (targetMode: string, iconKey: string) => {
    setIconAssignments((prev) => ({
      ...prev,
      [targetMode]: iconKey,
    }));
    setPickerOpen(false);
    setPickerTargetMode(null);
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
        width: '460px',
        height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
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
          boxShadow: !licenseActive ? 'none' : (isGripped ? `0 18px 50px 5px ${modes[currentMode]?.soft || 'var(--accent-soft)'}, 0 6px 18px rgba(0, 0, 0, 0.45)` : undefined),
          transition: isGripped ? 'transform 0s, box-shadow 0.2s ease' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, padding 0.35s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: isGripped ? 'grabbing' : undefined,
          minHeight: (settingsOpen && !minimized) ? '390px' : undefined,
        }}
      >
        {!licenseActive ? (
          <div className="license-card-inner" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', boxSizing: 'border-box', padding: '16px 8px' }}>
            <img 
              className="license-logo" 
              src={overdeskLogo} 
              alt="Overdesk Checklist Logo" 
              style={{ width: '80px', height: '100px', objectFit: 'contain', marginBottom: '16px' }}
              referrerPolicy="no-referrer"
            />
            <div className="license-title" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>Overdesk Checklist</div>
            <div className="license-sub" style={{ fontSize: '11px', color: 'var(--text-mid)', textAlign: 'center', lineHeight: '1.4' }}>
              Enter your license key to activate.
              <br />
              Find your license key inside your Gumroad purchase receipt.
            </div>
            <input
              className={`license-input ${licenseError ? 'error' : ''}`}
              id="license-input"
              type="text"
              placeholder="Enter Gumroad License Key"
              maxLength={100}
              value={licenseInput}
              onChange={handleLicenseInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attemptActivation();
              }}
              style={{ width: '100%' }}
            />
            {licenseAPIErrorText && (
              <div 
                className="license-api-feedback"
                style={{
                  fontSize: '11px',
                  color: licenseError ? '#ff4d4d' : '#00ccff',
                  textAlign: 'center',
                  marginTop: '-4px',
                  marginBottom: '4px',
                  padding: '0 8px',
                  wordBreak: 'break-word',
                  lineHeight: '1.3'
                }}
              >
                {licenseAPIErrorText}
              </div>
            )}
            <button className="license-btn" onClick={attemptActivation} style={{ width: '100%' }}>
              Activate
            </button>
            
            <div className="license-hint" style={{ fontSize: '11px', marginTop: '12px', textAlign: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                Get your license key on Gumroad: <a href="https://overdesk.gumroad.com/l/app3" target="_blank" rel="noreferrer" style={{ color: '#00ccff', textDecoration: 'underline' }}>overdesk.gumroad.com/l/app3</a>
              </span>
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
            <div className="icons">
          {Object.keys(modes).map((mKey) => {
            const hasLiquidFill = selections[mKey]?.length > 0;
            const isSelected = mKey === currentMode;
            const waveParams = compileLiquidWaveData(mKey);

            return (
              <div className="icon-wrap" key={mKey}>
                <Glass
                  isLight={isLight}
                  borderRadius={25}
                  width={50}
                  height={50}
                  variant={isSelected ? "default" : "subtle"}
                  backgroundOpacity={isSelected ? (isLight ? 0.35 : 0.18) : (isLight ? 0.15 : 0.08)}
                  style={{
                    borderRadius: '50%',
                    boxShadow: isSelected 
                      ? `0 0 16px ${modes[mKey]?.soft || 'var(--accent-soft)'}${isLight ? ', 0 2px 8px rgba(0, 0, 0, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95)' : ''}` 
                      : (isLight ? '0 2px 6px rgba(0, 0, 0, 0.06), inset 0 1px 1.5px rgba(255, 255, 255, 0.85)' : 'none'),
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
                  <button
                    className={`icon-btn ${isSelected ? 'active' : ''} ${hasLiquidFill ? 'has-liquid' : ''}`}
                    data-mode={mKey}
                    onClick={() => handleModeIconClick(mKey)}
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
                    {ICON_LIBRARY[iconAssignments[mKey]]?.svg || ICON_LIBRARY.briefcase?.svg || ICON_LIBRARY.home?.svg}
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

            {/* Icon grid options list selector */}
            <div className="picker-grid">
              {Object.entries(ICON_LIBRARY).map(([libKey, def]) => (
                <div
                  className={`picker-item ${iconAssignments[pickerTargetMode] === libKey ? 'current' : ''}`}
                  key={libKey}
                  onClick={() => assignModeIcon(pickerTargetMode, libKey)}
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
          <div className="icon-picker open" id="settings-panel">
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

            <div className="settings-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '6px', padding: '2px 8px 10px', overflow: 'hidden', flex: 1 }}>
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Window Scale</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '100%' }}>
                  {[2, 1.5, 1.2, 1, 0.7, 0.5].map((val) => {
                    const isSelected = Math.abs(scale - val) < 0.01;
                    const label = val === 2 ? 'x2'
                                : val === 1.5 ? 'x1.5'
                                : val === 1.2 ? 'x1.2'
                                : val === 1 ? 'x1'
                                : val === 0.7 ? 'x0.7'
                                : 'x0.5';
                    return (
                      <button
                        key={val}
                        onClick={() => handleScaleChange(val)}
                        className="scale-select-btn"
                        style={{
                          padding: '5px 2px',
                          borderRadius: '10px',
                          background: isSelected ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                          border: '1px solid ' + (isSelected ? 'var(--accent)' : 'transparent'),
                          color: isSelected ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                          fontWeight: '600',
                          fontSize: '10.5px',
                          cursor: 'pointer',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--divider)', paddingTop: '6px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Countdown Display</span>
                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                  <button
                    onClick={() => handleShowCountdownChange(true)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: showCountdown ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (showCountdown ? 'var(--accent)' : 'transparent'),
                      color: showCountdown ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Shown
                  </button>
                  <button
                    onClick={() => handleShowCountdownChange(false)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: !showCountdown ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (!showCountdown ? 'var(--accent)' : 'transparent'),
                      color: !showCountdown ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Hidden
                  </button>
                </div>
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--divider)', paddingTop: '6px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Completion Alarm</span>
                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                  <button
                    onClick={() => handleAlarmEnabledChange(true)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: alarmEnabled ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (alarmEnabled ? 'var(--accent)' : 'transparent'),
                      color: alarmEnabled ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Alarm On
                  </button>
                  <button
                    onClick={() => handleAlarmEnabledChange(false)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: !alarmEnabled ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (!alarmEnabled ? 'var(--accent)' : 'transparent'),
                      color: !alarmEnabled ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Alarm Off
                  </button>
                </div>
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--divider)', paddingTop: '6px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Minimized Text Animation</span>
                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                  <button
                    onClick={() => handleAnimateMinimizedTextChange(true)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: animateMinimizedText ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (animateMinimizedText ? 'var(--accent)' : 'transparent'),
                      color: animateMinimizedText ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Animated
                  </button>
                  <button
                    onClick={() => handleAnimateMinimizedTextChange(false)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '10px',
                      background: !animateMinimizedText ? 'var(--accent)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                      border: '1px solid ' + (!animateMinimizedText ? 'var(--accent)' : 'transparent'),
                      color: !animateMinimizedText ? '#fff' : (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    Static
                  </button>
                </div>
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
                  border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'),
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
                      color: 'var(--accent)',
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
                  color: isTimerRunning ? 'var(--accent)' : 'var(--text-dim)',
                  background: isTimerRunning ? 'var(--accent-soft)' : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: '1px solid ' + (isTimerRunning ? 'var(--accent)' : 'transparent'),
                  userSelect: 'none',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                }}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? "Pause timer" : "Start timer"}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.04em',
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
              style={{ display: 'block' }}
              type="text"
              value={titleInputValue}
              onChange={(e) => setTitleInputValue(e.target.value)}
              onBlur={commitTitleEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitleEditing();
              }}
            />
          ) : (
            <div className={`title-container-editable ${editMode ? 'can-edit' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              >
                {modes[currentMode]?.title || 'Precision'}
              </h1>
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
          <div className="scroll-area">
            <ul className="options" id="options-list">
              {modes[currentMode]?.options.map((itemText, optionIdx) => {
                const isItemChecked = (selections[currentMode] || []).includes(optionIdx);
                const isEditingItem = editingItemIdx === optionIdx;

                return (
                  <li className={`option ${isItemChecked ? 'selected' : ''}`} key={optionIdx} onClick={() => handleOptionToggle(optionIdx)}>
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

                    {/* Action delete toggle */}
                    {editMode && (
                      <button className="del-btn animate-fade-in" style={{ display: 'flex' }} onClick={(e) => deleteItemOption(e, optionIdx)}>
                        ×
                      </button>
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
