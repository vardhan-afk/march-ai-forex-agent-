'use client';

import { useState, useRef, useEffect } from 'react';

type ChatMessage = {
  id: number;
  role: 'user' | 'march';
  text: string;
  displayedText: string;
};

const GREETINGS = [
  "What do you need boss I can pull up live prices the latest news or anything on the calendar",
  "What were we working on today boss want a rundown of how the markets are moving or are we focused on a specific pair",
  "Ready when you are boss I can check gold run through the news or dig into any pair you're watching",
  "Boss good to have you back should I catch you up on prices and news or is there something specific on your mind",
  "What are we looking at today boss I've got live prices upcoming events and the latest headlines whenever you need them",
  "Hey boss markets have been moving want me to walk you through what's changed or are we diving into something specific",
];

interface MarchChatProps {
  onTalkingChange?: (talking: boolean) => void;
  pendingAsk?: { id: number; text: string } | null;
  onAskHandled?: () => void;
  onMinimize?: () => void;
  onCloseMarch?: () => void;
  autoStartVoice?: boolean; // NEW: Triggers voice mode automatically
}

export default function MarchChat({
  onTalkingChange,
  pendingAsk,
  onAskHandled,
  onMinimize,
  onCloseMarch,
  autoStartVoice = false,
}: MarchChatProps) {
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    pendingAsk ? [] : [{ id: 0, role: 'march', text: greeting, displayedText: '' }]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasSpokenGreeting = useRef(false);
  const conversationActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextIdRef = useRef(1);
  const lastHandledAskId = useRef<number | null>(null);

  // --- NEW: Automatically start or stop the mic when entering Voice Mode ---
  useEffect(() => {
    if (autoStartVoice && !conversationActiveRef.current) {
      conversationActiveRef.current = true;
      setConversationActive(true);
      listenOnce();
    } else if (!autoStartVoice && conversationActiveRef.current) {
      conversationActiveRef.current = false;
      setConversationActive(false);
      if (recognitionRef.current) recognitionRef.current.abort();
      setListening(false);
    }
  }, [autoStartVoice]);

  useEffect(() => {
    if (!hasSpokenGreeting.current && !pendingAsk) {
      hasSpokenGreeting.current = true;
      revealAndSpeak(0, greeting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingAsk && pendingAsk.id !== lastHandledAskId.current) {
      lastHandledAskId.current = pendingAsk.id;
      sendMessage(pendingAsk.text);
      onAskHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk]);

  function revealAndSpeak(messageId: number, text: string): Promise<void> {
    return new Promise(async (resolve) => {
      const audioDone = speak(text);

      const msPerChar = 45;
      let i = 0;
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }

      const typingDone = new Promise<void>((resolveTyping) => {
        typewriterTimerRef.current = setInterval(() => {
          i += 1;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, displayedText: text.slice(0, i) } : m))
          );
          if (i >= text.length) {
            if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
            resolveTyping();
          }
        }, msPerChar);
      });

      await Promise.all([audioDone, typingDone]);
      resolve();
    });
  }

  function speak(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();

        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          const stopTalking = () => {
            onTalkingChange?.(false);
            resolve();
          };
          audio.onplay = () => onTalkingChange?.(true);
          audio.onended = stopTalking;
          audio.onerror = stopTalking;
          audio.play();
        } else {
          resolve();
        }
      } catch (err) {
        console.error('Speak failed:', err);
        onTalkingChange?.(false);
        resolve();
      }
    });
  }

  function getRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    return recognition;
  }

  function listenOnce() {
    const recognition = getRecognition();
    if (!recognition) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      setConversationActive(false);
      conversationActiveRef.current = false;
      return;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      await sendMessage(transcript);
      if (conversationActiveRef.current) {
        listenOnce();
      }
    };

    recognition.onerror = () => {
      setListening(false);
      if (conversationActiveRef.current) {
        setTimeout(() => {
          if (conversationActiveRef.current) listenOnce();
        }, 600);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  function toggleConversation() {
    if (conversationActiveRef.current) {
      conversationActiveRef.current = false;
      setConversationActive(false);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setListening(false);
    } else {
      conversationActiveRef.current = true;
      setConversationActive(true);
      listenOnce();
    }
  }

  async function sendMessage(overrideText?: string) {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || loading) return;

    const userId = nextIdRef.current++;
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: trimmed, displayedText: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/march', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'No response.';

      const marchId = nextIdRef.current++;
      setMessages((prev) => [...prev, { id: marchId, role: 'march', text: reply, displayedText: '' }]);
      setLoading(false);

      await revealAndSpeak(marchId, reply);
    } catch (err) {
      const errId = nextIdRef.current++;
      setMessages((prev) => [
        ...prev,
        { id: errId, role: 'march', text: 'Connection failed. Try again.', displayedText: 'Connection failed. Try again.' },
      ]);
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  }

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 560,
        marginBottom: isFullscreen ? 0 : 24,
        background: '#0f0f0f',
        border: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        zIndex: isFullscreen ? 2000 : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #222',
        }}
      >
        <span style={{ fontSize: 12, color: '#888', letterSpacing: 1 }}>MARCH</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onMinimize && (
            <button
              onClick={onMinimize}
              title="Minimize to corner (session keeps running)"
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#aaa',
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ▽ Minimize
            </button>
          )}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#aaa',
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {isFullscreen ? '⤡ Exit Fullscreen' : '⤢ Fullscreen'}
          </button>
          {onCloseMarch && (
            <button
              onClick={onCloseMarch}
              title="End March session completely (resets on next open)"
              style={{
                background: 'transparent',
                border: '1px solid #663333',
                color: '#d08080',
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ✕ End Session
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: 14,
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: 6,
                background: m.role === 'user' ? '#1a1a2e' : '#151515',
                border: m.role === 'user' ? '1px solid #333' : '1px solid #222',
                color: m.role === 'user' ? '#ddd' : '#eff0ee',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.role === 'march' ? m.displayedText : m.text}
              {m.role === 'march' && m.displayedText.length < m.text.length && (
                <span style={{ opacity: 0.6 }}>▍</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: '#555', fontSize: 12 }}>March is thinking...</div>
        )}
        {listening && (
          <div style={{ color: '#0ff5c9', fontSize: 12 }}>Listening...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid #222', padding: 12, gap: 10 }}>
        <button
          onClick={toggleConversation}
          style={{
            background: conversationActive ? '#ff4d4d' : '#1a1a1a',
            color: '#eee',
            border: '1px solid #333',
            width: 42,
            fontFamily: 'monospace',
            fontSize: 16,
            cursor: 'pointer',
          }}
          title={conversationActive ? 'Stop conversation' : 'Start hands-free conversation'}
        >
          {conversationActive ? '⏹' : '🎤'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            conversationActive
              ? listening
                ? 'Listening...'
                : 'Conversation active...'
              : 'Talk to March...'
          }
          style={{
            flex: 1,
            background: '#000',
            border: '1px solid #333',
            color: '#eee',
            padding: '10px 12px',
            fontFamily: 'monospace',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading}
          style={{
            background: '#0ff5c9',
            color: '#000',
            border: 'none',
            padding: '0 20px',
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}