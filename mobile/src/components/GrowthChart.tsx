import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { GrowthStandardPoint } from "../lib/api";
import { colors } from "../lib/theme";

export interface ChartPoint {
  ageMonths: number;
  value: number;
  label: string;
}

interface Props {
  standards: GrowthStandardPoint[];
  points: ChartPoint[];
  unit: string;
  height?: number;
}

const PAD = { top: 12, right: 14, bottom: 26, left: 38 };

export function GrowthChart({ standards, points, unit, height = 240 }: Props) {
  const [width, setWidth] = useState(0);
  if (!standards.length) return null;

  const maxAgeData = Math.max(12, ...points.map((p) => p.ageMonths));
  const maxAge = Math.min(60, Math.max(24, Math.ceil((maxAgeData + 3) / 6) * 6));
  const curve = standards.filter((s) => s.age_months <= maxAge);
  const ys = [...curve.map((s) => s.p3), ...curve.map((s) => s.p97), ...points.map((p) => p.value)];
  const yMin = Math.floor(Math.min(...ys) * 0.95);
  const yMax = Math.ceil(Math.max(...ys) * 1.04);

  const w = width - PAD.left - PAD.right;
  const h = height - PAD.top - PAD.bottom;
  const x = (age: number) => PAD.left + (age / maxAge) * w;
  const y = (v: number) => PAD.top + h - ((v - yMin) / (yMax - yMin)) * h;
  const path = (key: keyof GrowthStandardPoint) => curve.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.age_months).toFixed(1)},${y(s[key]).toFixed(1)}`).join(" ");
  const band = (lo: keyof GrowthStandardPoint, hi: keyof GrowthStandardPoint) => {
    const up = curve.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.age_months).toFixed(1)},${y(s[hi]).toFixed(1)}`).join(" ");
    const down = [...curve].reverse().map((s) => `L${x(s.age_months).toFixed(1)},${y(s[lo]).toFixed(1)}`).join(" ");
    return `${up} ${down} Z`;
  };

  const xTicks = Array.from({ length: maxAge / 6 + 1 }, (_, i) => i * 6);
  const yStep = yMax - yMin > 40 ? 10 : yMax - yMin > 16 ? 4 : 2;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);
  const childPath = points.length > 1 ? points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.ageMonths).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ") : "";

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path d={band("p3", "p97")} fill={colors.tealSoft} />
          <Path d={band("p15", "p85")} fill="#cdeeec" />
          {yTicks.map((v) => (
            <Line key={`y${v}`} x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="#e4e7f2" strokeWidth={1} />
          ))}
          {(["p3", "p97"] as const).map((k) => (
            <Path key={k} d={path(k)} stroke="#9ad7d3" strokeWidth={1} fill="none" strokeDasharray="4 4" />
          ))}
          <Path d={path("p50")} stroke={colors.teal} strokeWidth={2} fill="none" />
          {childPath ? <Path d={childPath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" /> : null}
          {points.map((p, i) => (
            <Circle key={i} cx={x(p.ageMonths)} cy={y(p.value)} r={i === points.length - 1 ? 6 : 4} fill={i === points.length - 1 ? colors.orange : colors.primary} stroke={colors.white} strokeWidth={2} />
          ))}
          {xTicks.map((t) => (
            <SvgText key={`xt${t}`} x={x(t)} y={height - 8} fontSize={10} fill={colors.muted} textAnchor="middle">
              {t}
            </SvgText>
          ))}
          {yTicks.map((v) => (
            <SvgText key={`yt${v}`} x={PAD.left - 6} y={y(v) + 3} fontSize={10} fill={colors.muted} textAnchor="end">
              {v}
            </SvgText>
          ))}
        </Svg>
      )}
      <View style={styles.legend}>
        <LegendItem color={colors.teal} label="WHO median" />
        <LegendItem color="#cdeeec" label="15th–85th" block />
        <LegendItem color={colors.tealSoft} label="3rd–97th" block />
        <LegendItem color={colors.primary} label="Your child" />
        <Text style={styles.legendText}>· {unit} by age in months</Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label, block }: { color: string; label: string; block?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }, block ? { height: 10, borderRadius: 2 } : null]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11, color: colors.muted },
});
