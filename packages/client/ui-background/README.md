# @deepseek-ai/dsh-client-ui-background

English | [中文](README.zh.md)

Standalone conversation-background plugin: lets a user set a global wallpaper behind the chat column, adjust a readable wash over it, and clear it, all persisted in the user-settings document. It is a pure CSS/UI enhancement — it **never edits the stock conversation shell's source**; it overrides the rendered DOM by matching stable data attributes and paints the wallpaper through CSS variables on the document root.

## What it does

Its node half registers the `chat-background` settings namespace (fields `imageDataUrl`, `opacity`). Its browser half binds that namespace, writes the current snapshot into CSS variables (`--dsh-bg-image`, `--dsh-bg-wash-opacity`) on `document.documentElement`, and installs one plugin-owned `<style>` tag with an enhancement stylesheet.

The stylesheet:

- paints a full-bleed wallpaper behind the column content via `[data-phase]::before` and a readable wash via `[data-phase]::after`, both driven by those variables (so both light/dark palettes keep their own tint through the wash opacity);
- turns the docked input into a floating island via `[data-phase][data-phase='active'] [data-composer-seat]`: it narrows the seat to the card width, centers it, and removes the stock bottom fade — so the wallpaper stays visible on both sides.

Because the rules match stock data attributes (`data-phase`, `data-conversation-scroll`, `data-composer-seat`), they degrade gracefully: if a future shell renames an attribute, the affected override simply stops applying (the column keeps its default tint) rather than breaking the shell.

## Settings row

A General-section row (`settings.general.item`) offers upload, a wash-opacity slider (0–100), and clear. The file pick is a hidden `input[type=file]` the row's button triggers; the picked raster is downsampled to at most 2560px on the longest side and re-encoded (WebP when supported, else JPEG) before it reaches the settings document, so the settings file and the rendered column stay small.

The plugin exposes no model-visible tool: it is a pure UI/settings feature.

## Model Experience

None, as the background is a browser/settings surface; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Inline data URL in the settings document** — a large picture enlarges `$DSH_HOME/settings.yaml`; the 2560px / ~85% quality downsample bounds this rather than eliminating it.
- **Global only** — the background is process-wide, not per-session; per-session backgrounds are deferred.
- **Style overrides track the shell's data attributes** — because the plugin does not edit shell source, its enhancement depends on the DOM attributes it matches; a shell restructure may need a version bump of this plugin to re-target.
