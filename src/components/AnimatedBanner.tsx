import { useEffect, useState } from "react";
import { Rect, Text as SvgText } from "react-native-svg";

// Animated "LET'S EVALUATE YOUR BRAND" banner drawn inside the car body (SVG coordinates).
// - a white light sweep glides across the yellow plate
// - the red underline pulses
// - the text breathes (slight scale) and a rev-light dot row chases left to right
const X = 440;
const Y = 262;
const W = 470;
const H = 52;

export function AnimatedBanner() {
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setT(frame);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const seconds = t * 0.05;
  // sweep: 0 -> 1 every 2.4s, with a pause
  const sweepPhase = (seconds % 2.4) / 1.6;
  const sweepX = X - 90 + Math.min(sweepPhase, 1) * (W + 140);
  const sweepOpacity = sweepPhase <= 1 ? 0.75 : 0;
  // pulse: 0..1 sine
  const pulse = (Math.sin(seconds * 3.2) + 1) / 2;
  const underlineOpacity = 0.55 + pulse * 0.45;
  const scale = 1 + pulse * 0.035;
  // chasing dots
  const active = Math.floor(seconds * 8) % 8;

  return (
    <>
      <Rect
        x={X}
        y={Y}
        width={W}
        height={H}
        rx={6}
        fill="#FFF200"
        stroke="#DC0000"
        strokeWidth={5}
      />
      {/* light sweep, clipped visually by staying inside the plate bounds */}
      <Rect
        x={Math.max(X + 3, Math.min(sweepX, X + W - 53))}
        y={Y + 3}
        width={Math.min(50, Math.max(0, X + W - 3 - Math.max(X + 3, sweepX)))}
        height={H - 12}
        fill="#FFFFFF"
        opacity={sweepOpacity}
        transform={`skewX(-18)`}
      />
      <Rect
        x={X}
        y={Y + H - 7}
        width={W}
        height={7}
        fill="#DC0000"
        opacity={underlineOpacity}
      />
      {/* chasing rev lights on the underline */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect
          key={i}
          x={X + 14 + i * ((W - 40) / 7)}
          y={Y + H - 5}
          width={14}
          height={3}
          rx={1.5}
          fill={i === active ? "#FFF200" : "#7A0000"}
        />
      ))}
      <SvgText
        x={X + W / 2}
        y={Y + 31}
        fontSize={24}
        fontWeight="bold"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#0B0B0D"
        textAnchor="middle"
        textLength={420}
        lengthAdjust="spacingAndGlyphs"
        transform={`translate(${X + W / 2} ${Y + 26}) scale(${scale}) translate(${-(X + W / 2)} ${-(Y + 26)})`}
      >
        LET’S ELEVATE YOUR BRAND
      </SvgText>
    </>
  );
}
