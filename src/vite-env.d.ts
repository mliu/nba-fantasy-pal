/// <reference types="vite/client" />

interface ImportMetaEnv {
  // URL of the Cloudflare Worker in worker/ (not secret)
  readonly VITE_ESPN_PROXY_URL?: string;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
