'use client';

import { useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSpeech } from '@/hooks/useSpeech';

/**
 * Microphone button. Calls onText(finalTranscript) whenever speech is recognised.
 * Renders nothing in browsers without speech recognition.
 */
export default function VoiceButton({ onText, onInterim, className = 'btn btn-ghost btn-icon', continuous = false, title = 'Speak' }) {
  const { supported, listening, interim, error, toggle } = useSpeech({ onFinal: onText, continuous });

  useEffect(() => {
    onInterim?.(listening ? interim : '');
  }, [interim, listening, onInterim]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (!supported) return null;
  return (
    <button
      type="button"
      className={`${className} mic ${listening ? 'listening' : ''}`}
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : title}
      title={listening ? 'Listening… tap to stop' : title}
    >
      {listening ? <MicOff /> : <Mic />}
    </button>
  );
}

/** Animated "listening" strip showing the live transcript */
export function VoiceBar({ text }) {
  if (!text) return null;
  return (
    <div className="voice-bar" aria-live="polite">
      <span className="wave" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="truncate">{text}</span>
    </div>
  );
}
