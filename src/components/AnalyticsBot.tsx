import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import type { ComponentRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { STARTER_QUESTIONS, answerQuestion } from "../data/analyticsBot";
import type { AnalystAnswer, AnalystContext } from "../data/analyticsBot";
import { colors, fonts } from "../theme";

type Props = {
  /** Snapshot of the model's findings; null on the landing page, where no model exists yet. */
  context: AnalystContext | null;
};

type Message =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "bot"; answer: AnalystAnswer };

const LANDING_ANSWER: AnalystAnswer = {
  title: "Your analytics assistant",
  lines: [
    "I answer questions about the data the model builds: ratings, review sentiment and themes, competitor ranking, store comparison, transfer fees, markets and trends.",
    "Set up a brand and open the dashboard, then ask me for an executive summary, the top complaints or how you compare with competitors.",
  ],
};

/** The gear-and-bars mark: an orange gear around a gauge, beside three rising bars. */
function AnalystMark({ size }: { size: number }) {
  const bar = (height: number, color: string) => (
    <View
      style={{
        width: size * 0.13,
        height: size * height,
        borderRadius: 2,
        backgroundColor: color,
      }}
    />
  );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: size * 0.04,
      }}
    >
      <View style={{ justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="settings" size={size * 0.62} color={colors.orange} />
      </View>
      {bar(0.28, colors.red)}
      {bar(0.5, colors.orangeLight)}
      {bar(0.72, colors.green)}
    </View>
  );
}

export function AnalyticsBot({ context }: Props) {
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const panelWidth = Math.min(400, width - 24);
  const panelHeight = Math.min(560, height - 120);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const answer = context ? answerQuestion(context, text) : LANDING_ANSWER;
    setMessages((current) => [
      ...current,
      { id: nextId.current++, from: "user", text },
      { id: nextId.current++, from: "bot", answer },
    ]);
    setDraft("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const subtitle = context
    ? `${context.brand} · ${context.country}`
    : "Ready when you open the dashboard";

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {open && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.panel, { width: panelWidth, height: panelHeight }]}
          testID="analytics-bot-panel"
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <AnalystMark size={30} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Analytics assistant</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close analytics assistant"
              onPress={() => setOpen(false)}
              style={styles.close}
              testID="analytics-bot-close"
            >
              <Ionicons name="close" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
          >
            <View style={styles.botBubble}>
              <Text style={styles.answerTitle}>
                {context
                  ? `Hi, I'm your analyst for ${context.brand}.`
                  : LANDING_ANSWER.title}
              </Text>
              <Text style={styles.answerLine}>
                {context
                  ? "Ask me about the findings below and I will answer with the numbers behind them."
                  : LANDING_ANSWER.lines[0]}
              </Text>
              {!context && (
                <Text style={styles.answerLine}>{LANDING_ANSWER.lines[1]}</Text>
              )}
            </View>
            {messages.map((message) =>
              message.from === "user" ? (
                <View key={message.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{message.text}</Text>
                </View>
              ) : (
                <View
                  key={message.id}
                  style={styles.botBubble}
                  testID="analytics-bot-answer"
                >
                  <Text style={styles.answerTitle}>{message.answer.title}</Text>
                  {message.answer.lines.map((line, index) => (
                    <Text key={index} style={styles.answerLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              ),
            )}
          </ScrollView>
          {context && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chips}
              contentContainerStyle={styles.chipsContent}
            >
              {STARTER_QUESTIONS.map((question) => (
                <Pressable
                  key={question}
                  accessibilityRole="button"
                  onPress={() => ask(question)}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{question}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Ask the analytics assistant"
              placeholder={
                context ? "Ask about the data…" : "Open the dashboard to ask"
              }
              placeholderTextColor={colors.faint}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => ask(draft)}
              returnKeyType="send"
              style={styles.input}
              testID="analytics-bot-input"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send question"
              onPress={() => ask(draft)}
              style={styles.send}
              testID="analytics-bot-send"
            >
              <Ionicons name="arrow-up" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          open ? "Hide analytics assistant" : "Open analytics assistant"
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.launcher}
        testID="analytics-bot-launcher"
      >
        <AnalystMark size={34} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    right: 12,
    bottom: 12,
    alignItems: "flex-end",
    gap: 10,
    zIndex: 50,
  },
  launcher: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: { fontFamily: fonts.black, fontSize: 14, color: colors.onPrimary },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.onDarkMuted,
    marginTop: 1,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  thread: { flex: 1, backgroundColor: colors.canvas },
  threadContent: { padding: 12, gap: 10 },
  botBubble: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    padding: 12,
    gap: 6,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderTopRightRadius: 4,
    backgroundColor: colors.primary,
  },
  userText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.onPrimary,
  },
  answerTitle: {
    fontFamily: fonts.black,
    fontSize: 12,
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  answerLine: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  chips: { flexGrow: 0, backgroundColor: colors.canvas },
  chipsContent: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
