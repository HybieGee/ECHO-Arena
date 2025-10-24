/**
 * Black Hole Enter Screen
 * Animated particle vortex entry experience
 */

'use client';

import { useEffect, useRef } from 'react';

interface EnterScreenProps {
  onEnter: () => void;
}

export function EnterScreen({ onEnter }: EnterScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const h = container.offsetHeight;
    const w = container.offsetWidth;
    const cw = w;
    const ch = h;
    const maxorbit = 255;
    const centery = ch / 2;
    const centerx = cw / 2;

    const startTime = new Date().getTime();
    let currentTime = 0;

    const stars: Star[] = [];
    let collapse = false;
    let expanse = false;
    let animationFrameId: number;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    container.appendChild(canvas);
    canvasRef.current = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;

    function setDPI(canvas: HTMLCanvasElement, dpi: number) {
      if (!canvas.style.width) canvas.style.width = canvas.width + 'px';
      if (!canvas.style.height) canvas.style.height = canvas.height + 'px';

      const scaleFactor = dpi / 96;
      canvas.width = Math.ceil(canvas.width * scaleFactor);
      canvas.height = Math.ceil(canvas.height * scaleFactor);
      const ctx = canvas.getContext('2d');
      ctx?.scale(scaleFactor, scaleFactor);
    }

    function rotate(cx: number, cy: number, x: number, y: number, angle: number) {
      const radians = angle;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const nx = cos * (x - cx) + sin * (y - cy) + cx;
      const ny = cos * (y - cy) - sin * (x - cx) + cy;
      return [nx, ny];
    }

    setDPI(canvas, 192);

    class Star {
      orbital: number;
      x: number;
      y: number;
      yOrigin: number;
      speed: number;
      rotation: number;
      startRotation: number;
      id: number;
      collapseBonus: number;
      color: string;
      hoverPos: number;
      expansePos: number;
      prevR: number;
      prevX: number;
      prevY: number;

      constructor() {
        const rands = [];
        rands.push(Math.random() * (maxorbit / 2) + 1);
        rands.push(Math.random() * (maxorbit / 2) + maxorbit);

        this.orbital = rands.reduce((p, c) => p + c, 0) / rands.length;

        this.x = centerx;
        this.y = centery + this.orbital;
        this.yOrigin = centery + this.orbital;

        this.speed = (Math.floor(Math.random() * 2.5) + 1.5) * Math.PI / 180;
        this.rotation = 0;
        this.startRotation = (Math.floor(Math.random() * 360) + 1) * Math.PI / 180;

        this.id = stars.length;

        this.collapseBonus = this.orbital - maxorbit * 0.7;
        if (this.collapseBonus < 0) {
          this.collapseBonus = 0;
        }

        // Use ECHO Arena colors - magenta to cyan gradient based on distance
        const transparency = 1 - this.orbital / 255;
        const hue = 300 - (this.orbital / 255) * 120; // 300 (magenta) to 180 (cyan)
        this.color = `hsla(${hue}, 100%, 60%, ${transparency})`;

        this.hoverPos = centery + maxorbit / 2 + this.collapseBonus;
        this.expansePos = centery + (this.id % 100) * -10 + (Math.floor(Math.random() * 20) + 1);

        this.prevR = this.startRotation;
        this.prevX = this.x;
        this.prevY = this.y;

        stars.push(this);
      }

      draw() {
        if (!expanse) {
          this.rotation = this.startRotation + currentTime * this.speed;
          if (!collapse) {
            if (this.y > this.yOrigin) {
              this.y -= 2.5;
            }
            if (this.y < this.yOrigin - 4) {
              this.y += (this.yOrigin - this.y) / 10;
            }
          } else {
            if (this.y > this.hoverPos) {
              this.y -= (this.hoverPos - this.y) / -5;
            }
            if (this.y < this.hoverPos - 4) {
              this.y += 2.5;
            }
          }
        } else if (expanse) {
          this.rotation = this.startRotation + currentTime * (this.speed / 2);
          if (this.y > this.expansePos) {
            this.y -= Math.floor(this.expansePos - this.y) / -80;
          }
        }

        if (!context) return;

        context.save();
        context.fillStyle = this.color;
        context.strokeStyle = this.color;
        context.beginPath();
        const oldPos = rotate(centerx, centery, this.prevX, this.prevY, -this.prevR);
        context.moveTo(oldPos[0], oldPos[1]);
        context.translate(centerx, centery);
        context.rotate(this.rotation);
        context.translate(-centerx, -centery);
        context.lineTo(this.x, this.y);
        context.stroke();
        context.restore();

        this.prevR = this.rotation;
        this.prevX = this.x;
        this.prevY = this.y;
      }
    }

    function loop() {
      const now = new Date().getTime();
      currentTime = (now - startTime) / 50;

      if (!context) return;

      context.fillStyle = 'rgba(10, 10, 15, 0.2)';
      context.fillRect(0, 0, cw, ch);

      for (let i = 0; i < stars.length; i++) {
        if (stars[i] !== undefined) {
          stars[i].draw();
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    }

    function init() {
      if (!context) return;
      context.fillStyle = 'rgba(10, 10, 15, 1)';
      context.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 2500; i++) {
        new Star();
      }
      loop();
    }

    // Event handlers
    const handleClick = () => {
      collapse = false;
      expanse = true;
      setTimeout(() => {
        onEnter();
      }, 1500); // Enter after 1.5s of expansion
    };

    const handleMouseOver = () => {
      if (!expanse) {
        collapse = true;
      }
    };

    const handleMouseOut = () => {
      if (!expanse) {
        collapse = false;
      }
    };

    const centerHover = container.querySelector('.centerHover') as HTMLElement;
    if (centerHover) {
      centerHover.addEventListener('click', handleClick);
      centerHover.addEventListener('mouseover', handleMouseOver);
      centerHover.addEventListener('mouseout', handleMouseOut);
    }

    init();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (centerHover) {
        centerHover.removeEventListener('click', handleClick);
        centerHover.removeEventListener('mouseover', handleMouseOver);
        centerHover.removeEventListener('mouseout', handleMouseOut);
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
      }
    };
  }, [onEnter]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-[#0A0A0F]"
      style={{ width: '100%', height: '100%' }}
    >
      <div className="centerHover">
        <span className="font-orbitron tracking-wider">ENTER</span>
      </div>

      <style jsx>{`
        .centerHover {
          width: 255px;
          height: 255px;
          background-color: transparent;
          border-radius: 50%;
          position: absolute;
          left: 50%;
          top: 50%;
          margin-top: -128px;
          margin-left: -128px;
          z-index: 2;
          cursor: pointer;
          line-height: 255px;
          text-align: center;
          transition: all 500ms;
        }

        .centerHover:hover span {
          color: #00E5FF;
        }

        .centerHover:hover span:before {
          background-color: #00E5FF;
        }

        .centerHover:hover span:after {
          background-color: #00E5FF;
        }

        .centerHover span {
          color: #E000FF;
          font-size: 18px;
          position: relative;
          transition: all 500ms;
        }

        .centerHover span:before {
          content: '';
          display: inline-block;
          height: 1px;
          width: 16px;
          margin-right: 12px;
          margin-bottom: 4px;
          background-color: #E000FF;
          transition: all 500ms;
        }

        .centerHover span:after {
          content: '';
          display: inline-block;
          height: 1px;
          width: 16px;
          margin-left: 12px;
          margin-bottom: 4px;
          background-color: #E000FF;
          transition: all 500ms;
        }

        canvas {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          margin: auto;
        }
      `}</style>
    </div>
  );
}
