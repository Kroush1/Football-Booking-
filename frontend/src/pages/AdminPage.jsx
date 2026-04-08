import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE, adminApi, publicApi } from "../api";
import Toast from "../components/Toast";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const socket = io(API_BASE, { autoConnect: true });

function toBasicToken(username, password) {
  return btoa(`${username}:${password}`);
}

function formatTimeLabel(time24) {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return time24;
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12} ${suffix}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function parseTimeToken(token) {
  const value = String(token || "").trim().toUpperCase().replace(/\./g, "");
  if (!value) return null;

  const ampmMatch = value.match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || "0");
    const meridiem = ampmMatch[3];
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (minute !== 0) return null; // Keep only full-hour slots.
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  // Accept existing 24h format for convenience.
  const hhmm = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (hhmm) {
    if (Number(hhmm[2]) !== 0) return null; // Keep only full-hour slots.
    return `${hhmm[1]}:${hhmm[2]}`;
  }

  return null;
}

function parseTimeList(input) {
  return (input || "")
    .split(",")
    .map((item) => parseTimeToken(item))
    .filter(Boolean);
}

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(Boolean(localStorage.getItem("admin_basic_auth")));
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [config, setConfig] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isAuth) {
      loadData();
    }
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth) return;
    const refresh = () => loadData();
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
  }, [isAuth]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      uniqueDays: new Set(bookings.map((b) => b.date)).size,
    };
  }, [bookings]);

  const allowedTimes = useMemo(() => {
    if (!config?.availableSlots) return [];
    const unique = new Set(config.availableSlots || []);
    return [...unique].sort();
  }, [config]);

  async function loadData() {
    try {
      setLoading(true);
      const [configRes, bookingsRes] = await Promise.all([
        publicApi.get("/config"),
        adminApi.get("/bookings"),
      ]);
      setConfig({
        ...configRes.data,
        slotsText: (configRes.data.availableSlots || []).map(formatTimeLabel).join(", "),
      });
      setBookings(bookingsRes.data);
    } catch (_e) {
      setToast({ type: "error", message: "Failed to load admin data" });
      setIsAuth(false);
      localStorage.removeItem("admin_basic_auth");
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    const token = toBasicToken(credentials.username, credentials.password);
    localStorage.setItem("admin_basic_auth", token);
    try {
      await adminApi.post("/auth/login");
      setIsAuth(true);
      setToast({ type: "success", message: "Logged in" });
    } catch (_e) {
      localStorage.removeItem("admin_basic_auth");
      setToast({ type: "error", message: "Invalid credentials" });
    }
  }

  async function updateConfig(e) {
    e.preventDefault();
    try {
      const slots = parseTimeList(config.slotsText);
      await adminApi.put("/config", {
        startDate: config.startDate,
        endDate: config.endDate,
        availableSlots: slots,
        slotsByDay: config.slotsByDay || {},
      });
      setToast({ type: "success", message: "Configuration updated" });
      loadData();
    } catch (error) {
      setToast({ type: "error", message: error.response?.data?.message || "Config update failed" });
    }
  }

  function setDaySlots(day, value) {
    const slots = parseTimeList(value);
    setConfig((prev) => ({
      ...prev,
      slotsByDay: { ...(prev.slotsByDay || {}), [day]: slots },
    }));
  }

  async function deleteBooking(id) {
    const confirmed = window.confirm("Are you sure you want to delete this booking?");
    if (!confirmed) return;
    try {
      await adminApi.delete(`/booking/${id}`);
      setToast({ type: "success", message: "Booking deleted" });
      loadData();
    } catch (_e) {
      setToast({ type: "error", message: "Delete failed" });
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await adminApi.put(`/booking/${editing._id}`, editing);
      setToast({ type: "success", message: "Booking updated" });
      setEditing(null);
      loadData();
    } catch (error) {
      setToast({ type: "error", message: error.response?.data?.message || "Update failed" });
    }
  }

  if (!isAuth) {
    return (
      <div className="page">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <div className="card">
          <h1>Admin Login</h1>
          <form onSubmit={login} className="form">
            <label>Username</label>
            <input
              value={credentials.username}
              onChange={(e) => setCredentials((p) => ({ ...p, username: e.target.value }))}
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="card wide admin-card">
        <div className="admin-header">
          <div className="admin-title">
            <img className="admin-logo" src="/logo.png" alt="Kafr-Jalabta football field logo" />
            <h1>Admin Dashboard</h1>
          </div>
          <a className="export-btn" href={`${API_BASE}/export`} target="_blank" rel="noreferrer">
            Export CSV
          </a>
        </div>
        {loading || !config ? (
          <p>Loading...</p>
        ) : (
          <>
            <section className="admin-section">
              <h2 className="section-title">Configuration</h2>
              <form onSubmit={updateConfig} className="form admin-form">
                <div className="date-grid">
                  <div>
                    <label>📅 Start Date</label>
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>📅 End Date</label>
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label>⏰ Default Slots (comma separated)</label>
                  <input
                    value={config.slotsText}
                    onChange={(e) => setConfig((p) => ({ ...p, slotsText: e.target.value }))}
                    placeholder="e.g. 9 AM, 3 PM, 4 PM"
                  />
                </div>

                <h3 className="subsection-title">Slots Per Day (optional)</h3>
                <div className="day-slots-grid">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="day-slot-item">
                      <label>⚙️ {day}</label>
                      <input
                        value={(config.slotsByDay?.[day] || []).map(formatTimeLabel).join(", ")}
                        onChange={(e) => setDaySlots(day, e.target.value)}
                        placeholder="e.g. 9 AM, 11 AM, 2 PM"
                      />
                    </div>
                  ))}
                </div>
                <button type="submit" className="save-config-btn">
                  Save Configuration
                </button>
              </form>
            </section>

            <div className="stats admin-stats">
              <div>
                <strong>Total bookings</strong>
                <p>{stats.total}</p>
              </div>
              <div>
                <strong>Booked days</strong>
                <p>{stats.uniqueDays}</p>
              </div>
            </div>

            <section className="admin-section">
              <h2 className="section-title">Bookings</h2>
              {bookings.length === 0 ? (
                <div className="empty-state">No bookings yet. New bookings will appear here.</div>
              ) : (
                <div className="table-wrap admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>{booking.name}</td>
                          <td>{booking.phone}</td>
                          <td>{booking.date}</td>
                          <td className="center-cell">{formatTimeLabel(booking.time)}</td>
                          <td className="center-cell actions-cell">
                            <button className="edit-btn" onClick={() => setEditing({ ...booking })}>
                              Edit
                            </button>
                            <button
                              onClick={() => deleteBooking(booking._id)}
                              className="danger delete-btn"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {editing && (
        <div className="modal">
          <div className="card">
            <h2>Edit Booking</h2>
            <form className="form" onSubmit={saveEdit}>
              <label>Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <label>Phone</label>
              <input
                value={editing.phone}
                onChange={(e) => setEditing((p) => ({ ...p, phone: e.target.value }))}
                required
              />
              <label>Date</label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing((p) => ({ ...p, date: e.target.value }))}
                required
              />
              <label>Time</label>
              <select
                value={editing.time}
                onChange={(e) => setEditing((p) => ({ ...p, time: e.target.value }))}
                required
              >
                {allowedTimes.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
              <div className="row">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
