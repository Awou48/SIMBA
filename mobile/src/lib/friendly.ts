import type { Tone } from "./theme";

export interface Verdict {
  emoji: string;
  headline: string;
  detail: string;
  tone: Tone;
}

export function growthVerdict(name: string, stunting: string | null | undefined, weight: string | null | undefined, wasting?: string | null): Verdict {
  const s = (stunting ?? "").toLowerCase();
  const w = (weight ?? "").toLowerCase();
  const ws = (wasting ?? "").toLowerCase();
  if (!stunting) return { emoji: "📏", headline: `Let's measure ${name}`, detail: "Add today's weight and height to see how they are growing.", tone: "muted" };
  if (s.includes("sangat pendek")) return { emoji: "💛", headline: `${name} is much shorter than expected`, detail: "Please visit Posyandu or a doctor soon. Regular check-ups and good food help a lot.", tone: "bad" };
  if (s.includes("pendek")) return { emoji: "🌱", headline: `${name} is a little short for their age`, detail: "Keep offering protein-rich meals and measure again next month.", tone: "warn" };
  if (s.includes("tinggi")) return { emoji: "🦒", headline: `${name} is tall for their age`, detail: "Great! Keep the healthy routine going.", tone: "good" };
  if (ws.includes("buruk") || ws.includes("kurang") || w.includes("sangat kurang")) return { emoji: "🍲", headline: `${name} could use more nutritious food`, detail: "Weight is low for their size. Small, frequent meals with eggs, fish or tempe help.", tone: "warn" };
  if (ws.includes("obes") || ws.includes("lebih") || w.includes("lebih")) return { emoji: "🍎", headline: `${name} is a bit above the healthy weight`, detail: "More play time and fewer sweet drinks make a big difference.", tone: "warn" };
  return { emoji: "🌟", headline: `${name} is growing well!`, detail: "Height and weight are right on track. Measure again next month to keep the curve going.", tone: "good" };
}

export function zPlain(z: number | null | undefined): string {
  if (z === null || z === undefined) return "not measured";
  if (z < -3) return "much lower than most children";
  if (z < -2) return "lower than most children";
  if (z > 3) return "much higher than most children";
  if (z > 2) return "higher than most children";
  if (z < -1) return "a little below average";
  if (z > 1) return "a little above average";
  return "about average";
}

export function nutritionVerdict(pct: number | null | undefined, loggedToday: boolean): Verdict {
  if (pct === null || pct === undefined || !loggedToday) return { emoji: "🍽️", headline: "What did they eat today?", detail: "Log a meal to see if today's food covers their needs.", tone: "muted" };
  if (pct < 50) return { emoji: "🥣", headline: "Still hungry for more", detail: "Less than half of today's energy so far. A snack with milk or fruit helps.", tone: "warn" };
  if (pct < 90) return { emoji: "🍛", headline: "Good progress today", detail: "Most of today's energy is covered. One more meal should do it.", tone: "good" };
  if (pct <= 130) return { emoji: "🎉", headline: "Today's plate is complete!", detail: "Energy needs are met. Nice work.", tone: "good" };
  return { emoji: "🍎", headline: "Plenty for today", detail: "Above the daily need — lighter meals tomorrow balance it out.", tone: "warn" };
}

export function kpspVerdict(interpretation: string | null | undefined, answered: number, total: number): Verdict {
  if (answered < total) return { emoji: "🧩", headline: `${total - answered} question${total - answered === 1 ? "" : "s"} to go`, detail: "Answer them all to see how development is going.", tone: "muted" };
  const s = (interpretation ?? "").toLowerCase();
  if (s.startsWith("sesuai")) return { emoji: "🎈", headline: "Development is on track", detail: "Everything expected for this age is there. Check again at the next age step.", tone: "good" };
  if (s.startsWith("meragukan")) return { emoji: "🧸", headline: "A couple of skills still coming", detail: "Practice the missed ones through play and re-check in two weeks.", tone: "warn" };
  return { emoji: "🩺", headline: "Worth talking to a health worker", detail: "Several skills are not there yet. A professional can help early.", tone: "bad" };
}

export function immunizationVerdict(overdue: number, due: number, nextName: string | null): Verdict {
  if (overdue > 0) return { emoji: "💉", headline: `${overdue} vaccine${overdue === 1 ? "" : "s"} overdue`, detail: "Visit Posyandu or Puskesmas to catch up — it is never too late.", tone: "bad" };
  if (due > 0) return { emoji: "📅", headline: `${due} vaccine${due === 1 ? "" : "s"} due now`, detail: nextName ? `${nextName} is due this month.` : "Time for the next dose.", tone: "warn" };
  return { emoji: "🛡️", headline: "Vaccines are up to date", detail: nextName ? `Next: ${nextName}.` : "All routine doses done.", tone: "good" };
}

export const MEAL_EMOJI: Record<string, string> = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" };
export const DOMAIN_EMOJI: Record<string, string> = { "Motorik Kasar": "🏃", "Motorik Halus": "✋", Bicara: "🗣️", "Bicara & Bahasa": "🗣️", Sosialisasi: "🤗", "Sosialisasi & Kemandirian": "🤗" };
export const CATEGORY_EMOJI: Record<string, string> = { Growth: "📏", Nutrition: "🍲", Development: "🧩", Immunization: "💉" };

export function childEmoji(gender: "male" | "female"): string {
  return gender === "female" ? "👧" : "👦";
}
