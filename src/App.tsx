import { AppRouter } from './router/AppRouter';
import { ApiLogDrawer } from './components/common/ApiLogDrawer';
import { DialogHost } from './components/common/DialogHost';

// The API log inspector is a developer tool: dev builds only, and opt-in via
// localStorage.setItem('dripnow-debug', '1') so it never clutters the UI by default.
const showDebugDrawer = (() => {
  try { return import.meta.env.DEV && localStorage.getItem('dripnow-debug') === '1'; } catch { return false; }
})();

function App() {
  return (
    <>
      <AppRouter />
      <DialogHost />
      {showDebugDrawer && <ApiLogDrawer />}
    </>
  );
}

export default App;
