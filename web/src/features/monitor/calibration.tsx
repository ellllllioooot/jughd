interface Props {
  personPresent: boolean;
  hasBaseline: boolean;
  busy: boolean;
  error: string | null;
  onCalibrate: () => void;
}

/** Calibration flow (T023): correct-sitting prompt, person-detected gate. */
export function CalibrationPanel({ personPresent, hasBaseline, busy, error, onCalibrate }: Props) {
  return (
    <section className="stack card">
      <h2>{hasBaseline ? "بازمحاسبه وضعیت اولیه" : "محاسبه وضعیت اولیه"}</h2>
      <p>
        لطفاً صاف و در وضعیت راحت بنشینید، شانه‌ها را رها نگه دارید و مستقیم به دوربین نگاه کنید.
      </p>
      {!personPresent ? (
        <p className="field-error">
          شخصی در تصویر دیده نشد. لطفاً جلوی دوربین بنشینید تا محاسبه فعال شود.
        </p>
      ) : (
        <p style={{ color: "var(--color-ok)" }}>شخص شناسایی شد — آماده محاسبه.</p>
      )}
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary" disabled={!personPresent || busy} onClick={onCalibrate}>
        {busy ? "در حال محاسبه…" : hasBaseline ? "محاسبه دوباره" : "محاسبه و شروع مانیتورینگ"}
      </button>
    </section>
  );
}
