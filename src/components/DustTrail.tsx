import { useEffect, useState } from "react";
import { Circle, G } from "react-native-svg";

type Props = {
  // wheel contact point in SVG coordinates (where tyre meets the road)
  x: number;
  y: number;
};

const PARTICLES = 22;
const LIFE = 1.4; // seconds per particle

// Dust kicked up by the rear wheel and drifting backwards. The nose is on the left in
// this side view, so "back" is to the right. SVG coordinates. Each particle rises,
// drifts back, grows and fades out, then respawns.
export function DustTrail({ x, y }: Props) {
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setT(frame);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const seconds = t * 0.04;

  return (
    <G pointerEvents="none">
      {Array.from({ length: PARTICLES }).map((_, i) => {
        // stagger each particle so the trail is continuous
        const phase = ((seconds + (i * LIFE) / PARTICLES) % LIFE) / LIFE; // 0 -> 1
        // deterministic pseudo-random per particle for a natural spread
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const rand = seed - Math.floor(seed); // 0..1
        const drift = phase * (80 + rand * 40); // back (to the right)
        const rise = phase * (14 + rand * 34) + Math.sin(phase * 6 + i) * 3;
        const radius = 5 + phase * (14 + rand * 9);
        const opacity = (1 - phase) * (0.7 + rand * 0.25);
        const warm =
          phase < 0.35 ? "#FFF200" : phase < 0.65 ? "#C8C0A0" : "#8A8A90";
        return (
          <Circle
            key={i}
            cx={x + drift}
            cy={y - 6 - rise}
            r={radius}
            fill={warm}
            opacity={Math.max(0, opacity)}
          />
        );
      })}
    </G>
  );
}
