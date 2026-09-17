import type { Tone } from "./theme";

export interface Verdict {
  icon: string;
  headline: string;
  detail: string;
  tone: Tone;
}

export function growthVerdict(name: string, stunting: string | null | undefined, weight: string | null | undefined, wasting?: string | null): Verdict {
  const s = (stunting ?? "").toLowerCase();
  const w = (weight ?? "").toLowerCase();
  const ws = (wasting ?? "").toLowerCase();
  if (!stunting) return { icon: "resize-outline", headline: `Yuk, ukur ${name}`, detail: "Masukkan berat dan tinggi hari ini untuk melihat pertumbuhannya.", tone: "muted" };
  if (s.includes("sangat pendek")) return { icon: "medkit-outline", headline: `${name} jauh lebih pendek dari seusianya`, detail: "Segera periksa ke Posyandu atau dokter. Pemeriksaan rutin dan makanan bergizi sangat membantu.", tone: "bad" };
  if (s.includes("pendek")) return { icon: "leaf-outline", headline: `${name} sedikit lebih pendek dari seusianya`, detail: "Beri makanan kaya protein setiap hari dan ukur lagi bulan depan.", tone: "warn" };
  if (s.includes("tinggi")) return { icon: "trending-up-outline", headline: `${name} tinggi untuk usianya`, detail: "Bagus! Lanjutkan pola makan dan kebiasaan sehatnya.", tone: "good" };
  if (ws.includes("buruk") || ws.includes("kurang") || w.includes("sangat kurang")) return { icon: "restaurant-outline", headline: `${name} perlu makanan yang lebih bergizi`, detail: "Berat badannya kurang untuk tinggi badannya. Makan sedikit tapi sering, dengan telur, ikan, atau tempe.", tone: "warn" };
  if (ws.includes("obes") || ws.includes("lebih") || w.includes("lebih")) return { icon: "nutrition-outline", headline: `${name} sedikit di atas berat sehat`, detail: "Perbanyak waktu bermain aktif dan kurangi minuman manis.", tone: "warn" };
  return { icon: "sunny-outline", headline: `${name} tumbuh dengan baik!`, detail: "Berat dan tinggi badannya sesuai usia. Ukur lagi bulan depan, ya.", tone: "good" };
}

export function zPlain(z: number | null | undefined): string {
  if (z === null || z === undefined) return "belum diukur";
  if (z < -3) return "jauh di bawah rata-rata";
  if (z < -2) return "di bawah rata-rata";
  if (z > 3) return "jauh di atas rata-rata";
  if (z > 2) return "di atas rata-rata";
  if (z < -1) return "sedikit di bawah rata-rata";
  if (z > 1) return "sedikit di atas rata-rata";
  return "sesuai rata-rata";
}

export function nutritionVerdict(pct: number | null | undefined, logged: boolean): Verdict {
  if (pct === null || pct === undefined || !logged) return { icon: "restaurant-outline", headline: "Apa yang dimakan hari ini?", detail: "Catat makanan untuk melihat apakah kebutuhan hariannya sudah tercukupi.", tone: "muted" };
  if (pct < 50) return { icon: "cafe-outline", headline: "Masih perlu makan lagi", detail: "Energi hari ini belum sampai setengah. Tambah camilan seperti susu atau buah.", tone: "warn" };
  if (pct < 90) return { icon: "restaurant-outline", headline: "Sudah bagus, sedikit lagi", detail: "Sebagian besar kebutuhan energi sudah tercukupi. Satu kali makan lagi cukup.", tone: "good" };
  if (pct <= 130) return { icon: "happy-outline", headline: "Kebutuhan hari ini tercukupi!", detail: "Energi harian sudah terpenuhi. Kerja bagus.", tone: "good" };
  return { icon: "nutrition-outline", headline: "Sudah lebih dari cukup", detail: "Di atas kebutuhan harian. Besok porsinya bisa sedikit lebih ringan.", tone: "warn" };
}

export function kpspVerdict(interpretation: string | null | undefined, answered: number, total: number): Verdict {
  if (answered < total) return { icon: "extension-puzzle-outline", headline: `${total - answered} pertanyaan lagi`, detail: "Jawab semuanya untuk melihat hasil perkembangannya.", tone: "muted" };
  const s = (interpretation ?? "").toLowerCase();
  if (s.startsWith("sesuai")) return { icon: "balloon-outline", headline: "Perkembangan sesuai usia", detail: "Semua kemampuan yang diharapkan sudah ada. Cek lagi di tahap usia berikutnya.", tone: "good" };
  if (s.startsWith("meragukan")) return { icon: "game-controller-outline", headline: "Beberapa kemampuan masih berkembang", detail: "Latih sambil bermain dan cek lagi dua minggu ke depan.", tone: "warn" };
  return { icon: "medkit-outline", headline: "Sebaiknya konsultasi ke petugas kesehatan", detail: "Beberapa kemampuan belum muncul. Bantuan lebih awal lebih baik.", tone: "bad" };
}

export function immunizationVerdict(overdue: number, due: number, nextName: string | null): Verdict {
  if (overdue > 0) return { icon: "medical-outline", headline: `${overdue} imunisasi terlambat`, detail: "Datang ke Posyandu atau Puskesmas untuk mengejar. Tidak ada kata terlambat.", tone: "bad" };
  if (due > 0) return { icon: "calendar-outline", headline: `${due} imunisasi saatnya diberikan`, detail: nextName ? `${nextName} dijadwalkan bulan ini.` : "Saatnya dosis berikutnya.", tone: "warn" };
  return { icon: "shield-checkmark-outline", headline: "Imunisasi lengkap sesuai jadwal", detail: nextName ? `Berikutnya: ${nextName}.` : "Semua dosis rutin sudah diberikan.", tone: "good" };
}

export const MEAL_LABEL: Record<string, string> = { Breakfast: "Sarapan", Lunch: "Makan siang", Dinner: "Makan malam", Snack: "Camilan" };
export const MEAL_ICON: Record<string, string> = { Breakfast: "sunny-outline", Lunch: "partly-sunny-outline", Dinner: "moon-outline", Snack: "ice-cream-outline" };
export const DOMAIN_LABEL: Record<string, string> = { "Motorik Kasar": "Gerak tubuh", "Motorik Halus": "Gerak tangan", Bicara: "Bicara", "Bicara & Bahasa": "Bicara & bahasa", Sosialisasi: "Bergaul", "Sosialisasi & Kemandirian": "Bergaul & mandiri" };
export const DOMAIN_ICON: Record<string, string> = { "Motorik Kasar": "walk-outline", "Motorik Halus": "hand-left-outline", Bicara: "chatbubble-ellipses-outline", "Bicara & Bahasa": "chatbubble-ellipses-outline", Sosialisasi: "people-outline", "Sosialisasi & Kemandirian": "people-outline" };
export const CATEGORY_LABEL: Record<string, string> = { Growth: "Pertumbuhan", Nutrition: "Makan", Development: "Perkembangan", Immunization: "Imunisasi" };
export const CATEGORY_ICON: Record<string, string> = { Growth: "resize-outline", Nutrition: "restaurant-outline", Development: "extension-puzzle-outline", Immunization: "medical-outline" };
export const SEVERITY_LABEL: Record<string, string> = { high: "Penting", medium: "Perlu dilihat", low: "Tips" };
export const EVENT_LABEL: Record<string, string> = { Vaccination: "Imunisasi", "Doctor Visit": "Dokter", Checkup: "Pemeriksaan", Other: "Lainnya" };
export const EVENT_ICON: Record<string, string> = { Vaccination: "medical-outline", "Doctor Visit": "medkit-outline", Checkup: "clipboard-outline", Other: "bookmark-outline" };
