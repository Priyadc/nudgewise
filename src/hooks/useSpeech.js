'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice-to-text using the browser's built-in Web Speech API (free, no API key).
 * Works in Chrome, Edge, Safari and Android browsers. Firefox does not support it yet.
 *
 *   const { supported, listening, interim, start, stop } = useSpeech({ onFinal: (text) => ... })
 */
export function useSpeech({ lang, onFinal, continuous = false } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang || navigator.language || 'en-IN';
    rec.interimResults = true;
    rec.continuous = continuous;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText.trim()) onFinalRef.current?.(finalText.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(e.error === 'not-allowed' ? 'Microphone access was blocked' : `Voice error: ${e.error}`);
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    return () => {
      rec.onresult = rec.onend = rec.onerror = null;
      try {
        rec.abort();
      } catch {}
    };
  }, [lang, continuous]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    setInterim('');
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // "already started" — ignore
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
