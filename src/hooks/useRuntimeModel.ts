import { useEffect, useState } from "react";
import { fetchRuntimeMarket } from "../data/liveData";
import type { ModelConfiguration, RuntimeModel } from "../data/runtimeModel";

type Market = { code: string; name: string };
type State = {
  key: string;
  model: RuntimeModel | null;
  loading: boolean;
  errors: Record<string, string>;
};

// The model service accepts 4 concurrent evaluations; use 3 to leave headroom for a retry or a second tab.
const CONCURRENCY = 3;

export function useRuntimeModel(
  configuration: ModelConfiguration | null,
  markets: Market[],
  generation: string,
  months: number,
  refresh: number,
  report: (id: string, task: string, failed?: boolean) => void,
) {
  const key = JSON.stringify({
    configuration,
    markets: markets.map(({ code, name }) => ({ code, name })),
    generation,
    months,
    refresh,
  });
  const [state, setState] = useState<State>({
    key: "",
    model: null,
    loading: false,
    errors: {},
  });
  useEffect(() => {
    if (!configuration) return;
    const controller = new AbortController();
    const initial: State = {
      key,
      model: { id: generation, configuration, markets: {} },
      loading: true,
      errors: {},
    };
    const evaluate = async (market: Market) => {
      try {
        const result = await fetchRuntimeMarket(
          configuration,
          market.code,
          months,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setState((previous) => {
          const current = previous.key === key ? previous : initial;
          return {
            ...current,
            model: {
              id: generation,
              configuration,
              markets: { ...current.model?.markets, [market.code]: result },
            },
          };
        });
        report(generation, `market:${market.name}`, result.status !== "ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Model evaluation failed.";
        console.error(`Model evaluation failed (${market.code}):`, message);
        setState((previous) => {
          const current = previous.key === key ? previous : initial;
          return {
            ...current,
            errors: { ...current.errors, [market.code]: message },
          };
        });
        report(generation, `market:${market.name}`, true);
      }
    };
    const load = async () => {
      // Sliding window: a slow market never holds back the rest, unlike fixed batches.
      let next = 0;
      const worker = async () => {
        while (next < markets.length && !controller.signal.aborted)
          await evaluate(markets[next++]);
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, markets.length) }, worker),
      );
      if (!controller.signal.aborted)
        setState((current) =>
          current.key === key ? { ...current, loading: false } : current,
        );
    };
    void load();
    return () => controller.abort();
    // key is the serialized request, including every configuration field and market.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, report]);
  return state.key === key
    ? state
    : { key, model: null, loading: configuration !== null, errors: {} };
}
