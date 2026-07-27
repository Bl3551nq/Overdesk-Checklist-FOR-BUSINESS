import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface MinimizedReminderViewProps {
  reminderText: string;
  isEditingReminder: boolean;
  tempReminderText: string;
  isLight: boolean;
  accentSoft?: string;
  animateText?: boolean;
  setTempReminderText: (value: string) => void;
  setIsEditingReminder: (value: boolean) => void;
  handleSaveReminder: () => void;
  getReminderFontSize: (value: string) => string;
}

interface TypewriterTextProps {
  text: string;
  speed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  getReminderFontSize: (value: string) => string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  deleteSpeed = 25,
  pauseDuration = 30000,
  getReminderFontSize,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Reset when target text changes
  useEffect(() => {
    setDisplayText('');
    setIsDeleting(false);
    setIsPaused(false);
  }, [text]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
    } else if (isDeleting) {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(text.substring(0, displayText.length - 1));
        }, deleteSpeed);
      } else {
        setIsDeleting(false);
      }
    } else {
      if (displayText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayText(text.substring(0, displayText.length + 1));
        }, speed);
      } else {
        setIsPaused(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, isPaused, text, speed, deleteSpeed, pauseDuration]);

  const fontSize = getReminderFontSize(text);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateAreas: '"content"',
        alignItems: 'center',
        justifyItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Invisible layout-reservation element matching full text space so height never changes */}
      <span
        aria-hidden="true"
        style={{
          gridArea: 'content',
          visibility: 'hidden',
          fontSize: fontSize,
          fontWeight: 800,
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          wordBreak: 'break-word',
          textAlign: 'center',
          width: '100%',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {text || 'A'} |
      </span>

      {/* Visible typing element */}
      <span
        style={{
          gridArea: 'content',
          fontSize: fontSize,
          fontWeight: 800,
          color: 'var(--text)',
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          wordBreak: 'break-word',
          textAlign: 'center',
          width: '100%',
          display: 'block',
        }}
      >
        {displayText}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          style={{
            display: 'inline-block',
            marginLeft: '2px',
            color: 'var(--accent)',
            fontWeight: 700,
          }}
        >
          |
        </motion.span>
      </span>
    </div>
  );
};

export const MinimizedReminderView: React.FC<MinimizedReminderViewProps> = ({
  reminderText,
  isEditingReminder,
  tempReminderText,
  isLight,
  accentSoft,
  animateText = true,
  setTempReminderText,
  setIsEditingReminder,
  handleSaveReminder,
  getReminderFontSize,
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (val.length > 100) {
      val = val.slice(0, 100);
    }
    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 16) {
      setTempReminderText(words.slice(0, 16).join(' '));
    } else {
      setTempReminderText(val);
    }
  };

  return (
    <div className="minimized-reminder-view animate-fade-in">
      {isEditingReminder ? (
        <div className="reminder-edit-wrap">
          <textarea
            autoFocus
            className="minimized-reminder-input"
            value={tempReminderText}
            onChange={handleTextChange}
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveReminder();
              } else if (e.key === 'Escape') {
                setIsEditingReminder(false);
              }
            }}
            placeholder="Enter reminder (max 16 words / 100 chars)..."
            rows={2}
            style={{
              width: '100%',
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
              border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'),
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: getReminderFontSize(tempReminderText),
              fontWeight: 700,
              fontFamily: 'inherit',
              textAlign: 'center',
              padding: '6px 10px',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.3,
            }}
          />
          <div className="reminder-btn-row">
            <button
              onClick={handleSaveReminder}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 14px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 10px ' + (accentSoft || 'var(--accent-soft)'),
                transition: 'opacity 0.15s',
              }}
            >
              Save Reminder
            </button>
            <button
              onClick={() => setIsEditingReminder(false)}
              style={{
                background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="reminder-text-display-wrap"
          onDoubleClick={() => {
            setTempReminderText(reminderText);
            setIsEditingReminder(true);
          }}
          title="Double-click to edit reminder"
          style={{
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            borderRadius: '12px',
            background: 'transparent',
          }}
        >
          <div
            className="minimized-reminder-text"
            style={{
              fontSize: getReminderFontSize(reminderText),
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: 1.25,
              letterSpacing: '-0.015em',
              wordBreak: 'break-word',
              textAlign: 'center',
              width: '100%',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {animateText ? (
              <TypewriterText
                text={reminderText}
                pauseDuration={30000}
                getReminderFontSize={getReminderFontSize}
              />
            ) : (
              <span
                style={{
                  fontSize: getReminderFontSize(reminderText),
                  fontWeight: 800,
                  color: 'var(--text)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.015em',
                  wordBreak: 'break-word',
                  textAlign: 'center',
                  width: '100%',
                  display: 'block',
                }}
              >
                {reminderText}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
