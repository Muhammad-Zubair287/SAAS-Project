# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/platform-super-admin.spec.ts >> Platform Super Admin — end-to-end >> creates tenant, accepts primary admin invitation, verifies tenant access
- Location: e2e/platform-super-admin.spec.ts:60:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/nn/l901hdk123lgxwysfhwz365m0000gn/T/cursor-sandbox-cache/7838efafc2c42e8014b22715e00a3fe6/playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```