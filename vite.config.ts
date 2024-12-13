import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // 在构建时忽略类型检查
    typescript: {
      noEmit: false,
      ignoreBuildErrors: true,
    }
  }
})
