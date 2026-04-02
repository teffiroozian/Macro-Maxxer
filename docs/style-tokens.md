# UI Style Tokens (Tailwind + semantic utilities)

Use semantic token classes instead of arbitrary Tailwind bracket values for **spacing**, **radius**, **border opacity**, and **elevation/shadows**.

## Allowed semantic tokens

- Surfaces: `card-surface`, `card-surface-muted`, `surface-muted`
- Radius: `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`, `radius-pill`
- Border opacity: `border-soft`, `border-subtle`, `border-strong`
- Elevation: `elevation-1`, `elevation-2`, `elevation-3`
- Spacing helpers: `inset-sm`, `inset-md`, `inset-lg`, `stack-sm`, `stack-md`, `stack-lg`

## Usage rules

1. Prefer semantic tokens above over bracket utilities such as `rounded-[14px]`, `shadow-[...]`, `border-[rgba(...)]`, `p-[18px]`, or `gap-[10px]`.
2. Bracket values are allowed only when there is no existing token (example: very specific animation constraints), and should be documented in the PR.
3. For new card-like UI, start with: `card-surface radius-lg elevation-1` and adjust semantically.

## Linting

ESLint now flags common arbitrary token patterns in `className` strings where possible:
- `rounded-[...]`
- `shadow-[...]`
- `border-[...]`
- spacing brackets (`p-[...]`, `px-[...]`, `py-[...]`, `m-[...]`, `gap-[...]`)

If you need a one-off bracket class, add an inline disable + short justification.
