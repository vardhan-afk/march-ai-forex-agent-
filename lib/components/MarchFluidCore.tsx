'use client';

import { useEffect, useRef } from 'react';

interface MarchFluidCoreProps {
  onClick?: () => void;
  talking?: boolean;
}

export default function MarchFluidCore({ onClick, talking = false }: MarchFluidCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const talkingRef = useRef(talking);

  useEffect(() => {
    talkingRef.current = talking;
  }, [talking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let baseRadius = 90;

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let isHovered = false;
    let impulse = 0;
    let time = 0;
    let animationId = 0;

    const numPoints = 32;
    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

    class Point {
      angle: number;
      radius: number;
      baseRadius: number;
      speed: number;
      offset: number;

      constructor(angle: number, radius: number) {
        this.angle = angle;
        this.radius = radius;
        this.baseRadius = radius;
        this.speed = 0.02 + Math.random() * 0.02;
        this.offset = Math.random() * Math.PI * 2;
      }

      // We add scaleFactor here so the physics shrink with the container
      update(t: number, impulseForce: number, talkForce: number, scaleFactor: number) {
        const wave = Math.sin(t * this.speed + this.offset) * (12 * scaleFactor);
        const totalImpulse = Math.sin(t * 0.08 + this.angle * 3) * (impulseForce * scaleFactor);
        const talkJitter =
          talkForce > 0
            ? (Math.sin(t * 0.22 + this.angle * 4 + this.offset * 2) * talkForce +
              Math.sin(t * 0.35 + this.angle * 1.5) * talkForce * 0.4) * scaleFactor
            : 0;
            
        // Math.max prevents the radius from ever going negative and shattering the shape
        this.radius = Math.max(1, this.baseRadius + wave + totalImpulse + talkJitter);
      }

      getX(cx: number) {
        return cx + Math.cos(this.angle) * this.radius;
      }

      getY(cy: number) {
        return cy + Math.sin(this.angle) * this.radius;
      }
    }

    let points: Point[] = [];

    function buildPoints() {
      points = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        points.push(new Point(angle, baseRadius));
      }
    }

    function applySize(cssWidth: number, cssHeight: number) {
      if (!canvas || cssWidth <= 0 || cssHeight <= 0) return;
      width = cssWidth;
      height = cssHeight;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      centerY = height / 2;
      
      // Slightly reduced multiplier so the outer glow doesn't hit the box edges when small
      baseRadius = Math.max(12, Math.min(width, height) * 0.26);
      buildPoints();
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        applySize(cr.width, cr.height);
      }
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    const rect = (canvas.parentElement || canvas).getBoundingClientRect();
    applySize(rect.width, rect.height);

    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left - centerX;
      mouseY = e.clientY - r.top - centerY;
      isHovered = true;
    };
    const handleMouseLeave = () => {
      isHovered = false;
    };
    const handleClick = () => {
      impulse = 35;
      onClick?.();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    function animate() {
      if (!ctx || !canvas || width === 0 || height === 0) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      time += 1;
      impulse *= 0.92;

      if (isHovered) {
        targetX += (mouseX * 0.15 - targetX) * 0.1;
        targetY += (mouseY * 0.15 - targetY) * 0.1;
      } else {
        targetX += (0 - targetX) * 0.05;
        targetY += (0 - targetY) * 0.05;
      }

      const currCenterX = centerX + targetX;
      const currCenterY = centerY + targetY;

      // Calculate how much we need to scale down the effects based on current radius
      const scaleFactor = baseRadius / 145; // 145 is the approx radius at 560px size

      const talkForce = talkingRef.current ? 8 : 0;
      points.forEach((p) => p.update(time, impulse, talkForce, scaleFactor));

      ctx.save();
      ctx.beginPath();
      ctx.arc(currCenterX, currCenterY, baseRadius * 1.55, 0, Math.PI * 2);
      const outerGlow = ctx.createRadialGradient(
        currCenterX, currCenterY, baseRadius * 0.6,
        currCenterX, currCenterY, baseRadius * 1.6
      );
      const glowAlpha = talkingRef.current ? 0.2 : 0.15;
      outerGlow.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
      outerGlow.addColorStop(0.7, 'rgba(255, 255, 255, 0.03)');
      outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = outerGlow;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();

      const firstPoint = points[0];
      let prevX = (points[numPoints - 1].getX(currCenterX) + firstPoint.getX(currCenterX)) / 2;
      let prevY = (points[numPoints - 1].getY(currCenterY) + firstPoint.getY(currCenterY)) / 2;
      ctx.moveTo(prevX, prevY);

      for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        const nextP = points[(i + 1) % numPoints];
        const cx = p.getX(currCenterX);
        const cy = p.getY(currCenterY);
        const midX = (cx + nextP.getX(currCenterX)) / 2;
        const midY = (cy + nextP.getY(currCenterY)) / 2;
        ctx.quadraticCurveTo(cx, cy, midX, midY);
      }

      ctx.closePath();

      // Scale the lighting origin so shading looks correct at 90px
      const offsetDist = 20 * scaleFactor;
      const grad = ctx.createRadialGradient(
        currCenterX - offsetDist, currCenterY - offsetDist, 10 * scaleFactor,
        currCenterX, currCenterY, baseRadius * 1.2
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#e0e6ed');
      grad.addColorStop(0.8, '#8a99ad');
      grad.addColorStop(1, '#1e293b');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      // Scale the blur so the glow doesn't clip into a square shape
      ctx.shadowBlur = (talkingRef.current ? 38 : 30) * scaleFactor;
      ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [onClick]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        display: 'block',
      }}
    />
  );
}