import { Link, Route, Routes } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/AdminPage";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/">Booking</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
