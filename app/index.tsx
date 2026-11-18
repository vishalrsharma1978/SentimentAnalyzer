import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetupPicker } from "../src/components/SetupPicker";
import { HeaderPulse } from "../src/components/HeaderPulse";
import { useModelPreparation } from "../src/components/ModelPreparation";
import {
  brandPresets,
  brandSetupSuggestions,
  businessTypes,
  countries,
  countriesForBrand,
  countryBundles,
  platformOptions,
  sentimentSources,
  workingSentimentSources,
} from "../src/config/brandSetup";
import {
  forgetBrand,
  loadRecentBrands,
  recordBrand,
  type RecentBrand,
} from "../src/data/recentBrands";
import { colors, fonts } from "../src/theme";

const pickerOptions = (items: string[]) =>
  items.map((value) => ({ label: value, value }));
const toggleItem = (items: string[], value: string) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

export default function Onboarding() {
  const { begin } = useModelPreparation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isCompact = width < 560;
  const [businessName, setBusinessName] = useState("");
  const [appName, setAppName] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState("Other");
  const [selectedPlatforms, setSelectedPlatforms] = useState([
    "Web",
    "Mobile · iOS",
    "Mobile · Android",
  ]);
  const [selectedSources, setSelectedSources] = useState([
    ...workingSentimentSources,
  ]);
  const [selectedCountries, setSelectedCountries] = useState(["United States"]);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [recentBrands, setRecentBrands] = useState<RecentBrand[]>([]);
  useEffect(() => {
    setRecentBrands(loadRecentBrands());
  }, []);
  const availableCountries = countriesForBrand(countries, businessName);
  const suggestion = brandSetupSuggestions[businessName.trim()];

  const setBrandName = (name: string) => {
    setBusinessName(name);
    setSelectedCountries((current) => countriesForBrand(current, name));
    setSelectedBundles([]);
    setError("");
  };
  const selectBrand = (name: string) => {
    const brand = brandPresets.find((item) => item.name === name);
    setBrandName(brand?.name ?? "");
    setAppName("");
    setWebsite(brand?.website ?? "");
    setBusinessType(
      brand
        ? (brandSetupSuggestions[brand.name]?.businessType ?? "Other")
        : "Other",
    );
  };
  const selectRecentBrand = (brand: RecentBrand) => {
    setBrandName(brand.name);
    setAppName("");
    setWebsite(brand.website);
  };
  const applySuggestion = () => {
    if (!suggestion) return;
    setBusinessType(suggestion.businessType);
    setSelectedPlatforms([...suggestion.platforms]);
    setSelectedSources([...suggestion.sources]);
    setSelectedCountries(countriesForBrand(suggestion.countries, businessName));
    setSelectedBundles([]);
    setError("");
  };
  const toggleCountry = (country: string) => {
    const next = toggleItem(selectedCountries, country);
    setSelectedCountries(next);
    setSelectedBundles((current) =>
      current.filter((bundle) =>
        countriesForBrand(countryBundles[bundle], businessName).every((item) =>
          next.includes(item),
        ),
      ),
    );
    setError("");
  };
  const bundleIsSelected = (bundle: string) =>
    selectedBundles.includes(bundle) ||
    (bundle === "Global" &&
      countriesForBrand(countryBundles.Global, businessName).every((country) =>
        selectedCountries.includes(country),
      ));
  const toggleBundle = (bundle: string) => {
    const bundleCountries = countriesForBrand(
      countryBundles[bundle],
      businessName,
    );
    const active = bundleIsSelected(bundle);
    setSelectedBundles(
      bundle === "Global"
        ? active
          ? []
          : ["Global"]
        : toggleItem(selectedBundles, bundle),
    );
    setSelectedCountries(
      bundle === "Global"
        ? active
          ? []
          : bundleCountries
        : active
          ? selectedCountries.filter(
              (country) => !bundleCountries.includes(country),
            )
          : [...new Set([...selectedCountries, ...bundleCountries])],
    );
    setError("");
  };
  const submit = () => {
    if (!businessName.trim()) {
      setError("Enter your brand name.");
      return;
    }
    try {
      const parsed = new URL(website.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("Enter a valid http(s) website.");
        return;
      }
    } catch {
      setError("Enter a valid http(s) website.");
      return;
    }
    if (!selectedCountries.length) {
      setError("Select at least one market.");
      return;
    }
    if (!selectedPlatforms.length || !selectedSources.length) {
      setShowOptions(true);
      setError(
        `Select at least one ${selectedPlatforms.length ? "sentiment source" : "platform"}.`,
      );
      return;
    }
    setError("");
    setRecentBrands(recordBrand(businessName, website));
    const preparationId = begin(businessName.trim(), selectedCountries, true);
    router.push({
      pathname: "/dashboard",
      params: {
        countries: JSON.stringify(selectedCountries),
        brand: businessName.trim(),
        appName: appName.trim(),
        businessType,
        platforms: JSON.stringify(selectedPlatforms),
        sources: JSON.stringify(selectedSources),
        runtime: "1",
        website: website.trim(),
        refresh: preparationId,
      },
    });
  };
  const signIn = () => {
    if (!loginEmail.includes("@") || loginPassword.length < 4) {
      setLoginError(
        "Enter an email and a password of at least 4 characters for demo access.",
      );
      return;
    }
    setLoginError("");
    setShowLogin(false);
    router.push("/dashboard");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, isCompact && styles.headerMobile]}>
        <View style={styles.identity}>
          <View testID="landing-logo" style={styles.logo}>
            <Ionicons name="pulse" size={23} color={colors.onPrimary} />
          </View>
          <Text style={styles.wordmark}>PulseBoard</Text>
          {!isCompact && (
            <Text style={styles.headerTagline}>Customer intelligence</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <HeaderPulse />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Demo sign in"
            onPress={() => {
              setLoginError("");
              setShowLogin(true);
            }}
            style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
          >
            <Text style={styles.signInText}>Sign in</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.navy} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.page, isCompact && styles.pageMobile]}
      >
        <View style={[styles.shell, isWide && styles.shellWide]}>
          <View
            testID="landing-hero"
            style={[
              styles.hero,
              isWide && styles.heroWide,
              isCompact && styles.heroMobile,
            ]}
          >
            <View style={styles.eyebrow}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrowText}>
                CUSTOMER SENTIMENT, SIMPLIFIED
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.heroTitle, isCompact && styles.heroTitleMobile]}
            >
              Every brand has a pulse.
            </Text>
            <Text
              style={[
                styles.heroSubtitle,
                isCompact && styles.heroSubtitleMobile,
              ]}
            >
              Turn customer feedback into your next move.
            </Text>
            {!isCompact && (
              <>
                <View testID="landing-preview" style={styles.preview}>
                  <View style={styles.previewHeader}>
                    <View>
                      <Text style={styles.previewTitle}>
                        The bigger picture
                      </Text>
                      <Text style={styles.previewCaption}>
                        Illustrative preview
                      </Text>
                    </View>
                    <Ionicons name="pulse" size={30} color={colors.accent} />
                  </View>
                  {[
                    {
                      label: "Positive",
                      share: "68%",
                      bar: styles.positiveBar,
                      color: colors.green,
                    },
                    {
                      label: "Neutral",
                      share: "22%",
                      bar: styles.neutralBar,
                      color: colors.orange,
                    },
                    {
                      label: "Negative",
                      share: "10%",
                      bar: styles.negativeBar,
                      color: colors.red,
                    },
                  ].map((item) => (
                    <View key={item.label} style={styles.previewRow}>
                      <Text style={styles.previewLabel}>{item.label}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            item.bar,
                            { backgroundColor: item.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.previewShare}>{item.share}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.heroFeatures}>
                  {[
                    "Spot trends",
                    "Compare markets",
                    "Find your next move",
                  ].map((label) => (
                    <View key={label} style={styles.heroFeature}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={17}
                        color={colors.accent}
                      />
                      <Text style={styles.heroFeatureText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View
            style={[
              styles.form,
              isWide && styles.formWide,
              isCompact && styles.formMobile,
            ]}
          >
            <View style={styles.formHeading}>
              <Text accessibilityRole="header" style={styles.formTitle}>
                Start with your brand
              </Text>
              <Text style={styles.formSubtitle}>
                Any brand. Any industry. One clear view.
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Brand name</Text>
              <TextInput
                accessibilityLabel="Brand name"
                placeholder="e.g. Acme Coffee"
                placeholderTextColor={colors.faint}
                value={businessName}
                onChangeText={setBrandName}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                accessibilityLabel="Website"
                placeholder="https://yourbrand.com"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={website}
                onChangeText={(value) => {
                  setWebsite(value);
                  setError("");
                }}
                style={styles.input}
              />
            </View>
            {recentBrands.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>Your frequent brands</Text>
                <View style={styles.bundles}>
                  {recentBrands.map((brand) => (
                    <View key={brand.name} style={styles.recentChip}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${brand.name}`}
                        onPress={() => selectRecentBrand(brand)}
                        style={styles.recentUse}
                      >
                        <Text style={styles.bundleText}>{brand.name}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Forget ${brand.name}`}
                        onPress={() => setRecentBrands(forgetBrand(brand.name))}
                        style={styles.recentForget}
                      >
                        <Ionicons name="close" size={14} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <SetupPicker
              title="Markets"
              summary={
                selectedCountries.length === 1
                  ? selectedCountries[0]
                  : `${selectedCountries.length} countries`
              }
              options={pickerOptions(availableCountries)}
              selected={selectedCountries}
              multiple
              onSelect={toggleCountry}
              footer={
                <View style={styles.marketFooter}>
                  <Text style={styles.smallText}>
                    {selectedCountries.length}{" "}
                    {selectedCountries.length === 1 ? "country" : "countries"}{" "}
                    selected
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear all"
                    onPress={() => {
                      setSelectedCountries([]);
                      setSelectedBundles([]);
                    }}
                    style={styles.textButton}
                  >
                    <Text style={styles.linkText}>Clear all</Text>
                  </Pressable>
                </View>
              }
            >
              <Text style={styles.groupLabel}>Regions</Text>
              <View style={styles.bundles}>
                {Object.keys(countryBundles).map((bundle) => (
                  <Pressable
                    key={bundle}
                    accessibilityRole="checkbox"
                    accessibilityLabel={bundle}
                    aria-checked={bundleIsSelected(bundle)}
                    onPress={() => toggleBundle(bundle)}
                    style={[
                      styles.bundle,
                      bundleIsSelected(bundle) && styles.bundleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bundleText,
                        bundleIsSelected(bundle) && styles.bundleTextActive,
                      ]}
                    >
                      {bundle}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.groupLabel}>Countries</Text>
            </SetupPicker>
            <View style={styles.secondaryRow}>
              <View style={styles.examplePicker}>
                <SetupPicker
                  title="Example brands"
                  summary="Try an example"
                  selected={[businessName.trim()]}
                  options={[
                    {
                      label: "Your brand",
                      value: "",
                      detail: "Start with a blank setup",
                    },
                    ...brandPresets.map((brand) => ({
                      label: brand.name,
                      value: brand.name,
                    })),
                  ]}
                  onSelect={selectBrand}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More options"
                aria-expanded={showOptions}
                onPress={() => setShowOptions((current) => !current)}
                style={styles.moreButton}
              >
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.linkText}>
                  {showOptions ? "Fewer options" : "More options"}
                </Text>
                <Ionicons
                  name={showOptions ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
            </View>
            {showOptions && (
              <View style={styles.advanced}>
                <Text style={styles.smallText}>Fine-tune your view</Text>
                <SetupPicker
                  title="Industry"
                  summary={businessType}
                  options={pickerOptions(businessTypes)}
                  selected={[businessType]}
                  onSelect={setBusinessType}
                />
                <SetupPicker
                  title="Platforms"
                  summary={`${selectedPlatforms.length} selected`}
                  options={pickerOptions(platformOptions)}
                  selected={selectedPlatforms}
                  multiple
                  onSelect={(value) => {
                    setSelectedPlatforms((current) =>
                      toggleItem(current, value),
                    );
                    setError("");
                  }}
                />
                <SetupPicker
                  title="Sentiment sources"
                  summary={`${selectedSources.length} selected`}
                  options={pickerOptions(sentimentSources)}
                  selected={selectedSources}
                  multiple
                  onSelect={(value) => {
                    setSelectedSources((current) => toggleItem(current, value));
                    setError("");
                  }}
                />
                <View style={styles.field}>
                  <Text style={styles.label}>
                    App name <Text style={styles.optional}>(if different)</Text>
                  </Text>
                  <TextInput
                    accessibilityLabel="App name"
                    placeholder={businessName || "Same as your brand"}
                    placeholderTextColor={colors.faint}
                    value={appName}
                    onChangeText={setAppName}
                    style={styles.input}
                  />
                </View>
                {suggestion && (
                  <View style={styles.suggestion}>
                    <Text style={[styles.smallText, styles.flex]}>
                      Suggested setup for {businessName.trim()}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={applySuggestion}
                      style={styles.textButton}
                    >
                      <Text style={styles.linkText}>Use setup</Text>
                    </Pressable>
                  </View>
                )}
                <Text style={styles.smallText}>
                  Source availability varies by brand and market.
                </Text>
              </View>
            )}
            {error !== "" && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create model"
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>Create model</Text>
              <Ionicons
                name="arrow-forward"
                size={19}
                color={colors.onPrimary}
              />
            </Pressable>
            <Text style={styles.formFootnote}>
              Reviews, trends and markets — together.
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Ionicons name="pulse" size={16} color={colors.primary} />
          <Text style={styles.smallText}>Less noise. More insight.</Text>
        </View>
      </ScrollView>
      <Modal
        visible={showLogin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogin(false)}
      >
        <View style={styles.loginBackdrop}>
          <View
            role="dialog"
            accessibilityLabel="Demo sign in"
            style={styles.loginCard}
          >
            <View style={styles.loginHeader}>
              <Text style={styles.formTitle}>Welcome back</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sign in"
                onPress={() => setShowLogin(false)}
                style={styles.textButton}
              >
                <Ionicons name="close" size={22} color={colors.navy} />
              </Pressable>
            </View>
            <Text style={styles.smallText}>
              Demo workspace. Not production authentication.
            </Text>
            <TextInput
              accessibilityLabel="Work email"
              placeholder="Work email"
              placeholderTextColor={colors.faint}
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Password"
              placeholder="Password"
              placeholderTextColor={colors.faint}
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              style={styles.input}
            />
            {loginError !== "" && (
              <Text accessibilityRole="alert" style={styles.error}>
                {loginError}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open demo workspace"
              onPress={signIn}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Open demo workspace</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.onPrimary}
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerMobile: { minHeight: 64, paddingHorizontal: 20 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  identity: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: { fontFamily: fonts.black, fontSize: 21, color: colors.navy },
  headerTagline: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginLeft: 12,
  },
  signIn: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signInText: { fontFamily: fonts.bold, fontSize: 14, color: colors.navy },
  page: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: "center",
  },
  pageMobile: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: "flex-start",
  },
  shell: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: 24 },
  shellWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  hero: {
    padding: 36,
    borderRadius: 28,
    backgroundColor: colors.navy,
    overflow: "hidden",
    justifyContent: "center",
  },
  heroWide: { flex: 1, borderRadius: 0, padding: 44 },
  heroMobile: { padding: 24, borderRadius: 22 },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  eyebrowText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.accent,
    flexShrink: 1,
  },
  heroTitle: {
    fontFamily: fonts.black,
    fontSize: 54,
    lineHeight: 59,
    letterSpacing: -1.6,
    color: colors.onDark,
    maxWidth: 430,
  },
  heroTitleMobile: { fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 27,
    color: colors.onDarkMuted,
    marginTop: 18,
    maxWidth: 330,
  },
  heroSubtitleMobile: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  preview: {
    marginTop: 36,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    backgroundColor: colors.darkCard,
    gap: 18,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  previewTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.onDark },
  previewCaption: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.onDarkMuted,
    marginTop: 5,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewLabel: {
    width: 56,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.onDarkMuted,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 8,
    backgroundColor: colors.darkBorder,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 8 },
  positiveBar: { width: "68%" },
  neutralBar: { width: "22%" },
  negativeBar: { width: "10%" },
  previewShare: {
    width: 32,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.onDark,
    textAlign: "right",
  },
  heroFeatures: { marginTop: 28, gap: 12 },
  heroFeature: { flexDirection: "row", alignItems: "center", gap: 9 },
  heroFeatureText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.onDarkMuted,
  },
  form: {
    backgroundColor: colors.card,
    padding: 32,
    borderRadius: 28,
    gap: 18,
  },
  formWide: { flex: 1, borderRadius: 0, padding: 40 },
  formMobile: { padding: 22, borderRadius: 22, gap: 14 },
  formHeading: { gap: 8, marginBottom: 6 },
  formTitle: {
    fontFamily: fonts.black,
    fontSize: 25,
    color: colors.navy,
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  field: { gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.navy },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    backgroundColor: colors.primaryTint,
    color: colors.navy,
  },
  secondaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  examplePicker: { flex: 1, minWidth: 0 },
  moreButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  linkText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  textButton: {
    minHeight: 44,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  advanced: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optional: { fontFamily: fonts.regular, color: colors.muted },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 8,
  },
  bundles: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  bundle: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  recentChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  recentUse: {
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 6,
    justifyContent: "center",
  },
  recentForget: {
    minHeight: 44,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bundleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bundleText: { fontFamily: fonts.bold, fontSize: 12, color: colors.navy },
  bundleTextActive: { color: colors.onPrimary },
  marketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  error: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.redText,
  },
  button: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
  pressed: { opacity: 0.75 },
  formFootnote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 24,
  },
  loginBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    padding: 24,
    justifyContent: "center",
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 24,
    backgroundColor: colors.card,
    padding: 24,
    gap: 16,
  },
  loginHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
