import path from 'node:path'
import { defineConfig } from 'vite'

const workspaceRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
})
