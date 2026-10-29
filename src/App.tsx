import { useEffect, type ReactNode } from 'react';
import { HashRouter, MemoryRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useMe, useStore } from './lib/store';
import { useWide } from './lib/useWide';
import { Explore } from './screens/Explore';
import { Garden } from './screens/Garden';
import { Gardens } from './screens/Gardens';
import { Home } from './screens/Home';
import { InviteLanding } from './screens/InviteLanding';
import { Join } from './screens/Join';
import { Lawn } from './screens/Lawn';
import { Me } from './screens/Me';
import { EventEditor } from './screens/EventEditor';
import { GroupPage } from './screens/GroupPage';
import { Groups } from './screens/Groups';
import { Admin } from './screens/admin/Admin';
import { CampaignEditor } from './screens/admin/CampaignEditor';
import { Studio } from './screens/Studio';
import { Welcome } from './screens/Welcome';
import { BottomNav, TopBar } from './ui/Chrome';
import { Celebration, Toasts } from './ui/Feedback';
import { Sidebar } from './ui/Sidebar';
import { World } from './ui/World';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try { window.scrollTo({ top: 0 }); } catch { /* noop */ }
  }, [pathname]);
  return null;
}

// Phone: one column with a top bar and bottom tabs. Desktop: sidebar plus a wide canvas.
function Frame({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const me = useMe();
  const wide = useWide();
  if (wide && me) {
    return (
      <div className="frame">
        <Sidebar />
        <main className="shell desk">{children}</main>
      </div>
    );
  }
  return (
    <>
      <main className="shell" style={bare || !me ? { paddingBottom: 40 } : undefined}>
        {me && <TopBar />}
        {children}
      </main>
      <BottomNav />
    </>
  );
}

function SignedIn() {
  const me = useMe();
  const loc = useLocation();
  if (!me) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <Frame><Outlet /></Frame>;
}

function Root() {
  const me = useMe();
  return me ? <Frame><Home /></Frame> : <Welcome />;
}

function OpenShell() {
  return <Frame bare><Outlet /></Frame>;
}

// The illustrated sky and lawn only sit behind the welcome, sign-up and invite pages.
// Everywhere else the platform is a clean workspace.
function Backdrop() {
  const me = useMe();
  const { pathname } = useLocation();
  const show = pathname === '/join' || pathname.startsWith('/invite') || (!me && pathname === '/');
  return show ? <World /> : null;
}

// Scheduled campaigns go out when their time comes. Live, a server job does this.
function CampaignClock() {
  const process = useStore((s) => s.processScheduled);
  useEffect(() => {
    process();
    const t = setInterval(process, 20_000);
    return () => clearInterval(t);
  }, [process]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <CampaignClock />
      <Backdrop />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/join" element={<Join />} />
        <Route element={<OpenShell />}>
          <Route path="/invite/:code/:from?" element={<InviteLanding />} />
        </Route>
        <Route element={<SignedIn />}>
          <Route path="/explore" element={<Explore />} />
          <Route path="/gardens" element={<Gardens />} />
          <Route path="/new" element={<EventEditor />} />
          <Route path="/lawn/:id/edit" element={<EventEditor />} />
          <Route path="/lawn/:id" element={<Lawn />} />
          <Route path="/lawn/:id/garden" element={<Garden />} />
          <Route path="/me" element={<Me />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/g/:slug" element={<GroupPage />} />
          <Route path="/g/:slug/admin" element={<Admin />} />
          <Route path="/g/:slug/admin/campaigns/:cid" element={<CampaignEditor />} />
          <Route path="/g/:slug/admin/:tab" element={<Admin />} />
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
