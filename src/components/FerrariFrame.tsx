import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";

const BODY =
  "M92 276 C116 266 154 258 201 251 L290 238 C326 231 349 215 376 186 L427 132 C445 113 464 105 492 103 L636 103 C659 104 679 113 697 130 L783 209 C806 223 835 232 876 238 L1026 252 C1080 257 1118 267 1145 283 C1159 291 1165 301 1161 310 C1159 317 1151 322 1137 324 L1088 324 C1084 278 1051 247 1008 247 C964 247 931 278 928 324 L337 324 C334 278 301 247 257 247 C213 247 180 278 176 324 L117 324 C92 324 77 316 77 302 C77 291 82 282 92 276 Z";

const WINDOW =
  "M393 181 L443 133 C456 120 469 115 491 115 L630 115 C650 115 664 122 681 139 L747 205 C694 207 641 208 587 208 L363 208 Z";

const WHEEL_POSITIONS = [
  { x: 257, y: 318 },
  { x: 1008, y: 318 },
];

export function FerrariFrame() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 70 1200 360"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <Defs>
          <LinearGradient id="carPaint" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#67171B" />
            <Stop offset="0.32" stopColor="#2B1013" />
            <Stop offset="1" stopColor="#101013" />
          </LinearGradient>
          <LinearGradient id="carGlass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#54616A" stopOpacity="0.9" />
            <Stop offset="0.45" stopColor="#1B252D" />
            <Stop offset="1" stopColor="#0B0B0D" />
          </LinearGradient>
          <LinearGradient id="carFloor" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#DC0000" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#DC0000" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#DC0000" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Ellipse
          cx="624"
          cy="350"
          rx="520"
          ry="18"
          fill="url(#carFloor)"
          opacity={0.65}
        />
        <Path
          d={BODY}
          fill="url(#carPaint)"
          stroke="#DC0000"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path
          d="M96 276 C193 251 263 252 309 236 C347 223 369 194 399 163 L429 132 C446 114 465 106 492 104 L636 104 C661 105 679 115 699 133 L783 210 C830 234 888 239 1026 252 C1087 258 1131 272 1151 290"
          fill="none"
          stroke="#F3B2A7"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.78}
        />
        <Path
          d={WINDOW}
          fill="url(#carGlass)"
          stroke="#E8C55B"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path
          d="M558 115 L558 207 M660 119 L719 202"
          fill="none"
          stroke="#E8C55B"
          strokeWidth={1.5}
          opacity={0.85}
        />
        <Path
          d="M365 216 C467 220 602 220 752 213 M807 229 C868 237 918 244 955 252"
          fill="none"
          stroke="#E8C55B"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.8}
        />
        <Path
          d="M766 241 L832 246 L803 267 L746 263 Z"
          fill="#09090B"
          stroke="#DC0000"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path
          d="M92 275 L171 263 L196 265 L183 273 L107 285 Z"
          fill="#E8C55B"
          stroke="#FFF1A8"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <Path
          d="M1119 277 L1153 285 L1161 298 L1128 291 Z"
          fill="#DC0000"
          stroke="#F3B2A7"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <Path
          d="M1071 244 L1153 237 L1158 242 L1074 254 Z M1087 251 L1083 272"
          fill="none"
          stroke="#E8C55B"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M452 232 L451 263 M581 222 L578 265 M714 220 L730 258"
          fill="none"
          stroke="#F3B2A7"
          strokeWidth={1}
          opacity={0.65}
        />
        <Circle cx="895" cy="254" r="3" fill="#E8C55B" />

        {WHEEL_POSITIONS.map(({ x, y }) => (
          <G key={x}>
            <Circle cx={x} cy={y} r={77} fill="#09090B" stroke="#08080A" strokeWidth={8} />
            <Circle cx={x} cy={y} r={63} fill="#141418" stroke="#DC0000" strokeWidth={3} />
            <Circle cx={x} cy={y} r={49} fill="#09090B" stroke="#E8C55B" strokeWidth={1.5} />
            <Circle cx={x} cy={y} r={19} fill="#242429" stroke="#A8A8AE" strokeWidth={2} />
            <Circle cx={x} cy={y} r={6} fill="#E8C55B" />
            {[0, 60, 120].map((angle) => (
              <Path
                key={`${x}-${angle}`}
                d={`M ${x} ${y - 10} L ${x} ${y - 44}`}
                stroke="#A8A8AE"
                strokeWidth={3}
                strokeLinecap="round"
                transform={`rotate(${angle} ${x} ${y})`}
              />
            ))}
          </G>
        ))}

        <Path
          d="M42 390 L1158 390"
          fill="none"
          stroke="#DC0000"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.75}
        />
        <Path
          d="M75 390 L1125 390"
          fill="none"
          stroke="#E8C55B"
          strokeWidth={1}
          strokeDasharray="24 20"
          opacity={0.75}
        />
      </Svg>
    </View>
  );
}
