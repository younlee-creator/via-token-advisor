# Via Token Advisor — Project Brief


## Background

Vibe-coded products often look visually close to a design system but feel slightly off in practice. They tend to use the right components while missing proper semantic token assignments in custom UI — things like `background-primary`, `text-secondary`, and similar tokens.

This pattern shows up frequently in Figma — not just in early prototypes but also in final design deliverables and live prototypes.

Correct token usage matters for long-term scalability: it supports rebranding, color theming, accessibility, and consistent behavior across light and dark modes. It also contributes to a more cohesive experience and a shared visual language across products.

There's often a gap between understanding token concepts and applying them consistently in real product UI. Via Token Advisor was built to make those decisions more intuitive and scalable — available both as an MCP server and as a web app.

### Use Cases

Designers rely heavily on design system components, which are built on top of foundational tokens. However, there are many situations where they need to create custom components or one-off page layouts outside of what the design system provides. In those cases, using the correct semantic tokens ensures that custom work stays visually and behaviorally consistent with the rest of the system — maintaining semantic roles, supporting dark mode, and making it easier to share or contribute work back to the design system.

## Benefits

- Encourages better semantic alignment between design and implementation.
- Reduces inconsistencies in custom UI patterns.
- Helps design system designers make more informed and consistent token decisions while designing and building Via components.
- Streamlines the design system contribution process by making token usage easier to apply correctly from the start.
- As Via introduces new token systems, both the web app and MCP serve as practical tools for understanding and exploring those token systems — for designers and contributors alike.

## Notes

- Writing directly to Figma files for token assignment (including creating frames or assigning tokens) is still not fully reliable as of this week. It also takes considerable time.
- The web app required multiple rounds of refinement to improve both the recommendation logic and the rationale quality. The MCP implementation is noticeably more reliable.
- Fallback handling needs more work.
  - Token recommendations rely on authored `notFor`/`pairWith` metadata, with a text-parsing fallback when those fields are absent. However, both approaches are still limited to what's captured in token descriptions. Results improve significantly when the AI can also reference actual usage patterns in Figma, since Figma is the source of truth for Via components.

## Lessons Learned

- Vibecoding the web app
  - Cursor used `tokens.css` as the primary reference when building the web app. The initial output looked visually similar to a MongoDB product, but many token values were incorrectly assigned on closer review.
  - The CSS was updated to align with the token data and descriptions used by the advisor, so Cursor could generate the web app using the same semantic logic and guidance.
  - This process required several iterations and very explicit direction. Vague feedback like "the web app doesn't use the correct colors" wasn't actionable. Specific guidance worked much better — for example: "This text is currently using `xxxx`, but it should use `text-secondary` because it better matches the semantic purpose of the UI."
- Writing back to Figma is still not effective for token assignment or design modification. AI performs reasonably well for commenting and annotation workflows, but not for directly modifying designs or assigning tokens.
  - Direct token assignment (typography only): ~5 min 30 sec + ~3 min for colors
  - Annotation-based workflow using custom frames: ~4 min 20 sec

## Further Ideas

- **Component recommendations** — Once Via matures, recommend replacing custom UI patterns with existing Via components where applicable.
- **Spacing guidelines** — Potentially more impactful than color or typography recommendations. Page-level spacing guidance could significantly improve consistency across products.
- **Migration tooling** — Explore workflows and tooling to support large-scale migration and token adoption across existing products.
