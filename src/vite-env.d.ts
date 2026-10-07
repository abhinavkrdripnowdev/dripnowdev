/// <reference types="vite/client" />

// Allow CSS imports in TypeScript
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DATADOG_CLIENT_TOKEN?: string;
  readonly VITE_DATADOG_SITE?: string;
  readonly VITE_DATADOG_SERVICE?: string;
  readonly VITE_DATADOG_ENV?: string;
  readonly VITE_ENABLE_DATADOG_LOGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
