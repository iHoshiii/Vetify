import { lazy } from 'react';
import { consoleRoutes } from './routes/console-routes';
import { PageBoundary } from './routes/page-boundary';
import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireTermsAgreed } from '@/components/providers/RequireTermsAgreed';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/home-page';
import PlannerPage from '@/pages/planner/planner-page';

const AboutPage = lazy(() => import('@/pages/about/about-page'));
const AnatomyPage = lazy(() => import('@/pages/anatomy/anatomy-page'));
const AuthCallbackPage = lazy(() => import('@/pages/auth-callback/auth-callback-page'));
const BlogDetailPage = lazy(() => import('@/pages/blogs/blog-detail-page'));
const BlogsPage = lazy(() => import('@/pages/blogs/blogs-page'));
const BooksPage = lazy(() => import('@/pages/books/books-page'));
const BookAppointmentPage = lazy(() => import('@/pages/book-appointment/book-appointment-page'));
const CallPage = lazy(() => import('@/pages/call/call-page'));
const ChatPage = lazy(() => import('@/pages/chat/chat-page'));
const ContactPage = lazy(() => import('@/pages/contact/contact-page'));
const HelpPage = lazy(() => import('@/pages/help/help-page'));
const LoginPage = lazy(() => import('@/pages/login/login-page'));
const ForgotPasswordPage = lazy(() => import('@/pages/password-recovery/forgot-password-page'));
const ResetPasswordPage = lazy(() => import('@/pages/password-recovery/reset-password-page'));
const VerifyEmailPage = lazy(() => import('@/pages/email-verification/verify-email-page'));
const MapPage = lazy(() => import('@/pages/map/map-page'));
const MessagesPage = lazy(() => import('@/pages/messages/messages-page'));
const NotFoundPage = lazy(() => import('@/pages/not-found-page'));
const PrivacyPage = lazy(() => import('@/pages/privacy/privacy-page'));
const ProfessionalApplyPage = lazy(() => import('@/pages/professionals/apply-page'));
const ProfessionalInvitePage = lazy(() => import('@/pages/professionals/invite-page'));
const ProfessionalPublicProfilePage = lazy(
  () => import('@/pages/professionals/public-profile-page')
);
const ProfessionalsPage = lazy(() => import('@/pages/professionals/professionals-page'));
const ServicesPage = lazy(() => import('@/pages/services/services-page'));
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'));
const SignupPage = lazy(() => import('@/pages/signup/signup-page'));
const TermsPage = lazy(() => import('@/pages/terms/terms-page'));

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
        <Route path="verify-email" element={<VerifyEmailPage />} />
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
            <PageBoundary>
              <CallPage />
            </PageBoundary>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
