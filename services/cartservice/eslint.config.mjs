import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        require: true,
        process: true,
        console: true,
        __dirname: true,
        __filename: true,
      },
    },
    rules: {
      "no-console": "warn",
    }
  }
];