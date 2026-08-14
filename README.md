# dsh-ui-background

Conversation-background plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh). Lets a user set a global wallpaper behind the chat column, adjust a readable wash over it, and clear it — persisted in the user-settings document.

> **Status: source-only plugin.** This is the source of a client plugin package. It depends on `@deepseek-ai/dsh-*` workspace packages that are not yet published to npm, so it is not independently `npm install`able. To use it, mount it inside a deepseek-harness workspace checkout (see [Installation](#installation)).

## What it does

The plugin is a **pure CSS/UI override** — it never edits the stock `ui-conversation` shell's source:

- Its **node half** registers the `chat-background` settings namespace (`imageDataUrl`, `opacity`) on `ctx.settings`, and `api-proxy` exposes it to the browser settings surface.
- Its **browser half** binds that namespace, writes the current snapshot into CSS variables (`--dsh-bg-image`, `--dsh-bg-wash-opacity`) on `document.documentElement`, and installs one plugin-owned `<style>` tag.
- That enhancement stylesheet:
  - paints a full-bleed wallpaper behind the column via `[data-phase]::before` and a readable wash via `[data-phase]::after` (both palette-aware), and
  - turns the docked input into a floating island via `[data-phase][data-phase='active'] [data-composer-seat]` (narrows the seat to the card width, centers it, removes the stock bottom fade), so the wallpaper stays visible beside it.

Because the overrides match stable stock data attributes, they degrade gracefully if a future shell rename breaks a selector.

## Installation

Inside a `deepseek-harness` repository checkout:

1. **Provide the package** under `packages/client/ui-background/` (this repository's content, including `package.json`, `tsconfig.json`, `tsdown.config.ts`, `src/`, and `tests/`), and re-run `pnpm install` so the workspace links resolve.
2. **Register the client row** in `packages/bundle/web-app/cordis.patch.yml` browser roster:

   ```yaml
   - id: ui-background
     name: '@deepseek-ai/dsh-client-ui-background'
   ```

3. **Add** `@deepseek-ai/dsh-client-ui-background` to `packages/bundle/web-app/package.json` `dependencies` (`workspace:^`).
4. **Add the tsconfig reference** `{ "path": "./packages/client/ui-background" }` to `tsconfig.client.json`.
5. **Expose the settings namespace**: add `'chat-background'` to `WEB_SETTINGS_NAMESPACES` in `packages/host/apiproxy/src/api-proxy.ts` so the browser can read/write it.

Then `pnpm run build:lib:client` and run `pnpm dsh web`. A "对话背景 / Conversation background" row appears in General settings (upload, wash-opacity slider, clear).

## License

MIT — see [LICENSE](LICENSE). The plugin is derived from upstream DeepSeek Harness conventions and depends on [`@deepseek-ai/dsh-*`](https://github.com/deepseek-ai/deepseek-harness) packages.
