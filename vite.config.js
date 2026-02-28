import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 🚀 THIS FIXES THE WHITE SCREEN! 
  // Set base to match your actual GitHub repo name for project pages
  base: '/se2_lab6_front/' 
})