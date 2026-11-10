import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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
import { BrandPanel } from "../src/components/BrandPanel";
import { BrandFooter, BrandStrip } from "../src/components/BrandStrip";
import { Cockpit } from "../src/components/Cockpit";
import { CustomerSentimentBanner } from "../src/components/CustomerSentimentBanner";
import { GaugeCluster } from "../src/components/GaugeCluster";
import { SentimentStoryRails } from "../src/components/SentimentStoryRails";
import { colors } from "../src/theme";

const businessTypes = [
  "Money transfer",
  "Banking",
  "Fintech",
  "E-commerce",
  "Retail",
  "Travel",
  "Telecom",
  "SaaS",
  "Hospitality",
];
const platformOptions = [
  "Web",
  "Mobile · iOS",
  "Mobile · Android",
  "Desktop app",
  "Agent network",
];
const sentimentSources = [
  "App Store",
  "Google Play",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "X / Twitter",
  "YouTube",
  "Reddit",
  "Trustpilot",
  "Reviews.io",
  "Other web reviews",
];
const workingSentimentSources = ["App Store", "Google Play", "Reddit"];
const countryBundles: Record<string, string[]> = {
  Global: [
    "United States",
    "United Kingdom",
    "India",
    "Germany",
    "Australia",
    "Philippines",
    "Mexico",
    "UAE",
    "France",
    "Canada",
    "Brazil",
    "Japan",
    "Singapore",
    "Sweden",
    "Norway",
    "Denmark",
    "Saudi Arabia",
  ],
  APAC: [
    "India",
    "Australia",
    "Philippines",
    "Japan",
    "Singapore",
    "South Korea",
    "Indonesia",
    "Malaysia",
  ],
  Nordics: ["Sweden", "Norway", "Denmark", "Finland", "Iceland"],
  LACA: ["Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru"],
  Europe: [
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
  ],
  "North America": ["United States", "Canada", "Mexico"],
  "Middle East & Africa": [
    "UAE",
    "Saudi Arabia",
    "South Africa",
    "Egypt",
    "Nigeria",
  ],
};
const countries = [...new Set(Object.values(countryBundles).flat())];
const brandPresets = [
  { name: "Western Union", website: "https://www.westernunion.com" },
  { name: "Wise", website: "https://wise.com" },
  { name: "PayPal", website: "https://www.paypal.com" },
  { name: "Revolut", website: "https://www.revolut.com" },
  { name: "MoneyGram", website: "https://www.moneygram.com" },
  { name: "Remitly", website: "https://www.remitly.com" },
  { name: "Venmo", website: "https://venmo.com" },
  { name: "Cash App", website: "https://cash.app" },
  { name: "Monzo", website: "https://monzo.com" },
  { name: "Chime", website: "https://www.chime.com" },
];
const brandSetupSuggestions: Record<
  string,
  {
    businessType: string;
    platforms: string[];
    sources: string[];
    countries: string[];
    corridors: string[];
  }
> = {
  "Western Union": {
    businessType: "Money transfer",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android", "Agent network"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "India",
      "Philippines",
      "Mexico",
      "UAE",
      "Canada",
      "Brazil",
    ],
    corridors: ["US ↔ India", "US ↔ Mexico", "UK ↔ India", "UAE ↔ Philippines"],
  },
  Wise: {
    businessType: "Fintech",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "India",
      "Germany",
      "Australia",
      "Singapore",
      "Japan",
      "Canada",
    ],
    corridors: ["US ↔ UK", "UK ↔ India", "US ↔ Singapore", "Australia ↔ UK"],
  },
  PayPal: {
    businessType: "Fintech",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android", "Desktop app"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "Germany",
      "France",
      "Australia",
      "Canada",
      "Japan",
      "Singapore",
    ],
    corridors: ["US ↔ UK", "US ↔ Germany", "UK ↔ France", "Australia ↔ Singapore"],
  },
  Revolut: {
    businessType: "Banking",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android"],
    sources: [...workingSentimentSources],
    countries: [
      "United Kingdom",
      "United States",
      "Germany",
      "France",
      "Spain",
      "Italy",
      "Australia",
      "Singapore",
    ],
    corridors: ["UK ↔ EU", "UK ↔ US", "Germany ↔ France", "Australia ↔ Singapore"],
  },
};

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const [businessType, setBusinessType] = useState("Money transfer");
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
  const [businessName, setBusinessName] = useState("Western Union");
  const [appName, setAppName] = useState("Western Union");
  const [website, setWebsite] = useState("https://www.westernunion.com");
  const [touched, setTouched] = useState(false);
  const [collectionState, setCollectionState] = useState<
    "idle" | "collecting" | "complete" | "error"
  >("idle");
  const [collectionMessage, setCollectionMessage] = useState("Sources ready");
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("partner@westernunion.com");
  const [loginPassword, setLoginPassword] = useState("");

  const isWide = width >= 900;
  const showStoryRails = width >= 1200;
  const toggleSelection = (
    value: string,
    current: string[],
    setCurrent: (next: string[]) => void,
  ) => {
    setCurrent(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const selectBrand = (brand: (typeof brandPresets)[number]) => {
    setBusinessName(brand.name);
    setAppName(brand.name);
    setWebsite(brand.website);
  };

  const selectCustomBrand = () => {
    setBusinessName("");
    setAppName("");
    setWebsite("");
    setCollectionState("idle");
    setCollectionMessage("Enter your brand details");
  };

  const selectedBrandSuggestion = brandSetupSuggestions[businessName.trim()];

  const applyBrandSuggestion = () => {
    if (!selectedBrandSuggestion) return;
    setBusinessType(selectedBrandSuggestion.businessType);
    setSelectedPlatforms([...selectedBrandSuggestion.platforms]);
    setSelectedSources([...selectedBrandSuggestion.sources]);
    setSelectedCountries([...selectedBrandSuggestion.countries]);
    setSelectedBundles([]);
    setCollectionState("idle");
    setCollectionMessage("Suggested setup loaded · review your selections");
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries((current) =>
      current.includes(country)
        ? current.filter((item) => item !== country)
        : [...current, country],
    );
  };

  const toggleBundle = (bundle: string) => {
    const bundleCountries = countryBundles[bundle];
    const isSelected = selectedBundles.includes(bundle);
    if (bundle === "Global") {
      setSelectedCountries(isSelected ? [] : [...countryBundles.Global]);
      setSelectedBundles(isSelected ? [] : ["Global"]);
      return;
    }
    setSelectedBundles((current) =>
      isSelected
        ? current.filter((item) => item !== bundle)
        : [...current, bundle],
    );
    setSelectedCountries((current) =>
      isSelected
        ? current.filter((country) => !bundleCountries.includes(country))
        : [...new Set([...current, ...bundleCountries])],
    );
  };

  const submit = async () => {
    setTouched(true);
    setCollectionState("idle");
    setCollectionMessage("Sources ready");

    const normalizedWebsite = website.trim();
    let validWebsite = false;
    try {
      const parsed = new URL(normalizedWebsite);
      validWebsite =
        parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      validWebsite = false;
    }

    const requiredSelections =
      businessName.trim() &&
      appName.trim() &&
      normalizedWebsite &&
      validWebsite &&
      selectedCountries.length &&
      selectedPlatforms.length &&
      selectedSources.length;
    if (!requiredSelections) {
      setCollectionState("error");
      setCollectionMessage(
        validWebsite
          ? "Complete all required selections"
          : "Enter a valid http(s) website",
      );
      return;
    }

    setCollectionState("collecting");
    try {
      setCollectionMessage(
        `Connecting ${selectedSources.length} sentiment sources…`,
      );
      await new Promise((resolve) => setTimeout(resolve, 550));
      setCollectionMessage(
        `Collecting data across ${selectedCountries.length} markets…`,
      );
      await new Promise((resolve) => setTimeout(resolve, 650));
      setCollectionState("complete");
      setCollectionMessage("Collection complete · validating results");
      await new Promise((resolve) => setTimeout(resolve, 450));
      router.push({
        pathname: "/dashboard",
        params: {
          countries: JSON.stringify(selectedCountries),
          brand: appName.trim(),
          website: normalizedWebsite,
        },
      });
    } catch {
      setCollectionState("error");
      setCollectionMessage("Collection was interrupted. Please retry.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.frame}>
        <View accessibilityRole="header" style={styles.topHeader}>
          <View style={styles.topHeaderMark}>
            <Ionicons name="pulse" size={20} color="#FFF200" />
          </View>
          <Text
            style={[styles.topHeaderTitle, !isWide && styles.topHeaderTitleCompact]}
            numberOfLines={1}
          >
            Customer Sentiment Analyzer
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partner sign in"
            onPress={() => setShowLogin(true)}
            style={[styles.signInButton, styles.headerSignInButton]}
          >
            <Ionicons name="person-circle-outline" size={17} color="#FFF200" />
            <Text style={styles.signInText}>
              {isWide ? "Partner sign in" : "Sign in"}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <View
            style={[
              styles.shell,
              isWide && styles.shellWide,
              showStoryRails && { maxWidth: Math.min(1180, width - 440) },
            ]}
          >
            <View style={[styles.heroBanner, !isWide && styles.heroBannerCompact]}>
              <CustomerSentimentBanner compact={!isWide} />
            </View>
            <BrandStrip isWide={isWide} />
            <View style={styles.brandRow}>
              <View style={styles.brandIdentity}>
                <View style={styles.logo}>
                  <Ionicons name="pulse" size={22} color="#0B0B0D" />
                </View>
                <Text style={styles.brandName}>PulseBoard</Text>
              </View>
            </View>

            <View style={[styles.content, isWide && styles.contentWide]}>
              <View style={[styles.visual, isWide && styles.visualWide]}>
                <GaugeCluster
                  brand={appName || "Select a brand"}
                  score="4.1"
                  status={collectionMessage}
                  sources={selectedSources.length}
                  markets={selectedCountries.length}
                  platforms={selectedPlatforms.length}
                  isError={collectionState === "error"}
                />
                {isWide && <BrandPanel />}
              </View>

              <View style={[styles.form, isWide && styles.formWide]}>
                <Text style={styles.kicker}>PULSEBOARD · SCUDERIA EDITION</Text>
                <Text style={styles.title}>Engineered for sentiment</Text>
                <Text style={styles.subtitle}>
                  Precision-tuned intelligence for brands that demand
                  performance. Build your live sentiment model.
                </Text>

                <View style={styles.brandSelectorHeader}>
                  <Text style={styles.label}>Choose your brand</Text>
                  <Text style={styles.multiHint}>Popular brands</Text>
                </View>
                <View style={styles.brandPresets}>
                  {brandPresets.map((brand) => {
                    const active =
                      businessName === brand.name && appName === brand.name;
                    return (
                      <Pressable
                        key={brand.name}
                        onPress={() => selectBrand(brand)}
                        style={[
                          styles.brandPreset,
                          active && styles.brandPresetActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.brandPresetMark,
                            active && styles.brandPresetMarkActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.brandPresetInitial,
                              active && styles.brandPresetInitialActive,
                            ]}
                          >
                            {brand.name[0]}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.brandPresetText,
                            active && styles.brandPresetTextActive,
                          ]}
                        >
                          {brand.name}
                        </Text>
                        {active && (
                          <Ionicons
                            name="checkmark-circle"
                            size={15}
                            color="#DC0000"
                          />
                        )}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="button"
                    onPress={selectCustomBrand}
                    style={[
                      styles.brandPreset,
                      styles.customBrandPreset,
                      !brandPresets.some(
                        (brand) => brand.name === businessName.trim(),
                      ) && styles.brandPresetActive,
                    ]}
                  >
                    <View style={styles.customBrandMark}>
                      <Ionicons
                        name="add"
                        size={17}
                        color="#FFF200"
                      />
                    </View>
                    <Text style={styles.brandPresetText}>Your brand</Text>
                  </Pressable>
                </View>
                {selectedBrandSuggestion && (
                  <View style={styles.suggestionCard}>
                    <View style={styles.suggestionCopy}>
                      <View style={styles.suggestionHeading}>
                        <Ionicons
                          name="sparkles"
                          size={15}
                          color="#FFF200"
                        />
                        <Text style={styles.suggestionTitle}>
                          Suggested setup for {businessName.trim()}
                        </Text>
                      </View>
                      <Text style={styles.suggestionDetail}>
                        Platforms: {selectedBrandSuggestion.platforms.join(", ")}
                      </Text>
                      <Text style={styles.suggestionDetail}>
                        Sources: {selectedBrandSuggestion.sources.join(", ")}
                      </Text>
                      <Text style={styles.suggestionDetail}>
                        Corridors: {selectedBrandSuggestion.corridors.join(" · ")}
                      </Text>
                      <Text style={styles.suggestionFootnote}>
                        Starting suggestions only. Confirm your brand’s actual presence, then edit below.
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={applyBrandSuggestion}
                      style={({ pressed }) => [
                        styles.applySuggestionButton,
                        pressed && styles.applySuggestionButtonPressed,
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={15}
                        color="#FFF200"
                      />
                      <Text style={styles.applySuggestionText}>Use setup</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.fieldRow}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Business name</Text>
                    <TextInput
                      placeholder="e.g. Acme Financial"
                      placeholderTextColor="#98A2B3"
                      style={[
                        styles.input,
                        touched && !businessName && styles.inputError,
                      ]}
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>App or brand name</Text>
                    <TextInput
                      placeholder="e.g. Acme Mobile"
                      placeholderTextColor="#98A2B3"
                      style={[
                        styles.input,
                        touched && !appName && styles.inputError,
                      ]}
                      value={appName}
                      onChangeText={setAppName}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Website</Text>
                  <TextInput
                    placeholder="https://example.com"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="none"
                    keyboardType="url"
                    style={[
                      styles.input,
                      touched && !website && styles.inputError,
                    ]}
                    value={website}
                    onChangeText={(value) => {
                      setWebsite(value);
                      if (collectionState === "error") {
                        setCollectionState("idle");
                        setCollectionMessage("Sources ready");
                      }
                    }}
                  />
                </View>

                <Text style={styles.label}>Core business type</Text>
                <View style={styles.chips}>
                  {businessTypes.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setBusinessType(type)}
                      style={[
                        styles.chip,
                        businessType === type && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          businessType === type && styles.chipTextActive,
                        ]}
                      >
                        {businessType === type ? "✓  " : ""}
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.selectionHeader}>
                  <Text style={styles.label}>Platforms</Text>
                  <Text style={styles.multiHint}>Multi-select</Text>
                </View>
                <View style={styles.chips}>
                  {platformOptions.map((platform) => {
                    const active = selectedPlatforms.includes(platform);
                    return (
                      <Pressable
                        key={platform}
                        onPress={() =>
                          toggleSelection(
                            platform,
                            selectedPlatforms,
                            setSelectedPlatforms,
                          )
                        }
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Ionicons
                          name={
                            active
                              ? "checkmark-circle"
                              : "phone-portrait-outline"
                          }
                          size={14}
                          color={active ? colors.primary : "#8A8A90"}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {platform}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {touched && selectedPlatforms.length === 0 && (
                  <Text style={styles.marketError}>
                    Select at least one platform.
                  </Text>
                )}

                <View style={styles.selectionHeader}>
                  <Text style={styles.label}>Sentiment sources</Text>
                  <Text style={styles.multiHint}>Multi-select</Text>
                </View>
                <View style={styles.chips}>
                  {sentimentSources.map((source) => {
                    const active = selectedSources.includes(source);
                    return (
                      <Pressable
                        key={source}
                        onPress={() =>
                          toggleSelection(
                            source,
                            selectedSources,
                            setSelectedSources,
                          )
                        }
                        style={[
                          styles.sourceChip,
                          active && styles.sourceChipActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            active ? "checkmark-circle" : "chatbubble-outline"
                          }
                          size={13}
                          color={active ? colors.primary : "#8A8A90"}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {source}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {touched && selectedSources.length === 0 && (
                  <Text style={styles.marketError}>
                    Select at least one sentiment source.
                  </Text>
                )}

                <View style={styles.marketHeader}>
                  <Text style={styles.label}>Markets to monitor</Text>
                  <Pressable
                    onPress={() => {
                      setSelectedCountries([]);
                      setSelectedBundles([]);
                    }}
                  >
                    <Text style={styles.clearText}>Clear all</Text>
                  </Pressable>
                </View>
                <Text style={styles.marketHint}>
                  Choose a regional bundle or select individual countries
                </Text>
                <View style={styles.bundleChips}>
                  {Object.keys(countryBundles).map((bundle) => {
                    const active =
                      selectedBundles.includes(bundle) ||
                      (bundle === "Global" &&
                        selectedCountries.length ===
                          countryBundles.Global.length);
                    return (
                      <Pressable
                        key={bundle}
                        onPress={() => toggleBundle(bundle)}
                        style={[
                          styles.bundleChip,
                          active && styles.bundleChipActive,
                        ]}
                      >
                        <Ionicons
                          name={active ? "checkmark-circle" : "globe-outline"}
                          size={14}
                          color={active ? colors.primary : "#8A8A90"}
                        />
                        <Text
                          style={[
                            styles.bundleText,
                            active && styles.bundleTextActive,
                          ]}
                        >
                          {bundle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionCount}>
                    {selectedCountries.length}{" "}
                    {selectedCountries.length === 1 ? "country" : "countries"}{" "}
                    selected
                  </Text>
                  {selectedCountries.length > 0 && (
                    <Text style={styles.selectionNames} numberOfLines={2}>
                      {selectedCountries.join(", ")}
                    </Text>
                  )}
                </View>
                <Text style={[styles.label, styles.aLaCarteLabel]}>
                  A la carte countries
                </Text>
                <View style={styles.chips}>
                  {countries.map((country) => (
                    <Pressable
                      key={country}
                      onPress={() => toggleCountry(country)}
                      style={[
                        styles.chip,
                        selectedCountries.includes(country) &&
                          styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedCountries.includes(country) &&
                            styles.chipTextActive,
                        ]}
                      >
                        {selectedCountries.includes(country) ? "✓  " : ""}
                        {country}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {touched && selectedCountries.length === 0 && (
                  <Text style={styles.marketError}>
                    Select at least one market or country bundle.
                  </Text>
                )}

                {collectionState === "error" && (
                  <Text style={styles.collectionErrorText}>
                    {collectionMessage}
                  </Text>
                )}
                <Pressable
                  onPress={submit}
                  disabled={collectionState === "collecting"}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    collectionState === "collecting" && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {collectionState === "collecting"
                      ? "Collecting intelligence…"
                      : collectionState === "complete"
                        ? "Opening dashboard…"
                        : collectionState === "error"
                          ? "Retry collection"
                          : "Ignite sentiment model"}
                  </Text>
                  <Ionicons
                    name={
                      collectionState === "collecting"
                        ? "sync-outline"
                        : "arrow-forward"
                    }
                    size={18}
                    color="#fff"
                  />
                </Pressable>
                <Text style={styles.privacy}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={13}
                    color="#98A2B3"
                  />{" "}
                  Your sources and API keys stay private
                </Text>
              </View>
              {isWide && !showStoryRails && (
                <View style={styles.cockpitCol}>
                  <Cockpit />
                </View>
              )}
            </View>
            <BrandFooter />
          </View>
        </ScrollView>
        {showStoryRails && <SentimentStoryRails />}
      </View>
      <Modal
        visible={showLogin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogin(false)}
      >
        <View style={styles.loginBackdrop}>
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <View style={styles.loginMark}>
                <Ionicons name="pulse" size={20} color="#fff" />
              </View>
              <Pressable onPress={() => setShowLogin(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#8A8A90" />
              </Pressable>
            </View>
            <Text style={styles.loginEyebrow}>BUSINESS PARTNER PORTAL</Text>
            <Text style={styles.loginTitle}>Welcome back</Text>
            <Text style={styles.loginSubtitle}>
              Sign in to your global intelligence workspace.
            </Text>
            <Text style={styles.label}>Work email</Text>
            <TextInput
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <TextInput
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              placeholder="Enter password"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />
            <Pressable
              onPress={() => {
                if (loginEmail.includes("@") && loginPassword.length >= 4) {
                  setShowLogin(false);
                  router.push("/dashboard");
                }
              }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Sign in securely</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </Pressable>
            <View style={styles.demoNote}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#DC0000"
              />
              <Text style={styles.demoNoteText}>
                Demo access requires an email and 4-character password.
                Production authentication requires an identity provider.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0D", padding: 10 },
  frame: {
    flex: 1,
    borderWidth: 16,
    borderColor: "#26262B",
    borderRadius: 28,
    backgroundColor: "#0B0B0D",
    overflow: "hidden",
    shadowColor: "#DC0000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
    outlineWidth: 2,
    outlineColor: "#DC0000",
  } as any,
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 64,
    paddingHorizontal: 12,
    backgroundColor: "#FFF200",
    borderBottomWidth: 5,
    borderBottomColor: "#DC0000",
  },
  topHeaderMark: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: "#0B0B0D",
    alignItems: "center",
    justifyContent: "center",
  },
  topHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#0B0B0D",
    textTransform: "uppercase",
    textAlign: "center",
    flexShrink: 1,
  },
  topHeaderTitleCompact: { fontSize: 11, letterSpacing: 0.4 },
  headerSignInButton: {
    height: 36,
    paddingHorizontal: 9,
    borderRadius: 18,
    backgroundColor: "#0B0B0D",
    borderColor: "#0B0B0D",
    gap: 5,
  },
  heroBanner: {
    width: "100%",
    height: 220,
    marginBottom: 10,
  },
  heroBannerCompact: { height: 190 },
  page: { flexGrow: 1, padding: 16 },
  shell: { flex: 1, maxWidth: 1180, width: "100%", alignSelf: "center" },
  shellWide: { paddingTop: 8 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  brandIdentity: { flexDirection: "row", alignItems: "center" },
  signInButton: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#DC0000",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "transparent",
  },
  signInText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#FFF200",
    textTransform: "uppercase",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#FFF200",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#F2F2F2",
    textTransform: "uppercase",
  },
  content: {
    flexDirection: "column-reverse",
    gap: 24,
    flex: 1,
    paddingVertical: 12,
  },
  contentWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 42,
    paddingVertical: 20,
  },
  visual: {
    justifyContent: "flex-start",
  },
  visualWide: { flex: 1.1, alignSelf: "flex-start" },
  heroPhoto: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    height: 260,
  },
  heroShadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    backgroundColor: "rgba(7,9,12,0.5)",
  },
  heroShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "rgba(7,9,12,0.9)",
  },
  carWrap: {
    position: "absolute",
    top: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  cockpitCol: { flex: 0.9, alignSelf: "stretch" },
  visualAtmosphere: {
    position: "absolute",
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: "rgba(201,162,39,0.07)",
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.14)",
    transform: [{ scaleX: 1.35 }],
  },
  visualSpeedLines: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 150,
    height: 180,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(201,162,39,0.18)",
    transform: [{ rotate: "-8deg" }],
  },
  visualCarOutline: {
    position: "absolute",
    width: 520,
    height: 760,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: "rgba(108,170,255,0.12)",
    backgroundColor: "rgba(15,23,33,0.42)",
  },
  visualCarNose: {
    position: "absolute",
    left: 72,
    right: 72,
    top: 35,
    height: 118,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: "rgba(232,197,91,0.35)",
    borderBottomColor: "rgba(200,30,40,0.55)",
  },
  visualCarGlass: {
    position: "absolute",
    left: 155,
    right: 155,
    top: 250,
    bottom: 230,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: "rgba(232,197,91,0.25)",
    backgroundColor: "#0B0B0D",
  },
  visualCarSpine: {
    position: "absolute",
    left: 258,
    width: 4,
    top: 120,
    bottom: 120,
    borderRadius: 2,
    backgroundColor: "rgba(232,197,91,0.18)",
  },
  visualCarStrip: {
    position: "absolute",
    left: 46,
    right: 46,
    top: 430,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(200,30,40,0.75)",
  },
  visualCarWheel: {
    position: "absolute",
    width: 92,
    height: 230,
    borderRadius: 46,
    borderWidth: 9,
    borderColor: "rgba(232,197,91,0.14)",
    backgroundColor: "#050506",
  },
  visualWheelLeft: { left: -10, top: 220 },
  visualWheelRight: { right: -10, top: 220 },
  visualTopline: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  visualLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#29A866",
  },
  visualToplineText: {
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: "700",
    color: "#FFF200",
  },
  visualCard: {
    width: "72%",
    maxWidth: 380,
    borderRadius: 6,
    padding: 24,
    backgroundColor: "rgba(12,15,20,0.92)",
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.55)",
    shadowColor: "#DC0000",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 12,
  },
  visualCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  visualLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "700",
    color: "#DC0000",
  },
  visualBrand: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 2,
    color: "#F2F2F2",
  },
  visualBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A0F0F",
    borderWidth: 1,
    borderColor: "#DC0000",
  },
  visualScore: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "200",
    color: "#F2F2F2",
  },
  visualTrend: { color: colors.green, fontWeight: "700" },
  visualBars: {
    height: 106,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  visualBar: { flex: 1, borderRadius: 6, backgroundColor: "#8178FF" },
  form: { flex: 1 },
  formWide: { flex: 1.2, maxWidth: 530 },
  kicker: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "700",
    color: "#DC0000",
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: "#F2F2F2",
    maxWidth: 440,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 22,
    fontSize: 15,
    lineHeight: 24,
    color: "#A0A0A6",
  },
  brandSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandPresets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  brandPreset: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#2A2A30",
    backgroundColor: "#141417",
    paddingHorizontal: 8,
    paddingRight: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandPresetActive: { borderColor: "#DC0000", backgroundColor: "#2A1010" },
  brandPresetMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1E22",
  },
  brandPresetMarkActive: { backgroundColor: "#DC0000" },
  brandPresetInitial: { fontSize: 11, fontWeight: "900", color: "#667085" },
  brandPresetInitialActive: { color: "#FFFFFF" },
  brandPresetText: { fontSize: 11, fontWeight: "800", color: "#C4C4C8" },
  brandPresetTextActive: { color: "#FFF200" },
  customBrandPreset: { borderStyle: "dashed" },
  customBrandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A1010",
  },
  suggestionCard: {
    marginTop: -6,
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4A2920",
    backgroundColor: "#141214",
  },
  suggestionCopy: { gap: 5 },
  suggestionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },
  suggestionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#F2F2F2",
  },
  suggestionDetail: {
    fontSize: 10,
    lineHeight: 15,
    color: "#C4C4C8",
  },
  suggestionFootnote: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: "#A0A0A6",
  },
  applySuggestionButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    marginTop: 10,
    paddingHorizontal: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DC0000",
    backgroundColor: "#2A1010",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  applySuggestionButtonPressed: { opacity: 0.75 },
  applySuggestionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF200",
  },
  fieldRow: { flexDirection: "row", gap: 12 },
  field: { flex: 1, marginBottom: 15 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: "#C4C4C8",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#2A2A30",
    borderRadius: 4,
    paddingHorizontal: 13,
    backgroundColor: "#141417",
    color: "#F2F2F2",
  },
  inputError: { borderColor: colors.red },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: "#2A2A30",
    borderRadius: 4,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#141417",
  },
  chipActive: { borderColor: "#DC0000", backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, fontWeight: "600", color: "#C4C4C8" },
  chipTextActive: { color: "#FFF200" },
  marketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  multiHint: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#DC0000",
    marginBottom: 8,
  },
  sourceChip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: "#2A2A30",
    borderRadius: 4,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#141417",
  },
  sourceChipActive: {
    borderColor: "#DC0000",
    backgroundColor: colors.primarySoft,
  },
  clearText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC0000",
    marginBottom: 8,
  },
  marketHint: { fontSize: 11, color: "#8A8A90", marginBottom: 9 },
  bundleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  bundleChip: {
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2A2A30",
    backgroundColor: "#141417",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bundleChipActive: {
    borderColor: "#DC0000",
    backgroundColor: colors.primarySoft,
  },
  bundleText: { fontSize: 11, fontWeight: "700", color: "#C4C4C8" },
  bundleTextActive: { color: "#FFF200" },
  selectionSummary: {
    minHeight: 52,
    borderRadius: 4,
    backgroundColor: "#1A0F0F",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    padding: 10,
    marginBottom: 14,
  },
  selectionCount: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#FFF200",
  },
  selectionNames: {
    fontSize: 10,
    lineHeight: 14,
    color: "#8A8A90",
    marginTop: 4,
  },
  aLaCarteLabel: { marginTop: 2 },
  marketError: {
    fontSize: 11,
    color: colors.red,
    marginTop: -10,
    marginBottom: 12,
  },
  collectionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(201,162,39,0.3)",
  },
  collectionMetaValue: {
    fontSize: 16,
    fontWeight: "300",
    color: "#FFF200",
    textAlign: "center",
  },
  collectionMetaLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: "#8A8A90",
    marginTop: 2,
    textAlign: "center",
  },
  collectionError: { color: colors.red },
  collectionErrorText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.red,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    marginTop: 14,
    borderRadius: 2,
    backgroundColor: "#2A1A1A",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    width: "72%",
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.75 },
  loginBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(16,24,40,0.55)",
  },
  loginCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 6,
    backgroundColor: "#101012",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 20,
  },
  loginHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  loginMark: {
    width: 38,
    height: 38,
    borderRadius: 4,
    backgroundColor: "#DC0000",
    alignItems: "center",
    justifyContent: "center",
  },
  loginEyebrow: {
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "700",
    color: "#DC0000",
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "200",
    color: "#F2F2F2",
    marginTop: 5,
  },
  loginSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#8A8A90",
    marginTop: 6,
    marginBottom: 20,
  },
  loginButton: {
    height: 48,
    borderRadius: 4,
    marginTop: 18,
    backgroundColor: "#DC0000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginButtonText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  demoNote: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 4,
    backgroundColor: "#1A0F0F",
    padding: 10,
    marginTop: 12,
  },
  demoNoteText: { flex: 1, fontSize: 9, lineHeight: 14, color: "#8A8A90" },
  button: {
    height: 56,
    borderRadius: 4,
    backgroundColor: "#DC0000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
    shadowColor: "#DC0000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonPressed: { opacity: 0.88 },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  privacy: {
    textAlign: "center",
    fontSize: 11,
    color: "#98A2B3",
    marginTop: 12,
  },
});
