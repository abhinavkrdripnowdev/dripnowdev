import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { getDefaultDashboard } from '@/features/auth/types/auth.types';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisLoader: Promise<void> | undefined;
const loadGis = () => {
  if (!gisLoader) gisLoader = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = GIS_SRC; el.async = true; el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => { gisLoader = undefined; reject(new Error('Unable to load Google sign-in')); };
    document.head.appendChild(el);
  });
  return gisLoader;
};

/**
 * Google Identity Services sign-in. The ID token is verified server-side
 * (POST /auth/google); this component never trusts client-side claims.
 * When GOOGLE_CLIENT_ID is not configured on the backend it renders a disabled button.
 */
export const GoogleSignIn: React.FC<{ onError?: (message: string) => void; dividerLabel?: string }> = ({ onError, dividerLabel = 'or' }) => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const holder = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    let active = true;
    api.get('/auth/google/config')
      .then((r) => { if (active) setClientId(r.data?.data?.client_id ?? null); })
      .catch(() => { if (active) setClientId(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let active = true;
    loadGis().then(() => {
      const gid = (window as any).google?.accounts?.id;
      if (!active || !gid || !holder.current) return;
      gid.initialize({
        client_id: clientId,
        callback: async (resp: { credential?: string }) => {
          if (!resp.credential) return;
          setBusy(true);
          try {
            const result = await authService.loginGoogle(resp.credential);
            setAuth(result.user, result.accessToken);
            navigate(getDefaultDashboard(result.user.roles), { replace: true });
          } catch (e) {
            errorRef.current?.(e instanceof Error ? e.message : 'Google sign-in failed');
          } finally { setBusy(false); }
        },
      });
      gid.renderButton(holder.current, { theme: 'outline', size: 'large', shape: 'pill', width: Math.min(holder.current.clientWidth || 320, 400), text: 'continue_with' });
    }).catch((e) => errorRef.current?.(e.message));
    return () => { active = false; };
  }, [clientId, navigate, setAuth]);

  // Not configured (or still checking): render nothing so shoppers never see a dead button.
  if (!clientId) return null;

  return (
    <div className="google-signin" aria-busy={busy}>
      <div className="auth-divider"><span>{dividerLabel}</span></div>
      <div ref={holder} style={{ display: 'flex', justifyContent: 'center', minHeight: 44, opacity: busy ? 0.6 : 1 }} />
    </div>
  );
};
