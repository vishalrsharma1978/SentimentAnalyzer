import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchFxRate, fetchTransferComparison } from "../data/liveData";
import type {
  TransferComparison,
  TransferOption,
  TransferPayIn,
} from "../data/liveData";
import {
  PAY_IN_OPTIONS,
  PAY_OUT_OPTIONS,
  TRANSFER_COUNTRIES,
  corridorRequest,
  defaultReceiverFor,
  findTransferCountry,
  formatMoney,
  isSameCorridor,
} from "../data/transferCorridors";
import type { TransferCountry } from "../data/transferCorridors";
import { colors, fonts } from "../theme";

type Props = {
  /** Country code of the market selected in the dashboard; prefills the sender. */
  senderCode: string;
};

const QUICK_AMOUNTS = [200, 500, 1000, 2500];

function CountryPicker({
  label,
  value,
  onChange,
  disabledCode,
  testID,
}: {
  label: string;
  value: TransferCountry;
  onChange: (country: TransferCountry) => void;
  disabledCode?: string;
  testID: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value.name}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.picker}
        testID={testID}
      >
        <Text style={styles.pickerCode}>{value.code}</Text>
        <Text style={styles.pickerName} numberOfLines={1}>
          {value.name}
        </Text>
        <Text style={styles.pickerCurrency}>{value.currency}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.muted}
        />
      </Pressable>
      {open && (
        <ScrollView style={styles.menu} nestedScrollEnabled>
          {TRANSFER_COUNTRIES.map((country) => {
            const disabled = country.code === disabledCode;
            return (
              <Pressable
                key={country.code}
                accessibilityRole="button"
                accessibilityLabel={`${label} option ${country.name}`}
                disabled={disabled}
                onPress={() => {
                  onChange(country);
                  setOpen(false);
                }}
                style={[
                  styles.menuItem,
                  country.code === value.code && styles.menuItemActive,
                  disabled && styles.menuItemDisabled,
                ]}
              >
                <Text style={styles.menuCode}>{country.code}</Text>
                <Text style={styles.menuName}>{country.name}</Text>
                <Text style={styles.menuCurrency}>{country.currency}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <View
      style={styles.stars}
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={
            rating >= star
              ? "star"
              : rating >= star - 0.5
                ? "star-half"
                : "star-outline"
          }
          size={12}
          color={colors.orange}
        />
      ))}
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function ProviderCard({
  option,
  receiveCurrency,
  sendCurrency,
}: {
  option: TransferOption;
  receiveCurrency: string;
  sendCurrency: string;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const converted = option.sendAmount - option.fee;
  return (
    <View
      style={[styles.provider, option.best && styles.providerBest]}
      accessibilityLabel={`${option.provider}, rank ${option.rank}, recipient gets ${formatMoney(option.receivedAmount, receiveCurrency)}${option.best ? ", best option" : ""}`}
      testID={option.best ? "best-provider" : "provider-row"}
    >
      <View style={styles.providerTop}>
        <View style={[styles.rankBadge, option.best && styles.rankBadgeBest]}>
          <Text style={[styles.rankText, option.best && styles.rankTextBest]}>
            #{option.rank}
          </Text>
        </View>
        {option.logo ? (
          <Image
            source={{ uri: option.logo }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={styles.providerName}>
          <Text style={styles.providerTitle}>{option.provider}</Text>
          <Text style={styles.providerKind}>{option.kind}</Text>
        </View>
        {option.best && (
          <View style={styles.bestPill}>
            <Ionicons name="trophy" size={11} color={colors.greenText} />
            <Text style={styles.bestText}>Best option</Text>
          </View>
        )}
        <Stars rating={option.rating} />
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Transfer fee</Text>
          <Text style={styles.metricValue}>
            {option.fee === 0 ? "Free" : formatMoney(option.fee, sendCurrency)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Exchange rate</Text>
          <Text style={styles.metricValue}>
            {option.exchangeRate.toFixed(option.exchangeRate >= 100 ? 2 : 4)}
          </Text>
          {option.midMarketRate ? (
            <Text style={styles.metricNote}>
              Mid-market{" "}
              {option.midMarketRate.toFixed(
                option.midMarketRate >= 100 ? 2 : 4,
              )}
            </Text>
          ) : null}
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Delivery</Text>
          <Text style={styles.metricValue}>
            {option.delivery ? option.delivery.label : "Not stated"}
          </Text>
        </View>
        <View
          style={[
            styles.metric,
            styles.metricHand,
            option.best && styles.metricHandBest,
          ]}
        >
          <Text style={styles.metricLabel}>Recipient gets</Text>
          <Text style={[styles.handValue, option.best && styles.handValueBest]}>
            {formatMoney(option.receivedAmount, receiveCurrency)}
          </Text>
          <Text style={styles.metricNote}>
            {option.best
              ? "Most in hand"
              : `${formatMoney(option.lessThanBest, receiveCurrency)} less than best`}
          </Text>
        </View>
      </View>
      {option.totalCostPercent !== null && option.totalCost !== null && (
        <Text style={styles.costNote}>
          Total cost {formatMoney(option.totalCost, sendCurrency)} (
          {option.totalCostPercent.toFixed(2)}%) including the fee and
          exchange-rate margin · rated on {option.ratingBasis.toLowerCase()}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${showBreakdown ? "Hide" : "Show"} fee breakdown for ${option.provider}`}
        accessibilityState={{ expanded: showBreakdown }}
        onPress={() => setShowBreakdown((current) => !current)}
        style={styles.breakdownToggle}
        testID="fee-breakdown-toggle"
      >
        <Ionicons
          name={showBreakdown ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.primary}
        />
        <Text style={styles.breakdownToggleText}>
          {showBreakdown ? "Hide fee breakdown" : "How the fee is calculated"}
        </Text>
      </Pressable>
      {showBreakdown && (
        <View style={styles.breakdown} testID="fee-breakdown">
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>You send</Text>
            <Text style={styles.breakdownValue}>
              {formatMoney(option.sendAmount, sendCurrency)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              {option.provider} fee deducted
            </Text>
            <Text style={[styles.breakdownValue, styles.breakdownDeduction]}>
              {option.fee === 0
                ? "Free"
                : `− ${formatMoney(option.fee, sendCurrency)}`}
            </Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownDivider]}>
            <Text style={styles.breakdownLabel}>Amount converted</Text>
            <Text style={styles.breakdownValue}>
              {formatMoney(converted, sendCurrency)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Exchange rate applied</Text>
            <Text style={styles.breakdownValue}>
              × {option.exchangeRate.toFixed(option.exchangeRate >= 100 ? 2 : 4)}
            </Text>
          </View>
          {option.midMarketRate !== null &&
            option.midMarketRate !== option.exchangeRate && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Hidden exchange-rate margin
                </Text>
                <Text
                  style={[styles.breakdownValue, styles.breakdownDeduction]}
                >
                  −{" "}
                  {formatMoney(
                    Math.abs(
                      converted * (option.midMarketRate - option.exchangeRate),
                    ),
                    receiveCurrency,
                  )}
                </Text>
              </View>
            )}
          <View style={[styles.breakdownRow, styles.breakdownDivider]}>
            <Text style={[styles.breakdownLabel, styles.breakdownTotalLabel]}>
              Receiver gets
            </Text>
            <Text style={[styles.breakdownValue, styles.breakdownTotal]}>
              {formatMoney(option.receivedAmount, receiveCurrency)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function CustomerExperience({ senderCode }: Props) {
  const initialSender =
    findTransferCountry(senderCode) ??
    (findTransferCountry("US") as TransferCountry);
  const [sender, setSender] = useState<TransferCountry>(initialSender);
  const [receiver, setReceiver] = useState<TransferCountry>(() =>
    defaultReceiverFor(initialSender.code),
  );
  const [senderEdited, setSenderEdited] = useState(false);
  const [payIn, setPayIn] = useState<TransferPayIn>("BANK_TRANSFER");
  const [payOut, setPayOut] = useState(PAY_OUT_OPTIONS[0].id);
  const [amountText, setAmountText] = useState("500");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransferComparison | null>(null);
  // Latest mid-market rate, tagged with the currency pair it was fetched for so
  // stale rates are never shown while a new pair loads.
  const [fx, setFx] = useState<{ pair: string; rate: number | null } | null>(
    null,
  );
  const requestId = useRef(0);

  // Follow the dashboard's selected market until the user picks their own sender.
  useEffect(() => {
    if (senderEdited) return;
    const next = findTransferCountry(senderCode);
    if (!next) return;
    setSender(next);
    setReceiver((current) =>
      current.code === next.code ? defaultReceiverFor(next.code) : current,
    );
    setResult(null);
    setStatus("idle");
  }, [senderCode, senderEdited]);

  const amount = Number(amountText.replace(/,/g, ""));
  const amountValid =
    Number.isFinite(amount) && amount >= 10 && amount <= 100000;
  const sameCountry = isSameCorridor(sender, receiver);
  const canCompare = amountValid && !sameCountry && status !== "loading";

  // Mid-market preview of the converted amount, refreshed whenever the
  // currency pair changes; the full comparison still runs on demand.
  const fxPair = `${sender.currency}:${receiver.currency}`;
  const sameCurrency = sender.currency === receiver.currency;
  useEffect(() => {
    if (sameCountry || sameCurrency) return;
    const controller = new AbortController();
    const pair = fxPair;
    fetchFxRate(sender.currency, receiver.currency, controller.signal)
      .then((rate) => setFx({ pair, rate: rate.rate }))
      .catch(() => {
        if (!controller.signal.aborted) setFx({ pair, rate: null });
      });
    return () => controller.abort();
  }, [fxPair, sameCountry, sameCurrency, sender.currency, receiver.currency]);
  const fxRate = sameCurrency ? 1 : fx?.pair === fxPair ? fx.rate : null;
  const fxLoading = !sameCountry && !sameCurrency && fx?.pair !== fxPair;
  const fxError = !sameCurrency && fx?.pair === fxPair && fx.rate === null;

  const reset = () => {
    requestId.current += 1;
    setResult(null);
    setStatus("idle");
    setError(null);
  };

  const compare = async (nextPayIn: TransferPayIn = payIn) => {
    if (!amountValid || sameCountry) return;
    const id = ++requestId.current;
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchTransferComparison(
        corridorRequest(sender, receiver, nextPayIn, amount),
      );
      if (id !== requestId.current) return;
      setResult(data);
      setStatus("done");
    } catch (failure) {
      if (id !== requestId.current) return;
      setError(
        failure instanceof Error ? failure.message : "Comparison failed.",
      );
      setStatus("error");
    }
  };

  const swap = () => {
    setSenderEdited(true);
    setSender(receiver);
    setReceiver(sender);
    reset();
  };

  const best = result?.providers[0] ?? null;
  const payOutLabel =
    PAY_OUT_OPTIONS.find((option) => option.id === payOut)?.label ?? "";
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.card} testID="customer-experience">
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Customer experience</Text>
          <Text style={styles.subtitle}>
            What a customer actually receives when sending money, compared
            across providers on live quotes.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Hide" : "Show"} customer experience section`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          style={styles.sectionToggle}
          testID="customer-experience-toggle"
        >
          <Text style={styles.sectionToggleText}>
            {expanded ? "Hide" : "Show"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {expanded && (
        <>
      <View style={styles.row}>
        <CountryPicker
          label="Sender country"
          value={sender}
          disabledCode={receiver.code}
          testID="sender-country"
          onChange={(country) => {
            setSenderEdited(true);
            setSender(country);
            reset();
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap sender and receiver"
          onPress={swap}
          style={styles.swap}
        >
          <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
        </Pressable>
        <CountryPicker
          label="Receiver country"
          value={receiver}
          disabledCode={sender.code}
          testID="receiver-country"
          onChange={(country) => {
            setReceiver(country);
            reset();
          }}
        />
        <View style={[styles.field, styles.convertedField]}>
          <Text style={styles.fieldLabel}>
            Receiver gets (approx, {receiver.currency})
          </Text>
          <View style={styles.convertedBox} testID="converted-amount">
            {fxLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : fxRate !== null && amountValid ? (
              <Text
                style={styles.convertedValue}
                accessibilityLabel={`Approximately ${formatMoney(amount * fxRate, receiver.currency)} at the mid-market rate`}
              >
                ≈ {formatMoney(amount * fxRate, receiver.currency)}
              </Text>
            ) : (
              <Text style={styles.convertedPlaceholder}>
                {fxError ? "Rate unavailable" : "Enter an amount"}
              </Text>
            )}
          </View>
          {fxRate !== null && !fxLoading && (
            <Text style={styles.convertedNote}>
              Mid-market rate {fxRate.toFixed(fxRate >= 100 ? 2 : 4)}, before
              provider fees
            </Text>
          )}
        </View>
      </View>

      <View style={styles.amountBlock}>
        <Text style={styles.fieldLabel}>You send ({sender.currency})</Text>
        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Amount to send"
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={(text) => {
              setAmountText(text.replace(/[^0-9.,]/g, ""));
              reset();
            }}
            style={[styles.amountInput, !amountValid && styles.amountInvalid]}
          />
          <View style={styles.quick}>
            {QUICK_AMOUNTS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Send ${value}`}
                onPress={() => {
                  setAmountText(String(value));
                  reset();
                }}
                style={[styles.chip, amount === value && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    amount === value && styles.chipTextActive,
                  ]}
                >
                  {value.toLocaleString("en-US")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {!amountValid && (
          <Text style={styles.errorText}>
            Enter an amount between 10 and 100,000.
          </Text>
        )}
      </View>

      <View style={styles.methods}>
        <View style={styles.methodGroup}>
          <Text style={styles.fieldLabel}>Pay in · changes the quotes</Text>
          <View style={styles.segment}>
            {PAY_IN_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`Pay in ${option.label}`}
                accessibilityState={{ selected: payIn === option.id }}
                onPress={() => {
                  setPayIn(option.id);
                  if (status === "done" || status === "error")
                    void compare(option.id);
                }}
                style={[
                  styles.segmentItem,
                  payIn === option.id && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    payIn === option.id && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.segmentHint,
                    payIn === option.id && styles.segmentHintActive,
                  ]}
                >
                  {option.hint}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.methodGroup}>
          <Text style={styles.fieldLabel}>Pay out · informational</Text>
          <View style={styles.segment}>
            {PAY_OUT_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`Pay out ${option.label}`}
                accessibilityState={{ selected: payOut === option.id }}
                onPress={() => setPayOut(option.id)}
                style={[
                  styles.segmentItem,
                  payOut === option.id && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    payOut === option.id && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.methodNote}>
            Quotes do not change with how the recipient is paid, so confirm{" "}
            {payOutLabel.toLowerCase()} availability with the provider you pick.
          </Text>
        </View>
      </View>

      {sameCountry && (
        <Text style={styles.errorText}>
          Choose different sender and receiver countries.
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare price"
        accessibilityState={{
          disabled: !canCompare,
          busy: status === "loading",
        }}
        disabled={!canCompare}
        onPress={() => void compare()}
        style={[styles.compare, !canCompare && styles.compareDisabled]}
        testID="compare-price"
      >
        {status === "loading" ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Ionicons
            name="pricetags-outline"
            size={16}
            color={colors.onPrimary}
          />
        )}
        <Text style={styles.compareText}>
          {status === "loading" ? "Comparing live prices…" : "Compare price"}
        </Text>
      </Pressable>

      {status === "error" && (
        <View
          accessibilityRole="alert"
          style={styles.errorBox}
          testID="compare-error"
        >
          <Text style={styles.errorTitle}>Could not compare prices</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      )}

      {status === "done" && result && result.providers.length === 0 && (
        <View style={styles.emptyBox} testID="compare-empty">
          <Text style={styles.emptyTitle}>
            No providers quoted this corridor
          </Text>
          <Text style={styles.emptyBody}>
            Wise returned no current quotes for {sender.name} to {receiver.name}{" "}
            paying by {result.request.payInLabel.toLowerCase()}. Try another
            pay-in method or country.
          </Text>
        </View>
      )}

      {status === "done" && result && best && (
        <View testID="compare-results">
          <View style={styles.summary} testID="recommendation">
            <Text style={styles.summaryLabel}>RECOMMENDATION</Text>
            <Text style={styles.summaryTitle}>
              {best.provider} gets {receiver.name} the most:{" "}
              {formatMoney(best.receivedAmount, receiver.currency)}
            </Text>
            <Text style={styles.summaryBody}>
              Sending {formatMoney(result.request.amount, sender.currency)} from{" "}
              {sender.name} by {result.request.payInLabel.toLowerCase()}, after
              a{" "}
              {best.fee === 0 ? "zero" : formatMoney(best.fee, sender.currency)}{" "}
              fee at{" "}
              {best.exchangeRate.toFixed(best.exchangeRate >= 100 ? 2 : 4)}.
              {result.providers.length > 1
                ? ` That is ${formatMoney(result.providers[result.providers.length - 1].lessThanBest, receiver.currency)} more than the lowest of ${result.providers.length} providers.`
                : ""}
            </Text>
          </View>
          {result.providers.map((option) => (
            <ProviderCard
              key={option.provider}
              option={option}
              sendCurrency={sender.currency}
              receiveCurrency={receiver.currency}
            />
          ))}
          <Text style={styles.footnote}>
            Live quotes from {result.source}, updated{" "}
            {new Date(result.fetchedAt).toLocaleTimeString()}. The recipient
            amount is after fees. Rating weights what the recipient gets (70%)
            with delivery speed (30%) when the provider states a delivery time;
            otherwise it uses the amount alone.
          </Text>
        </View>
      )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
  },
  sectionToggleText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
  },
  title: { fontFamily: fonts.black, fontSize: 18, color: colors.navy },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 10,
  },
  field: { flex: 1, minWidth: 200, zIndex: 2 },
  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  picker: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
  },
  pickerCode: { fontFamily: fonts.black, fontSize: 13, color: colors.primary },
  pickerName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  pickerCurrency: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  menu: {
    maxHeight: 220,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  menuItem: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  menuItemActive: { backgroundColor: colors.primarySoft },
  menuItemDisabled: { opacity: 0.4 },
  menuCode: {
    width: 28,
    fontFamily: fonts.black,
    fontSize: 12,
    color: colors.primary,
  },
  menuName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  menuCurrency: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  swap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  amountBlock: { gap: 2 },
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  amountInput: {
    minWidth: 150,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    fontFamily: fonts.black,
    fontSize: 20,
    color: colors.navy,
  },
  amountInvalid: { borderColor: colors.red, backgroundColor: colors.redSoft },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  methods: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  methodGroup: { flex: 1, minWidth: 260 },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  segmentItem: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  segmentTextActive: { color: colors.onPrimary },
  segmentHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  segmentHintActive: { color: colors.onDarkMuted },
  methodNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 6,
  },
  compare: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  compareDisabled: { opacity: 0.45 },
  compareText: {
    fontFamily: fonts.black,
    fontSize: 15,
    color: colors.onPrimary,
  },
  errorText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.redText,
    marginTop: 4,
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorTitle: { fontFamily: fonts.black, fontSize: 13, color: colors.redText },
  errorBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.redText,
    marginTop: 2,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  emptyTitle: {
    fontFamily: fonts.black,
    fontSize: 13,
    color: colors.orangeText,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.orangeText,
    marginTop: 2,
  },
  summary: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.navy,
    marginBottom: 12,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: fonts.black,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.accent,
  },
  summaryTitle: {
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onDark,
  },
  summaryBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onDarkMuted,
  },
  provider: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    gap: 12,
  },
  providerBest: {
    borderColor: colors.green,
    borderWidth: 2,
    backgroundColor: colors.greenSoft,
  },
  providerTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeBest: { backgroundColor: colors.green },
  rankText: { fontFamily: fonts.black, fontSize: 12, color: colors.primary },
  rankTextBest: { color: colors.onPrimary },
  logo: { width: 28, height: 28 },
  providerName: { flex: 1, minWidth: 110 },
  providerTitle: { fontFamily: fonts.black, fontSize: 15, color: colors.navy },
  providerKind: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.green,
  },
  bestText: { fontFamily: fonts.black, fontSize: 10, color: colors.greenText },
  stars: { flexDirection: "row", alignItems: "center", gap: 1 },
  ratingValue: {
    fontFamily: fonts.black,
    fontSize: 12,
    color: colors.navy,
    marginLeft: 5,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flex: 1, minWidth: 110 },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.muted,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: fonts.black,
    fontSize: 15,
    color: colors.navy,
    marginTop: 2,
  },
  metricNote: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  metricHand: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
  },
  metricHandBest: { backgroundColor: colors.card },
  handValue: {
    fontFamily: fonts.black,
    fontSize: 20,
    color: colors.navy,
    marginTop: 2,
  },
  handValueBest: { color: colors.greenText },
  costNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 4,
  },
  convertedField: { flex: 1, minWidth: 180 },
  convertedBox: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
  },
  convertedValue: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.greenText,
  },
  convertedPlaceholder: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  convertedNote: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
  breakdownToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  breakdownToggleText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primary,
  },
  breakdown: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  breakdownDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
  },
  breakdownLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    flexShrink: 1,
  },
  breakdownValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  breakdownDeduction: { color: colors.redText },
  breakdownTotalLabel: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  breakdownTotal: {
    fontFamily: fonts.black,
    fontSize: 14,
    color: colors.greenText,
  },
});
