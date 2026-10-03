import { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { RequireRole } from '@/components/providers/RequireRole';
import { PageBoundary, PageOutlet } from './page-boundary';

const AdminLayout = lazy(() => import('@/pages/admin/admin-layout'));
const AdminApplicationQueue = lazy(() => import('@/pages/admin/applications/application-queue'));
const AdminApplicationsLayout = lazy(
  () => import('@/pages/admin/applications/applications-layout')
);
const AdminRequestTab = lazy(() => import('@/pages/admin/applications/request-tab'));
const AdminApplicationStatistics = lazy(() => import('@/pages/admin/applications/statistics-tab'));
const AdminAuditPage = lazy(() => import('@/pages/admin/audit-page'));
const AdminBlogsPage = lazy(() => import('@/pages/admin/blogs-page'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard-page'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/reviews/reviews-page'));
const AdminAccountsTab = lazy(() => import('@/pages/admin/users/accounts-tab'));
const AdminUsersLayout = lazy(() => import('@/pages/admin/users/users-layout'));
const BooksPage = lazy(() => import('@/pages/books/books-page'));
const ProfessionalAffiliatePage = lazy(() => import('@/pages/professionals/affiliate-page'));
const ProfessionalBookingsPage = lazy(() => import('@/pages/professionals/bookings-page'));
const ProfessionalConversationsPage = lazy(
  () => import('@/pages/professionals/conversations-page')
);
const ProfessionalHistoryPage = lazy(() => import('@/pages/professionals/history-page'));
const ProfessionalMapLocationPage = lazy(() => import('@/pages/professionals/map-location-page'));
const ProfessionalLayout = lazy(() => import('@/pages/professionals/professional-layout'));
const ProfessionalProfilePage = lazy(() => import('@/pages/professionals/profile-page'));
const ProfessionalReviewsPage = lazy(() => import('@/pages/professionals/reviews-page'));
const ProfessionalSettingsPage = lazy(() => import('@/pages/professionals/settings-page'));

export function consoleRoutes() {
  return (
    <>
      <Route
        path="admin"
        element={
          <RequireRole roles={['admin']}>
            <PageBoundary>
              <AdminLayout />
            </PageBoundary>
          </RequireRole>
        }
      >
        <Route element={<PageOutlet />}>
          <Route index element={<AdminDashboardPage />} />

          <Route path="applications" element={<AdminApplicationsLayout />}>
            <Route element={<PageOutlet />}>
              <Route index element={<AdminRequestTab />} />
              <Route path="application" element={<AdminApplicationQueue phase="application" />} />
              <Route path="accepted" element={<AdminApplicationQueue phase="accepted" />} />
              <Route path="rejected" element={<AdminApplicationQueue phase="rejected" />} />
              <Route path="completed" element={<AdminApplicationQueue phase="completed" />} />

              <Route
                path="verification"
                element={<Navigate to="/admin/applications/application" replace />}
              />
              <Route
                path="approved"
                element={<Navigate to="/admin/applications/accepted" replace />}
              />
            </Route>
          </Route>

          <Route path="users" element={<AdminUsersLayout />}>
            <Route element={<PageOutlet />}>
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
      </Route>

      <Route
        path="professionals/dashboard"
        element={
          <RequireAuth>
            <RequireRole roles={['professional']}>
              <PageBoundary>
                <ProfessionalLayout />
              </PageBoundary>
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route element={<PageOutlet />}>
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
      </Route>
    </>
  );
}
