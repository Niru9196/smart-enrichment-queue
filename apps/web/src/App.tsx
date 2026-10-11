import { LandingPage } from '@/features/marketing/landing-page';
import { WorkspaceShell } from '@/features/workspace/workspace-shell';

function isWorkspacePath(): boolean {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'leads' || view === 'queue';
}

export default function App() {
  return isWorkspacePath() ? <WorkspaceShell /> : <LandingPage />;
}
