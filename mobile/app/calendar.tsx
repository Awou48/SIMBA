import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, EVENT_TYPES, type EventType, type HealthEvent } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Button, Card, Empty, ErrorBox, Field, Header, Loading, Pill, Row, Screen, SectionTitle, Segmented } from "../src/components/ui";
import { fmtDate, isValidDate, toDateString } from "../src/lib/format";
import { colors, radius, spacing, type Tone } from "../src/lib/theme";

const TYPE_TONE: Record<EventType, Tone> = { Vaccination: "teal", "Doctor Visit": "primary", Checkup: "orange", Other: "muted" };

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
        setError(errorMessage(err, "Could not load events."));
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
    if (form.title.trim().length < 2) return setError("Give the event a title.");
    if (!isValidDate(form.date)) return setError("Date must be YYYY-MM-DD.");
    if (form.time && !/^\d{2}:\d{2}$/.test(form.time)) return setError("Time must be HH:MM.");
    setBusy(true);
    setError("");
    try {
      await api.createEvent(active.id, { title: form.title.trim(), event_type: form.event_type, date: form.date, time: form.time || null, notes: form.notes.trim() || null });
      setAdding(false);
      setForm({ title: "", event_type: "Checkup", date: today, time: "", notes: "" });
      load(true);
    } catch (err) {
      setError(errorMessage(err, "Could not save the event."));
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
    if (e.vaccine_code) return Alert.alert("Linked to immunization", "Undo this dose from the Immunization screen instead.");
    Alert.alert("Delete event", `Delete "${e.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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

  const EventRow = ({ e }: { e: HealthEvent }) => (
    <Card style={styles.event}>
      <Pressable onPress={() => toggleDone(e)} style={[styles.check, e.done && { backgroundColor: colors.good, borderColor: colors.good }]} accessibilityLabel="Toggle done">
        {e.done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, e.done && { textDecorationLine: "line-through", color: colors.muted }]}>{e.title}</Text>
        <Text style={styles.meta}>
          {fmtDate(e.date, { weekday: "short", day: "numeric", month: "short" })}
          {e.time ? ` · ${e.time}` : ""}
          {e.notes ? ` · ${e.notes}` : ""}
        </Text>
      </View>
      <Pill tone={TYPE_TONE[e.event_type]} small>{e.event_type}</Pill>
      <Pressable onPress={() => remove(e)} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={colors.muted} />
      </Pressable>
    </Card>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Calendar" subtitle="Visits, checkups and vaccinations" onBack={() => router.back()} right={<Button title="Add" icon="add" onPress={() => setAdding(true)} style={{ paddingVertical: 8, paddingHorizontal: 12 }} />} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <SectionTitle title={`Upcoming · ${upcoming.length}`} />
          {upcoming.length === 0 ? (
            <Card>
              <Empty title="Nothing scheduled" body="Add a doctor visit or checkup, or mark vaccine doses in Immunization." />
            </Card>
          ) : (
            upcoming.map((e) => <EventRow key={e.id} e={e} />)
          )}
          {past.length > 0 ? (
            <>
              <SectionTitle title={`Past & done · ${past.length}`} />
              {past.slice(0, 20).map((e) => <EventRow key={e.id} e={e} />)}
            </>
          ) : null}
        </>
      )}

      <Modal visible={adding} animationType="slide" onRequestClose={() => setAdding(false)}>
        <Screen edges={["top", "bottom"]}>
          <Header title="New event" onBack={() => setAdding(false)} />
          <ErrorBox message={error} />
          <Field label="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Posyandu checkup" />
          <Text style={styles.label}>Type</Text>
          <Segmented options={EVENT_TYPES.map((t) => ({ value: t, label: t === "Doctor Visit" ? "Doctor" : t }))} value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} />
          <Row style={{ gap: spacing.md, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Field label="Date" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Time (optional)" value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} placeholder="HH:MM" />
            </View>
          </Row>
          <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Bring KIA book" />
          <Button title="Save event" onPress={save} loading={busy} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  event: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  check: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
});
