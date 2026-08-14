/**
 * The plugin's enhancement stylesheet as an inline string, installed by apply
 * into a plugin-owned <style> tag. Inlined (rather than a .module.css import)
 * because the rules must match stock-shell data attributes, not hashed classes.
 */

/** DOM id of the plugin-owned <style> tag (idempotent installs skip if present). */
export const STYLE_TAG_ID = 'dsh-client-ui-background-styles'

/** The stylesheet text injected into the page. */
export const ENHANCEMENT_CSS = `
/* dsh-client-ui-background enhancement stylesheet.
   Overrides the stock conversation shell by matching stable data attributes;
   the wallpaper and wash ride CSS variables on the document root. Degrades
   gracefully (keeps the default tint) if a future shell renames an attribute. */

[data-phase] { position: relative; }

[data-phase]::before {
  content: ''; position: absolute; inset: 0; z-index: 0;
  background-image: var(--dsh-bg-image, none);
  background-position: center; background-size: cover; background-repeat: no-repeat;
  pointer-events: none;
}

[data-phase]::after {
  content: ''; position: absolute; inset: 0; z-index: 0;
  background-color: var(--dsw-alias-bg-base);
  opacity: var(--dsh-bg-wash-opacity, 0);
  pointer-events: none;
}

[data-phase] > [data-conversation-scroll] { position: relative; z-index: 1; }
[data-phase] > :last-child:not([data-conversation-scroll]) { position: relative; z-index: 1; }

[data-phase][data-phase='active'] [data-composer-seat] {
  width: min(100%, var(--dsh-composer-card-max-width));
  align-self: center;
  background: transparent;
}
`
