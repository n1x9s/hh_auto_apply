import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import AppLayout from "@/components/layout/AppLayout"
import DashboardPage from "@/pages/DashboardPage"
import AuthPage from "@/pages/AuthPage"
import ResumesPage from "@/pages/ResumesPage"
import VacanciesPage from "@/pages/VacanciesPage"
import NegotiationsPage from "@/pages/NegotiationsPage"
import EmployersPage from "@/pages/EmployersPage"
import ContactsPage from "@/pages/ContactsPage"
import SettingsPage from "@/pages/SettingsPage"

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="resumes" element={<ResumesPage />} />
          <Route path="vacancies" element={<VacanciesPage />} />
          <Route path="negotiations" element={<NegotiationsPage />} />
          <Route path="employers" element={<EmployersPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
