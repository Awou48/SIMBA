import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, errorMessage, type AlertItem } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Card, Empty, ErrorBox, Icon, Loading, Pill, YellowBar, toneClass } from "../components/ui";
import { CATEGORY_ICON, fmtDate, SEVERITY_LABEL, type Tone } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "teal" };
const ROUTE: Record<AlertItem["category"], string> = { Growth: "/tumbuh", Nutrition: "/makan", Development: "/kembang", Immunization: "/imunisasi" };

export function Alerts() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setRows(await api.parent.alerts(active.id));
    } catch (err) {
      setError(errorMessage(err, "Pengingat belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <YellowBar title="Pengingat" subtitle="Hal kecil yang perlu diperhatikan" onBack={() => navigate(-1)} />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon="smile" title="Semua aman!" body="Tidak ada yang perlu diperhatikan saat ini. Lanjutkan mencatat makan dan pengukuran." />
          </Card>
        ) : (
          rows.map((a) => (
            <Card key={a.id} onClick={() => navigate(ROUTE[a.category])}>
              <div className="flex items-start gap-3">
                <span className={cn("size-12 rounded-[14px] sb-outline grid place-items-center shrink-0", toneClass(SEVERITY[a.severity]))}>
                  <Icon name={CATEGORY_ICON[a.category]} size={24} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone={SEVERITY[a.severity]}>{SEVERITY_LABEL[a.severity]}</Pill>
                    <span className="text-[13px] text-[var(--muted)]">{fmtDate(a.date)}</span>
                  </div>
                  <p className="text-[16px] font-extrabold">{a.title}</p>
                  <p className="text-[14px] text-[var(--muted)] leading-5">{a.description}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </Body>
    </>
  );
}
