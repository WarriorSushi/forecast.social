/**
 * Renders a JSON-LD <script type="application/ld+json"> server-side.
 * Used to surface profile + market structured data to crawlers. Keep
 * the data SAFE: serialize a plain object, never user-supplied raw
 * HTML. Server-only.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return (
    <script
      type="application/ld+json"
      // Plain object → JSON serialization; React escapes the string as
      // a text node, but we use dangerouslySetInnerHTML so the
      // unescaped JSON stays parseable for crawlers.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
