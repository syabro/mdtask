```markdown
# Design System Specification

## 1. Overview & Creative North Star: "The Digital Manuscript"
This design system rejects the rounded, bubbly aesthetic of consumer SaaS in favor of a rigorous, high-fidelity editorial experience. The Creative North Star is **"The Digital Manuscript"**—a fusion of Swiss International Style and terminal-based utility. 

We achieve a premium feel not through shadows or gradients, but through **extreme typographic precision** and **intentional asymmetry**. By utilizing a monospace-only scale, we honor the developer's medium (the code editor) while elevating it to a gallery-grade interface. The experience should feel like a well-set technical manual: authoritative, sparse, and impeccably organized.

---

## 2. Colors & Surface Architecture
The palette is rooted in a "Milky" monochromatic base, using high-contrast ink-black for readability and restricted neon-accents for functional signaling.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Interfaces must never be "boxed in." Boundaries are defined solely through background color shifts. To separate a sidebar from a main content area, use `surface-container-low` (#f2f4f3) against the primary `background` (#f9f9f8).

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, un-rounded sheets of paper. 
- **Base Layer:** `surface` (#f9f9f8) for the main application canvas.
- **Mid Layer:** `surface-container-low` (#f2f4f3) for secondary navigation or side-panels.
- **Top Layer:** `surface-container-lowest` (#ffffff) for active task cards or modals to create a "bleached" focus effect.

### Signature Textures
While the system is minimalist, CTAs should utilize a subtle vertical shift from `primary` (#5f5e5e) to `primary-dim` (#535252) to provide a tactile "pressed" feel without breaking the flat aesthetic.

---

## 3. Typography: Monospace Rigor
We use **Space Grotesk** (set with monospace metrics) or a dedicated high-end mono font for the entire system. Hierarchy is created through drastic scale jumps, not font-family changes.

| Level | Size | Token | Role |
| :--- | :--- | :--- | :--- |
| **Display LG** | 3.5rem | `display-lg` | Hero headers, massive task counts. |
| **Headline MD** | 1.75rem | `headline-md` | Section titles, project names. |
| **Title SM** | 1.0rem | `title-sm` | Task headers, bold utility labels. |
| **Body MD** | 0.875rem | `body-md` | Standard task descriptions, metadata. |
| **Label SM** | 0.6875rem | `label-sm` | Terminal-style timestamps, status tags. |

**Editorial Note:** Use `uppercase` and `letter-spacing: 0.05em` for `label-sm` to create a "technical spec" aesthetic. Always align text to a strict baseline grid to maintain the "manuscript" feel.

---

## 4. Elevation & Depth
In this system, depth is "baked in" rather than "projected."

*   **The Layering Principle:** To highlight a code block, do not use a border. Place the code block on a `surface-container-highest` (#dde4e3) background. The contrast between the milky base and the slightly cooler grey creates a natural indentation.
*   **The "Ghost Border" Fallback:** If a UI element (like a dropdown) overlaps complex content and requires a boundary, use a "Ghost Border": `outline-variant` (#adb3b2) at **15% opacity**. It should be felt, not seen.
*   **Ambient Shadows:** For floating command palettes only, use a "Vapor Shadow": 
    *   `box-shadow: 0 20px 40px rgba(45, 52, 51, 0.04);`
    *   This mimics natural light hitting a heavy sheet of paper.

---

## 5. Components

### Buttons
*   **Primary:** Solid `on_surface` (#2d3433) background, `surface` (#f9f9f8) text. Sharp 0px corners.
*   **Secondary:** `surface-container-high` (#e4e9e8) background. No border. 
*   **States:** On hover, primary buttons should shift to `primary-dim`. On click, 1px inset "Ghost Border."

### Input Fields
Forbid the "four-sided box" input. Use a single bottom-stroke of `outline` (#757c7b) or a background fill of `surface-container-low`.
*   **Focus State:** The bottom-stroke thickens to 2px using `tertiary` (#0059cb).

### Cards & Lists
*   **Strict Rule:** No divider lines between list items. Use the spacing scale `spacing-4` (1.4rem) to create clear breathing room between tasks.
*   **Selection:** A selected list item should use a `secondary_fixed` (#72ff70) 4px vertical "accent bar" on the extreme left edge.

### Terminal Accents (Status Indicators)
*   **Success:** `secondary` (#006f16) - Used for "Completed" or "Deployed" status.
*   **Warning/Error:** `error` (#9f403d) - Reserved for "Overdue" or "Bug."
*   **Execution:** `tertiary` (#0059cb) - Used for active processes or "In Progress."

---

## 6. Do’s and Don’ts

### Do
*   **Do** use extreme whitespace (`spacing-16` and above) to separate major functional groups.
*   **Do** lean on font weight (Regular vs. Bold) to establish hierarchy within the monospace constraint.
*   **Do** keep all corners at 0px. The "chic" comes from the architectural sharpness.

### Don’t
*   **Don’t** use icons unless absolutely necessary. Prefer text labels (e.g., `[+] NEW TASK` instead of a plus icon).
*   **Don’t** use center alignment. This system is built on a rigid left-aligned grid, mimicking code indentation.
*   **Don’t** use "Soft" colors. If a color is used, it must be functional (Terminal Green, Error Red) or structural (The Milky Off-White).