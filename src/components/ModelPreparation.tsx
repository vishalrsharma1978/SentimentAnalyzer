import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PulseFlow } from "./PulseFlow";
import { colors, fonts } from "../theme";

type Preparation = {
  id: string;
  brand: string;
  tasks: string[];
  completed: string[];
  failed: string[];
};
type PreparationContext = {
  begin: (brand: string, markets: string[], runtime?: boolean) => string;
  report: (id: string, task: string, failed?: boolean) => void;
};
const Context = createContext<PreparationContext | null>(null);

export function useModelPreparation() {
  const context = useContext(Context);
  if (!context) throw new Error("Model preparation requires its root provider.");
  return context;
}

function PreparationPulse() {
  return (
    <View testID="preparation-pulse-animation" style={styles.graphic} accessibilityRole="image" accessibilityLabel="PulseBoard pulse">
      <View style={styles.pulseScale} pointerEvents="none">
        <PulseFlow color={colors.navy} />
      </View>
    </View>
  );
}

function PreparationTrack({ progress, active }: { progress: number; active: boolean }) {
  const [width, setWidth] = useState(0);
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    sweep.setValue(0);
    if (!active || width <= 0) return;
    const loop = Animated.loop(Animated.timing(sweep, {
      toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web", isInteraction: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [active, width, sweep]);

  const sweepWidth = Math.max(40, width * 0.35);
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-sweepWidth, width] });

  return (
    <View
      accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      accessibilityValue={{ min: 0, max: 100, now: progress }}
      accessibilityLabel="Model preparation progress" style={styles.track}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.fill, { width: `${progress}%` }]} />
      {active && width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.sweep, { width: sweepWidth, transform: [{ translateX }] }]} />
      )}
    </View>
  );
}

export function ModelPreparationProvider({ children }: { children: ReactNode }) {
  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const begin = useCallback((brand: string, markets: string[], runtime = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPreparation({
      id, brand, tasks: [...(runtime ? [] : ["sources", "chart"]), ...markets.map((market) => `market:${market}`)],
      completed: [], failed: [],
    });
    return id;
  }, []);
  const report = useCallback((id: string, task: string, failed = false) => {
    setPreparation((current) => {
      if (!current || current.id !== id || !current.tasks.includes(task) || current.completed.includes(task)) return current;
      const next = {
        ...current, completed: [...current.completed, task],
        failed: failed ? [...current.failed, task] : current.failed,
      };
      return next.completed.length === next.tasks.length && !next.failed.length ? null : next;
    });
  }, []);
  const complete = preparation !== null && preparation.completed.length === preparation.tasks.length;
  const progress = preparation ? Math.round(preparation.completed.length / preparation.tasks.length * 100) : 0;
  const cancel = () => { setPreparation(null); router.back(); };

  return (
    <Context.Provider value={{ begin, report }}>
      {children}
      <Modal visible={preparation !== null} transparent animationType="fade" onRequestClose={cancel}>
        <View style={styles.backdrop}>
          <View role="dialog" aria-modal accessibilityLabel="Preparing model" style={styles.card}>
            {preparation !== null && !complete && <PreparationPulse />}
            <Text accessibilityRole="header" style={styles.title}>
              {complete ? "Model ready with limited data" : "Preparing model"}
            </Text>
            <Text style={styles.subtitle}>
              {complete ? "Some sources could not be loaded. Available data is ready to explore." :
                `Evaluating ${preparation?.brand ?? "your brand"} across your selected markets.`}
            </Text>
            <PreparationTrack progress={progress} active={!complete} />
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {progress}% · {complete ? "Market evaluations finished" : "Evaluating competitors, reviews and market statistics"}
            </Text>
            {complete && preparation && (
              <>
                <Text accessibilityRole="alert" style={styles.warning}>
                  Needs attention: {preparation.failed.map((task) =>
                    task === "sources" ? "customer and competitor sources" :
                      task === "chart" ? "store rankings" : task.replace("market:", ""),
                  ).join(", ")}.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setPreparation(null)} style={styles.button}>
                  <Text style={styles.buttonText}>View available dashboard</Text>
                </Pressable>
              </>
            )}
            {!complete && (
              <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel preparation</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: "center", padding: 24,
    backgroundColor: "rgba(15,43,87,0.5)",
    ...(Platform.OS === "web"
      ? ({ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as object)
      : null),
  },
  card: { width: "100%", maxWidth: 420, alignSelf: "center", padding: 28, borderRadius: 24, backgroundColor: colors.card, gap: 18 },
  graphic: { width: 200, height: 56, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  pulseScale: { transform: [{ scale: 1.6 }] },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.navy, textAlign: "center" },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center" },
  track: { height: 10, borderRadius: 8, backgroundColor: colors.lineSoft, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 8 },
  sweep: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.accent, opacity: 0.55, borderRadius: 8 },
  status: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, textAlign: "center" },
  warning: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.orangeText },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
});
