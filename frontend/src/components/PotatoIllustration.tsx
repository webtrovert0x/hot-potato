"use client";

import React from "react";
import { ExternalLink, Flame, Skull, Sparkles } from "lucide-react";
import { getAddressExplorerUrl } from "@/config/chain";
import { shortenAddress } from "@/lib/format";

interface PotatoIllustrationProps {
  status: "Waiting" | "Active" | "Finished";
  secondsRemaining: number;
  currentHolder?: string;
  isCurrentUserHolder: boolean;
  isExpiredPendingEnd: boolean;
  passCount: number;
}

export function PotatoIllustration({
  status,
  secondsRemaining,
  currentHolder,
  isCurrentUserHolder,
  isExpiredPendingEnd,
  passCount,
}: PotatoIllustrationProps) {
  const isUrgent = status === "Active" && secondsRemaining <= 15 && secondsRemaining > 0;
  const isBurned = status === "Finished" || isExpiredPendingEnd;

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      {/* Ambient radial heat glow */}
      <div
        className={`pointer-events-none absolute h-64 w-64 rounded-full blur-3xl transition-all duration-500 ${
          isBurned
            ? "bg-red-700/25"
            : isUrgent
            ? "scale-110 bg-arcade-ember/40"
            : status === "Active"
            ? "bg-arcade-orange/30"
            : "bg-arcade-amber/15"
        }`}
      />

      {/* Animated SVG Potato */}
      <div
        key={passCount}
        className={`relative z-10 select-none ${
          passCount > 0 ? "animate-pass-burst" : ""
        }`}
      >
        <div
          className={
            isUrgent
              ? "animate-wobble-hot"
              : status === "Active" && !isBurned
              ? "animate-float-slow"
              : ""
          }
        >
          <svg
            viewBox="0 0 240 240"
            className="h-52 w-52 drop-shadow-[0_18px_36px_rgba(255,106,0,0.35)] sm:h-60 sm:w-60"
            aria-label="Animated BOT Hot Potato"
          >
            <defs>
              <radialGradient id="potatoBody" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor={isBurned ? "#8d5837" : "#f7b267"} />
                <stop offset="55%" stopColor={isBurned ? "#54311c" : "#d97724"} />
                <stop offset="100%" stopColor={isBurned ? "#2b170c" : "#8f3f0c"} />
              </radialGradient>
              <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff3b00" />
                <stop offset="60%" stopColor="#ff8800" />
                <stop offset="100%" stopColor="#ffd60a" />
              </linearGradient>
            </defs>

            {/* Outer Heat Flames when active */}
            {status === "Active" && !isBurned && (
              <g className="opacity-90">
                <path
                  d="M52 110 C32 82, 52 52, 68 72 C72 40, 102 28, 110 56 C125 22, 156 32, 156 64 C180 46, 204 72, 188 104 C206 122, 198 156, 178 164 L64 164 C44 152, 38 126, 52 110 Z"
                  fill="url(#flameGrad)"
                  opacity={isUrgent ? "0.88" : "0.45"}
                />
              </g>
            )}

            {/* Burn smoke puffs when finished/expired */}
            {isBurned && (
              <g opacity="0.55" fill="#9ca3af">
                <circle cx="90" cy="44" r="12" />
                <circle cx="115" cy="30" r="15" />
                <circle cx="144" cy="42" r="11" />
              </g>
            )}

            {/* Potato Shadow */}
            <ellipse cx="120" cy="206" rx="64" ry="12" fill="rgba(0,0,0,0.45)" />

            {/* Main Potato Silhouette */}
            <path
              d="M120 44 C166 44, 194 84, 190 132 C187 174, 158 196, 118 196 C78 196, 48 172, 48 128 C48 82, 76 44, 120 44 Z"
              fill="url(#potatoBody)"
              stroke={isUrgent ? "#ffd60a" : "#ff9e00"}
              strokeWidth={isUrgent ? "4" : "2.5"}
            />

            {/* Potato spots / texture */}
            <ellipse cx="78" cy="86" rx="8" ry="5" fill="rgba(75,30,5,0.22)" />
            <ellipse cx="160" cy="148" rx="10" ry="6" fill="rgba(75,30,5,0.22)" />
            <circle cx="152" cy="82" r="4" fill="rgba(75,30,5,0.2)" />
            <circle cx="74" cy="146" r="5" fill="rgba(75,30,5,0.18)" />

            {/* Sweat drop when active */}
            {status === "Active" && !isBurned && (
              <path
                d="M170 90 C170 90, 178 103, 178 108 C178 112.5, 174.5 116, 170 116 C165.5 116, 162 112.5, 162 108 C162 103, 170 90, 170 90 Z"
                fill="#7dd3fc"
              />
            )}

            {/* Eyes */}
            {isBurned ? (
              <g stroke="#1b0e05" strokeWidth="5" strokeLinecap="round">
                <line x1="86" y1="104" x2="102" y2="120" />
                <line x1="102" y1="104" x2="86" y2="120" />
                <line x1="138" y1="104" x2="154" y2="120" />
                <line x1="154" y1="104" x2="138" y2="120" />
              </g>
            ) : (
              <g>
                <circle cx="94" cy="112" r={isUrgent ? "13" : "11"} fill="#fff8eb" />
                <circle cx="146" cy="112" r={isUrgent ? "13" : "11"} fill="#fff8eb" />
                <circle cx="96" cy="112" r={isUrgent ? "5.5" : "6"} fill="#1a0d05" />
                <circle cx="148" cy="112" r={isUrgent ? "5.5" : "6"} fill="#1a0d05" />
                <circle cx="98" cy="109" r="2" fill="#ffffff" />
                <circle cx="150" cy="109" r="2" fill="#ffffff" />
                {/* Eyebrows */}
                {status === "Active" && (
                  <g stroke="#3c1805" strokeWidth="4" strokeLinecap="round">
                    <line x1="80" y1="95" x2="104" y2="100" />
                    <line x1="160" y1="95" x2="136" y2="100" />
                  </g>
                )}
              </g>
            )}

            {/* Mouth */}
            {isBurned ? (
              <path
                d="M98 154 Q120 138 142 154"
                fill="none"
                stroke="#1b0e05"
                strokeWidth="5"
                strokeLinecap="round"
              />
            ) : isUrgent ? (
              <ellipse cx="120" cy="148" rx="16" ry="12" fill="#2a0902" stroke="#ffd60a" strokeWidth="2" />
            ) : status === "Active" ? (
              <path
                d="M98 145 Q110 136 120 145 Q130 154 142 145"
                fill="none"
                stroke="#2a0902"
                strokeWidth="5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M100 144 Q120 158 140 144"
                fill="none"
                stroke="#2a0902"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}

            {/* Cute rosy cheeks */}
            {!isBurned && (
              <g fill="#ff4d00" opacity="0.35">
                <ellipse cx="75" cy="128" rx="8" ry="5" />
                <ellipse cx="165" cy="128" rx="8" ry="5" />
              </g>
            )}
          </svg>
        </div>

        {/* Pass burst badge */}
        {passCount > 0 && status === "Active" && !isBurned && (
          <div className="pointer-events-none absolute -right-2 -top-1 flex items-center gap-1 rounded-full border border-arcade-yellow/60 bg-arcade-bg/90 px-2.5 py-1 text-xs font-bold text-arcade-yellow shadow-lg">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PASS #{passCount}</span>
          </div>
        )}
      </div>

      {/* Current Holder Pill */}
      <div className="relative z-10 mt-3 flex flex-col items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/60">
          {isBurned ? "Final Holder (Lost Round)" : "Current Potato Holder"}
        </span>

        {currentHolder && currentHolder !== "0x0000000000000000000000000000000000000000" ? (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-sm font-semibold transition-all ${
              isCurrentUserHolder
                ? "border-arcade-yellow bg-arcade-orange/20 text-arcade-yellow shadow-[0_0_25px_rgba(255,106,0,0.35)]"
                : "border-arcade-border bg-arcade-surface/90 text-amber-50"
            }`}
          >
            {isBurned ? (
              <Skull className="h-4 w-4 text-red-400" />
            ) : (
              <Flame className="h-4 w-4 text-arcade-orange" />
            )}
            <span>{shortenAddress(currentHolder, 6)}</span>
            {isCurrentUserHolder && (
              <span className="rounded-md bg-arcade-yellow px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                YOU
              </span>
            )}
            <a
              href={getAddressExplorerUrl(currentHolder)}
              target="_blank"
              rel="noreferrer"
              className="text-amber-300/70 transition-colors hover:text-arcade-yellow"
              title="View on BOTScan"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-arcade-border bg-arcade-surface/60 px-4 py-2 font-mono text-sm text-amber-200/50">
            Waiting for Round Start
          </div>
        )}
      </div>
    </div>
  );
}

