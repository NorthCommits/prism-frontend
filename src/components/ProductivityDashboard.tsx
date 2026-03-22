"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, useInView } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart2,
  Clock,
  Heart,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

import {
  getRecentScores,
  getScoresSummary,
  type ConversationScore,
  type ScoresSummary,
} from "@/lib/profile";

const SCORE_CATEGORY_COLORS: Record<string, string> = {
  coding: "#8b5cf6",
  writing: "#06b6d4",
  research: "#ec4899",
  analysis: "#22c55e",
  learning: "#f59e0b",
  planning: "#3b82f6",
  creative: "#f97316",
  general: "#6b7280",
};

const TOPIC_PILL_COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#22c55e"] as const;

function categoryColor(cat: string): string {
  const key = cat.toLowerCase();
  return SCORE_CATEGORY_COLORS[key] ?? "#6b7280";
}

function scoreValueClass(score: number): string {
  if (score > 7) return "text-emerald-400";
  if (score > 5) return "text-amber-400";
  return "text-red-400";
}

function formatChartDate(isoOrDay: string): string {
  const d = new Date(isoOrDay);
  if (Number.isNaN(d.getTime())) return isoOrDay;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativePast(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const day = Math.floor(h / 24);
  if (day < 14) return `${day} day${day === 1 ? "" : "s"} ago`;
  const w = Math.floor(day / 7);
  if (w < 8) return `${w} week${w === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function useAnimatedNumber(
  target: number,
  enabled: boolean,
  durationMs: number,
  decimals: number
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let start: number | null = null;
    let raf = 0;
    const from = 0;
    const to = target;

    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setValue(decimals > 0 ? Number(v.toFixed(decimals)) : Math.round(v));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs, decimals]);

  return enabled ? value : 0;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
          />
        ))}
      </div>
      <div className="h-[200px] animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"
            style={{ transitionDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/5"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

function WeeklyReportCard({ report }: { report: NonNullable<ScoresSummary["weekly_report"]> }) {
  const h =
    report.time_saved_hours ??
    Math.round((report.time_saved_minutes / 60) * 10) / 10;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 border-l-4 border-l-violet-500 bg-purple-50 p-5 shadow-[0_0_40px_rgba(139,92,246,0.08)] backdrop-blur-sm dark:border-purple-500/20 dark:bg-purple-500/5 dark:shadow-[0_0_40px_rgba(139,92,246,0.12)]">
      <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        <span className="text-violet-600 dark:text-violet-400">✦</span> This
        Week&apos;s Report
      </p>
      <p className="mb-3 text-[15px] text-gray-700 dark:text-white/80">
        {report.conversations} conversations{" "}
        <span className="text-gray-400 dark:text-white/30">·</span> Avg{" "}
        {report.avg_productivity.toFixed(1)}/10
      </p>
      <div className="space-y-2 text-sm text-gray-600 dark:text-white/60">
        <p>
          <span className="mr-1.5">⏱</span>
          {h} hours saved
        </p>
        <p>
          <span className="mr-1.5">🎯</span>
          Top category:{" "}
          <span className="capitalize text-gray-800 dark:text-white/80">
            {report.top_category}
          </span>
        </p>
        <p>
          <span className="mr-1.5">📅</span>
          Most productive:{" "}
          <span className="text-gray-800 dark:text-white/80">
            {report.best_day}
          </span>
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  label,
  subtext,
  valueDisplay,
  valueClassName = "text-gray-900 dark:text-white",
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  subtext: string;
  valueDisplay: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-black/20">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: iconBg }}
      >
        <Icon className="size-5 text-white" />
      </div>
      <p
        className={`text-[28px] font-extrabold leading-none tracking-tight ${valueClassName}`}
      >
        {valueDisplay}
      </p>
      <p className="mt-2 text-xs font-medium text-gray-600 dark:text-white/60">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/30">
        {subtext}
      </p>
    </div>
  );
}

type ChartRow = {
  dateKey: string;
  rawDate: string;
  avg_productivity: number;
  count: number;
  time_saved: number;
};

function ProductivityChart({
  data,
  gradientId,
}: {
  data: ChartRow[];
  gradientId: string;
}) {
  const { resolvedTheme } = useTheme();
  const gridStroke =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.05)" : "#e5e7eb";
  const axisLineStroke =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.1)" : "#d1d5db";

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
        Not enough data yet. Start chatting!
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="dateKey"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: axisLineStroke }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ChartRow;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-lg dark:border-white/10 dark:bg-black/80 dark:text-white">
                  <p className="mb-1 font-medium">{label}</p>
                  <p className="text-gray-600 dark:text-white/70">
                    Productivity:{" "}
                    <span className="text-violet-600 dark:text-violet-300">
                      {Number(row.avg_productivity).toFixed(1)}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-white/70">
                    Conversations:{" "}
                    <span className="text-cyan-600 dark:text-cyan-300">
                      {row.count}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-white/70">
                    Time saved:{" "}
                    <span className="text-emerald-600 dark:text-emerald-300">
                      {row.time_saved >= 60
                        ? `${(row.time_saved / 60).toFixed(1)}h`
                        : `${Math.round(row.time_saved)}m`}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="avg_productivity"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#a78bfa" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryBars({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const entries = useMemo(() => {
    const list = Object.entries(breakdown).filter(([, n]) => n > 0);
    list.sort((a, b) => b[1] - a[1]);
    const max = list.reduce((m, [, c]) => Math.max(m, c), 1);
    return list.map(([name, count]) => ({
      name,
      count,
      pct: max > 0 ? (count / max) * 100 : 0,
      color: categoryColor(name),
    }));
  }, [breakdown]);

  const [showBars, setShowBars] = useState(false);

  useEffect(() => {
    if (entries.length === 0) return;
    const id = requestAnimationFrame(() => setShowBars(true));
    return () => cancelAnimationFrame(id);
  }, [entries.length, breakdown]);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-white/40">
        No categories yet for this range.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((row, i) => (
        <div key={row.name} className="flex items-center gap-3">
          <span className="w-[120px] shrink-0 text-xs capitalize text-gray-700 dark:text-white/70">
            {row.name}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: showBars ? `${row.pct}%` : "0%",
                backgroundColor: row.color,
                transitionDelay: `${i * 0.1}s`,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-gray-500 dark:text-white/40">
            {row.count} {row.count === 1 ? "conv" : "convs"}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardEmpty({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center">
        <BarChart2 className="mb-4 size-[60px] text-violet-500/90" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your insights will appear here
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600 dark:text-white/60">
          Have a few conversations with Prism and your productivity dashboard will
          come to life. We analyze each conversation automatically.
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[2px] dark:bg-black/25">
          <span className="rounded-full border border-gray-200 bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            Coming soon
          </span>
        </div>
        {["Conversations", "Productivity", "Time saved", "Satisfaction"].map(
          (t) => (
            <div
              key={t}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 opacity-40 blur-[1px] dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="mb-2 h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
              <p className="text-xl font-bold text-gray-400 dark:text-white/50">
                —
              </p>
              <p className="text-[11px] text-gray-500 dark:text-white/40">{t}</p>
            </div>
          )
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Start Chatting →
      </button>
    </div>
  );
}

export function ProductivityDashboard({ authReady }: { authReady: boolean }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });
  const chartGradientId = useId().replace(/:/g, "");

  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [recent, setRecent] = useState<ConversationScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    Promise.all([getScoresSummary(days), getRecentScores(10)])
      .then(([s, r]) => {
        if (cancelled) return;
        setSummary(s);
        setRecent(r.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, days]);

  const chartData: ChartRow[] = useMemo(() => {
    if (!summary?.daily_scores?.length) return [];
    return summary.daily_scores.map((d) => ({
      dateKey: formatChartDate(d.date),
      rawDate: d.date,
      avg_productivity: d.avg_productivity,
      count: d.count,
      time_saved: d.time_saved,
    }));
  }, [summary]);

  const statsAnimate = inView && !!summary && !loading;
  const convAnimated = useAnimatedNumber(
    summary?.total_conversations ?? 0,
    statsAnimate,
    1000,
    0
  );
  const prodAnimated = useAnimatedNumber(
    summary?.avg_productivity ?? 0,
    statsAnimate,
    1000,
    1
  );
  const hoursAnimated = useAnimatedNumber(
    summary?.total_time_saved_hours ?? 0,
    statsAnimate,
    1000,
    1
  );
  const satAnimated = useAnimatedNumber(
    summary?.avg_satisfaction ?? 0,
    statsAnimate,
    1000,
    1
  );

  const loadFailed = !loading && summary === null;

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 space-y-6"
    >
      <div>
        <p
          className="mb-1 text-[12px] font-bold uppercase text-violet-400"
          style={{ letterSpacing: "0.15em" }}
        >
          YOUR INSIGHTS
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Productivity Dashboard
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How you&apos;re using Prism
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              days === d
                ? "border-transparent bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-white shadow-md"
                : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-white/10 dark:text-white/40 dark:hover:border-white/20 dark:hover:text-foreground"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && loadFailed && (
        <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
          Couldn&apos;t load productivity insights. Try again later.
        </p>
      )}

      {!loading && summary && summary.total_conversations === 0 && (
        <DashboardEmpty onStart={() => router.push("/")} />
      )}

      {!loading && summary && summary.total_conversations > 0 && (
        <div className="space-y-8">
          {summary.weekly_report && (
            <WeeklyReportCard report={summary.weekly_report} />
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={MessageSquare}
              iconBg="rgba(139,92,246,0.35)"
              label="Conversations"
              subtext={`Last ${summary.days} days`}
              valueDisplay={String(convAnimated)}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="rgba(34,197,94,0.35)"
              label="Productivity"
              subtext="Average score"
              valueDisplay={`${prodAnimated.toFixed(1)}/10`}
              valueClassName={scoreValueClass(summary.avg_productivity)}
            />
            <StatCard
              icon={Clock}
              iconBg="rgba(6,182,212,0.35)"
              label="Time Saved"
              subtext="Estimated total"
              valueDisplay={`${hoursAnimated.toFixed(1)}h`}
            />
            <StatCard
              icon={Heart}
              iconBg="rgba(236,72,153,0.35)"
              label="Satisfaction"
              subtext="Response quality"
              valueDisplay={`${satAnimated.toFixed(1)}/10`}
              valueClassName={scoreValueClass(summary.avg_satisfaction)}
            />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-gray-500 dark:text-white/50">
              Daily Productivity
            </p>
            <ProductivityChart data={chartData} gradientId={chartGradientId} />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-gray-500 dark:text-white/50">
              By category
            </p>
            <CategoryBars breakdown={summary.category_breakdown ?? {}} />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-gray-500 dark:text-white/50">
              Top Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {(summary.top_topics ?? []).map((t, i) => {
                const c = TOPIC_PILL_COLORS[i % TOPIC_PILL_COLORS.length];
                return (
                  <motion.span
                    key={`${t.topic}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[12px] text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white/85"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: c,
                    }}
                  >
                    {t.topic}{" "}
                    <span className="text-gray-500 dark:text-white/45">
                      ×{t.count}
                    </span>
                  </motion.span>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-gray-500 dark:text-white/50">
              Recent Activity
            </p>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 py-10 text-center dark:border-white/10">
                <BarChart2 className="size-12 text-gray-300 dark:text-white/20" />
                <p className="max-w-xs text-sm text-gray-500 dark:text-white/45">
                  No activity yet. Start chatting to see your productivity
                  insights!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      router.push(`/?conversation=${item.conversation_id}`)
                    }
                    className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-violet-500/30 dark:hover:bg-white/5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                        style={{
                          background: `${categoryColor(item.category)}22`,
                          color: categoryColor(item.category),
                          border: `1px solid ${categoryColor(item.category)}44`,
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-white/60">
                      {item.summary || "Conversation"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] text-cyan-600 dark:text-cyan-400/90">
                      <span>
                        🕐 {item.time_saved_minutes} min saved
                      </span>
                      <span className="text-gray-300 dark:text-white/25">·</span>
                      <span>
                        Productivity: {item.productivity_score}/10
                      </span>
                    </div>
                    <p className="mt-1 text-right text-[10px] text-gray-400 dark:text-white/35">
                      {formatRelativePast(item.scored_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
