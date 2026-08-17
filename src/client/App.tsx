import { Route, Routes } from 'react-router-dom';

import RootLayout from '@/layouts/RootLayout';
import AboutPage from '@/pages/about/about-page';
import AnatomyPage from '@/pages/anatomy/anatomy-page';
import AuthCallbackPage from '@/pages/auth-callback/auth-callback-page';
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
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="anatomy" element={<AnatomyPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="book-appointment" element={<BookAppointmentPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
