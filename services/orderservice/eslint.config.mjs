import js from "@eslint/js";

export default [
  // 1. Keep the standard recommended JavaScript rules
  js.configs.recommended,

  // 2. Your specific custom overrides
  {
    languageOptions: {
      globals: {
        require: true,
        module: true,
        process: true,
        __dirname: true,
        console: true,
      },
    },
  }
];
