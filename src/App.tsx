import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import TailorCV from "./pages/TailorCV/TailorCV";
import ProcessedResumes from "./pages/ProcessedResumes/ProcessedResumes";
import ProjectsList from "./pages/Projects/ProjectsList";
import ImportFromResume from "./pages/Projects/ImportFromResume";
import UploadCsv from "./pages/Projects/UploadCsv";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/tailor" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Protected dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/tailor" element={<TailorCV />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/import-resume" element={<ImportFromResume />} />
            <Route path="/projects/upload-csv" element={<UploadCsv />} />
            <Route path="/resumes" element={<ProcessedResumes />} />
            <Route path="/blank" element={<Blank />} />
          </Route>
        </Route>

        {/* Guest-only routes */}
        <Route path="/signin" element={<GuestRoute><SignIn /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
