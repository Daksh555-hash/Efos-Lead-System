import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicApply from './pages/PublicApply'
import Login from './pages/Login'
import DashboardHome from './pages/DashboardHome'
import LeadManagement from './pages/LeadManagement'
import RegisterLead from './pages/RegisterLead'
import AIScoring from './pages/AIScoring'
import AIMessaging from './pages/AIMessaging'
import AutomationWorkflow from './pages/AutomationWorkflow'
import CounselorHub from './pages/CounselorHub'
import AnalyticsDashboard from './pages/AnalyticsDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicApply />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="register" element={<RegisterLead />} />
          <Route path="scoring" element={<AIScoring />} />
          <Route path="messaging" element={<AIMessaging />} />
          <Route path="automation" element={<AutomationWorkflow />} />
          <Route path="counselors" element={<CounselorHub />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App