/// <reference types="vite/client" />

// Permite importar archivos CSS como módulos de efectos secundarios
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Tipado explícito de las variables de entorno de Vite
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly MODE: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
