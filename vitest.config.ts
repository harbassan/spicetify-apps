import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		environment: "happy-dom",
		include: ["projects/**/src/**/__tests__/**/*.test.{ts,tsx}"],
		globals: true,
	},
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "projects/shared/src"),
		},
	},
});
