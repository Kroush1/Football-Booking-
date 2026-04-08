import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE, publicApi } from "../api";
import { dateRange } from "../utils";
import Toast from "../components/Toast";

const socket = io(API_BASE, { autoConnect: true });

function formatTimeLabel(time24) {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return time24;
  const [h, m] = time24.split(":").map(Number);

  let period = "الليل";
  if (h >= 3 && h <= 5) {
    period = "الفجر";
  } else if (h >= 6 && h <= 11) {
    period = "الصباح";
  } else if (h >= 12 && h <= 17) {
    period = "العصر";
  } else {
    period = "الليل";
  }

  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatArabicDateOption(date) {
  const day = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("ar-EG", {
    weekday: "long",
    timeZone: "UTC",
  });
  return `${date} (${day})`;
}

function sortSlotsForDisplay(slotList) {
  return [...slotList].sort((a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    const aMinutes = (ah === 0 ? 24 : ah) * 60 + am;
    const bMinutes = (bh === 0 ? 24 : bh) * 60 + bm;
    return aMinutes - bMinutes;
  });
}

export default function BookingPage() {
  const [config, setConfig] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const dates = useMemo(() => {
    if (!config) return [];
    return dateRange(config.startDate, config.endDate);
  }, [config]);

  useEffect(() => {
    loadConfig();
    const refresh = () => {
      loadConfig();
      if (selectedDate) loadSlots(selectedDate);
    };
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    socket.on("booking:deleted", refresh);
    socket.on("config:updated", refresh);
    return () => {
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
      socket.off("booking:deleted", refresh);
      socket.off("config:updated", refresh);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
      setSelectedTime("");
    }
  }, [selectedDate]);

  async function loadConfig() {
    try {
      setLoadingConfig(true);
      const res = await publicApi.get("/config");
      setConfig(res.data);
    } catch (_e) {
      setToast({ type: "error", message: "فشل في تحميل الإعدادات" });
    } finally {
      setLoadingConfig(false);
    }
  }

  async function loadSlots(date) {
    try {
      setLoadingSlots(true);
      const res = await publicApi.get(`/slots?date=${date}`);
      setSlots(sortSlotsForDisplay(res.data.slots || []));
    } catch (_e) {
      setToast({ type: "error", message: "فشل في تحميل المواعيد المتاحة" });
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submitBooking(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "الاسم مطلوب";
    if (!phone.trim()) {
      nextErrors.phone = "رقم الهاتف مطلوب";
    } else if (!/^[0-9+\-\s]{7,20}$/.test(phone.trim())) {
      nextErrors.phone = "يرجى إدخال رقم هاتف صحيح";
    }
    if (!selectedDate) nextErrors.date = "التاريخ مطلوب";
    if (!selectedTime) nextErrors.time = "يرجى اختيار موعد";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setToast({ type: "error", message: "يرجى تصحيح الحقول المطلوبة" });
      return;
    }

    setErrors({});
    try {
      setSubmitting(true);
      await publicApi.post("/book", {
        name: name.trim(),
        phone: phone.trim(),
        date: selectedDate,
        time: selectedTime,
      });
      setToast({ type: "success", message: "تم تأكيد الحجز بنجاح" });
      setName("");
      setPhone("");
      setSelectedTime("");
      await loadSlots(selectedDate);
    } catch (error) {
      const message = error.response?.data?.message || "فشل في عملية الحجز";
      setToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page booking-page" dir="rtl">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="card booking-card">
        <div className="booking-header">
          <img className="booking-logo" src="/logo.png" alt="Kafr-Jalabta football field logo" />
          <h1>حجز ملعب كفر الجلابطة</h1>
        </div>
        {loadingConfig ? (
          <p>جاري تحميل الإعدادات...</p>
        ) : (
          <>
            <label>التاريخ *</label>
            <div className={`input-wrap ${errors.date ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">
                📅
              </span>
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                {dates.map((date) => (
                  <option key={date} value={date}>
                    {formatArabicDateOption(date)}
                  </option>
                ))}
              </select>
            </div>
            {errors.date && <p className="field-error">{errors.date}</p>}

            <div className="slots">
              <p>المواعيد المتاحة</p>
              {loadingSlots ? (
                <span>جاري تحميل المواعيد...</span>
              ) : slots.length === 0 ? (
                <span>لا توجد مواعيد متاحة</span>
              ) : (
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={selectedTime === slot ? "slot active" : "slot"}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {formatTimeLabel(slot)}
                    </button>
                  ))}
                </div>
              )}
              {errors.time && <p className="field-error">{errors.time}</p>}
            </div>

            <form onSubmit={submitBooking} className="form">
              <label>الاسم *</label>
              <div className={`input-wrap ${errors.name ? "has-error" : ""}`}>
                <span className="input-icon" aria-hidden="true">
                  👤
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ادخل الاسم بالكامل"
                  required
                />
              </div>
              {errors.name && <p className="field-error">{errors.name}</p>}

              <label>رقم الهاتف *</label>
              <div className={`input-wrap ${errors.phone ? "has-error" : ""}`}>
                <span className="input-icon" aria-hidden="true">
                  📞
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 0791234567"
                  required
                />
              </div>
              {errors.phone && <p className="field-error">{errors.phone}</p>}

              <button type="submit" className="book-btn" disabled={submitting || !selectedTime}>
                {submitting ? "جاري الحجز..." : "احجز الآن"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
