import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput,
  useWindowDimensions, View,
} from "react-native";
import { colors, fonts } from "../theme";

type PickerOption = { label: string; value: string; detail?: string };
type Props = {
  title: string;
  summary: string;
  options: PickerOption[];
  selected: string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
};

export function SetupPicker({
  title, summary, options, selected, onSelect, multiple = false, children, footer,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const { height } = useWindowDimensions();
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const close = () => setVisible(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        aria-expanded={visible}
        onPress={() => { setSearch(""); setVisible(true); }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${title}`}
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <View
            role="dialog"
            accessibilityLabel={title}
            aria-modal
            accessibilityViewIsModal
            style={[styles.card, { maxHeight: Math.max(240, height - 64) }]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
                onPress={close}
                style={styles.close}
              >
                <Ionicons name="close" size={22} color={colors.navy} />
              </Pressable>
            </View>
            {options.length > 8 && (
              <TextInput
                accessibilityLabel={`Search ${title.toLowerCase()}`}
                placeholder={`Search ${title.toLowerCase()}`}
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                style={styles.search}
              />
            )}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
              {children}
              {filteredOptions.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole={multiple ? "checkbox" : "radio"}
                    accessibilityLabel={option.label}
                    aria-checked={checked}
                    onPress={() => { onSelect(option.value); if (!multiple) close(); }}
                    style={({ pressed }) => [
                      styles.option, checked && styles.optionSelected, pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.triggerCopy}>
                      <Text style={[styles.optionLabel, checked && styles.selectedText]}>{option.label}</Text>
                      {option.detail && <Text style={styles.detail}>{option.detail}</Text>}
                    </View>
                    <Ionicons
                      name={checked ? "checkmark-circle" : multiple ? "ellipse-outline" : "chevron-forward"}
                      size={20}
                      color={checked ? colors.primary : colors.faint}
                    />
                  </Pressable>
                );
              })}
              {filteredOptions.length === 0 && <Text style={styles.empty}>No matches. Try another search.</Text>}
            </ScrollView>
            {multiple && (
              <View style={styles.footer}>
                {footer}
                <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={close} style={styles.done}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1,
    borderColor: colors.line, borderRadius: 14, backgroundColor: colors.card,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  triggerCopy: { flex: 1, minWidth: 0, gap: 4 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  summary: { fontFamily: fonts.bold, fontSize: 14, color: colors.navy },
  pressed: { opacity: 0.75 },
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: 20 },
  card: {
    width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: colors.card,
    borderRadius: 24, padding: 20, gap: 12, flexShrink: 1,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.black, fontSize: 22, color: colors.navy },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  search: {
    minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.navy,
  },
  options: { gap: 6, paddingBottom: 4 },
  option: {
    minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 12,
  },
  optionSelected: { backgroundColor: colors.primarySoft },
  optionLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.navy },
  selectedText: { color: colors.primaryDark },
  detail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  empty: { padding: 16, fontFamily: fonts.regular, color: colors.muted },
  footer: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  done: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary },
  doneText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
