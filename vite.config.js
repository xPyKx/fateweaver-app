import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        watch: {
            ignored: ["**/.codex_prompt*/**", "**/dist/**", "**/node_modules/**"]
        }
    }
});
