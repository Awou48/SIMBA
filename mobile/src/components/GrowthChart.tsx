import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { GrowthStandardPoint } from "../lib/api";
import { colors, font } from "../lib/theme";

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

const PAD = { top: 12, right: 14, bottom: 28, left: 40 };

export function GrowthChart({ standards, points, unit, height = 230 }: Props) {
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
          <Path d={band("p3", "p97")} fill={colors.greenSoft} stroke={colors.ink} strokeWidth={1.5} strokeDasharray="4 4" />
          <Path d={band("p15", "p85")} fill="#B9EBCF" />
          {yTicks.map((v) => (
            <Line key={`y${v}`} x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={colors.track} strokeWidth={1} />
          ))}
          <Path d={path("p50")} stroke={colors.green} strokeWidth={2.5} fill="none" />
          {childPath ? <Path d={childPath} stroke={colors.coral} strokeWidth={3} fill="none" strokeLinejoin="round" /> : null}
          {points.map((p, i) => (
            <Circle key={i} cx={x(p.ageMonths)} cy={y(p.value)} r={i === points.length - 1 ? 8 : 6} fill={i === points.length - 1 ? colors.yellow : colors.coral} stroke={colors.ink} strokeWidth={2} />
          ))}
          {xTicks.map((t) => (
            <SvgText key={`xt${t}`} x={x(t)} y={height - 8} fontSize={12} fontFamily={font.bold} fill={colors.muted} textAnchor="middle">
              {t}
            </SvgText>
          ))}
          {yTicks.map((v) => (
            <SvgText key={`yt${v}`} x={PAD.left - 6} y={y(v) + 4} fontSize={12} fontFamily={font.bold} fill={colors.muted} textAnchor="end">
              {v}
            </SvgText>
          ))}
        </Svg>
      )}
      <View style={styles.legend}>
        <LegendItem color="#B9EBCF" label="Rentang sehat" block />
        <LegendItem color={colors.green} label="Rata-rata anak" />
        <LegendItem color={colors.coral} label={`Anak Anda (${unit})`} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, block }: { color: string; label: string; block?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }, block ? { height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink } : null]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 16, height: 4, borderRadius: 2 },
  legendText: { fontSize: 13, color: colors.muted, fontFamily: font.bold },
});
