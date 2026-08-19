'use client';

import { useRef, useState, useEffect } from 'react';

interface FloatingPanelProps {
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  width: number | string;
}

// Shared across all panels so whichever one you last touched visually comes
// to the front, like real floating windows.
let globalZCounter = 100;

export default function FloatingPanel({ children, initialX, initialY, width }: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [z, setZ] = useState(1);

  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d.dragging) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setPos({ x: d.startPosX + dx, y: d.startPosY + dy });
    }
    function handleUp() {
      dragRef.current.dragging = false;
      setIsDragging(false);
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  function bringToFront() {
    globalZCounter += 1;
    setZ(globalZCounter);
  }

  function handleHeaderMouseDown(e: React.MouseEvent) {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
    setIsDragging(true);
    bringToFront();
  }

  function handlePanelMouseMove(e: React.MouseEvent) {
    if (isDragging) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    // Subtle tilt — keep it restrained so text stays readable.
    setTilt({ x: relY * -6, y: relX * 6 });
  }

  function handlePanelMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={panelRef}
      onMouseMove={handlePanelMouseMove}
      onMouseLeave={handlePanelMouseLeave}
      onMouseDown={bringToFront}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width,
        zIndex: z,
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: isDragging ? 'none' : 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
        background: 'rgba(15, 15, 15, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        boxShadow: isDragging
          ? '0 30px 60px rgba(0,0,0,0.55)'
          : '0 12px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          height: 22,
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444' }} />
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444' }} />
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444' }} />
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}