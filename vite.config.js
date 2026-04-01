import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // ✅ [추가] 외부 톰캣 배포를 위한 베이스 경로 설정
  // WAR 파일명이 interface-manager.war 이므로 이 경로를 반드시 넣어줘야 합니다.
  base: '/interface-manager/',

  build: {
    // 1. 빌드 결과물이 저장될 위치
    outDir: '../../sts4-workspace/인터페이스관리/interface-manager/src/main/resources/static', 
    
    // 2. 빌드 시 기존 static 폴더를 비우고 새로 생성
    emptyOutDir: true,
  },

  // 개발 모드(npm run dev) 설정
  server: {
    port: 5173, // 리액트 개발 포트
    proxy: {
      '/api': {
        target: 'http://localhost:24050/interface-manager', // 백엔드 포트 (24050으로 변경하신 것 같네요!)
        changeOrigin: true,
      }
    }
  }
})