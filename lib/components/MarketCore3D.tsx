'use client';

import { useState, useRef, useEffect } from 'react';
import MarchFluidCore from './MarchFluidCore';

const CATEGORIES = [
  { key: 'majors', label: 'Majors', color: '#EC4899' },
  { key: 'gold', label: 'Gold / Metals', color: '#F4C430' },
  { key: 'crypto', label: 'Crypto', color: '#22D3EE' },
  { key: 'indices', label: 'Indices', color: '#A78BFA' },
  { key: 'commodities', label: 'Commodities', color: '#FB923C' },
  { key: 'news', label: 'News / Events', color: '#4ADE80' },
];

interface MarketCore3DProps {
  isActive?: boolean;
  isTalking?: boolean;
  onActivate?: () => void;
}

export default function MarketCore3D({ isActive = false, isTalking = false, onActivate }: MarketCore3DProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    moved: false,
  });

  useEffect(() => {
    if (!isActive) {
      setOffset({ x: 0, y: 0 });
    }
  }, [isActive]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const d = dragStateRef.current;
      if (!d.dragging) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      // 5px threshold so it clicks easily but still drags smoothly
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        d.moved = true;
      }
      setOffset({ x: d.startOffsetX + dx, y: d.startOffsetY + dy });
    }

    function handleMouseUp() {
      const d = dragStateRef.current;
      if (d.dragging) {
        d.dragging = false;
        setIsDragging(false);
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    if (!isActive) return;
    const d = dragStateRef.current;
    d.dragging = true;
    d.moved = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startOffsetX = offset.x;
    d.startOffsetY = offset.y;
    setIsDragging(true);
  }

  function handleClick() {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    onActivate?.();
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        position: isActive ? 'fixed' : 'relative',
        top: isActive ? 24 : undefined,
        right: isActive ? 24 : undefined,
        
        // CRITICAL: Forces browser to let it go to the top-right corner
        left: isActive ? 'auto' : undefined,
        bottom: isActive ? 'auto' : undefined,

        transform: isActive ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
        width: isActive ? 90 : '100%',
        height: isActive ? 90 : 560,
        marginBottom: isActive ? 0 : 24,
        background: isActive ? 'transparent' : '#000000',
        borderRadius: isActive ? '50%' : 0,
        overflow: 'visible',
        cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        
        // CRITICAL: Guaranteed to sit entirely over the chat box
        zIndex: isActive ? 9999 : 'auto', 
        
        boxShadow: 'none',
        userSelect: 'none', // Stops text selection while dragging
        // Removed 'all' transition to stop the component from snapping weirdly
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
      }}
    >
      {!isActive && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#ccc',
              pointerEvents: 'none', // Prevents clicks getting eaten by text
            }}
          >
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c.color,
                    marginRight: 6,
                  }}
                />
                {c.label}
              </div>
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              textAlign: 'center',
              fontFamily: 'monospace',
              color: '#eee',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 13, letterSpacing: 1 }}>MARCH FLUID CORE</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              Click to talk to March
            </div>
          </div>
        </>
      )}

      {/* CRITICAL FIX: The key prop destroys the huge canvas and forces a fresh 90x90 canvas to mount */}
      <MarchFluidCore key={isActive ? 'shrunk' : 'expanded'} talking={isTalking} />
    </div>
  );
}