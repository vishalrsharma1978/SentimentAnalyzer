import { useEffect, useState } from "react";
import { Path } from "react-native-svg";

// Rolling road: the yellow dashed centre line scrolls backwards under the car (SVG coordinates).
export function AnimatedRoad() {
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setT(frame);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const offset = (t * 0.04 * 160) % 54; // dash 30 + gap 24

  return (
    <>
      <Path
        d="M10 392 L1190 392"
        stroke="#DC0000"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Path
        d="M10 392 L1190 392"
        stroke="#FFF200"
        strokeWidth={2}
        strokeDasharray="30 24"
        strokeDashoffset={offset}
      />
    </>
  );
}
