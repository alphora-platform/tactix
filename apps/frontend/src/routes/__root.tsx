import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/lib/store/auth.store';

const AUTH_ROUTES = ['/sign-in', '/sign-up'];

export const Route = createRootRoute({
  beforeLoad: () => {
    // TODO: re-enable auth guard when auth feature is ready
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
