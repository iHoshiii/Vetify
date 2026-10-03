import { Navigate, Route } from 'react-router-dom';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireRole } from '@/components/providers/RequireRole';
import AdminLayout from '@/pages/admin/admin-layout';
import AdminApplicationQueue from '@/pages/admin/applications/application-queue';
import AdminApplicationsLayout from '@/pages/admin/applications/applications-layout';
import AdminRequestTab from '@/pages/admin/applications/request-tab';
import AdminApplicationStatistics from '@/pages/admin/applications/statistics-tab';
import AdminAuditPage from '@/pages/admin/audit-page';
import AdminBlogsPage from '@/pages/admin/blogs-page';
import AdminDashboardPage from '@/pages/admin/dashboard-page';
import AdminReviewsPage from '@/pages/admin/reviews/reviews-page';
import AdminAccountsTab from '@/pages/admin/users/accounts-tab';
import AdminUsersLayout from '@/pages/admin/users/users-layout';
import BooksPage from '@/pages/books/books-page';
import ProfessionalAffiliatePage from '@/pages/professionals/affiliate-page';
import ProfessionalBookingsPage from '@/pages/professionals/bookings-page';
import ProfessionalConversationsPage from '@/pages/professionals/conversations-page';
import ProfessionalHistoryPage from '@/pages/professionals/history-page';
import ProfessionalMapLocationPage from '@/pages/professionals/map-location-page';
import ProfessionalLayout from '@/pages/professionals/professional-layout';
import ProfessionalProfilePage from '@/pages/professionals/profile-page';
import ProfessionalReviewsPage from '@/pages/professionals/reviews-page';
import ProfessionalSettingsPage from '@/pages/professionals/settings-page';

export function consoleRoutes() {
  return (
    <>
      <Route
        path="admin"
        element={
          <RequireRole roles={['admin']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboardPage />} />

        <Route path="applications" element={<AdminApplicationsLayout />}>
          <Route index element={<AdminRequestTab />} />
          <Route path="application" element={<AdminApplicationQueue phase="application" />} />
          <Route path="accepted" element={<AdminApplicationQueue phase="accepted" />} />
          <Route path="rejected" element={<AdminApplicationQueue phase="rejected" />} />
          <Route path="completed" element={<AdminApplicationQueue phase="completed" />} />

          <Route
            path="verification"
            element={<Navigate to="/admin/applications/application" replace />}
          />
          <Route path="approved" element={<Navigate to="/admin/applications/accepted" replace />} />
        </Route>

        <Route path="users" element={<AdminUsersLayout />}>
          <Route index element={<AdminAccountsTab />} />
          <Route path="public" element={<AdminAccountsTab role="user" />} />
          <Route path="professionals" element={<AdminAccountsTab role="professional" />} />
          <Route path="admins" element={<AdminAccountsTab role="admin" />} />

          <Route path="enquiries" element={<Navigate to="/admin/applications" replace />} />
          <Route
            path="applications"
            element={<Navigate to="/admin/applications/application" replace />}
          />
        </Route>

        <Route path="applications/statistics" element={<AdminApplicationStatistics />} />

        <Route
          path="professionals"
          element={<Navigate to="/admin/applications/application" replace />}
        />
        <Route path="blogs" element={<AdminBlogsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route
        path="professionals/dashboard"
        element={
          <RequireAuth>
            <RequireRole roles={['professional']}>
              <ProfessionalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="consultations" replace />} />
        <Route path="consultations" element={<ProfessionalBookingsPage kind="virtual" />} />
        <Route path="clinic-visits" element={<ProfessionalBookingsPage kind="onsite" />} />
        <Route path="reviews" element={<ProfessionalReviewsPage />} />
        <Route path="books" element={<BooksPage manage />} />
        <Route path="affiliate" element={<ProfessionalAffiliatePage />} />
        <Route path="conversations" element={<ProfessionalConversationsPage />} />
        <Route path="history" element={<ProfessionalHistoryPage />} />
        <Route path="location" element={<ProfessionalMapLocationPage />} />
        <Route path="profile" element={<ProfessionalProfilePage />} />
        <Route path="settings" element={<ProfessionalSettingsPage />} />
      </Route>
    </>
  );
}
