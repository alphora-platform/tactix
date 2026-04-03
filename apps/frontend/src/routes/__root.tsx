import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/lib/store/auth.store';

const AUTH_ROUTES = ['/sign-in', '/sign-up'];
const PROTECTED_ROUTES = ['/jobs', '/settings', '/stats', '/logs'];

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const isProtected = PROTECTED_ROUTES.some(
      (r) => location.pathname === r || location.pathname.startsWith(r + '/')
    );
    if (isProtected) {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw redirect({ to: '/sign-in', search: { redirect: location.pathname } });
      }
    }
  },
  component: RootLayout,
});

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
