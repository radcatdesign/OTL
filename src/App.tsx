import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useMe } from './lib/store';
import { Explore } from './screens/Explore';
import { Garden } from './screens/Garden';
import { Gardens } from './screens/Gardens';
import { Home } from './screens/Home';
import { InviteLanding } from './screens/InviteLanding';
import { Join } from './screens/Join';
import { Lawn } from './screens/Lawn';
import { Me } from './screens/Me';
import { NewLawn } from './screens/NewLawn';
import { Studio } from './screens/Studio';
import { Welcome } from './screens/Welcome';
import { BottomNav, TopBar } from './ui/Chrome';
import { Celebration, Toasts } from './ui/Feedback';
import { World } from './ui/World';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try { window.scrollTo({ top: 0 }); } catch { /* noop */ }
  }, [pathname]);
  return null;
}

function SignedIn() {
  const me = useMe();
  const loc = useLocation();
  if (!me) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return (
    <>
      <main className="shell">
        <TopBar />
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}

function Root() {
  const me = useMe();
  return me ? (
    <>
      <main className="shell">
        <TopBar />
        <Home />
      </main>
      <BottomNav />
    </>
  ) : (
    <Welcome />
  );
}

function OpenShell() {
  const me = useMe();
  return (
    <>
      <main className="shell" style={me ? undefined : { paddingBottom: 40 }}>
        {me && <TopBar />}
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <World />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/join" element={<Join />} />
        <Route element={<OpenShell />}>
          <Route path="/invite/:code/:from?" element={<InviteLanding />} />
        </Route>
        <Route element={<SignedIn />}>
          <Route path="/explore" element={<Explore />} />
          <Route path="/gardens" element={<Gardens />} />
          <Route path="/new" element={<NewLawn />} />
          <Route path="/lawn/:id" element={<Lawn />} />
          <Route path="/lawn/:id/garden" element={<Garden />} />
          <Route path="/me" element={<Me />} />
          <Route path="/studio" element={<Studio />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
      <Celebration />
    </>
  );
}

// Hash routing works on any static host. The single-file preview uses in-memory routing.
const Router = import.meta.env.MODE === 'preview' ? MemoryRouter : HashRouter;

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
