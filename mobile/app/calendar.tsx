import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, EVENT_TYPES, type EventType, type HealthEvent } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Bounce, Button, Card, Chips, DateField, Empty, ErrorBox, Field, Icon, Loading, Pill, Row, Screen, SectionTitle, YellowBar } from "../src/components/ui";
import { fmtDate, parseDate, toDateString } from "../src/lib/format";
import { EVENT_ICON, EVENT_LABEL } from "../src/lib/friendly";
import { colors, font, INK_BORDER, spacing, tones, type Tone } from "../src/lib/theme";

const TYPE_TONE: Record<EventType, Tone> = { Vaccination: "teal", "Doctor Visit": "violet", Checkup: "yellow", Other: "muted" };
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

export default function Calendar() {
  const { active } = useChildren();
  const router = useRouter();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", event_type: "Checkup" as EventType, date: toDateString(new Date()), time: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setEvents(await api.listEvents(active.id));
      } catch (err) {
        setError(errorMessage(err, "Kalender belum bisa dimuat."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [active],
  );

  useEffect(() => {
    load();
  }, [load]);

  const today = toDateString(new Date());
  const upcoming = events.filter((e) => !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.done || e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const save = async () => {
    if (!active) return;
    if (form.title.trim().length < 2) return setError("Tulis nama kegiatannya dulu.");
    if (form.time && !/^\d{2}[:.]\d{2}$/.test(form.time)) return setError("Jam ditulis seperti 08.00.");
    setBusy(true);
    setError("");
    try {
      await api.createEvent(active.id, { title: form.title.trim(), event_type: form.event_type, date: form.date, time: form.time ? form.time.replace(".", ":") : null, notes: form.notes.trim() || null });
      setAdding(false);
      setForm({ title: "", event_type: "Checkup", date: today, time: "", notes: "" });
      load(true);
    } catch (err) {
      setError(errorMessage(err, "Kegiatan belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (e: HealthEvent) => {
    if (!active) return;
    try {
      const saved = await api.updateEvent(active.id, e.id, { done: !e.done });
      setEvents((p) => p.map((x) => (x.id === saved.id ? saved : x)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = (e: HealthEvent) => {
    if (!active) return;
    if (e.vaccine_code) return Alert.alert("Terhubung ke imunisasi", "Batalkan dosis ini dari halaman Imunisasi.");
    Alert.alert("Hapus kegiatan?", e.title, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteEvent(active.id, e.id);
            setEvents((p) => p.filter((x) => x.id !== e.id));
          } catch (err) {
            setError(errorMessage(err));
          }
        },
      },
    ]);
  };

  const EventRow = ({ e }: { e: HealthEvent }) => {
    const d = parseDate(e.date);
    const tone = TYPE_TONE[e.event_type];
    return (
      <Card pad={spacing.md}>
        <Row style={{ gap: spacing.md }}>
          <Bounce onPress={() => toggleDone(e)} accessibilityLabel="Tandai selesai">
            <View style={[styles.dateBox, { backgroundColor: e.done ? colors.green : tones[tone].bg }]}>
              {e.done ? (
                <Icon name="checkmark" size={26} color={colors.white} />
              ) : (
                <>
                  <Text style={styles.dateDay}>{d.getDate()}</Text>
                  <Text style={styles.dateMonth}>{MONTHS[d.getMonth()]}</Text>
                </>
              )}
            </View>
          </Bounce>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, e.done && { textDecorationLine: "line-through", color: colors.muted }]}>{e.title}</Text>
            <Text style={styles.meta}>
              {fmtDate(e.date, "day")}
              {e.time ? ` · ${e.time.replace(":", ".")}` : ""}
              {e.notes ? ` · ${e.notes}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Pill tone={tone}>{EVENT_LABEL[e.event_type]}</Pill>
            <Bounce onPress={() => remove(e)} hitSlop={8} haptic={false} accessibilityLabel="Hapus">
              <Icon name="close" size={18} color={colors.muted} />
            </Bounce>
          </View>
        </Row>
      </Card>
    );
  };

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Kalender" subtitle="Posyandu, dokter, imunisasi" onBack={() => router.back()} right={<Button title="Tambah" icon="add" variant="white" small onPress={() => setAdding(true)} />} />
      <View style={styles.body}>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <SectionTitle title="Akan datang" />
            {upcoming.length === 0 ? (
              <Card>
                <Empty icon="calendar-outline" title="Belum ada jadwal" body="Tambahkan jadwal Posyandu atau kunjungan dokter agar tidak terlewat." />
              </Card>
            ) : (
              upcoming.map((e) => <EventRow key={e.id} e={e} />)
            )}
            {past.length > 0 ? (
              <>
                <SectionTitle title="Selesai & lampau" />
                {past.slice(0, 20).map((e) => <EventRow key={e.id} e={e} />)}
              </>
            ) : null}
            <Text style={styles.hint}>Ketuk kotak tanggal untuk menandai selesai.</Text>
          </>
        )}
      </View>

      <Modal visible={adding} animationType="slide" onRequestClose={() => setAdding(false)}>
        <Screen padded={false} edges={["top", "bottom"]}>
          <YellowBar title="Jadwal baru" onBack={() => setAdding(false)} />
          <View style={styles.body}>
            <ErrorBox message={error} />
            <Card>
              <Field label="Kegiatan" icon="create-outline" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Contoh: Penimbangan Posyandu" />
              <Text style={styles.label}>Jenis</Text>
              <Chips options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABEL[t], icon: EVENT_ICON[t] }))} value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} />
              <DateField label="Tanggal" value={form.date} onChange={(v) => setForm({ ...form, date: v })} maxToday={false} />
              <Field label="Jam (boleh dikosongkan)" icon="time-outline" value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} placeholder="08.00" keyboardType="numbers-and-punctuation" />
              <Field label="Catatan (boleh dikosongkan)" icon="document-text-outline" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Bawa buku KIA" />
            </Card>
            <Button title="Simpan" icon="checkmark" onPress={save} loading={busy} />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  dateBox: { width: 56, height: 60, borderRadius: 14, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  dateDay: { fontFamily: font.display, fontSize: 22, color: colors.ink, lineHeight: 26 },
  dateMonth: { fontFamily: font.extra, fontSize: 12, color: colors.ink },
  title: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  label: { fontFamily: font.extra, fontSize: 14, color: colors.ink, marginBottom: 6 },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
});
