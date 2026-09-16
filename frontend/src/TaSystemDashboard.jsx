import { useCallback, useEffect, useMemo, useState } from "react";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import MaCrossoverChart from "./MaCrossoverChart.jsx";
import TripleMaChart from "./TripleMaChart.jsx";
import MacdChart from "./MacdChart.jsx";
import RsiChart from "./RsiChart.jsx";
import DonchianChart from "./DonchianChart.jsx";
import KeltnerChart from "./KeltnerChart.jsx";
import BollingerChart from "./BollingerChart.jsx";
import DarvasChart from "./DarvasChart.jsx";
import CandlestickReversalChart from "./CandlestickReversalChart.jsx";
import FibonacciChart from "./FibonacciChart.jsx";
import FibonacciLegsTable from "./FibonacciLegsTable.jsx";
import { SR_DEFAULTS } from "./supportResistance.js";
import OpensClosesTable from "./OpensClosesTable.jsx";
import TopPerformersDialog from "./TopPerformersDialog.jsx";
import YesterdaySignalsDialog from "./YesterdaySignalsDialog.jsx";
import DowStocksDialog from "./DowStocksDialog.jsx";
import MaCrossoverProblemsDialog from "./MaCrossoverProblemsDialog.jsx";
import TripleMaAboutDialog from "./TripleMaAboutDialog.jsx";
import TripleMaProblemsDialog from "./TripleMaProblemsDialog.jsx";
import MacdProblemsDialog from "./MacdProblemsDialog.jsx";
import MacdAboutDialog from "./MacdAboutDialog.jsx";
import RsiProblemsDialog from "./RsiProblemsDialog.jsx";
import RsiAboutDialog from "./RsiAboutDialog.jsx";
import DonchianProblemsDialog from "./DonchianProblemsDialog.jsx";
import DonchianAboutDialog from "./DonchianAboutDialog.jsx";
import KeltnerProblemsDialog from "./KeltnerProblemsDialog.jsx";
import KeltnerAboutDialog from "./KeltnerAboutDialog.jsx";
import BollingerProblemsDialog from "./BollingerProblemsDialog.jsx";
import BollingerAboutDialog from "./BollingerAboutDialog.jsx";
import DarvasProblemsDialog from "./DarvasProblemsDialog.jsx";
import DarvasAboutDialog from "./DarvasAboutDialog.jsx";
import DarvasVolumeFilterDialog from "./DarvasVolumeFilterDialog.jsx";
import DarvasMaFilterDialog from "./DarvasMaFilterDialog.jsx";
import DarvasSettingsDialog from "./DarvasSettingsDialog.jsx";
import FibonacciProblemsDialog from "./FibonacciProblemsDialog.jsx";
import FibonacciAboutDialog from "./FibonacciAboutDialog.jsx";
import { simulateMaCrossover } from "./maCrossoverSignals.js";
import { simulateTripleMa } from "./tripleMaSignals.js";
import { simulateMacd } from "./macdSignals.js";
import { simulateRsi } from "./rsiSignals.js";
import { simulateDonchian } from "./donchianSignals.js";
import { simulateKeltner } from "./keltnerSignals.js";
import { simulateBollinger } from "./bollingerSignals.js";
import { simulateDarvas } from "./darvasSignals.js";
import { simulateFibonacci } from "./fibonacciSignals.js";
import { FIB_LEG_DEFAULTS } from "./fibonacci.js";
import { parsePeriod } from "./util/parsePeriod.js";

const DEFAULT_SYMBOL = "AAPL";

/**
 * Shared TA system dashboard shell (chart-tab layout).
 * MA crossover, Triple MA, MACD, and RSI chart are wired; other systems blank for now.
 */
export default function TaSystemDashboard({ system }) {
  const isMaCrossover = system?.id === "ma-crossover";
  const isTripleMa = system?.id === "triple-ma";
  const isMacd = system?.id === "macd";
  const isRsi = system?.id === "rsi";
  const isDonchian = system?.id === "donchian";
  const isKeltner = system?.id === "keltner";
  const isBollinger = system?.id === "bollinger-squeeze";
  const isDarvas = system?.id === "darvas";
  const isCandlestickReversal = system?.id === "candlestick-reversal";
  const isFibonacci = system?.id === "fibonacci";
  const usesChart =
    isMaCrossover ||
    isTripleMa ||
    isMacd ||
    isRsi ||
    isDonchian ||
    isKeltner ||
    isBollinger ||
    isDarvas ||
    isCandlestickReversal ||
    isFibonacci;

  const [input, setInput] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bars, setBars] = useState([]);
  const [companyName, setCompanyName] = useState(null);

  const [maType, setMaType] = useState("sma");
  const [fastInput, setFastInput] = useState(
    isTripleMa ? "10" : isMacd ? "12" : "21",
  );
  const [mediumInput, setMediumInput] = useState("20");
  const [slowInput, setSlowInput] = useState(
    isTripleMa ? "50" : isMacd ? "26" : "50",
  );
  const [signalInput, setSignalInput] = useState("9");
  const [rsiPeriodInput, setRsiPeriodInput] = useState("14");
  const [oversoldInput, setOversoldInput] = useState("30");
  const [overboughtInput, setOverboughtInput] = useState("70");
  const [entryPeriodInput, setEntryPeriodInput] = useState("20");
  const [exitPeriodInput, setExitPeriodInput] = useState("10");
  const [emaPeriodInput, setEmaPeriodInput] = useState("20");
  const [atrPeriodInput, setAtrPeriodInput] = useState("10");
  const [atrMultInput, setAtrMultInput] = useState("2");
  const [bbPeriodInput, setBbPeriodInput] = useState("20");
  const [bbStdMultInput, setBbStdMultInput] = useState("2");
  const [bbAtrPeriodInput, setBbAtrPeriodInput] = useState("10");
  const [bbAtrMultInput, setBbAtrMultInput] = useState("1.5");
  const [topOpen, setTopOpen] = useState(false);
  const [topRows, setTopRows] = useState([]);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [signalRows, setSignalRows] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState(null);
  const [dowOpen, setDowOpen] = useState(false);
  const [dowRows, setDowRows] = useState([]);
  const [dowLoading, setDowLoading] = useState(false);
  const [dowError, setDowError] = useState(null);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [tripleAboutOpen, setTripleAboutOpen] = useState(false);
  const [tripleProblemsOpen, setTripleProblemsOpen] = useState(false);
  const [macdAboutOpen, setMacdAboutOpen] = useState(false);
  const [macdProblemsOpen, setMacdProblemsOpen] = useState(false);
  const [rsiAboutOpen, setRsiAboutOpen] = useState(false);
  const [rsiProblemsOpen, setRsiProblemsOpen] = useState(false);
  const [donchianAboutOpen, setDonchianAboutOpen] = useState(false);
  const [donchianProblemsOpen, setDonchianProblemsOpen] = useState(false);
  const [keltnerAboutOpen, setKeltnerAboutOpen] = useState(false);
  const [keltnerProblemsOpen, setKeltnerProblemsOpen] = useState(false);
  const [bollingerAboutOpen, setBollingerAboutOpen] = useState(false);
  const [bollingerProblemsOpen, setBollingerProblemsOpen] = useState(false);
  const [highLookbackInput, setHighLookbackInput] = useState("55");
  const [boxBuildInput, setBoxBuildInput] = useState("3");
  const [darvasMaFilter, setDarvasMaFilter] = useState(false);
  const [darvasMaPeriodInput, setDarvasMaPeriodInput] = useState("200");
  const [darvasMaType, setDarvasMaType] = useState("sma");
  const [darvasVolFilter, setDarvasVolFilter] = useState(false);
  const [darvasVolPeriodInput, setDarvasVolPeriodInput] = useState("50");
  const [darvasVolMultInput, setDarvasVolMultInput] = useState("1.5");
  const [darvasAboutOpen, setDarvasAboutOpen] = useState(false);
  const [darvasSettingsHelpOpen, setDarvasSettingsHelpOpen] = useState(false);
  const [darvasMaHelpOpen, setDarvasMaHelpOpen] = useState(false);
  const [darvasVolHelpOpen, setDarvasVolHelpOpen] = useState(false);
  const [darvasProblemsOpen, setDarvasProblemsOpen] = useState(false);
  const [srSwingNInput, setSrSwingNInput] = useState(
    String(SR_DEFAULTS.swingN),
  );
  const [srAtrPeriodInput, setSrAtrPeriodInput] = useState(
    String(SR_DEFAULTS.atrPeriod),
  );
  const [srAtrMultInput, setSrAtrMultInput] = useState(
    String(SR_DEFAULTS.atrMult),
  );
  const [srMinTouchesInput, setSrMinTouchesInput] = useState(
    String(SR_DEFAULTS.minTouches),
  );
  const [srMinBarsInput, setSrMinBarsInput] = useState(
    String(SR_DEFAULTS.minBars),
  );
  const [fibSwingNInput, setFibSwingNInput] = useState("10");
  const [fibEntryLevelInput, setFibEntryLevelInput] = useState("0.618");
  const [fibExtensionTargetInput, setFibExtensionTargetInput] =
    useState("1.618");
  const [fibMinLegPctInput, setFibMinLegPctInput] = useState(
    String(FIB_LEG_DEFAULTS.minLegPct),
  );
  const [fibMinLegAtrInput, setFibMinLegAtrInput] = useState(
    String(FIB_LEG_DEFAULTS.minLegAtr),
  );
  const [fibAboutOpen, setFibAboutOpen] = useState(false);
  const [fibProblemsOpen, setFibProblemsOpen] = useState(false);

  const fast = parsePeriod(fastInput, isTripleMa ? 10 : isMacd ? 12 : 21);
  const medium = Math.max(parsePeriod(mediumInput, 20), fast + 1);
  const slow = Math.max(
    parsePeriod(slowInput, isTripleMa ? 50 : isMacd ? 26 : 50),
    (isTripleMa ? medium : fast) + 1,
  );
  const signalPeriod = Math.max(1, parsePeriod(signalInput, 9));
  const rsiPeriod = Math.max(2, parsePeriod(rsiPeriodInput, 14));
  const oversold = Math.min(99, Math.max(1, parsePeriod(oversoldInput, 30)));
  const overbought = Math.min(
    99,
    Math.max(oversold + 1, parsePeriod(overboughtInput, 70)),
  );
  const entryPeriod = Math.max(2, parsePeriod(entryPeriodInput, 20));
  const exitPeriod = Math.max(
    1,
    Math.min(entryPeriod, parsePeriod(exitPeriodInput, 10)),
  );
  const emaPeriod = Math.max(2, parsePeriod(emaPeriodInput, 20));
  const atrPeriod = Math.max(2, parsePeriod(atrPeriodInput, 10));
  const atrMultParsed = parseFloat(atrMultInput);
  const atrMult = Number.isFinite(atrMultParsed)
    ? Math.min(5, Math.max(0.5, atrMultParsed))
    : 2;
  const bbPeriod = Math.max(2, parsePeriod(bbPeriodInput, 20));
  const bbStdMultParsed = parseFloat(bbStdMultInput);
  const bbStdMult = Number.isFinite(bbStdMultParsed)
    ? Math.min(5, Math.max(0.5, bbStdMultParsed))
    : 2;
  const bbAtrPeriod = Math.max(2, parsePeriod(bbAtrPeriodInput, 10));
  const bbAtrMultParsed = parseFloat(bbAtrMultInput);
  const bbAtrMult = Number.isFinite(bbAtrMultParsed)
    ? Math.min(5, Math.max(0.5, bbAtrMultParsed))
    : 1.5;
  const highLookback = Math.max(2, parsePeriod(highLookbackInput, 55));
  const boxBuildParsed = (() => {
    const n = Number(String(boxBuildInput).trim());
    if (!Number.isFinite(n)) return 3;
    return Math.max(1, Math.min(20, Math.floor(n)));
  })();
  const boxBuild = Math.max(1, Math.min(highLookback, boxBuildParsed));
  const darvasMaPeriod = Math.max(2, parsePeriod(darvasMaPeriodInput, 200));
  const darvasVolPeriod = Math.max(2, parsePeriod(darvasVolPeriodInput, 50));
  const darvasVolMultParsed = parseFloat(darvasVolMultInput);
  const darvasVolMult = Number.isFinite(darvasVolMultParsed)
    ? Math.min(5, Math.max(0.5, darvasVolMultParsed))
    : 1.5;
  const srSwingN = Math.max(
    1,
    Math.min(20, parsePeriod(srSwingNInput, SR_DEFAULTS.swingN)),
  );
  const srAtrPeriod = Math.max(
    2,
    parsePeriod(srAtrPeriodInput, SR_DEFAULTS.atrPeriod),
  );
  const srAtrMultParsed = parseFloat(srAtrMultInput);
  const srAtrMult = Number.isFinite(srAtrMultParsed)
    ? Math.min(5, Math.max(0.1, srAtrMultParsed))
    : SR_DEFAULTS.atrMult;
  const srMinTouches = Math.max(
    1,
    Math.min(20, parsePeriod(srMinTouchesInput, SR_DEFAULTS.minTouches)),
  );
  const srMinBars = Math.max(
    1,
    Math.min(120, parsePeriod(srMinBarsInput, SR_DEFAULTS.minBars)),
  );
  const fibSwingN = Math.max(2, Math.min(40, parsePeriod(fibSwingNInput, 10)));
  const fibEntryLevelParsed = parseFloat(fibEntryLevelInput);
  const fibEntryLevel = Number.isFinite(fibEntryLevelParsed)
    ? Math.min(0.95, Math.max(0.05, fibEntryLevelParsed))
    : 0.618;
  const fibExtensionTargetParsed = parseFloat(fibExtensionTargetInput);
  const fibExtensionTarget = Number.isFinite(fibExtensionTargetParsed)
    ? Math.min(5, Math.max(1.01, fibExtensionTargetParsed))
    : 1.618;
  const fibMinLegPctParsed = parseFloat(fibMinLegPctInput);
  const fibMinLegPct = Number.isFinite(fibMinLegPctParsed)
    ? Math.min(50, Math.max(0, fibMinLegPctParsed))
    : FIB_LEG_DEFAULTS.minLegPct;
  const fibMinLegAtrParsed = parseFloat(fibMinLegAtrInput);
  const fibMinLegAtr = Number.isFinite(fibMinLegAtrParsed)
    ? Math.min(20, Math.max(0, fibMinLegAtrParsed))
    : FIB_LEG_DEFAULTS.minLegAtr;
  const fibLegOpts = useMemo(
    () => ({ minLegPct: fibMinLegPct, minLegAtr: fibMinLegAtr }),
    [fibMinLegPct, fibMinLegAtr],
  );

  const { trades, markers } = useMemo(() => {
    if (!bars.length) return { trades: [], markers: [] };
    if (isMaCrossover) {
      return simulateMaCrossover(bars, fast, slow, maType);
    }
    if (isTripleMa) {
      return simulateTripleMa(bars, fast, medium, slow, maType);
    }
    if (isMacd) {
      return simulateMacd(bars, fast, slow, signalPeriod);
    }
    if (isRsi) {
      return simulateRsi(bars, rsiPeriod, oversold, overbought);
    }
    if (isDonchian) {
      return simulateDonchian(bars, entryPeriod, exitPeriod);
    }
    if (isKeltner) {
      return simulateKeltner(bars, emaPeriod, atrPeriod, atrMult);
    }
    if (isBollinger) {
      return simulateBollinger(
        bars,
        bbPeriod,
        bbStdMult,
        bbAtrPeriod,
        bbAtrMult,
      );
    }
    if (isDarvas) {
      return simulateDarvas(
        bars,
        highLookback,
        boxBuild,
        darvasMaFilter,
        darvasMaPeriod,
        darvasMaType,
        darvasVolFilter,
        darvasVolPeriod,
        darvasVolMult,
      );
    }
    if (isFibonacci) {
      return simulateFibonacci(
        bars,
        fibSwingN,
        fibEntryLevel,
        fibExtensionTarget,
        fibLegOpts,
      );
    }
    return { trades: [], markers: [] };
  }, [
    isMaCrossover,
    isTripleMa,
    isMacd,
    isRsi,
    isDonchian,
    isKeltner,
    isBollinger,
    isDarvas,
    isFibonacci,
    bars,
    fast,
    medium,
    slow,
    maType,
    signalPeriod,
    rsiPeriod,
    oversold,
    overbought,
    entryPeriod,
    exitPeriod,
    emaPeriod,
    atrPeriod,
    atrMult,
    bbPeriod,
    bbStdMult,
    bbAtrPeriod,
    bbAtrMult,
    highLookback,
    boxBuild,
    darvasMaFilter,
    darvasMaPeriod,
    darvasMaType,
    darvasVolFilter,
    darvasVolPeriod,
    darvasVolMult,
    fibSwingN,
    fibEntryLevel,
    fibExtensionTarget,
    fibLegOpts,
  ]);

  const loadSymbol = useCallback(
    async (raw) => {
      const next = String(raw ?? "")
        .trim()
        .toUpperCase();
      if (!next) return;
      setInput(next);
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({ symbol: next });
        const barsPromise = fetch(`/api/daily-stock-data?${q}`);
        const pairPromise = isMaCrossover
          ? fetch(`/api/systems/ma-crossover/pair?${q}`, { cache: "no-store" })
          : isTripleMa
            ? fetch(`/api/systems/triple-ma/pair?${q}`, { cache: "no-store" })
            : isMacd
              ? fetch(`/api/systems/macd/pair?${q}`, { cache: "no-store" })
              : isRsi
                ? fetch(`/api/systems/rsi/pair?${q}`, { cache: "no-store" })
                : isDarvas
                  ? fetch(`/api/systems/darvas/pair?${q}`, {
                      cache: "no-store",
                    })
                  : isBollinger
                    ? fetch(`/api/systems/bollinger-squeeze/pair?${q}`, {
                        cache: "no-store",
                      })
                    : isKeltner
                      ? fetch(`/api/systems/keltner/pair?${q}`, {
                          cache: "no-store",
                        })
                      : isDonchian
                        ? fetch(`/api/systems/donchian/pair?${q}`, {
                            cache: "no-store",
                          })
                        : isFibonacci
                          ? fetch(`/api/systems/fibonacci/pair?${q}`, {
                              cache: "no-store",
                            })
                          : null;

        const barsRes = await barsPromise;
        const barsBody = await barsRes.json().catch(() => ({}));
        if (!barsRes.ok) {
          setError(barsBody.error || `Request failed (${barsRes.status})`);
          setBars([]);
          setCompanyName(null);
          return;
        }
        setBars(barsBody.data ?? []);
        setCompanyName(barsBody.companyName ?? null);

        if (pairPromise) {
          const pairRes = await pairPromise;
          const pairBody = await pairRes.json().catch(() => ({}));
          const pair = pairRes.ok ? pairBody.pair : null;
          if (isMaCrossover) {
            if (pair?.fast != null && pair?.slow != null) {
              setFastInput(String(pair.fast));
              setSlowInput(String(pair.slow));
            } else {
              setFastInput("21");
              setSlowInput("50");
            }
            setMaType("sma");
          } else if (isTripleMa) {
            if (
              pair?.fast != null &&
              pair?.medium != null &&
              pair?.slow != null
            ) {
              setFastInput(String(pair.fast));
              setMediumInput(String(pair.medium));
              setSlowInput(String(pair.slow));
            } else {
              setFastInput("10");
              setMediumInput("20");
              setSlowInput("50");
            }
            setMaType("sma");
          } else if (isMacd) {
            if (
              pair?.fast != null &&
              pair?.slow != null &&
              pair?.signal != null
            ) {
              setFastInput(String(pair.fast));
              setSlowInput(String(pair.slow));
              setSignalInput(String(pair.signal));
            } else {
              setFastInput("12");
              setSlowInput("26");
              setSignalInput("9");
            }
          } else if (isRsi) {
            if (
              pair?.period != null &&
              pair?.oversold != null &&
              pair?.overbought != null
            ) {
              setRsiPeriodInput(String(pair.period));
              setOversoldInput(String(pair.oversold));
              setOverboughtInput(String(pair.overbought));
            } else {
              setRsiPeriodInput("14");
              setOversoldInput("30");
              setOverboughtInput("70");
            }
          } else if (isDonchian) {
            if (pair?.entryPeriod != null && pair?.exitPeriod != null) {
              setEntryPeriodInput(String(pair.entryPeriod));
              setExitPeriodInput(String(pair.exitPeriod));
            } else {
              setEntryPeriodInput("20");
              setExitPeriodInput("10");
            }
          } else if (isKeltner) {
            if (
              pair?.emaPeriod != null &&
              pair?.atrPeriod != null &&
              pair?.atrMult != null
            ) {
              setEmaPeriodInput(String(pair.emaPeriod));
              setAtrPeriodInput(String(pair.atrPeriod));
              setAtrMultInput(String(pair.atrMult));
            } else {
              setEmaPeriodInput("20");
              setAtrPeriodInput("10");
              setAtrMultInput("2");
            }
          } else if (isBollinger) {
            if (
              pair?.period != null &&
              pair?.stdMult != null &&
              pair?.atrPeriod != null &&
              pair?.atrMult != null
            ) {
              setBbPeriodInput(String(pair.period));
              setBbStdMultInput(String(pair.stdMult));
              setBbAtrPeriodInput(String(pair.atrPeriod));
              setBbAtrMultInput(String(pair.atrMult));
            } else {
              setBbPeriodInput("20");
              setBbStdMultInput("2");
              setBbAtrPeriodInput("10");
              setBbAtrMultInput("1.5");
            }
          } else if (isDarvas) {
            if (pair?.highLookback != null && pair?.boxBuild != null) {
              setHighLookbackInput(String(pair.highLookback));
              setBoxBuildInput(String(pair.boxBuild));
            } else {
              setHighLookbackInput("55");
              setBoxBuildInput("3");
            }
          } else if (isFibonacci) {
            if (
              pair?.swingN != null &&
              pair?.entryLevel != null &&
              pair?.extensionTarget != null
            ) {
              setFibSwingNInput(String(pair.swingN));
              setFibEntryLevelInput(String(pair.entryLevel));
              setFibExtensionTargetInput(String(pair.extensionTarget));
            } else {
              setFibSwingNInput("10");
              setFibEntryLevelInput("0.618");
              setFibExtensionTargetInput("1.618");
            }
          }
        }
      } catch (err) {
        setError(err?.message || String(err));
        setBars([]);
        setCompanyName(null);
      } finally {
        setLoading(false);
      }
    },
    [
      isMaCrossover,
      isTripleMa,
      isMacd,
      isRsi,
      isDonchian,
      isKeltner,
      isBollinger,
      isDarvas,
      isFibonacci,
    ],
  );

  useEffect(() => {
    if (usesChart) loadSymbol(DEFAULT_SYMBOL);
  }, [usesChart, loadSymbol]);

  useEffect(() => {
    if (
      !topOpen ||
      (!isMaCrossover &&
        !isTripleMa &&
        !isMacd &&
        !isRsi &&
        !isDonchian &&
        !isKeltner &&
        !isBollinger &&
        !isDarvas &&
        !isFibonacci)
    )
      return undefined;
    let cancelled = false;
    (async () => {
      setTopLoading(true);
      setTopError(null);
      try {
        const url = isFibonacci
          ? "/api/systems/fibonacci/top-performers?top=50"
          : isDarvas
            ? "/api/systems/darvas/top-performers?top=50"
            : isBollinger
              ? "/api/systems/bollinger-squeeze/top-performers?top=50"
              : isKeltner
                ? "/api/systems/keltner/top-performers?top=50"
                : isDonchian
                  ? "/api/systems/donchian/top-performers?top=50"
                  : isRsi
                    ? "/api/systems/rsi/top-performers?top=50"
                    : isMacd
                      ? "/api/systems/macd/top-performers?top=50"
                      : isTripleMa
                        ? "/api/systems/triple-ma/top-performers?top=50"
                        : "/api/systems/ma-crossover/top-performers?top=50";
        const res = await fetch(url, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setTopRows([]);
          setTopError(body.error || `Request failed (${res.status})`);
          return;
        }
        setTopRows(body.top ?? []);
      } catch (err) {
        if (cancelled) return;
        setTopRows([]);
        setTopError(err?.message || "Top performers request failed");
      } finally {
        if (!cancelled) setTopLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    topOpen,
    isMaCrossover,
    isTripleMa,
    isMacd,
    isRsi,
    isDonchian,
    isKeltner,
    isBollinger,
    isDarvas,
    isFibonacci,
  ]);

  useEffect(() => {
    if (
      !signalsOpen ||
      (!isMaCrossover &&
        !isTripleMa &&
        !isMacd &&
        !isRsi &&
        !isDonchian &&
        !isKeltner &&
        !isBollinger &&
        !isDarvas &&
        !isFibonacci)
    )
      return undefined;
    let cancelled = false;
    (async () => {
      setSignalsLoading(true);
      setSignalsError(null);
      try {
        const url = isFibonacci
          ? "/api/systems/fibonacci/yesterday-signals"
          : isDarvas
            ? "/api/systems/darvas/yesterday-signals"
            : isBollinger
              ? "/api/systems/bollinger-squeeze/yesterday-signals"
              : isKeltner
                ? "/api/systems/keltner/yesterday-signals"
                : isDonchian
                  ? "/api/systems/donchian/yesterday-signals"
                  : isRsi
                    ? "/api/systems/rsi/yesterday-signals"
                    : isMacd
                      ? "/api/systems/macd/yesterday-signals"
                      : isTripleMa
                        ? "/api/systems/triple-ma/yesterday-signals"
                        : "/api/systems/ma-crossover/yesterday-signals";
        const res = await fetch(url, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setSignalRows([]);
          setSignalsError(body.error || `Request failed (${res.status})`);
          return;
        }
        setSignalRows(body.signals ?? []);
      } catch (err) {
        if (cancelled) return;
        setSignalRows([]);
        setSignalsError(err?.message || "Yesterday signals request failed");
      } finally {
        if (!cancelled) setSignalsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    signalsOpen,
    isMaCrossover,
    isTripleMa,
    isMacd,
    isRsi,
    isDonchian,
    isKeltner,
    isBollinger,
    isDarvas,
    isFibonacci,
  ]);

  useEffect(() => {
    if (
      !dowOpen ||
      (!isMaCrossover &&
        !isTripleMa &&
        !isMacd &&
        !isRsi &&
        !isDonchian &&
        !isKeltner &&
        !isBollinger &&
        !isDarvas &&
        !isFibonacci)
    )
      return undefined;
    let cancelled = false;
    (async () => {
      setDowLoading(true);
      setDowError(null);
      try {
        const url = isFibonacci
          ? "/api/systems/fibonacci/dow"
          : isDarvas
            ? "/api/systems/darvas/dow"
            : isBollinger
              ? "/api/systems/bollinger-squeeze/dow"
              : isKeltner
                ? "/api/systems/keltner/dow"
                : isDonchian
                  ? "/api/systems/donchian/dow"
                  : isRsi
                    ? "/api/systems/rsi/dow"
                    : isMacd
                      ? "/api/systems/macd/dow"
                      : isTripleMa
                        ? "/api/systems/triple-ma/dow"
                        : "/api/systems/ma-crossover/dow";
        const res = await fetch(url, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setDowRows([]);
          setDowError(body.error || `Request failed (${res.status})`);
          return;
        }
        setDowRows(body.stocks ?? []);
      } catch (err) {
        if (cancelled) return;
        setDowRows([]);
        setDowError(err?.message || "Dow stocks request failed");
      } finally {
        if (!cancelled) setDowLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    dowOpen,
    isMaCrossover,
    isTripleMa,
    isMacd,
    isRsi,
    isDonchian,
    isKeltner,
    isBollinger,
    isDarvas,
    isFibonacci,
  ]);

  function onSubmit(e) {
    e.preventDefault();
    loadSymbol(input);
  }

  function onSelectTopRow(row) {
    loadSymbol(row.symbol);
  }

  function onSelectSignalRow(row) {
    loadSymbol(row.symbol);
  }

  function onSelectDowRow(row) {
    if (isTripleMa) {
      if (row.optFast != null) setFastInput(String(row.optFast));
      if (row.optMedium != null) setMediumInput(String(row.optMedium));
      if (row.optSlow != null) setSlowInput(String(row.optSlow));
      setMaType("sma");
    } else if (isMacd) {
      if (row.optFast != null) setFastInput(String(row.optFast));
      if (row.optSlow != null) setSlowInput(String(row.optSlow));
      if (row.optSignal != null) setSignalInput(String(row.optSignal));
    } else if (isRsi) {
      if (row.optPeriod != null) setRsiPeriodInput(String(row.optPeriod));
      if (row.optOversold != null) setOversoldInput(String(row.optOversold));
      if (row.optOverbought != null)
        setOverboughtInput(String(row.optOverbought));
    } else if (isDonchian) {
      if (row.optEntryPeriod != null)
        setEntryPeriodInput(String(row.optEntryPeriod));
      if (row.optExitPeriod != null)
        setExitPeriodInput(String(row.optExitPeriod));
    } else if (isKeltner) {
      if (row.optEmaPeriod != null) setEmaPeriodInput(String(row.optEmaPeriod));
      if (row.optAtrPeriod != null) setAtrPeriodInput(String(row.optAtrPeriod));
      if (row.optAtrMult != null) setAtrMultInput(String(row.optAtrMult));
    } else if (isBollinger) {
      if (row.optPeriod != null) setBbPeriodInput(String(row.optPeriod));
      if (row.optStdMult != null) setBbStdMultInput(String(row.optStdMult));
      if (row.optAtrPeriod != null)
        setBbAtrPeriodInput(String(row.optAtrPeriod));
      if (row.optAtrMult != null) setBbAtrMultInput(String(row.optAtrMult));
    } else if (isDarvas) {
      if (row.optHighLookback != null)
        setHighLookbackInput(String(row.optHighLookback));
      if (row.optBoxBuild != null) setBoxBuildInput(String(row.optBoxBuild));
    } else if (isFibonacci) {
      if (row.optSwingN != null) setFibSwingNInput(String(row.optSwingN));
      if (row.optEntryLevel != null)
        setFibEntryLevelInput(String(row.optEntryLevel));
      if (row.optExtensionTarget != null)
        setFibExtensionTargetInput(String(row.optExtensionTarget));
    }
    loadSymbol(row.symbol);
  }

  const asOfDate = bars.length ? bars[bars.length - 1].date : null;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar-title">Chart Settings</h1>
        <form className="sidebar-form" onSubmit={onSubmit}>
          <label className="sidebar-field">
            <span>Symbol</span>
            <SymbolAutocomplete
              value={input}
              onChange={setInput}
              onPick={loadSymbol}
              disabled={loading}
            />
          </label>
          <button type="submit" className="sidebar-load" disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        </form>

        {error ? <div className="error sidebar-error">{error}</div> : null}

        {isMaCrossover ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setProblemsOpen(true)}
              >
                Pros and Cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="MA crossover settings"
            >
              <summary className="sidebar-settings-summary">
                <span>MA settings</span>
              </summary>
              <div className="ma-controls" aria-label="MA crossover settings">
                <label className="ma-controls-field">
                  <span>Type</span>
                  <select
                    value={maType}
                    onChange={(e) =>
                      setMaType(e.target.value === "ema" ? "ema" : "sma")
                    }
                    aria-label="MA type"
                  >
                    <option value="sma">SMA</option>
                    <option value="ema">EMA</option>
                  </select>
                </label>
                <label className="ma-controls-field">
                  <span>Fast</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fastInput}
                    onChange={(e) =>
                      setFastInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Fast MA period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Slow</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={slowInput}
                    onChange={(e) =>
                      setSlowInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Slow MA period"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isTripleMa ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTripleProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Triple MA settings"
            >
              <summary className="sidebar-settings-summary">
                <span>MA settings</span>
              </summary>
              <div className="ma-controls" aria-label="Triple MA settings">
                <label className="ma-controls-field">
                  <span>Type</span>
                  <select
                    value={maType}
                    onChange={(e) =>
                      setMaType(e.target.value === "ema" ? "ema" : "sma")
                    }
                    aria-label="MA type"
                  >
                    <option value="sma">SMA</option>
                    <option value="ema">EMA</option>
                  </select>
                </label>
                <label className="ma-controls-field">
                  <span>Fast</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fastInput}
                    onChange={(e) =>
                      setFastInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Fast MA period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Medium</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mediumInput}
                    onChange={(e) =>
                      setMediumInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Medium MA period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Slow</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={slowInput}
                    onChange={(e) =>
                      setSlowInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Slow MA period"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isMacd ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setMacdProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="MACD settings"
            >
              <summary className="sidebar-settings-summary">
                <span>MACD settings</span>
              </summary>
              <div className="ma-controls" aria-label="MACD settings">
                <label className="ma-controls-field">
                  <span>Fast</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fastInput}
                    onChange={(e) =>
                      setFastInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="MACD fast period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Slow</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={slowInput}
                    onChange={(e) =>
                      setSlowInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="MACD slow period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Signal</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={signalInput}
                    onChange={(e) =>
                      setSignalInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="MACD signal period"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isRsi ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setRsiProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="RSI settings"
            >
              <summary className="sidebar-settings-summary">
                <span>RSI settings</span>
              </summary>
              <div className="ma-controls" aria-label="RSI settings">
                <label className="ma-controls-field">
                  <span>Period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rsiPeriodInput}
                    onChange={(e) =>
                      setRsiPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="RSI period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Oversold</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={oversoldInput}
                    onChange={(e) =>
                      setOversoldInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="RSI oversold level"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Overbought</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={overboughtInput}
                    onChange={(e) =>
                      setOverboughtInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="RSI overbought level"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isDonchian ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDonchianProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Donchian settings"
            >
              <summary className="sidebar-settings-summary">
                <span>Donchian settings</span>
              </summary>
              <div className="ma-controls" aria-label="Donchian settings">
                <label className="ma-controls-field">
                  <span>Entry period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={entryPeriodInput}
                    onChange={(e) =>
                      setEntryPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Donchian entry period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Exit period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={exitPeriodInput}
                    onChange={(e) =>
                      setExitPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Donchian exit period"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isKeltner ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setKeltnerProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Keltner settings"
            >
              <summary className="sidebar-settings-summary">
                <span>Keltner settings</span>
              </summary>
              <div className="ma-controls" aria-label="Keltner settings">
                <label className="ma-controls-field">
                  <span>EMA period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={emaPeriodInput}
                    onChange={(e) =>
                      setEmaPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Keltner EMA period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>ATR period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={atrPeriodInput}
                    onChange={(e) =>
                      setAtrPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Keltner ATR period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>ATR mult</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={atrMultInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setAtrMultInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Keltner ATR multiplier"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isBollinger ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setBollingerProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Bollinger settings"
            >
              <summary className="sidebar-settings-summary">
                <span>Bollinger settings</span>
              </summary>
              <div className="ma-controls" aria-label="Bollinger settings">
                <label className="ma-controls-field">
                  <span>Period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bbPeriodInput}
                    onChange={(e) =>
                      setBbPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Bollinger period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Std mult</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bbStdMultInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setBbStdMultInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Bollinger std multiplier"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>ATR period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bbAtrPeriodInput}
                    onChange={(e) =>
                      setBbAtrPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Bollinger ATR period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>ATR mult</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bbAtrMultInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setBbAtrMultInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Bollinger ATR multiplier"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isDarvas ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDarvasProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Darvas settings"
            >
              <summary className="sidebar-settings-summary">
                <span>Darvas settings</span>
                <button
                  type="button"
                  className="systems-about-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDarvasSettingsHelpOpen(true);
                  }}
                  aria-label="About Darvas settings"
                  title="About Darvas settings"
                >
                  ?
                </button>
              </summary>
              <div className="ma-controls ma-controls-in-expand">
                <label className="ma-controls-field">
                  <span>High lookback</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={highLookbackInput}
                    onChange={(e) =>
                      setHighLookbackInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Darvas high lookback"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Box build days</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={boxBuildInput}
                    onChange={(e) =>
                      setBoxBuildInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Darvas box build days"
                  />
                </label>
                <div className="ma-controls-check-row">
                  <label className="ma-controls-check">
                    <input
                      type="checkbox"
                      checked={darvasMaFilter}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setDarvasMaFilter(on);
                        if (on && !String(darvasMaPeriodInput).trim()) {
                          setDarvasMaPeriodInput("200");
                        }
                      }}
                    />
                    <span>MA trend filter</span>
                  </label>
                  <button
                    type="button"
                    className="systems-about-btn"
                    onClick={() => setDarvasMaHelpOpen(true)}
                    aria-label="About MA trend filter"
                    title="About MA trend filter"
                  >
                    ?
                  </button>
                </div>
                <label className="ma-controls-field">
                  <span>MA period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={darvasMaPeriodInput}
                    disabled={!darvasMaFilter}
                    onChange={(e) =>
                      setDarvasMaPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Darvas MA period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>MA type</span>
                  <select
                    value={darvasMaType}
                    disabled={!darvasMaFilter}
                    onChange={(e) =>
                      setDarvasMaType(e.target.value === "ema" ? "ema" : "sma")
                    }
                    aria-label="Darvas MA type"
                  >
                    <option value="sma">SMA</option>
                    <option value="ema">EMA</option>
                  </select>
                </label>
                <div className="ma-controls-check-row">
                  <label className="ma-controls-check">
                    <input
                      type="checkbox"
                      checked={darvasVolFilter}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setDarvasVolFilter(on);
                        if (on && !String(darvasVolPeriodInput).trim()) {
                          setDarvasVolPeriodInput("50");
                        }
                        if (on && !String(darvasVolMultInput).trim()) {
                          setDarvasVolMultInput("1.5");
                        }
                      }}
                    />
                    <span>Volume filter</span>
                  </label>
                  <button
                    type="button"
                    className="systems-about-btn"
                    onClick={() => setDarvasVolHelpOpen(true)}
                    aria-label="About volume filter"
                    title="About volume filter"
                  >
                    ?
                  </button>
                </div>
                <label className="ma-controls-field">
                  <span>Vol avg period</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={darvasVolPeriodInput}
                    disabled={!darvasVolFilter}
                    onChange={(e) =>
                      setDarvasVolPeriodInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Darvas volume average period"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Vol multiple</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={darvasVolMultInput}
                    disabled={!darvasVolFilter}
                    onChange={(e) =>
                      setDarvasVolMultInput(
                        e.target.value.replace(/[^\d.]/g, ""),
                      )
                    }
                    aria-label="Darvas volume multiple"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}

        {isCandlestickReversal ? (
          <details
            className="expand-panel sidebar-settings-expand"
            aria-label="Candlestick reversal settings"
          >
            <summary className="sidebar-settings-summary">
              <span>Candlestick reversal settings</span>
            </summary>
            <div
              className="ma-controls"
              aria-label="Support and resistance settings"
            >
              <div className="ma-controls-title">Support / resistance</div>
              <label className="ma-controls-field">
                <span>Swing N</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={srSwingNInput}
                  onChange={(e) =>
                    setSrSwingNInput(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label="Swing pivot lookback N"
                />
              </label>
              <label className="ma-controls-field">
                <span>ATR period</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={srAtrPeriodInput}
                  onChange={(e) =>
                    setSrAtrPeriodInput(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label="S/R ATR period"
                />
              </label>
              <label className="ma-controls-field">
                <span>ATR mult</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={srAtrMultInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.]/g, "");
                    const i = raw.indexOf(".");
                    setSrAtrMultInput(
                      i === -1
                        ? raw
                        : raw.slice(0, i + 1) +
                            raw.slice(i + 1).replace(/\./g, ""),
                    );
                  }}
                  aria-label="S/R ATR tolerance multiplier"
                />
              </label>
              <label className="ma-controls-field">
                <span>Min touches</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={srMinTouchesInput}
                  onChange={(e) =>
                    setSrMinTouchesInput(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label="Minimum pivot touches for a level"
                />
              </label>
              <label className="ma-controls-field">
                <span>Min bars</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={srMinBarsInput}
                  onChange={(e) =>
                    setSrMinBarsInput(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label="Minimum bars for an S/R segment"
                />
              </label>
            </div>
          </details>
        ) : null}

        {isFibonacci ? (
          <>
            <div className="ma-controls ma-controls-actions">
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setTopOpen(true)}
              >
                Top performers
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setSignalsOpen(true)}
              >
                Yesterday&apos;s signals
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setDowOpen(true)}
              >
                Dow 30
              </button>
              <button
                type="button"
                className="sidebar-top-performers"
                onClick={() => setFibProblemsOpen(true)}
              >
                Pros &amp; cons
              </button>
            </div>
            <details
              className="expand-panel sidebar-settings-expand"
              aria-label="Fibonacci settings"
            >
              <summary className="sidebar-settings-summary">
                <span>Fibonacci settings</span>
              </summary>
              <div
                className="ma-controls"
                aria-label="Fibonacci retracement/extension settings"
              >
                <label className="ma-controls-field">
                  <span>Swing N</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fibSwingNInput}
                    onChange={(e) =>
                      setFibSwingNInput(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Swing pivot lookback N"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Entry zone top</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fibEntryLevelInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setFibEntryLevelInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Fibonacci entry retracement level"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Extension target</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fibExtensionTargetInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setFibExtensionTargetInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Fibonacci extension target"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Min leg %</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fibMinLegPctInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setFibMinLegPctInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Fibonacci minimum leg size, percent of swing low"
                  />
                </label>
                <label className="ma-controls-field">
                  <span>Min leg ATR×</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fibMinLegAtrInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "");
                      const i = raw.indexOf(".");
                      setFibMinLegAtrInput(
                        i === -1
                          ? raw
                          : raw.slice(0, i + 1) +
                              raw.slice(i + 1).replace(/\./g, ""),
                      );
                    }}
                    aria-label="Fibonacci minimum leg size, ATR multiples"
                  />
                </label>
              </div>
            </details>
          </>
        ) : null}
      </aside>

      <main className="main-content" aria-label={system?.name ?? "TA system"}>
        {isMaCrossover ? (
          <>
            <h1 className="systems-dash-title">{system.name}</h1>
            <div className="panel">
              <MaCrossoverChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                slowPeriod={slow}
                maType={maType}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isTripleMa ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setTripleAboutOpen(true)}
                aria-label="About Triple Moving Average Alignment"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <TripleMaChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                mediumPeriod={medium}
                slowPeriod={slow}
                maType={maType}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isMacd ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setMacdAboutOpen(true)}
                aria-label="About MACD system"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <MacdChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                slowPeriod={slow}
                signalPeriod={signalPeriod}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isRsi ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setRsiAboutOpen(true)}
                aria-label="About RSI mean reversion"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <RsiChart
                data={bars}
                markers={markers}
                period={rsiPeriod}
                oversold={oversold}
                overbought={overbought}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isDonchian ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setDonchianAboutOpen(true)}
                aria-label="About Donchian Breakout"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <DonchianChart
                data={bars}
                markers={markers}
                entryPeriod={entryPeriod}
                exitPeriod={exitPeriod}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isKeltner ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setKeltnerAboutOpen(true)}
                aria-label="About Keltner Channel Trend"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <KeltnerChart
                data={bars}
                markers={markers}
                emaPeriod={emaPeriod}
                atrPeriod={atrPeriod}
                atrMult={atrMult}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isBollinger ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setBollingerAboutOpen(true)}
                aria-label="About Bollinger Band Squeeze"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <BollingerChart
                data={bars}
                markers={markers}
                period={bbPeriod}
                stdMult={bbStdMult}
                atrPeriod={bbAtrPeriod}
                atrMult={bbAtrMult}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isDarvas ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setDarvasAboutOpen(true)}
                aria-label="About Darvas Box"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <DarvasChart
                data={bars}
                markers={markers}
                highLookback={highLookback}
                boxBuild={boxBuild}
                maFilter={darvasMaFilter}
                maPeriod={darvasMaPeriod}
                maType={darvasMaType}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isCandlestickReversal ? (
          <>
            <h1 className="systems-dash-title">{system.name}</h1>
            <div className="panel">
              <CandlestickReversalChart
                data={bars}
                swingN={srSwingN}
                atrPeriod={srAtrPeriod}
                atrMult={srAtrMult}
                minTouches={srMinTouches}
                minBars={srMinBars}
                symbol={input}
                companyName={companyName}
              />
            </div>
          </>
        ) : null}

        {isFibonacci ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setFibAboutOpen(true)}
                aria-label="About Fibonacci Retracement / Extension"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <FibonacciChart
                data={bars}
                markers={markers}
                trades={trades}
                swingN={fibSwingN}
                entryLevel={fibEntryLevel}
                legOpts={fibLegOpts}
                symbol={input}
                companyName={companyName}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
            <FibonacciLegsTable
              data={bars}
              trades={trades}
              swingN={fibSwingN}
              entryLevel={fibEntryLevel}
              legOpts={fibLegOpts}
            />
          </>
        ) : null}
      </main>

      {isMaCrossover ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="MA crossover — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MA pair was chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why." +
              "Also review the 'Problems with the MA Crossover system'"
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="MA crossover — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (when the cross fired), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="MA crossover — Dow 30"
            subtitle={
              "This is a quick list of the Dow stocks.  Profit for stock is calculated of the about the last 2 years.  " +
              "One share is used to calculate the change in price."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <MaCrossoverProblemsDialog
            open={problemsOpen}
            onClose={() => setProblemsOpen(false)}
          />
        </>
      ) : null}

      {isTripleMa ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Triple MA — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MA periods were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why. " +
              "Also review the Pros & cons of Triple MA alignment."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Triple MA — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (when alignment flipped), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Triple MA — Dow 30"
            subtitle={
              "Dow stocks using optimized triple MA alignment. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <TripleMaAboutDialog
            open={tripleAboutOpen}
            onClose={() => setTripleAboutOpen(false)}
          />
          <TripleMaProblemsDialog
            open={tripleProblemsOpen}
            onClose={() => setTripleProblemsOpen(false)}
          />
        </>
      ) : null}

      {isMacd ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="MACD — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MACD periods were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="MACD — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (when MACD crossed the signal line), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="MACD — Dow 30"
            subtitle={
              "Dow stocks using optimized MACD. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <MacdProblemsDialog
            open={macdProblemsOpen}
            onClose={() => setMacdProblemsOpen(false)}
          />
          <MacdAboutDialog
            open={macdAboutOpen}
            onClose={() => setMacdAboutOpen(false)}
          />
        </>
      ) : null}

      {isRsi ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="RSI — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "RSI period and levels were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="RSI — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (when RSI crossed oversold/overbought), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="RSI — Dow 30"
            subtitle={
              "Dow stocks using optimized RSI mean reversion. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <RsiProblemsDialog
            open={rsiProblemsOpen}
            onClose={() => setRsiProblemsOpen(false)}
          />
          <RsiAboutDialog
            open={rsiAboutOpen}
            onClose={() => setRsiAboutOpen(false)}
          />
        </>
      ) : null}

      {isDonchian ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Donchian — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "Entry/exit periods were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Donchian — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (channel break), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Donchian — Dow 30"
            subtitle={
              "Dow stocks using optimized Donchian breakout. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <DonchianProblemsDialog
            open={donchianProblemsOpen}
            onClose={() => setDonchianProblemsOpen(false)}
          />
          <DonchianAboutDialog
            open={donchianAboutOpen}
            onClose={() => setDonchianAboutOpen(false)}
          />
        </>
      ) : null}

      {isKeltner ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Keltner — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "EMA/ATR periods and multiplier were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Keltner — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (band break), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Keltner — Dow 30"
            subtitle={
              "Dow stocks using optimized Keltner channels. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <KeltnerProblemsDialog
            open={keltnerProblemsOpen}
            onClose={() => setKeltnerProblemsOpen(false)}
          />
          <KeltnerAboutDialog
            open={keltnerAboutOpen}
            onClose={() => setKeltnerAboutOpen(false)}
          />
        </>
      ) : null}

      {isBollinger ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Bollinger — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "Period, std mult, ATR period and multiplier were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Bollinger — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (band break), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Bollinger — Dow 30"
            subtitle={
              "Dow stocks using optimized Bollinger squeeze settings. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <BollingerProblemsDialog
            open={bollingerProblemsOpen}
            onClose={() => setBollingerProblemsOpen(false)}
          />
          <BollingerAboutDialog
            open={bollingerAboutOpen}
            onClose={() => setBollingerAboutOpen(false)}
          />
        </>
      ) : null}

      {isDarvas ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Darvas — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "High lookback and box build days were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Darvas — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (box break), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Darvas — Dow 30"
            subtitle={
              "Dow stocks using optimized Darvas box settings. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <DarvasProblemsDialog
            open={darvasProblemsOpen}
            onClose={() => setDarvasProblemsOpen(false)}
          />
          <DarvasAboutDialog
            open={darvasAboutOpen}
            onClose={() => setDarvasAboutOpen(false)}
          />
          <DarvasVolumeFilterDialog
            open={darvasVolHelpOpen}
            onClose={() => setDarvasVolHelpOpen(false)}
          />
          <DarvasMaFilterDialog
            open={darvasMaHelpOpen}
            onClose={() => setDarvasMaHelpOpen(false)}
          />
          <DarvasSettingsDialog
            open={darvasSettingsHelpOpen}
            onClose={() => setDarvasSettingsHelpOpen(false)}
          />
        </>
      ) : null}

      {isFibonacci ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Fibonacci — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "Swing lookback, entry zone top, and extension target were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Fibonacci — yesterday's signals"
            subtitle="Entry/exit on each symbol's last session (all assets)"
            note="Close is the signal-day close (entry zone close, extension target, or stop), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Fibonacci — Dow 30"
            subtitle={
              "Dow stocks using optimized Fibonacci retracement/extension. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <FibonacciProblemsDialog
            open={fibProblemsOpen}
            onClose={() => setFibProblemsOpen(false)}
          />
          <FibonacciAboutDialog
            open={fibAboutOpen}
            onClose={() => setFibAboutOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
