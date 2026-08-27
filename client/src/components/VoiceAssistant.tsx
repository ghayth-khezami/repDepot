import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getFocusedField() {
  const element = document.activeElement;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.type !== 'file' && element.type !== 'checkbox' && element.type !== 'radio') {
      return element;
    }
  }
  return null;
}

export default function VoiceAssistant() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const focusedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('Cliquez dans un champ, puis parlez.');
  const [fieldRect, setFieldRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const rememberField = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.type !== 'file' && target.type !== 'checkbox' && target.type !== 'radio') {
          focusedFieldRef.current = target;
          setFieldRect(target.getBoundingClientRect());
          setMessage('Champ sélectionné. Cliquez sur Assistance vocale.');
        }
      }
    };

    document.addEventListener('focusin', rememberField);
    return () => {
      document.removeEventListener('focusin', rememberField);
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const field = getFocusedField() ?? focusedFieldRef.current;
    if (!field) {
      setMessage('Sélectionnez d’abord un champ texte.');
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage('La saisie vocale n’est pas disponible dans ce navigateur.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (!transcript) return;

      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(field, `${field.value.trim()}${field.value.trim() ? ' ' : ''}${transcript}`);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      setMessage('Texte ajouté dans le champ.');
    };
    recognition.onerror = () => {
      setListening(false);
      setMessage('La saisie vocale n’a pas pu démarrer.');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    setMessage('Je vous écoute…');
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setMessage('La saisie vocale n’a pas pu démarrer.');
    }
  };

  const position = fieldRect
    ? { top: `${fieldRect.bottom + 8}px`, left: `${Math.max(12, fieldRect.right - 170)}px` }
    : undefined;

  return (
    <div className={`voice-assistant${fieldRect ? ' voice-assistant-near-field' : ''}`} style={position} aria-live="polite">
      <span className="voice-assistant-message">{message}</span>
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={toggleListening}
        className="voice-assistant-button"
        aria-pressed={listening}
        aria-label={listening ? 'Arrêter l’assistance vocale' : 'Assistance vocale'}
      >
        {listening ? <MicOff size={17} /> : <Mic size={17} />}
        <span>Assistance vocale</span>
      </button>
    </div>
  );
}
