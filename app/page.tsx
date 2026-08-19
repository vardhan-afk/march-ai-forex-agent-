'use client';

import { useState, useRef } from 'react';
import MarketCore3D from '../lib/components/MarketCore3D';
import MarchFluidCore from '../lib/components/MarchFluidCore'; // Added this import for the Voice Mode blob
import Ticker from '../lib/components/Ticker';
import PriceCards from '../lib/components/PriceCards';
import Heatmap from '../lib/components/Heatmap';
import CalendarWidget from '../lib/components/CalendarWidget';
import NewsFeed from '../lib/components/NewsFeed';
import PairDetailPanel from '../lib/components/PairDetailPanel';
import MarchChat from '../lib/components/MarchChat';
import FloatingPanel from '../lib/components/FloatingPanel';

export default function Home() {
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  const [marchOpen, setMarchOpen] = useState(false);
  const [marchExpanded, setMarchExpanded] = useState(false);
  const [marchTalking, setMarchTalking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false); // NEW: Tracks transparent voice mode
  const [pendingAsk, setPendingAsk] = useState<{ id: number; text: string } | null>(null);
  const askIdRef = useRef(0);

  function handleBlobClick() {
    if (!marchOpen) {
      // 1. Initial click: open text chat and shrink blob
      setMarchOpen(true);
      setMarchExpanded(true);
    } else {
      // 2. Clicked the shrunken blob: enter Voice Mode
      setIsVoiceMode(true);
      setMarchExpanded(false); // Hide the text box
    }
  }

  function minimizeMarch() {
    setMarchExpanded(false);
  }

  function exitVoiceMode() {
    setIsVoiceMode(false);
    setMarchExpanded(true); // Return to standard text mode
  }

  function askMarch(text: string) {
    askIdRef.current += 1;
    setPendingAsk({ id: askIdRef.current, text });
    setMarchOpen(true);
    setMarchExpanded(true);
    setIsVoiceMode(false); // Ensure voice mode is off if they ask via text
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', padding: '32px', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>
        March
      </h1>

      {/* --- TRANSPARENT VOICE MODE OVERLAY --- */}
      {isVoiceMode && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 5, 0.85)', 
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Centered Large Blob */}
          <div style={{ width: '320px', height: '320px', position: 'relative' }}>
            <MarchFluidCore talking={marchTalking} />
          </div>
          
          <div style={{ marginTop: '40px', color: '#0ff5c9', fontFamily: 'monospace', fontSize: '15px', letterSpacing: '2px' }}>
            {marchTalking ? 'MARCH IS SPEAKING...' : 'LISTENING...'}
          </div>

          <button 
            onClick={exitVoiceMode}
            style={{
              marginTop: '40px',
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid #333',
              color: '#aaa',
              borderRadius: '30px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            ✕ Exit Voice Mode
          </button>
        </div>
      )}

      {/* --- MARCH CHAT (Hidden visually during Voice Mode, but keeps running) --- */}
      {marchOpen && (
        <div style={{ display: (marchExpanded && !isVoiceMode) ? 'block' : 'none' }}>
          <MarchChat
            onTalkingChange={setMarchTalking}
            pendingAsk={pendingAsk}
            onAskHandled={() => setPendingAsk(null)}
            onMinimize={minimizeMarch}
            autoStartVoice={isVoiceMode} // Passes the trigger down to the mic
          />
        </div>
      )}

      {/* --- STANDARD MARKET CORE --- */}
      <div style={{ display: isVoiceMode ? 'none' : 'block' }}>
        <MarketCore3D
          isActive={marchOpen}
          isTalking={marchTalking}
          onActivate={handleBlobClick}
        />
      </div>

      <Ticker />

      <div style={{ position: 'relative', minHeight: 1100, marginTop: 20 }}>
        <FloatingPanel initialX={0} initialY={0} width={720}>
          <PriceCards onSelectPair={setSelectedPair} onAskMarch={askMarch} />
        </FloatingPanel>

        <FloatingPanel initialX={760} initialY={0} width={620}>
          <h2 style={{ fontSize: 14, color: '#aaa', marginBottom: 12 }}>
            Currency Strength
          </h2>
          <Heatmap />
        </FloatingPanel>

        <FloatingPanel initialX={0} initialY={420} width={690}>
          <h2 style={{ fontSize: 14, color: '#aaa', marginBottom: 12 }}>
            Upcoming Events
          </h2>
          <CalendarWidget onAskMarch={askMarch} />
        </FloatingPanel>

        <FloatingPanel initialX={760} initialY={420} width={620}>
          <h2 style={{ fontSize: 14, color: '#aaa', marginBottom: 12 }}>
            Latest News
          </h2>
          <NewsFeed onAskMarch={askMarch} />
        </FloatingPanel>
      </div>

      <PairDetailPanel symbol={selectedPair} onClose={() => setSelectedPair(null)} onAskMarch={askMarch} />
    </div>
  );
}