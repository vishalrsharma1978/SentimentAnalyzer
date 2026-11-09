import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

// Carbon-fibre weave used as a panel background. Decorative.
export function Carbon() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" aria-hidden>
        <Defs>
          <Pattern
            id="weave"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <Rect width="12" height="12" fill="#0B0B0D" />
            <Rect width="6" height="6" fill="#16161A" />
            <Rect x="6" y="6" width="6" height="6" fill="#16161A" />
            <Rect x="0" y="6" width="6" height="6" fill="#101013" />
            <Rect x="6" y="0" width="6" height="6" fill="#101013" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#weave)" />
      </Svg>
    </View>
  );
}
