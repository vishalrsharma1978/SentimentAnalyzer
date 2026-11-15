import { useEffect, useState } from 'react';
import { fetchRuntimeMarket } from '../data/liveData';
import type { ModelConfiguration, RuntimeModel } from '../data/runtimeModel';

type Market = { code: string; name: string };
type State = { key: string; model: RuntimeModel | null; loading: boolean; errors: Record<string, string> };

export function useRuntimeModel(
  configuration: ModelConfiguration | null, markets: Market[], generation: string, months: number,
  refresh: number, report: (id: string, task: string, failed?: boolean) => void,
) {
  const key = JSON.stringify({ configuration, markets: markets.map(({ code, name }) => ({ code, name })), generation, months, refresh });
  const [state, setState] = useState<State>({ key: '', model: null, loading: false, errors: {} });
  useEffect(() => {
    if (!configuration) return;
    const controller = new AbortController();
    const initial: State = {
      key, model: { id: generation, configuration, markets: {} }, loading: true, errors: {},
    };
    const load = async () => {
      for (let index = 0; index < markets.length && !controller.signal.aborted; index += 2) {
        await Promise.all(markets.slice(index, index + 2).map(async (market) => {
          try {
            const result = await fetchRuntimeMarket(configuration, market.code, months, controller.signal);
            if (controller.signal.aborted) return;
            setState((previous) => {
              const current = previous.key === key ? previous : initial;
              return { ...current, model: { id: generation, configuration,
                markets: { ...current.model?.markets, [market.code]: result } } };
            });
            report(generation, `market:${market.name}`, result.status !== 'ready');
          } catch (error) {
            if (controller.signal.aborted) return;
            const message = error instanceof Error ? error.message : 'Model evaluation failed.';
            console.error(`Model evaluation failed (${market.code}):`, message);
            setState((previous) => {
              const current = previous.key === key ? previous : initial;
              return { ...current, errors: { ...current.errors, [market.code]: message } };
            });
            report(generation, `market:${market.name}`, true);
          }
        }));
      }
      if (!controller.signal.aborted) setState((current) => current.key === key ? { ...current, loading: false } : current);
    };
    void load();
    return () => controller.abort();
    // key is the serialized request, including every configuration field and market.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, report]);
  return state.key === key ? state : { key, model: null, loading: configuration !== null, errors: {} };
}
