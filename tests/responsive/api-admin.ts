import { account, DATE, inquiry, pageOf, post, professional } from './data';
import { audit, report } from './data-admin';
export function adminReply(url: URL) {
  const path = url.pathname.replace('/api/v1', '');
  const series = {
    metric: 'signups',
    days: 30,
    from: DATE,
    to: DATE,
    points: [
      { date: '2026-10-14', count: 2 },
      { date: '2026-10-15', count: 4 },
    ],
  };
  if (path === '/admin/metrics/overview')
    return {
      days: 30,
      generatedAt: DATE,
      totals: {
        users: 42,
        admins: 2,
        professionals: 3,
        pendingApplications: 1,
        blogs: 2,
        publishedBlogs: 1,
        flaggedBlogs: 1,
        moderatedBlogs: 0,
      },
      trend: Object.fromEntries(
        [
          'signups',
          'logins',
          'applications',
          'approvals',
          'rejections',
          'publishedBlogs',
          'moderatedBlogs',
        ].map((key) => [key, { current: 4, previous: 2, change: 100 }])
      ),
    };
  if (path === '/admin/metrics/timeseries/providers')
    return {
      ...series,
      lines: ['google', 'facebook', 'tiktok', 'local', 'total'].map((provider) => ({
        provider,
        points: series.points,
      })),
    };
  if (path === '/admin/metrics/timeseries') return series;
  if (path === '/admin/metrics/breakdown')
    return {
      dimension: 'userStatus',
      role: null,
      total: 42,
      slices: [
        { label: 'active', count: 40 },
        { label: 'suspended', count: 2 },
      ],
    };
  if (path === '/admin/users') return pageOf(account);
  if (path === '/admin/inquiries') return pageOf(inquiry);
  if (path === '/admin/professionals')
    return pageOf({ ...professional, status: url.searchParams.get('status') || 'pending' });
  if (path === '/admin/blogs') return pageOf(post);
  if (path === '/admin/reviews') return pageOf(report);
  if (path === '/admin/audit') return pageOf(audit);

  return undefined;
}
