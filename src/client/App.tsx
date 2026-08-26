import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireRole } from '@/components/providers/RequireRole';
import RootLayout from '@/layouts/RootLayout';
import AboutPage from '@/pages/about/about-page';
import AdminLayout from '@/pages/admin/admin-layout';
import AdminAuditPage from '@/pages/admin/audit-page';
import AdminBlogsPage from '@/pages/admin/blogs-page';
import AdminDashboardPage from '@/pages/admin/dashboard-page';
import AdminProfessionalsPage from '@/pages/admin/professionals-page';
import AdminUsersPage from '@/pages/admin/users-page';
import AnatomyPage from '@/pages/anatomy/anatomy-page';
import AuthCallbackPage from '@/pages/auth-callback/auth-callback-page';
import BlogDetailPage from '@/pages/blogs/blog-detail-page';
import BlogsPage from '@/pages/blogs/blogs-page';
import BookAppointmentPage from '@/pages/book-appointment/book-appointment-page';
import ChatPage from '@/pages/chat/chat-page';
import ContactPage from '@/pages/contact/contact-page';
import HelpPage from '@/pages/help/help-page';
import HomePage from '@/pages/home-page';
import LoginPage from '@/pages/login/login-page';
import MapPage from '@/pages/map/map-page';
import NotFoundPage from '@/pages/not-found-page';
import PlannerPage from '@/pages/planner/planner-page';
import PrivacyPage from '@/pages/privacy/privacy-page';
import ProfessionalApplyPage from '@/pages/professionals/apply-page';
import ProfessionalsPage from '@/pages/professionals/professionals-page';
import ServicesPage from '@/pages/services/services-page';
import SignupPage from '@/pages/signup/signup-page';
import TermsPage from '@/pages/terms/terms-page';

/**
 * Route table replacing the App Router's file-system routing. Paths match the
 * former src/app directory names exactly, so every existing link still works.
 */
export default function App() {
  return (
    <Routes>
      {/* The only nested branch in the table, and the only one outside the public
          shell. The console keeps its own sidebar across every section, and the
          gate wraps the layout so a child route cannot be reached without passing
          it. Sitting outside RootLayout is what keeps the marketing header and
          the floating settings tray off an administrative page — AdminLayout
          brings the chrome a console actually needs instead. */}
      <Route
        path="admin"
        element={
          <RequireRole roles={['admin']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="professionals" element={<AdminProfessionalsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="blogs" element={<AdminBlogsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="anatomy" element={<AnatomyPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/:slug" element={<BlogDetailPage />} />
        <Route
          path="book-appointment"
          element={
            <RequireAuth>
              <BookAppointmentPage />
            </RequireAuth>
          }
        />
        <Route path="chat" element={<ChatPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="map"
          element={
            <RequireAuth>
              <MapPage />
            </RequireAuth>
          }
        />
        <Route
          path="planner"
          element={
            <RequireAuth>
              <PlannerPage />
            </RequireAuth>
          }
        />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route
          path="professionals/apply"
          element={
            <RequireAuth>
              <ProfessionalApplyPage />
            </RequireAuth>
          }
        />
        <Route path="services" element={<ServicesPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
