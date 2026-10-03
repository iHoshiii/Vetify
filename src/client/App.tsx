import { consoleRoutes } from './routes/console-routes';
import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireTermsAgreed } from '@/components/providers/RequireTermsAgreed';
import RootLayout from '@/layouts/RootLayout';
import AboutPage from '@/pages/about/about-page';
import AnatomyPage from '@/pages/anatomy/anatomy-page';
import AuthCallbackPage from '@/pages/auth-callback/auth-callback-page';
import BlogDetailPage from '@/pages/blogs/blog-detail-page';
import BlogsPage from '@/pages/blogs/blogs-page';
import BooksPage from '@/pages/books/books-page';
import BookAppointmentPage from '@/pages/book-appointment/book-appointment-page';
import CallPage from '@/pages/call/call-page';
import ChatPage from '@/pages/chat/chat-page';
import ContactPage from '@/pages/contact/contact-page';
import HelpPage from '@/pages/help/help-page';
import HomePage from '@/pages/home-page';
import LoginPage from '@/pages/login/login-page';
import ForgotPasswordPage from '@/pages/password-recovery/forgot-password-page';
import ResetPasswordPage from '@/pages/password-recovery/reset-password-page';
import MapPage from '@/pages/map/map-page';
import MessagesPage from '@/pages/messages/messages-page';
import NotFoundPage from '@/pages/not-found-page';
import PlannerPage from '@/pages/planner/planner-page';
import PrivacyPage from '@/pages/privacy/privacy-page';
import ProfessionalApplyPage from '@/pages/professionals/apply-page';
import ProfessionalInvitePage from '@/pages/professionals/invite-page';
import ProfessionalPublicProfilePage from '@/pages/professionals/public-profile-page';
import ProfessionalsPage from '@/pages/professionals/professionals-page';
import ServicesPage from '@/pages/services/services-page';
import SettingsPage from '@/pages/settings/settings-page';
import SignupPage from '@/pages/signup/signup-page';
import TermsPage from '@/pages/terms/terms-page';

export default function App() {
  return (
    <Routes>
      {consoleRoutes()}
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route
          path="books"
          element={
            <RequireAuth>
              <BooksPage />
            </RequireAuth>
          }
        />

        <Route
          path="anatomy"
          element={
            <RequireAuth>
              <AnatomyPage />
            </RequireAuth>
          }
        />
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
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route
          path="map"
          element={
            <RequireAuth>
              <MapPage />
            </RequireAuth>
          }
        />
        <Route
          path="messages"
          element={
            <RequireAuth>
              <MessagesPage />
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

        <Route path="professionals/:id" element={<ProfessionalPublicProfilePage />} />

        <Route
          path="professionals/apply"
          element={
            <RequireAuth>
              <RequireTermsAgreed>
                <ProfessionalApplyPage />
              </RequireTermsAgreed>
            </RequireAuth>
          }
        />

        <Route path="professionals/apply/:token" element={<ProfessionalInvitePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route
          path="settings/:section?"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="signup" element={<SignupPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="call/:appointmentId"
        element={
          <RequireAuth>
            <CallPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
