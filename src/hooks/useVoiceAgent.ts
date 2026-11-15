import { useState, useRef, useCallback, useEffect } from 'react';
import { pickNaturalBrowserVoice, splitIntoNaturalSpeechChunks } from '../utils/interviewFlow';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeakOptions {
  text: string;
  persona?: string;
  voiceOverride?: string;
  onEnd?: () => void;
}

export const useVoiceAgent = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<'kokoro-neural-tts' | 'edge-neural-tts' | 'gemini-neural-tts' | 'neural-browser'>('kokoro-neural-tts');
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Kore');
  const [audioBlocked, setAudioBlocked] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [committedTranscript, setCommittedTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const lastSpeakRef = useRef<SpeakOptions | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const keepListeningRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechGenerationRef = useRef(0);
  const ttsCooldownUntilRef = useRef(0);
  const chunkTimerRef = useRef<number | null>(null);

  const speechRecognitionCtor =
    typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
      : null;

  const speechSupported = Boolean(speechRecognitionCtor) || (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia));

  const stopSpeaking = useCallback(() => {
    speechGenerationRef.current += 1;
    if (chunkTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSynthesizing(false);
    setIsSpeaking(false);
  }, []);

  const speakWithBrowserVoice = useCallback(
    (text: string, persona?: string, voiceOverride?: string, onEnd?: () => void, genId?: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const chunks = splitIntoNaturalSpeechChunks(text);
        const voices = window.speechSynthesis.getVoices();
        const chosen = pickNaturalBrowserVoice(voices, persona, voiceOverride);

        const resolvedVoiceId = voiceOverride || (persona === 'Marcus Reed' ? 'Charon' : persona === 'David Chen' ? 'Puck' : persona === 'Dr. Elena Vance' ? 'Zephyr' : 'Kore');
        if (resolvedVoiceId) setActiveVoiceName(resolvedVoiceId);

        const isMaleTone =
          resolvedVoiceId === 'Charon' || resolvedVoiceId === 'Puck' || resolvedVoiceId === 'Fenrir';

        setVoiceProvider('neural-browser');
        setIsSpeaking(true);

        const speakChunkAt = (index: number) => {
          if (genId !== undefined && speechGenerationRef.current !== genId) {
            return;
          }
          if (index >= chunks.length) {
            setIsSpeaking(false);
            onEnd?.();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunks[index]);
          if (chosen) {
            utterance.voice = chosen;
          }
          // Conversational human interviewer cadence (~155 WPM) rather than rushed robotic speech
          utterance.rate = isMaleTone ? 0.96 : 0.97;
          utterance.pitch = isMaleTone ? 0.93 : 1.01;
          utterance.volume = 1;

          utterance.onend = () => {
            if (genId !== undefined && speechGenerationRef.current !== genId) return;
            if (index + 1 < chunks.length) {
              // Subtle 110ms conversational pause between sentences
              chunkTimerRef.current = window.setTimeout(() => {
                speakChunkAt(index + 1);
              }, 110);
            } else {
              setIsSpeaking(false);
              onEnd?.();
            }
          };

          utterance.onerror = () => {
            if (genId === undefined || speechGenerationRef.current === genId) {
              setIsSpeaking(false);
              onEnd?.();
            }
          };

          window.speechSynthesis.speak(utterance);
        };

        speakChunkAt(0);
      } catch {
        setIsSpeaking(false);
        onEnd?.();
      }
    },
    []
  );

  const fetchTtsAudioChunk = useCallback(
    async (chunkText: string, persona?: string, voiceOverride?: string) => {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunkText, persona, voiceOverride }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.voiceName) setActiveVoiceName(data.voiceName);
      if (!data.audioBase64 && data.quotaLimited) {
        ttsCooldownUntilRef.current = Date.now() + 5 * 60 * 1000;
      } else if (data.audioBase64) {
        ttsCooldownUntilRef.current = 0;
      }
      return data;
    },
    []
  );

  const speak = useCallback(
    async ({ text, persona, voiceOverride, onEnd }: SpeakOptions) => {
      if (!text.trim()) return;
      stopSpeaking();
      const myGen = speechGenerationRef.current;
      lastSpeakRef.current = { text, persona, voiceOverride, onEnd };
      setAudioBlocked(false);

      if (Date.now() < ttsCooldownUntilRef.current) {
        speakWithBrowserVoice(text, persona, voiceOverride, onEnd, myGen);
        return;
      }

      const chunks = splitIntoNaturalSpeechChunks(text);
      if (chunks.length === 0) {
        onEnd?.();
        return;
      }

      setIsSynthesizing(true);

      try {
        let nextPromise: Promise<any> | null = fetchTtsAudioChunk(chunks[0], persona, voiceOverride);

        for (let idx = 0; idx < chunks.length; idx++) {
          if (speechGenerationRef.current !== myGen) return;

          const data = await nextPromise;
          if (speechGenerationRef.current !== myGen) return;

          if (!data || !data.audioBase64) {
            setIsSynthesizing(false);
            const remaining = chunks.slice(idx).join(' ');
            speakWithBrowserVoice(remaining, persona, voiceOverride, onEnd, myGen);
            return;
          }

          // Prefetch next chunk in parallel while current human voice chunk plays aloud
          nextPromise =
            idx + 1 < chunks.length
              ? fetchTtsAudioChunk(chunks[idx + 1], persona, voiceOverride).catch(() => null)
              : null;

          const resolvedProvider =
            data.provider === 'kokoro-neural-tts'
              ? 'kokoro-neural-tts'
              : data.provider === 'gemini-neural-tts'
              ? 'gemini-neural-tts'
              : 'edge-neural-tts';
          setVoiceProvider(resolvedProvider);
          setIsSynthesizing(false);

          const playedOk = await new Promise<'ok' | 'blocked' | 'error' | 'cancelled'>((resolve) => {
            const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
            audioElRef.current = audio;

            audio.onended = () => {
              if (audioElRef.current === audio) audioElRef.current = null;
              resolve(speechGenerationRef.current === myGen ? 'ok' : 'cancelled');
            };
            audio.onerror = () => {
              if (audioElRef.current === audio) audioElRef.current = null;
              resolve('error');
            };

            setIsSpeaking(true);
            audio.play().catch(() => {
              if (audioElRef.current === audio) audioElRef.current = null;
              resolve('blocked');
            });
          });

          if (speechGenerationRef.current !== myGen || playedOk === 'cancelled') {
            return;
          }
          if (playedOk === 'blocked') {
            setIsSpeaking(false);
            setAudioBlocked(true);
            return;
          }
          if (playedOk === 'error') {
            const remaining = chunks.slice(idx).join(' ');
            speakWithBrowserVoice(remaining, persona, voiceOverride, onEnd, myGen);
            return;
          }
        }

        if (speechGenerationRef.current === myGen) {
          setIsSpeaking(false);
          onEnd?.();
        }
        return;
      } catch {
        // Fallback smoothly to best available browser natural voice
      }

      if (speechGenerationRef.current !== myGen) return;
      setIsSynthesizing(false);
      speakWithBrowserVoice(text, persona, voiceOverride, onEnd, myGen);
    },
    [stopSpeaking, speakWithBrowserVoice, fetchTtsAudioChunk]
  );

  const replayLastSpeech = useCallback(() => {
    if (lastSpeakRef.current) {
      void speak(lastSpeakRef.current);
    }
  }, [speak]);

  const stopMediaRecorder = useCallback(async (): Promise<string> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return '';

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (chunks.length === 0) {
          resolve('');
          return;
        }

        try {
          setIsTranscribingAudio(true);
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const base64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = String(reader.result || '');
              res(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.onerror = () => rej(new Error('Audio read error'));
            reader.readAsDataURL(blob);
          });

          const resp = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: blob.type || 'audio/webm' }),
          });
          if (resp.ok) {
            const data = await resp.json();
            const text = String(data.text || '').trim();
            if (text) {
              setCommittedTranscript((prev) => (prev ? `${prev} ${text}` : text));
            }
            resolve(text);
            return;
          }
        } catch {
          // Ignore transcription error
        } finally {
          setIsTranscribingAudio(false);
        }
        resolve('');
      };
      recorder.stop();
    });
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    keepListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore already stopped recognition
      }
      recognitionRef.current = null;
    }
    const mediaText = await stopMediaRecorder();
    setInterimTranscript('');
    return mediaText;
  }, [stopMediaRecorder]);

  const startListening = useCallback(async () => {
    setMicError(null);
    stopSpeaking();

    if (speechRecognitionCtor) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        const rec: SpeechRecognitionInstanceLike = new speechRecognitionCtor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        keepListeningRef.current = true;

        rec.onresult = (event: SpeechRecognitionEventLike) => {
          let finalizedChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const segment = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalizedChunk += `${segment} `;
            } else {
              interimChunk += segment;
            }
          }
          if (finalizedChunk.trim()) {
            setCommittedTranscript((prev) =>
              prev ? `${prev.trim()} ${finalizedChunk.trim()}` : finalizedChunk.trim()
            );
          }
          setInterimTranscript(interimChunk);
        };

        rec.onerror = (evt) => {
          if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
            setMicError('Microphone permission denied. Please enable mic access in your browser bar.');
            keepListeningRef.current = false;
            setIsListening(false);
          } else if (evt.error === 'no-speech' || evt.error === 'aborted') {
            // Transient silence; let onend auto-restart if still listening
          }
        };

        rec.onend = () => {
          if (keepListeningRef.current) {
            try {
              rec.start();
            } catch {
              setIsListening(false);
              keepListeningRef.current = false;
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
        return;
      } catch {
        // Fall through to MediaRecorder + Gemini Transcribe
      }
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
        setIsListening(true);
        return;
      } catch {
        setMicError('Microphone is unavailable or permission was denied in this browser.');
        setIsListening(false);
        return;
      }
    }

    setMicError('Voice capture requires a microphone-enabled browser.');
  }, [speechRecognitionCtor, stopSpeaking]);

  const resetCapturedSpeech = useCallback(() => {
    setCommittedTranscript('');
    setInterimTranscript('');
  }, []);

  const getCombinedTranscript = useCallback(() => {
    return [committedTranscript.trim(), interimTranscript.trim()].filter(Boolean).join(' ').trim();
  }, [committedTranscript, interimTranscript]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      keepListeningRef.current = false;
      recognitionRef.current?.abort();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopSpeaking]);

  return {
    isSpeaking,
    isSynthesizing,
    voiceProvider,
    activeVoiceName,
    audioBlocked,
    isListening,
    isTranscribingAudio,
    committedTranscript,
    interimTranscript,
    micError,
    speechSupported,
    speak,
    stopSpeaking,
    replayLastSpeech,
    startListening,
    stopListening,
    resetCapturedSpeech,
    getCombinedTranscript,
  };
};
