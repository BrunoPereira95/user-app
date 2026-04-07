import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouteObject, useLocation, useSearchParams } from 'react-router-dom';
import { useSession } from 'modelence/client';

// For guest-only routes (login, signup) - redirects to home if already logged in
function GuestRoute() {
  const { user } = useSession();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const encodedRedirect = searchParams.get('_redirect');
  const redirect = encodedRedirect ? decodeURIComponent(encodedRedirect) : '/';

  if (user) {
    return <Navigate to={redirect} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// For protected routes - redirects to login if not authenticated
function PrivateRoute() {
  const { user } = useSession();
  const location = useLocation();

  if (!user) {
    const fullPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?_redirect=${encodeURIComponent(fullPath)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}

// Public routes (no auth required)
const publicRoutes: RouteObject[] = [
  {
    path: '/terms',
    Component: lazy(() => import('./pages/TermsPage'))
  },
  {
    path: '/logout',
    Component: lazy(() => import('./pages/LogoutPage'))
  },
  {
    path: '*',
    Component: lazy(() => import('./pages/NotFoundPage'))
  }
];

// Guest routes (redirect to home if already logged in)
const guestRoutes: RouteObject[] = [
  {
    path: '/login',
    Component: lazy(() => import('./pages/LoginPage'))
  },
  {
    path: '/signup',
    Component: lazy(() => import('./pages/SignupPage'))
  }
];

// Private routes (redirect to login if not authenticated)
const privateRoutes: RouteObject[] = [
  {
    path: '/',
    Component: lazy(() => import('./pages/DashboardPage'))
  },
  {
    path: '/invoices',
    Component: lazy(() => import('./pages/InvoicesPage'))
  },
  {
    path: '/invoices/new',
    Component: lazy(() => import('./pages/NewInvoicePage'))
  },
  {
    path: '/invoices/:invoiceId/edit',
    Component: lazy(() => import('./pages/EditInvoicePage'))
  },
  {
    path: '/expenses',
    Component: lazy(() => import('./pages/ExpensesPage'))
  },
  {
    path: '/expenses/new',
    Component: lazy(() => import('./pages/NewExpensesPage'))
  },
  {
    path: '/clients',
    Component: lazy(() => import('./pages/ClientsPage'))
  },
  {
    path: '/personal',
    Component: lazy(() => import('./pages/PersonalPage'))
  },
  {
    path: '/settings',
    Component: lazy(() => import('./pages/SettingsPage'))
  },
];

export const router = createBrowserRouter([
  ...publicRoutes,
  {
    Component: GuestRoute,
    children: guestRoutes
  },
  {
    Component: PrivateRoute,
    children: privateRoutes
  }
]);