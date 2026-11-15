import { StyleSheet, View, useWindowDimensions } from "react-native";
import { PulseFlow } from "./PulseFlow";
import { colors } from "../theme";

export function HeaderPulse() {
  const { width } = useWindowDimensions();
  const compact = width < 560;
  return (
    <View testID="header-pulse" style={[styles.container, compact && styles.compact]} pointerEvents="none">
      <View style={compact && styles.scaled}>
        <PulseFlow color={colors.navy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 120, height: 28, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  compact: { width: 60 },
  scaled: { transform: [{ scaleX: 0.5 }] },
});
