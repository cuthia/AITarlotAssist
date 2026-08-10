import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import DrawPage from "@/pages/DrawPage";
import ReadingPage from "@/pages/ReadingPage";
import RecordsPage from "@/pages/RecordsPage";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/draw" element={<DrawPage />} />
        <Route path="/reading/:id" element={<ReadingPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth/login" element={<AuthPage />} />
        <Route path="/auth/signup" element={<AuthPage />} />
      </Routes>
    </Router>
  );
}
