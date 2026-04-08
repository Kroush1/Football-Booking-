import { Link, Route, Routes } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <>
      <nav className="navbar">
        <Link to="/">Booking</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<BookingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  );
}
