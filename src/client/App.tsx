import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireRole } from '@/components/providers/RequireRole';
import RootLayout from '@/layouts/RootLayout';
import AboutPage from '@/pages/about/about-page';
import AdminLayout from '@/pages/admin/admin-layout';
import AdminApplicationQueue from '@/pages/admin/applications/application-queue';
import AdminApplicationsLayout from '@/pages/admin/applications/applications-layout';
import AdminRequestTab from '@/pages/admin/applications/request-tab';
import AdminApplicationStatistics from '@/pages/admin/applications/statistics-tab';
import AdminAuditPage from '@/pages/admin/audit-page';
import AdminBlogsPage from '@/pages/admin/blogs-page';
import AdminDashboardPage from '@/pages/admin/dashboard-page';
import AdminAccountsTab from '@/pages/admin/users/accounts-tab';
import AdminUsersLayout from '@/pages/admin/users/users-layout';
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
import ProfessionalAppointmentsPage from '@/pages/professionals/appointments-page';
import ProfessionalConversationsPage from '@/pages/professionals/conversations-page';
import ProfessionalHistoryPage from '@/pages/professionals/history-page';
import ProfessionalMapLocationPage from '@/pages/professionals/map-location-page';
import ProfessionalInvitePage from '@/pages/professionals/invite-page';
import ProfessionalLayout from '@/pages/professionals/professional-layout';
import ProfessionalProfilePage from '@/pages/professionals/profile-page';
import ProfessionalPublicProfilePage from '@/pages/professionals/public-profile-page';
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
        {/* The licence pipeline, in the phases somebody moves through. Its own
            section rather than tabs under Users, because it is a journey rather than a
            view of an account: the queues decide whether somebody becomes a
            professional at all, and Users is where the account is administered once
            they have. */}
        <Route path="applications" element={<AdminApplicationsLayout />}>
          <Route index element={<AdminRequestTab />} />
          <Route path="application" element={<AdminApplicationQueue phase="application" />} />
          <Route path="accepted" element={<AdminApplicationQueue phase="accepted" />} />
          <Route path="rejected" element={<AdminApplicationQueue phase="rejected" />} />
          <Route path="completed" element={<AdminApplicationQueue phase="completed" />} />
          {/* What the two review tabs were called before the phases were named after
              the decision each one asks for. Bookmarked paths, so they redirect rather
              than 404. */}
          <Route
            path="verification"
            element={<Navigate to="/admin/applications/application" replace />}
          />
          <Route path="approved" element={<Navigate to="/admin/applications/accepted" replace />} />
        </Route>
        {/* Accounts, and the professionals among them: two views of the same people,
            which is why they are one section with tabs rather than two in the
            sidebar. */}
        <Route path="users" element={<AdminUsersLayout />}>
          <Route index element={<AdminAccountsTab />} />
          <Route path="professionals" element={<AdminAccountsTab role="professional" />} />
          {/* Where the two queues used to live. Kept as redirects because they are
              paths people have bookmarked and linked to. */}
          <Route path="enquiries" element={<Navigate to="/admin/applications" replace />} />
          <Route
            path="applications"
            element={<Navigate to="/admin/applications/application" replace />}
          />
        </Route>
        {/* Statistics is a sidebar workspace, separate from the application phase rail. */}
        <Route path="applications/statistics" element={<AdminApplicationStatistics />} />
        {/* And where it lived before that. */}
        <Route
          path="professionals"
          element={<Navigate to="/admin/applications/application" replace />}
        />
        <Route path="blogs" element={<AdminBlogsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        {/* Gated like the other tools it sits beside in the nav. It was the one
            entry in the Tools menu an anonymous visitor could open. */}
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
        {/* One vet, publicly readable: somebody should be able to read who they might
            book before making an account. Ranked below the literal paths below it by
            the router's own specificity rules, so /professionals/apply still wins. */}
        <Route path="professionals/:id" element={<ProfessionalPublicProfilePage />} />
        {/*
         * Stage one, behind an account. Stage two matches the invited address
         * against whoever opens the link, so an enquiry from nobody in particular
         * could only ever earn a link its sender cannot use.
         */}
        <Route
          path="professionals/apply"
          element={
            <RequireAuth>
              <ProfessionalApplyPage />
            </RequireAuth>
          }
        />
        {/*
         * Stage two. Public for the same reason the API's invite read is: the page
         * has to be able to name the address the link was sent to before it knows
         * who is looking, and the token in the path survives the trip through the
         * login page.
         */}
        <Route path="professionals/apply/:token" element={<ProfessionalInvitePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="professionals/dashboard"
        element={
          <RequireAuth>
            <ProfessionalLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ProfessionalAppointmentsPage />} />
        <Route path="conversations" element={<ProfessionalConversationsPage />} />
        <Route path="history" element={<ProfessionalHistoryPage />} />
        <Route path="location" element={<ProfessionalMapLocationPage />} />
        <Route path="profile" element={<ProfessionalProfilePage />} />
      </Route>
    </Routes>
  );
}
