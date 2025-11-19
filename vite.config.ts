import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 1. Vercel 不需要 base 設定，預設就是根目錄
  plugins: [react()],
  
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  
  // 2. 這裡移除了 define 區塊，防止 API Key 被打包進前端程式碼
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});