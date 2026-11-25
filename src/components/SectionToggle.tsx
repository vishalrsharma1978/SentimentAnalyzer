import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "../theme";

/**
 * The application-wide show/hide control for collapsible sections: an
 * eye icon plus "Show"/"Hide" in a bordered pill, as used on the
 * Competitive intelligence card.
 */
export function SectionToggle({
  hidden,
  onToggle,
  label,
  testID,
}: {
  hidden: boolean;
  onToggle: () => void;
  /** Lower-case section name used in the accessibility label, e.g. "feature map section". */
  label: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${hidden ? "Show" : "Hide"} ${label}`}
      accessibilityState={{ expanded: !hidden }}
      onPress={onToggle}
      style={styles.toggle}
      testID={testID}
    >
      <Ionicons
        name={hidden ? "eye-outline" : "eye-off-outline"}
        size={15}
        color={colors.primary}
      />
      <Text style={styles.text}>{hidden ? "Show" : "Hide"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: 32,
    paddingHorizontal: 10,
    marginLeft: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
});
