"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Design 1: Interactive Character Family
 * Eyes follow mouse coordinates smoothly.
 * Reacts when user focuses password (look away) or types username (nods & smiles).
 */
export function InteractiveCharacters({
  isPasswordFocused = false,
  isInputFocused = false,
  isTyping = false,
}: {
  isPasswordFocused?: boolean;
  isInputFocused?: boolean;
  isTyping?: boolean;
}) {
  const containerRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isPasswordFocused || isInputFocused) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      // Clamp pupil travel between -8px and +8px
      const clampedX = Math.max(-8, Math.min(8, deltaX * 8));
      const clampedY = Math.max(-8, Math.min(8, deltaY * 8));

      setMousePos({ x: clampedX, y: clampedY });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isPasswordFocused, isInputFocused]);

  const pupilPos = isPasswordFocused
    ? { x: 7, y: -7 }
    : isInputFocused
      ? { x: 0, y: 5 }
      : mousePos;

  // Expression mouth paths
  const mouthNeutral = "M -10 10 Q 0 15 10 10";
  const mouthSmile = "M -12 8 Q 0 20 12 8";
  const mouthFlat = "M -10 12 L 10 12";

  const currentMouth = isPasswordFocused
    ? mouthFlat
    : isInputFocused || isTyping
      ? mouthSmile
      : mouthNeutral;

  const blushColor = isPasswordFocused ? "rgba(244, 114, 182, 0.35)" : "transparent";

  return (
    <div className="relative w-full overflow-visible flex justify-center -mb-7 z-10 pointer-events-none select-none">
      <svg
        ref={containerRef}
        viewBox="0 0 800 240"
        className="w-full max-w-[620px] h-[160px] sm:h-[190px] overflow-visible"
        aria-hidden="true"
      >
        {/* 1. Giant Light Blue Character (Left) */}
        <g
          className="transition-transform duration-300"
          transform={`translate(180, 140) scale(1.4) ${isTyping ? "translate(0, 4)" : ""}`}
        >
          <rect x="-40" y="-30" width="80" height="120" rx="40" fill="#a2d2ff" />
          <circle cx="-25" cy="18" r="8" fill={blushColor} className="transition-colors duration-300" />
          <circle cx="25" cy="18" r="8" fill={blushColor} className="transition-colors duration-300" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle
              cx={-15 + (isPasswordFocused ? -7 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle
              cx={15 + (isPasswordFocused ? -7 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* 2. Giant Pink Character (Right) */}
        <g
          className="transition-transform duration-300"
          transform={`translate(620, 135) scale(1.35) ${isTyping ? "translate(0, -3)" : ""}`}
        >
          <rect x="-40" y="-30" width="80" height="120" rx="40" fill="#ffafcc" />
          <circle cx="-25" cy="18" r="8" fill={blushColor} className="transition-colors duration-300" />
          <circle cx="25" cy="18" r="8" fill={blushColor} className="transition-colors duration-300" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle
              cx={-15 + (isPasswordFocused ? 7 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle
              cx={15 + (isPasswordFocused ? 7 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* 3. Medium Peach Character (Center) */}
        <g
          className="transition-transform duration-300"
          transform={`translate(400, 160) scale(1.05) ${isTyping ? "translate(0, 3)" : ""}`}
        >
          <rect x="-40" y="-30" width="80" height="100" rx="40" fill="#fdf0d5" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle
              cx={-15 + pupilPos.x}
              cy={-10 + (isPasswordFocused ? -7 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle
              cx={15 + pupilPos.x}
              cy={-10 + (isPasswordFocused ? -7 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* 4. Small Mint Character (Mid-left) */}
        <g
          className="transition-transform duration-300"
          transform={`translate(300, 185) scale(0.7) ${isTyping ? "translate(0, -2)" : ""}`}
        >
          <rect x="-40" y="-30" width="80" height="90" rx="40" fill="#caffbf" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle
              cx={-15 + (isPasswordFocused ? -6 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle
              cx={15 + (isPasswordFocused ? -6 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* 5. Small Lavender Character (Mid-right) */}
        <g
          className="transition-transform duration-300"
          transform={`translate(500, 180) scale(0.65) ${isTyping ? "translate(0, 2)" : ""}`}
        >
          <rect x="-40" y="-30" width="80" height="90" rx="40" fill="#cdb4db" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle
              cx={-15 + (isPasswordFocused ? 6 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle
              cx={15 + (isPasswordFocused ? 6 : pupilPos.x)}
              cy={-10 + (isPasswordFocused ? -6 : pupilPos.y)}
              r="5"
              fill="#1e293b"
              className="transition-all duration-150 ease-out"
            />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* 6. Tiny Baby Pink Character */}
        <g transform="translate(360, 205) scale(0.42)">
          <rect x="-40" y="-30" width="80" height="90" rx="40" fill="#ffc8dd" />
          <g>
            <circle cx="-15" cy="-10" r="12" fill="white" />
            <circle cx={-15 + pupilPos.x} cy={-10 + pupilPos.y} r="5" fill="#1e293b" />
            <circle cx="15" cy="-10" r="12" fill="white" />
            <circle cx={15 + pupilPos.x} cy={-10 + pupilPos.y} r="5" fill="#1e293b" />
          </g>
          <path d={currentMouth} stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Design 2: Playful Geometric Shapes Panel
 * Features 4 lively shapes (purple, dark, yellow, orange)
 * with animated blinking eyes that follow the cursor.
 */
export function InteractiveShapesPanel({
  isPasswordFocused = false,
}: {
  isPasswordFocused?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mouseEyeOffset, setMouseEyeOffset] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);

  // Periodic blinking effect every 3.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 160);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Mouse tracking
  useEffect(() => {
    if (isPasswordFocused) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const maxMove = 5.5;

      setMouseEyeOffset({
        x: Math.cos(angle) * maxMove,
        y: Math.sin(angle) * maxMove,
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isPasswordFocused]);

  const eyeOffset = isPasswordFocused ? { x: -7, y: 0 } : mouseEyeOffset;

  const eyeTransform = `translate(${eyeOffset.x}px, ${eyeOffset.y}px) ${blinking ? "scaleY(0.15)" : "scaleY(1)"}`;

  return (
    <div
      ref={panelRef}
      className="relative w-full h-full min-h-[340px] @3xl:min-h-[500px] bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex items-end justify-center select-none"
    >
      <div className="relative w-full max-w-[480px] h-[340px]">
        {/* Purple Tall Shape */}
        <div
          className="absolute bottom-0 left-[16%] w-[110px] h-[260px] bg-indigo-600 rounded-t-3xl shadow-lg transition-transform duration-300 hover:scale-105 z-10 flex flex-col items-center pt-8"
        >
          <div className="flex gap-4">
            <span
              style={{ transform: eyeTransform }}
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-100 relative origin-center"
            />
            <span
              style={{ transform: eyeTransform }}
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-100 relative origin-center"
            />
          </div>
          <div
            className={`w-6 h-2 rounded-b-full bg-white/40 mt-5 transition-transform duration-200 ${
              isPasswordFocused ? "scale-y-50" : ""
            }`}
          />
        </div>

        {/* Dark Pillar Shape */}
        <div
          className="absolute bottom-0 left-[42%] w-[95px] h-[180px] bg-slate-900 dark:bg-slate-950 rounded-t-2xl shadow-xl transition-transform duration-300 hover:scale-105 z-20 flex flex-col items-center pt-7"
        >
          <div className="flex gap-3">
            <span
              style={{ transform: eyeTransform }}
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-100 relative flex items-center justify-center origin-center"
            >
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
            </span>
            <span
              style={{ transform: eyeTransform }}
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-100 relative flex items-center justify-center origin-center"
            >
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
            </span>
          </div>
        </div>

        {/* Yellow Rounded Shape */}
        <div
          className="absolute bottom-0 left-[56%] w-[115px] h-[130px] bg-amber-400 rounded-t-[50px] shadow-lg transition-transform duration-300 hover:scale-105 z-30 flex flex-col items-center pt-7"
        >
          <div className="flex gap-4">
            <span
              style={{ transform: eyeTransform }}
              className="w-2.5 h-2.5 bg-black rounded-full transition-transform duration-100 origin-center"
            />
            <span
              style={{ transform: eyeTransform }}
              className="w-2.5 h-2.5 bg-black rounded-full transition-transform duration-100 origin-center"
            />
          </div>
          <div
            className={`w-8 h-2 rounded-full bg-black/80 mt-3 transition-transform duration-200 ${
              isPasswordFocused ? "scale-x-75 scale-y-50" : "scale-100"
            }`}
          />
        </div>

        {/* Orange Wide Arch */}
        <div
          className="absolute bottom-0 left-[26%] w-[210px] h-[105px] bg-orange-500 rounded-t-[90px] shadow-md transition-transform duration-300 hover:scale-105 z-40 flex flex-col items-center pt-6"
        >
          <div className="flex gap-5">
            <span
              style={{ transform: eyeTransform }}
              className="w-3 h-3 bg-black rounded-full transition-transform duration-100 origin-center"
            />
            <span
              style={{ transform: eyeTransform }}
              className="w-3 h-3 bg-black rounded-full transition-transform duration-100 origin-center"
            />
          </div>
          <div
            className={`w-9 h-2.5 rounded-b-full bg-black/40 mt-2.5 transition-transform duration-200 ${
              isPasswordFocused ? "scale-x-50" : "scale-100"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
