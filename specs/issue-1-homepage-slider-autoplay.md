# Issue #1 Comment: Homepage Slider Autoplay

Sources:

- Issue: https://github.com/danh2002/khunglongshop/issues/1
- Comment: https://github.com/danh2002/khunglongshop/issues/1#issuecomment-4688351387
- Screenshot attachment: https://github.com/user-attachments/assets/cf38eea0-fe30-44f8-bbba-a7afa3d77690

## Overview

The issue comment requests: `Tôi muốn slider ở trang chủ tự chuyển động`.

The homepage currently renders `components/Hero.tsx` from `app/page.tsx`. `Hero` is the active homepage carousel and already contains a basic `setInterval` autoplay path when there are at least two slides and `prefers-reduced-motion` is not enabled. This spec formalizes the desired autoplay behavior so it is predictable, accessible, testable, and aligned with the visual slider shown in the comment screenshot.

`components/SimpleSlider.tsx` is an older `react-slick` slider component exported from `components/index.ts`, but it is not used by the current homepage. It should not be the implementation target unless the homepage is intentionally changed to render it again.

## Goals

- Make the homepage hero slider automatically advance without user input.
- Preserve manual previous, next, and dot navigation.
- Respect `prefers-reduced-motion: reduce`.
- Pause autoplay while the user is interacting with the slider.
- Resume autoplay after interaction ends.
- Keep the current dark `#070707` and orange `#e85d00` storefront style.
- Add regression tests so autoplay does not silently disappear.

## Non-Goals

- No redesign of the homepage hero layout.
- No replacement of `Hero` with `SimpleSlider`.
- No change to product selection, catalog visibility, pricing, checkout, or blind-box allocation.
- No new database fields or Prisma migration.
- No new slider library.
- No autoplay for non-homepage carousels unless they already use the shared behavior intentionally.

## Current Codebase Findings

- `app/page.tsx` renders `<Hero products={products} variantImages={variantImages} />` as the first homepage section.
- `components/Hero.tsx` derives slides from `featured.mainImage` and `variantImages`, capped at five images.
- `Hero` currently advances every `5000ms` with `window.setInterval`.
- Autoplay currently stops when `window.matchMedia("(prefers-reduced-motion: reduce)")` matches.
- Manual controls exist: previous arrow, next arrow, and dot buttons.
- `components/homeStyles.ts` and `app/globals.css` already include reduced-motion conventions.
- Existing unit tests are mostly static/module tests with Vitest; timer behavior for this feature must use fake timers.

## Functional Requirements

### FR-1: Autoplay Activation

The homepage hero carousel must automatically move from the active slide to the next slide.

Rules:

- Autoplay starts only when `slides.length >= 2`.
- Autoplay interval is `5000ms` by default.
- After the last slide, autoplay wraps to the first slide.
- The first slide remains the initial slide on page load.
- Autoplay must not start when there is zero or one slide.

### FR-2: Reduced Motion

Autoplay must respect the user's motion preference.

Rules:

- If `prefers-reduced-motion: reduce` is active, autoplay does not start.
- Slide transition animation should remain disabled or near-instant under reduced motion using existing global conventions.
- Manual controls remain usable when reduced motion is active.

### FR-3: User Interaction Pause

Autoplay must pause while the user is actively interacting with the carousel.

Pause triggers:

- Mouse hover enters the hero area.
- Keyboard focus enters any carousel control.
- The user clicks previous, next, or a dot.
- The browser tab becomes hidden.

Implementation notes:

- Use `onMouseEnter`/`onMouseLeave`, not `onPointerEnter`/`onPointerLeave`.
- Pen hover via mouse-compatible events is acceptable if the browser emits them, but pen support is best-effort and not a hard requirement.
- Touch tap must not pause autoplay because touch devices have no stable hover state.

Resume triggers:

- Mouse hover leaves the hero area.
- Keyboard focus leaves the hero area.
- After manual click interaction, autoplay resumes after one full interval only if no pause source remains active.
- The browser tab becomes visible again.

Pause-state precedence:

- Pause sources are: hover, focus-inside, tab-hidden, and reduced-motion.
- Any active pause source keeps autoplay paused.
- Manual navigation by click or keyboard resets the five-second timer but does not clear pause sources.
- Autoplay only runs when all pause sources are inactive.
- After click: if focus remains inside the hero, autoplay stays paused until blur.

Keyboard focus rules:

- `onBlur` must check `event.currentTarget.contains(event.relatedTarget as Node)`.
- Only resume autoplay if focus has truly left the hero container.
- Focus moving between arrow and dot controls must not resume autoplay.

Tab visibility rules:

- Autoplay must pause when `document.visibilityState === "hidden"`.
- Autoplay must resume when `document.visibilityState` becomes `"visible"` again.
- Implement this with a `visibilitychange` event listener in the autoplay hook.

### FR-4: Manual Navigation

Manual controls must continue to work exactly as expected.

Rules:

- Previous arrow moves to the previous slide and wraps from first to last.
- Next arrow moves to the next slide and wraps from last to first.
- Dot button selects the corresponding slide.
- Manual navigation resets the autoplay timer so the next automatic transition does not happen immediately after a click.

### FR-5: Accessibility

The carousel must expose clear accessible semantics.

Rules:

- Keep `aria-roledescription="carousel"` on the hero shell.
- Use a readable Vietnamese `aria-label`, for example `Sản phẩm nổi bật`.
- Each dot button must expose `aria-label="Xem slide N"`.
- The active dot should expose `aria-current="true"` or an equivalent selected state.
- Non-active slides should remain hidden from assistive technology with `aria-hidden`.
- Arrow labels should be corrected Vietnamese text: `Slide trước` and `Slide tiếp theo`.

### FR-6: Visual Behavior

Autoplay must feel smooth without changing the homepage design.

Rules:

- Keep the existing fade/scale transition timing unless performance testing shows a regression.
- Do not introduce layout shift when slides change.
- Images continue to use `next/image` with stable `fill` layout and `sizes="100vw"`.
- The hero remains responsive across desktop, tablet, and mobile.

### FR-7: Legacy Slider Boundary

`components/SimpleSlider.tsx` is not part of this change unless a future design decision reintroduces it.

Rules:

- Do not wire `SimpleSlider` into the homepage as part of this issue.
- Do not add duplicate autoplay behavior to `SimpleSlider` for this issue.
- If `SimpleSlider` is unused after verification, flag it as cleanup candidate in a separate refactor.

## UX Flow

1. Visitor opens the homepage.
2. The first hero slide is visible.
3. After approximately five seconds, the hero automatically moves to the next slide.
4. The visitor hovers the hero with a mouse; autoplay pauses.
5. The visitor moves the mouse away; autoplay resumes.
6. The visitor taps the hero on a touch device; autoplay does not pause because touch has no stable hover state.
7. The visitor clicks a dot; that slide becomes active and the autoplay timer restarts.
8. If focus remains inside the hero after the click, autoplay stays paused until focus leaves the hero.
9. The visitor moves keyboard focus between carousel controls; autoplay stays paused while focus remains inside the hero.
10. The visitor switches to another browser tab; autoplay pauses while hidden and resumes when the tab becomes visible.
11. The visitor enables reduced motion at OS/browser level; the hero no longer auto-advances, but controls still work.

## Architecture Decisions

### Decision 1: Implement In `Hero`

Use `components/Hero.tsx` as the implementation target.

Rationale:

- It is the actual homepage slider rendered by `app/page.tsx`.
- It already owns slide derivation, active slide state, and manual controls.
- It already has a reduced-motion check, so the change can stay localized.

Alternative considered:

- Reintroduce `SimpleSlider`.
- Rejected because it is not currently rendered, uses the older electronics-themed copy/images, and would conflict with the current Vanie storefront direction.

### Decision 2: Extract A Tested Autoplay Hook

Extract autoplay state into a small internal helper or hook. This is required because timer, pause/resume, manual restart, cleanup, and tab visibility behavior need focused fake-timer tests.

Confirmed hook test setup:

- Add `@testing-library/react` and `jsdom` as devDependencies if they are not already present.
- Use `renderHook` from `@testing-library/react` with fake timers.
- In this Vitest project, use `vi.useFakeTimers()`; if a Jest runner is introduced later, use the equivalent `jest.useFakeTimers()`.

Rejected alternative:

- Extract a pure timer controller with no React dependencies and test it in Node without a renderer.
- This remains a valid future option, but this issue uses the React hook testing stack so lifecycle cleanup and event listeners are covered directly.

Recommended shape:

```ts
function useCarouselAutoplay({
  slideCount,
  intervalMs,
  isPaused,
  onAdvance,
}: {
  slideCount: number;
  intervalMs: number;
  isPaused: boolean;
  onAdvance: () => void;
}) {
  // Owns reduced-motion, visibilitychange, timer restart, and interval cleanup.
}
```

Rationale:

- Keeps interval setup, cleanup, pause, reduced-motion, and tab-visibility logic testable.
- Avoids spreading timer rules through render handlers.

### Decision 3: Timer Behavior Requires Fake-Timer Tests

Timer behavior must use fake-timer unit tests. In this repository, use Vitest fake timers (`vi.useFakeTimers()`); if a Jest runner is introduced later, use the equivalent `jest.useFakeTimers()`.

Rationale:

- Source assertions cannot prove autoplay start, pause, resume, restart, or cleanup behavior.
- Extracted hook tests can verify the timer contract without requiring a full browser E2E setup.
- Static/source tests may still cover copy and wiring, but not timer behavior.

Required hook test coverage:

- Autoplay starts after `HERO_AUTOPLAY_INTERVAL_MS`.
- Autoplay pauses on hover.
- Autoplay resumes after hover.
- Autoplay restarts after manual navigation.
- Manual navigation resets the timer but does not clear active pause sources.
- Autoplay pauses when the tab is hidden.
- Autoplay resumes when the tab becomes visible.
- Interval is cleared on unmount.

## API Contracts

No public API changes are required.

Inputs remain:

```ts
type HeroProps = {
  products?: Product[];
  variantImages?: string[];
};
```

No database, Prisma, or route contract changes are required.

## Implementation Plan

1. Confirm `Hero` is the only homepage slider rendered by `app/page.tsx`.
2. Add explicit autoplay constants in `components/Hero.tsx`:
   - `HERO_AUTOPLAY_INTERVAL_MS = 5000`.
3. Install `@testing-library/react` and `jsdom` if not present.
4. Extract autoplay behavior into a hook with `renderHook` fake-timer tests.
5. Add pause state:
   - `isAutoplayPaused`.
6. Model pause sources explicitly:
   - hover.
   - focus-inside.
   - tab-hidden.
   - reduced-motion.
7. Pause on:
   - `onMouseEnter`.
   - `onFocusCapture`.
   - manual arrow/dot clicks.
   - `document.visibilityState === "hidden"`.
8. Resume on:
   - `onMouseLeave`.
   - `onBlurCapture` when focus has truly left the hero.
   - `document.visibilityState === "visible"`.
9. In `onBlur`, use `event.currentTarget.contains(event.relatedTarget as Node)` so focus moving between arrow and dot controls does not resume autoplay.
10. Reset the interval after every manual navigation without clearing active pause sources.
11. Preserve the existing reduced-motion guard.
12. Add active-dot selected state.
13. Fix mojibake in visible/ARIA text touched by `Hero` using these exact strings:
    - Carousel label: `Sản phẩm nổi bật`.
    - Variant image alt suffix: `mẫu`.
    - Eyebrow: `Ra mắt 2025`.
    - Subtitle: `Bộ sưu tập 10 nhân vật, một mẫu ngẫu nhiên trong mỗi hộp.`
    - Previous arrow label: `Slide trước`.
    - Next arrow label: `Slide tiếp theo`.
    - Dot label: `Xem slide N`.
14. Add focused fake-timer tests for:
    - interval constant.
    - reduced-motion guard.
    - mouse/focus pause handlers.
    - manual navigation reset behavior.
    - click dot while hovering: timer resets and autoplay stays paused.
    - click dot, then move mouse out: autoplay starts a fresh five-second timer.
    - tab hidden/visible pause and resume.
    - interval cleanup on unmount.
    - active dot accessibility state.
15. Run:
    - `npm run type-check`.
    - focused Vitest tests.
    - `npm run lint`.
    - build if no active dev-server file lock blocks `.next`.

## Acceptance Criteria

- Homepage hero automatically advances every five seconds when at least two slides exist.
- Autoplay wraps from the last slide back to the first.
- Autoplay does not run for zero or one slide.
- Autoplay does not run when `prefers-reduced-motion: reduce` is active.
- Hovering with a mouse, or focusing the hero, pauses autoplay.
- Leaving hover/focus resumes autoplay.
- Touch tap does not pause autoplay.
- Clicking arrows or dots changes slides manually and restarts the autoplay timer.
- Manual navigation does not clear active pause sources.
- If focus remains inside the hero after a click, autoplay stays paused until blur.
- If the user clicks a dot while hovering, the timer resets and autoplay stays paused.
- If the user clicks a dot and then moves the mouse out, autoplay starts a fresh five-second timer.
- Autoplay pauses while the browser tab is hidden and resumes when the tab becomes visible again.
- Previous, next, and dot controls remain keyboard accessible.
- Active dot exposes a selected/current state.
- No homepage layout shift is introduced by slide changes.
- `SimpleSlider` is not reintroduced into the homepage.
- No API, Prisma schema, product, checkout, or server behavior is changed.

## Test Strategy

### Unit Tests

- Use `renderHook` from `@testing-library/react` plus fake timers for autoplay behavior (`vi.useFakeTimers()` in Vitest, or `jest.useFakeTimers()` if the project later uses Jest for this suite).
- Verify autoplay starts after `5000ms`.
- Verify autoplay does not start with zero or one slide.
- Verify autoplay does not start when `prefers-reduced-motion: reduce` matches.
- Verify autoplay pauses on mouse hover and resumes after hover leaves.
- Verify touch tap does not pause autoplay.
- Verify manual arrow/dot navigation restarts the timer.
- Verify manual navigation does not clear hover, focus-inside, tab-hidden, or reduced-motion pause sources.
- Verify click dot while hovering resets the timer and keeps autoplay paused.
- Verify click dot, then move mouse out, starts a fresh five-second timer.
- Verify `onBlur` resumes only when focus leaves the hero container.
- Verify focus moving between arrow and dot controls does not resume autoplay.
- Verify autoplay pauses when `document.visibilityState === "hidden"`.
- Verify autoplay resumes when `document.visibilityState === "visible"`.
- Verify interval cleanup on unmount.

### Static Tests

- Assert `components/Hero.tsx` defines `HERO_AUTOPLAY_INTERVAL_MS = 5000`.
- Assert dot buttons expose `aria-current` or equivalent selected state.
- Assert arrow labels and visible strings use readable UTF-8 Vietnamese copy.

### Manual QA

- Open homepage with at least two hero images.
- Wait five seconds and verify the next slide appears.
- Click next and previous arrows.
- Click each dot.
- Hover the hero for longer than five seconds and confirm the slide does not advance.
- Move pointer away and confirm autoplay resumes.
- Click a dot while hovering and confirm autoplay stays paused.
- Click a dot, move the mouse out, and confirm the next automatic slide waits a fresh five seconds.
- Tap the hero on a touch viewport and confirm autoplay does not pause because of the tap.
- Enable reduced motion in the OS/browser and confirm autoplay stops.
- Switch to another tab for longer than five seconds, return, and confirm autoplay paused while hidden and resumes after the tab becomes visible.
- Check mobile viewport to confirm no controls or slide images overflow.

### Regression

- Homepage product data still comes from `getHomepageProducts()`.
- Product links still point to `/product/{featured.slug}`.
- `next/image` still receives normalized catalog images.
- No hidden/internal catalog products are exposed because of this change.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Autoplay continues while user is trying to interact | Annoying UX and accessibility issue | Pause on mouse hover/focus/manual controls |
| Timer leak after route transitions | Memory/performance issue | Always clear interval in effect cleanup |
| Reduced-motion users still see movement | Accessibility regression | Keep explicit `matchMedia` guard |
| Immediate auto-advance after manual click | Feels broken | Reset timer after manual navigation |
| Background tab keeps advancing slides | Wasted work and surprising return state | Pause on `visibilitychange` while hidden |
| Work targets unused `SimpleSlider` | No visible homepage change | Treat `Hero` as the implementation target |

## Confirmed Decisions

- Autoplay interval remains exactly `5000ms` for this issue. CMS configurability is out of scope.
- Add `@testing-library/react` and `jsdom`; use `renderHook` with fake timers for hook tests.
- Pause-on-pointer applies to mouse hover only, not touch.
- Pen hover via mouse-compatible events is acceptable if the browser emits them, but not required.
- Focus, hover, hidden-tab, and reduced-motion pause states win over manual timer reset.
- Manual reset applies only when no pause source remains active.
- Extract the autoplay behavior into a hook and test it with fake timers.
- Autoplay pauses when the browser tab is hidden and resumes when the tab becomes visible.
- Mobile keeps the current hidden-arrow behavior.

## Recommended Defaults

- Use `5000ms` interval for this issue.
- Keep current mobile arrow behavior.
- Do not add swipe support yet.
- Do not add CMS settings yet.
- Add only local `Hero` behavior and tests.
