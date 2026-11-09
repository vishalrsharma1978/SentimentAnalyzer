import { useEffect, useState } from "react";
import { Circle, G, Rect } from "react-native-svg";

type Props = { cx: number; cy: number; direction?: 1 | -1; speed?: number };

// Spinning Ferrari wheel (SVG coordinates): spokes rotate, a motion-blur ring pulses,
// and the yellow hub flashes a notch so the rotation is easy to see.
export function AnimatedWheel({ cx, cy, direction = 1, speed = 360 }: Props) {
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
  // speed = degrees per second (360 = one turn per second)
  const angle = (direction * speed * seconds) % 360;
  const blur = 0.12 + ((Math.sin(seconds * 4) + 1) / 2) * 0.18;

  return (
    <G>
      <Circle
        cx={cx}
        cy={cy}
        r={84}
        fill="#0B0B0D"
        stroke="#DC0000"
        strokeWidth={16}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={60}
        fill="url(#frameCarbon)"
        stroke="#FFF200"
        strokeWidth={3}
      />
      {/* motion blur ring */}
      <Circle
        cx={cx}
        cy={cy}
        r={44}
        fill="none"
        stroke="#FFF200"
        strokeWidth={34}
        opacity={blur}
      />
      {/* rotating spokes */}
      <G transform={`rotate(${angle} ${cx} ${cy})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <Rect
            key={a}
            x={cx - 5}
            y={cy - 58}
            width={10}
            height={36}
            rx={4}
            fill="#DC0000"
            transform={`rotate(${a} ${cx} ${cy})`}
          />
        ))}
        {/* hub notch so the spin is visible */}
        <Rect
          x={cx - 3}
          y={cy - 18}
          width={6}
          height={12}
          rx={2}
          fill="#0B0B0D"
        />
      </G>
      <Circle cx={cx} cy={cy} r={20} fill="#FFF200" opacity={0.9} />
      <Circle cx={cx} cy={cy} r={7} fill="#0B0B0D" />
    </G>
  );
}
