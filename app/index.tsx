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
import { PulseDot } from "../src/components/PulseDot";
import { PulseFlow } from "../src/components/PulseFlow";
import { SentimentStoryRails } from "../src/components/SentimentStoryRails";
import { colors, fonts } from "../src/theme";

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
  const isCompact = width < 560;
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
          refresh: String(Date.now()),
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
            <Ionicons name="pulse" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.topHeaderTitleRow}>
            <Text
              style={[styles.topHeaderTitle, !isWide && styles.topHeaderTitleCompact]}
              numberOfLines={1}
            >
              Customer Sentiment Analyzer
            </Text>
            <PulseFlow color={colors.primary} />
            <PulseDot color={colors.primary} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partner sign in"
            onPress={() => setShowLogin(true)}
            style={({ pressed }) => [
              styles.signInButton,
              styles.headerSignInButton,
              pressed && styles.signInButtonPressed,
            ]}
          >
            <Ionicons name="person-circle-outline" size={17} color="#FFFFFF" />
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
            <View style={[styles.heroBanner, !isWide && styles.heroBannerCompact, isCompact && styles.heroBannerMobile]}>
              <CustomerSentimentBanner compact={!isWide} />
            </View>
            <BrandStrip isWide={isWide} />
            <View style={styles.brandRow}>
              <View style={styles.brandIdentity}>
                <View style={styles.logo}>
                  <Ionicons name="pulse" size={22} color="#FFFFFF" />
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

              <View style={[styles.form, isWide && styles.formWide, isCompact && styles.formMobile]}>
                <Text style={styles.kicker}>PULSEBOARD · CUSTOMER SENTIMENT ANALYTICS</Text>
                <Text style={[styles.title, isCompact && styles.titleMobile]}>Know what your customers feel</Text>
                <Text style={styles.subtitle}>
                  Open, verifiable sentiment intelligence for your brand.
                  Build your live sentiment model in seconds.
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
                            color={colors.primary}
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
                        color={colors.primary}
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
                          color={colors.primaryDark}
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
                        color="#FFFFFF"
                      />
                      <Text style={styles.applySuggestionText}>Use setup</Text>
                    </Pressable>
                  </View>
                )}

                <View style={[styles.fieldRow, isCompact && styles.fieldRowMobile]}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Business name</Text>
                    <TextInput
                      placeholder="e.g. Acme Financial"
                      placeholderTextColor={colors.faint}
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
                      placeholderTextColor={colors.faint}
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
                    placeholderTextColor={colors.faint}
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
                          color={active ? "#FFFFFF" : colors.faint}
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
                          color={active ? "#FFFFFF" : colors.faint}
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
                          color={active ? "#FFFFFF" : colors.faint}
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
                          : "Build sentiment model"}
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
                    color={colors.faint}
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
                <Ionicons name="close" size={22} color={colors.muted} />
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
              placeholderTextColor={colors.faint}
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
                color={colors.primary}
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
  safe: { flex: 1, backgroundColor: colors.canvas },
  frame: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 68,
    paddingHorizontal: 20,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topHeaderMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  topHeaderTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexShrink: 1,
  },
  topHeaderTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.headerText,
    textAlign: "center",
    flexShrink: 0,
  },
  topHeaderTitleCompact: { fontSize: 13 },
  headerSignInButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    gap: 6,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  signInButtonPressed: { opacity: 0.88 },
  heroBanner: {
    width: "100%",
    height: 220,
    marginBottom: 10,
  },
  heroBannerCompact: { height: 190 },
  heroBannerMobile: { height: 170 },
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
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.primary,
  },
  signInText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  brandName: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.navy,
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
  cockpitCol: { flex: 0.9, alignSelf: "stretch" },
  form: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  formWide: { flex: 1.2, maxWidth: 560, padding: 30 },
  formMobile: { padding: 18, borderRadius: 20 },
  kicker: {
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: fonts.black,
    letterSpacing: -0.5,
    color: colors.navy,
    maxWidth: 440,
  },
  titleMobile: { fontSize: 28, lineHeight: 36 },
  subtitle: {
    marginTop: 12,
    marginBottom: 22,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: fonts.regular,
    color: colors.muted,
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
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandPresetActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  brandPresetMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.badge,
  },
  brandPresetMarkActive: { backgroundColor: colors.primary },
  brandPresetInitial: { fontSize: 11, fontFamily: fonts.black, color: colors.muted },
  brandPresetInitialActive: { color: "#FFFFFF" },
  brandPresetText: { fontSize: 11, fontFamily: fonts.bold, color: colors.text },
  brandPresetTextActive: { color: colors.primaryDark },
  customBrandPreset: { borderStyle: "dashed" },
  customBrandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  suggestionCard: {
    marginTop: -6,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
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
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  suggestionDetail: {
    fontSize: 10,
    lineHeight: 15,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  suggestionFootnote: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: colors.faint,
  },
  applySuggestionButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  applySuggestionButtonPressed: { opacity: 0.75 },
  applySuggestionText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldRowMobile: { flexDirection: "column", gap: 0 },
  field: { flex: 1, marginBottom: 15 },
  label: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.primaryTint,
    color: colors.navy,
    fontFamily: fonts.regular,
  },
  inputError: { borderColor: colors.red },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: fonts.bold, color: colors.text },
  chipTextActive: { color: "#FFFFFF" },
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
    fontFamily: fonts.bold,
    letterSpacing: 1,
    color: colors.primary,
    marginBottom: 8,
  },
  sourceChip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.card,
  },
  sourceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  clearText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 8,
  },
  marketHint: { fontSize: 11, color: colors.faint, marginBottom: 9 },
  bundleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  bundleChip: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bundleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  bundleText: { fontSize: 11, fontFamily: fonts.bold, color: colors.text },
  bundleTextActive: { color: "#FFFFFF" },
  selectionSummary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 14,
  },
  selectionCount: {
    fontSize: 11,
    fontFamily: fonts.black,
    letterSpacing: 1,
    color: colors.primaryDark,
  },
  selectionNames: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
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
    borderTopColor: colors.line,
  },
  collectionMetaValue: {
    fontSize: 16,
    fontFamily: fonts.light,
    color: colors.navy,
    textAlign: "center",
  },
  collectionMetaLabel: {
    fontSize: 8,
    fontFamily: fonts.bold,
    letterSpacing: 1.6,
    color: colors.faint,
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
    backgroundColor: colors.badge,
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
    backgroundColor: "rgba(15,43,87,0.45)",
  },
  loginCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 28,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  loginHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  loginMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  loginEyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  loginTitle: {
    fontSize: 28,
    fontFamily: fonts.light,
    color: colors.navy,
    marginTop: 5,
  },
  loginSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 20,
  },
  loginButton: {
    height: 50,
    borderRadius: 14,
    marginTop: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  demoNote: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    marginTop: 12,
  },
  demoNoteText: { flex: 1, fontSize: 9, lineHeight: 14, color: colors.muted },
  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buttonPressed: { opacity: 0.88 },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  privacy: {
    textAlign: "center",
    fontSize: 11,
    color: colors.faint,
    marginTop: 12,
  },
});
