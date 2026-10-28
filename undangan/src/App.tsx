import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import InvitationBuilder from './components/editor/InvitationBuilder';
import PublicInvitationPage from './components/public/PublicInvitationPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/invitation/:id" element={<PublicInvitationPage />} />

          {/* Demo builder — no auth required */}
          <Route path="/builder" element={<InvitationBuilder />} />

          {/* Dashboard — auth enforced inside each page */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/editor/:id" element={<InvitationBuilder />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

