# PROJECT_STATUS

Living status log for AniTrack development sessions. Newest session at
the top.

---

## Session: Commercial-launch critique of the Trading Card system (Phase 20)

**A "do not defend the existing implementation" review.** Five prior
phases (16-19) had already polished this system considerably — this
session's job was to find what still wasn't good enough for a real
commercial launch, prove each finding with actual rendering (not just
re-reading code), and fix what was worth fixing. All six findings below
were caught by rendering real cards and measuring/testing them, not by
inspection — several would have looked completely reasonable from the
code alone.

### Findings

1. **Evolution material tints clash with the card's own identity
   color.** `applyRarityEvolution` recolored the outer border and
   genre ornament to the evolved tier's material tint, but the gem,
   crest, hairline, nameplate top edge, and rarity label all stayed on
   `--tcg-accent` (the character's theme color) — never updated.
   Rendered a real Adventure-genre card at evolution tier 5 ("Diamond
   Navigator," a pale ice-blue #B9E7F5) and confirmed it live: a
   cyan-white border and ornament sitting against a gold gem, crest,
   and hairline on the exact same card — two different cards' worth of
   color in one object, undermining the "this has transformed into
   something special" read a real collectible variant should have.
2. **Evolution flavor names were computed and never shown anywhere.**
   `card.dataset.evolutionName = tier.name` has existed since Phase 5
   — genuinely authored names like "Diamond Navigator," "Celestial
   Gold," "Astral Ascension" — but nothing in the UI ever read that
   attribute. Confirmed via grep: the only two references to
   `evolutionName` in the whole file were the line that sets it and
   the line that never reads it. A real, deliberately-designed
   collectibility payoff, sitting invisible in the DOM.
3. **The Rarity/Card Number footer (Phase 18) failed WCAG AA
   contrast, and was borderline illegible regardless.** Computed the
   actual sRGB contrast by hand: `.tcg-card-number`'s `opacity:.75` on
   top of the already-tuned `--fg-faint` measured ~3.68:1 against the
   nameplate background — below the 4.5:1 minimum for normal text —
   and the whole footer sat at 8px, smaller than any other text on the
   card. Separately measured `.tcg-card-rarity`'s raw accent-as-text-
   color choice and found several genre accents (Military 3.57:1,
   Horror 3.73:1, Supernatural 3.77:1) also failed outright, unrelated
   to Phase 18 — a pre-existing gap this session's own rigor happened
   to surface.
4. **The "bleed" mechanism (Phase 18) does not render anything, at any
   border width.** Built two isolated test cards — one with a 1px
   border, one with a 6px border, both with `.tcg-card-art-bleed`
   active and a solid-red art fill — and confirmed via screenshot: 0%
   of the intended overshoot was visible in either case. Root cause:
   `overflow:hidden` always clips at the padding-box edge (inside the
   border), by CSS specification, regardless of box-sizing or how far
   a child's negative inset tries to reach past it. No tuning fixes
   this — it's a hard architectural mismatch between "let art bleed
   past a real CSS `border`" and how overflow-clipping actually works.
   The class and its always-on wiring were computing geometry the
   browser was guaranteed to discard.
5. **The art panel's vignette washes out to white in light theme.**
   Nothing in this system had ever been screenshotted in light theme
   before this session. `.tcg-card-vignette` faded the art toward
   `var(--bg-card)` — correct-looking in dark theme (fades toward
   near-black, reads as a moody photographic vignette) but in light
   theme `--bg-card` is white, so the same technique bleached the
   bottom of every portrait instead, looking like a printing defect,
   not a design choice.
6. *(Caught during this session's own verification of fix #3, before
   shipping)* **The accessibility fix for finding #3 would have broken
   light theme.** Mixing `.tcg-card-rarity`'s color toward white
   raises contrast against dark theme's dark nameplate, but the exact
   same mix lowers contrast against light theme's white one — a pale
   evolution tint mixed further toward white measured ~1:1 (invisible)
   there. Caught by actually rendering the light-theme card after the
   first version of the fix, not assumed safe because the math worked
   for one theme.

### Fixes

1. **`applyAccentVars(card, accent, hairlineAlpha)`** — extracted the
   five accent-derived custom-property assignments (tint, hairline,
   inset-glow, hover-glow, foil-tint) that used to be five inline
   `hexToRgba` calls in `buildTradingCard`, into one reusable function.
   `applyRarityEvolution` now calls this SAME function with the
   evolved tier's tint at level 3+, so the gem/crest/hairline/
   nameplate-border/rarity-label all shift together with the border —
   deliberately gated at tier 3+, not tier 0, since early tiers'
   tints are often duller than a character's own theme color by
   design, and forcing every common card's icons to dim along with a
   muddy entry-tier material would be a regression for the vast
   majority of cards that never evolve past those tiers. Tier 3 also
   matches where the ornament glow already kicks in — an existing
   threshold, not a new one invented for this fix.
2. **`buildCharacterTradingCard` now resolves `evolutionTierName`**
   (the same lookup `applyRarityEvolution` does internally, read
   earlier so the footer template — built before that function ever
   runs — can use it) and prefers it over the plain rarity tier word.
   An evolved character's footer now reads "DIAMOND NAVIGATOR"
   instead of "ICONIC" — the actual authored name, finally visible.
3. Footer bumped 8px → 9.5px; `.tcg-card-number` no longer applies its
   own opacity on top of the parent's already-compliant `--fg-faint`;
   `.tcg-card-rarity` now uses `color-mix()` to lighten (dark theme) or
   darken (light theme, via a `[data-theme="light"]` override) the raw
   accent for text use specifically, rather than using it directly —
   verified against the actual worst-case colors in both directions,
   not just the one case that prompted the fix. Added truncation
   (`text-overflow:ellipsis`) to the rarity span alone, since evolution
   names run longer than plain tier words and shouldn't be able to
   squeeze the card number.
4. **Removed `.tcg-card-art-bleed` and all its wiring** — the CSS
   rules, the `opts.bleed` doc comment, the `bleed:true` always passed
   from `buildCharacterTradingCard`, and the class-concatenation logic
   in `buildTradingCard`. Documented in place (both where the CSS used
   to live and in `.tcg-card-hairline`'s own comment) why it's gone
   rather than left as unused-but-harmless: `.tcg-card-hairline` is the
   genuinely working version of "artwork overlaps the frame," and now
   carries that claim alone.
5. `.tcg-card-vignette` now fades to a fixed `#161B22` (dark theme's
   own `--bg-card`, hardcoded rather than referenced) regardless of
   active theme — a vignette is a darkening effect by definition (real
   camera vignettes darken, never lighten), so tying it to the theme's
   own surface color was the actual bug. Dark theme is byte-for-byte
   unchanged; light theme now gets a real vignette instead of a
   washout, and it now also blends more naturally into the nameplate's
   pre-existing upward-cast dark box-shadow directly below it.

### A meta-observation on process

Finding #6 is the clearest evidence this session's own "verify before
shipping" discipline mattered, not just for the original six findings:
the FIRST version of fix #3 would have silently introduced a new,
real accessibility bug in light theme while fixing one in dark theme,
and it looked completely correct from the math alone (30% white mix
genuinely does clear 4.5:1 against a dark background — that part of
the reasoning wasn't wrong, it was just incomplete). It was only caught
because this session re-rendered the actual fix in light theme before
moving on, rather than trusting the first passing calculation.

### What was reviewed and found sound (not changed)

- **Visual hierarchy / card proportions**: the 78% art panel, 3-line
  nameplate, and single-glance rarity gem (Phase 18) hold up — nothing
  competes with the portrait for attention.
- **Animation**: cursor tilt/parallax/glare, the foil sweep, and the
  lock/missing-art shimmer are all still tasteful, correctly gated
  behind real hover+fine-pointer detection, and fully neutralized under
  `prefers-reduced-motion` — no changes needed.
- **Frame quality / genre system**: Phase 16's unified card silhouette
  (one border technique, differing only by color/ornament/pattern)
  remains the right call and wasn't revisited.
- **Grid responsiveness**: the 1/2/3-column breakpoint ceiling and
  `--archive-max-width:860px` (Phase 18) still hold at every tested
  viewport, confirmed via the existing regression suite's own explicit
  column-count assertions.

### Known Limitations / explicitly out of scope

- **Mobile catalogue chrome** (search bar, sort tabs, five filter
  dropdowns) consumes most of a 390px-viewport screen before the first
  card is visible — a real, observed responsiveness weakness, but it's
  the surrounding Catalogue page's filter UI, not the Trading Card
  component itself, and rebuilding it was judged out of scope for a
  card-focused review.
- **The Character Detail page's metadata grid** is roughly half
  em-dashes for any character (Species/Height/Occupation/Affiliation/
  Popularity — fields AniList's API simply doesn't provide). This is a
  known, deliberate, previously-documented honesty tradeoff (show
  "unknown," never fabricate), not something this session revisited,
  though it does read as sparse for a "premium" detail view.
- The evolution-color unification (fix #1) only activates at tier 3+;
  a future session could reconsider whether tiers 0-2 should also get
  a lighter-touch version of the same treatment, if the current
  "common cards keep their crisp theme color" tradeoff ever stops
  feeling right.

### Files Modified

`index.html` only. New: `applyAccentVars`. Changed: `buildTradingCard`
(uses `applyAccentVars`, removed bleed class logic + doc comment),
`applyRarityEvolution` (new `hairlineAlpha` parameter, tier-3+ accent
unification), `buildCharacterTradingCard` (`evolutionTierName`
resolution, removed `bleed:true`), `.tcg-card-vignette` (fixed dark
fade target), `.tcg-card-footer`/`.tcg-card-rarity`/`.tcg-card-number`
(size, contrast, truncation, light-theme override), `.tcg-card-hairline`
comment (now the sole documented "overlap" mechanism). Removed:
`.tcg-card-art-bleed` CSS block and every reference to it.

### Testing

Verified live with Playwright throughout — every finding above was
proven by rendering, not inferred from reading CSS/JS. Re-screenshotted
the same evolution-tier-5 Adventure card after the fix: gem, crest,
border, and hairline now render as one consistent pale-blue "Diamond
Navigator" identity, and the footer reads "DIAMOND NAVIGATOR" instead
of "ICONIC." Re-rendered the same card in light theme (`data-theme=
"light"`) both before and after the vignette fix — confirmed the
washout is gone and the art now fades to a proper dark vignette in
both themes. Computed exact WCAG contrast ratios (manual sRGB relative-
luminance math, not eyeballing) for every color decision touched:
footer text before (~3.68:1, fails) and after (inherits the compliant
`--fg-faint`), the rarity label's raw-accent failures (down to 3.57:1)
and its color-mix fix in both theme directions (dark theme worst case
~6.3:1, light theme worst case ~5.5:1, both comfortably clearing
4.5:1). Confirmed via computed styles that `hasBleedClass` is false on
a real rendered card post-fix. Re-ran the full existing regression
suite (`test-char-archive`, `test-char-catalogue` — including its
explicit column-count assertions — `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`, every migration/observer-isolation
script, `test23-character-identity`/`test24-identity-deck-stats`, and
`test35-shared-transition`) after every change — zero regressions,
zero console errors.

---

## Session: Missing Artwork redesign — a premium mystery card, not a broken image (Phase 19)

**A visual-design pass, scoped to one specific gap.** Confirmed the
underlying problem before touching anything: `buildTradingCard` rendered
`<img src="${imageUrl || ""}">` whenever a character had no portrait —
a real, fairly common AniList edge case for background-cast characters,
not a bug in this app's own data — which browsers render as a broken-
image icon. `docs/CHARACTER_TCG_DESIGN.md` §8.6 had actually already
specified the right fix ("renders the same lock-style silhouette
treatment... rather than a broken-image icon") back when the artwork
pipeline was first designed, but it was never implemented — this
session builds it.

### The key design decision: this is NOT the locked state

A locked card (existing, unchanged) means "you haven't unlocked this
character yet" — identity itself is the spoiler, so the whole card
seals shut (no name, no series, no role, nothing but a crest and a
lock). A missing-artwork card is a completely different situation: the
character is fully unlocked and known — name, series, role, rarity,
card number, genre frame all render exactly as they do for any other
unlocked character — AniList just has no picture of them. Conflating
the two would either wrongly re-hide real information behind a lock
icon, or wrongly promise unlock progress will eventually reveal an
image (it won't — the character is already unlocked; more art sources
connecting is what would). This is why the new state only replaces the
`.tcg-card-art` panel, not the whole card the way `.tcg-card-lock`
does.

### Design

Built as five new layers inside the art panel (`.tcg-card-art-missing`):
a soft gradient background (the card's own accent, the same "stronger
wash since there's no real art to carry the color instead" logic the
lock overlay already used), a subtle background pattern (reuses the
exact same per-genre pattern the nameplate already shows —
`TCG_GENRE_PATTERNS` — so genre identity stays visually consistent
whether or not a portrait exists; falls back to a plain woven
crosshatch for a card with no resolved genre), a generic embossed
character silhouette (the existing `CHAR_SILHOUETTE_SVG` icon, "a
person belongs here, we just don't have their picture" — deliberately
NOT the series crest again, since that's already shown small in the
header and repeating it large here would be the exact redundant-icon
mistake a previous session already found and removed elsewhere in this
same card system), a question-mark medallion seal, and a short caption.
Series colors/genre frame/embossed crest/gentle vignette/card frame —
four of the brief's six requested visual ingredients — needed no new
code at all: they're already properties of the card shell that apply
identically regardless of whether the art panel has a real portrait or
this new placeholder, which is exactly what "the card should still
look collectible" means in practice.

**Copy:** "Artwork Unavailable" — not "NO IMAGE." Chosen over the
brief's own other example ("Unknown Character") specifically because
it would be actively wrong here: the character ISN'T unknown, their
name is printed right below in the nameplate — only the portrait is
missing. "Artwork," not "Image," to match this app's own established
vocabulary (`resolveCharacterArtwork`, "Character Artwork Management
System") rather than introducing a second term for the same concept.

**The seal's mark is a literal "?"** — deliberately reusing the exact
character an earlier session removed from the LOCKED state's seal
(replaced there with a padlock SVG, on the reasoning that "?" read as
an unfinished placeholder rather than a real icon). That reasoning
doesn't transfer here: on a locked card, "?" was standing in for a
missing ICON; on a missing-artwork card, "?" is standing in for the
literal question "what do they look like?" — the honest, correct mark
for this specific meaning, not a downgrade of the earlier decision.

### Reuse, not duplication

Rather than writing a second copy of the medallion-ring CSS or the
ambient shimmer animation, both were extended to share their existing
rules with the new state (`.tcg-card-lock-seal, .tcg-card-artmissing-seal`
and `.tcg-card-lock-shimmer, .tcg-card-artmissing-shimmer` — same
declarations, two selectors) rather than copy-pasted — a locked card
and a missing-artwork card now literally share one CSS rule each for
those two effects. `--tcg-lock-tint` was renamed to `--tcg-noart-tint`
and its setter broadened from `if(opts.locked)` to
`if(opts.locked || !imageUrl)`, since "no real art, richer wash needed"
was always the actual underlying condition, not "locked" specifically.
Verified the locked state's own screenshot is pixel-identical before
and after this refactor — the shared-CSS change introduced zero visual
regression to code that was already shipped and tested.

### A real bug caught while building the genre-pattern fallback

First attempt tried to let CSS decide between the genre pattern and the
crosshatch fallback via a higher-specificity `[class*="tcg-pattern-"]`
override rule. Traced through the actual cascade math before shipping
it and found it was backwards: the override rule's higher specificity
would have always won and blanked the background-image, including on
top of a real genre pattern class, not just the crosshatch fallback it
was meant to suppress — it would have silently broken every genre'd
card's pattern, not just cleaned up the fallback case. Fixed by
following this codebase's own established precedent instead (the
nameplate's own genre-pattern div, built a few phases ago, already
solves this exact problem correctly): JS picks exactly one class
(`tcg-pattern-<key>` or `tcg-pattern-fallback`), never both, so there's
no cascade ambiguity to get wrong in the first place.

### Architecture

- Pure function of `imageUrl`'s truthiness at render time — no new
  flag, cache key, or persisted state anywhere records "this character
  has no artwork." This is what makes "the placeholder automatically
  disappears once artwork becomes available, no UI changes required"
  true by construction rather than something that needed separate
  wiring: the instant a caller passes a real `imageUrl`/`artwork.url`
  (a later AniList fetch filling the gap in, or a future Artwork
  Management System source tier connecting), `buildTradingCard` simply
  takes the other branch next time it runs.
- `patternKey` was hoisted above the `if(opts.locked)` branch (previously
  computed only where the nameplate needed it) so both the missing-
  artwork panel and the nameplate read the same resolved genre pattern
  from one place.
- Nothing about `buildCharacterTradingCard`'s call site changed at all
  — this is entirely internal to `buildTradingCard`, keyed off the same
  `opts.image`/`opts.artwork` every caller already provides.

### Files Modified

`index.html` only. New: `.tcg-card-art-missing`,
`.tcg-card-artmissing-texture` (+ `.tcg-pattern-fallback` variant),
`.tcg-card-artmissing-silhouette`, `.tcg-card-artmissing-seal-mark`,
`.tcg-card-artmissing-caption`, the `else` branch inside
`buildTradingCard`'s art-building code. Changed (shared with the
existing locked state, not duplicated): `--tcg-lock-tint` renamed to
`--tcg-noart-tint` and its setter condition broadened;
`.tcg-card-lock-seal`/`::before`/`::after` and `.tcg-card-lock-shimmer`
selectors extended to also cover the new `.tcg-card-artmissing-*`
equivalents; the reduced-motion block's shimmer rule extended the same
way. `patternKey` hoisted in `buildTradingCard`. `docs/
CHARACTER_TCG_DESIGN.md` §8.6's design intent is now actually
implemented (no doc change needed — it already correctly described
this).

### Known Limitations

- The silhouette is one generic humanoid icon for every character,
  genre, and rarity tier — there's no per-character or per-role
  variation (a "BACKGROUND" mystery card and a "MAIN" mystery card look
  structurally identical apart from color/pattern/rarity chrome). This
  was a deliberate restraint, not an oversight — a set of role-specific
  silhouettes would be new visual surface area the brief didn't ask
  for.
- Still no real second artwork source connected (same limitation noted
  in Phase 18) — this state will keep appearing for any AniList
  character with no `image.large` until a future source tier in the
  existing Artwork Management System actually goes live.

### Future Improvements

- If/when a real second artwork source (Tier 1-4 in
  `ARTWORK_SOURCE_ADAPTERS`) connects, this state should start
  appearing measurably less often with zero code changes here — a
  natural, free regression check for that future work.

### Testing

Verified live with Playwright, not just read from the CSS. Seeded two
unlocked characters with no portrait — one with a resolved genre
(Adventure), one with none — and confirmed live: no `<img>` element
ever renders for either, the genre'd character gets the Adventure
nameplate pattern reused inside its art panel
(`tcg-pattern-radiate-corner`), the non-genre character correctly falls
back to the plain crosshatch (`tcg-pattern-fallback`), both show the
"Artwork Unavailable" caption, and both still render their full normal
nameplate (name/series/role/rarity/card number) — screenshotted both,
confirming the result reads as a deliberate collectible object, not a
broken one. Directly proved the "automatically disappears, no UI
changes" requirement rather than just asserting it: rendered the same
character through the real Character Catalogue with no artwork first
(confirmed `.tcg-card-art-missing` present, no `<img>`), then re-seeded
the identical character with a real portrait and re-rendered through
the exact same code path (confirmed `.tcg-card-art-missing` gone, a
real `<img>` present) — zero lines of code changed between the two
renders. Screenshotted the existing locked state after the shared-CSS
refactor and confirmed it's visually identical to before this session.
Re-ran the full existing regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`, every migration/observer-isolation
script, `test23-character-identity`/`test24-identity-deck-stats`, and
`test35-shared-transition`) — zero regressions, zero console errors.

---

## Session: Trading Card visual redesign — artwork-dominant, dimensional, premium (Phase 18)

**A visual-design pass only.** The brief explicitly scoped this session
to the Trading Card's presentation and explicitly excluded the
Character Identity Engine (Phase 17) — nothing in `buildCharacterIdentityMap`,
`mergeCharacterAppearances`, `characterProviderKey`,
`findFallbackIdentityKey`, `dedupeIdentities`, `allCharacterIdentities`,
`characterIdentityOverrides`, or `isCharacterUnlocked` was touched;
`identity.id` is read once (for the new Card Number) and nothing more.

### The complaint, verified before touching anything

Screenshotted the actual rendered card (a synthetic bust portrait with
distinct hair/cape/edge shapes, so cropping and bleed are visible in a
screenshot rather than theoretical) before making any change. Confirmed
live: the art panel was already at 75% height (a prior session's own
documented target), but nothing bled past the frame, the nameplate had
no depth cues beyond a thin hairline, and the desktop grid rendered a
single, fairly small card inside a lot of empty overlay space — the
"information panel, not a premium card" complaint was real, not just a
description problem.

### Changes

**Artwork dominance.** Art panel height 75% → 78% (top of this
session's 70-80% target, landing there deliberately since the new
footer line below adds a little content height back onto the
nameplate). `bleed` — previously a real, working, but entirely unused
opt-in (`.tcg-card-art-bleed`, built in an earlier phase and never
actually turned on for a real character card) — is now the default for
every character card (`buildCharacterTradingCard` always passes
`bleed:true`). Verified live: a synthetic portrait's edge details now
visibly extend past the card's own border on every genre tested, not
just a theoretical CSS capability.

**"Never crop faces/weapons/accessories aggressively, use smart
positioning."** No content-aware/ML cropping exists or was built —
that would be a real vision pipeline, well beyond a visual-design pass,
and this app has no such infrastructure. The honest, actually-available
version of this ask: enlarging the visible art area (75%→78%) and
allowing bleed both directly reduce how much of the source image gets
cropped away in the first place, which is the real lever available
without fabricating an intelligence this app doesn't have. The
existing fixed `object-position:center 18%` default (tuned for
AniList's typical bust-portrait framing) is unchanged — a genuine
per-character focal point already exists as infrastructure
(`opts.focalPoint`, `resolveCharacterArtwork`) but was never wired into
`buildCharacterTradingCard` in any prior session; wiring up that whole
async multi-source artwork pipeline was judged out of scope for a
visual-design task and is called out below as a real, separate future
improvement, not silently done or silently ignored.

**Metadata reduced to exactly the brief's five items** — Name, Series,
Role (all three already existed, unchanged), plus two new ones:
- **Rarity** — the tier word (e.g. "Iconic"), shown uppercase in a new
  small footer line, using the card's own accent color. This is
  intentionally in ADDITION to the existing rarity gem icon, not a
  replacement — the brief asks for Rarity as a kept metadata item
  distinct from decoration.
- **Card Number** — `formatCardNumber(identity.id)`, e.g. `№ 000101`.
  Deliberately NOT a sequential "004/128"-style position: a real
  print-run position would silently renumber every character whenever
  an earlier-sorted one entered the Codex, which this app's own
  established "never fabricate, never let a displayed value silently
  drift" precedent (Species/Popularity's honest "—" elsewhere on this
  same card) rules out. `identity.id` is a real, permanently stable
  value for a given character — the honest choice, not the more
  "authentic-looking" one.

Both live in one new, deliberately quiet footer line
(`.tcg-card-footer`) — a hairline divider, 8px text, the smallest and
lowest-contrast text on the card — so the five kept items don't read as
five competing headlines. Confirmed live: the footer is never built for
a locked card (rarity is exactly the kind of spoiler the lock overlay
already exists to withhold, same precedent as the existing rarity gem),
and detailed metadata (birthday, blood type, voice actors, biography,
etc.) already lives only on the Character Detail overlay, never on the
grid card face — that page is this app's real equivalent of "the back
of the card," and already worked that way before this session; nothing
needed to move.

**Visual depth.** Added one new cue: a faint inset top highlight on
the existing frame-shadow layer (`inset 0 1px 0 rgba(255,255,255,.07)`)
— light catching a physically-raised bevel, the mirror of the dark
inset shadow that layer already cast. Reviewed the full requested
layer order (Background → Frame → Artwork → Foreground Decorations →
Foil → Labels) against the actual z-index stack and found it already
matched (plate 0, art 1, vignette 2, foil/glare 3, frame-shadow/
hairline 4, header/nameplate/ornaments 5-7) — a prior phase (14)
already built this stack deliberately; the "flat" complaint was about
insufficient depth CUES within a fundamentally correct order, not a
wrong order, so this session didn't restructure it.

**Desktop — "large premium cards, generous spacing."** `--archive-max-width`
780px → 860px. Deliberately NOT a return to the 1120px this same value
was already tried at and reverted from in an earlier session (documented
in-code: non-grid Archive content — the category list, progress bar,
search/filter row — "looked sparse and oversized" at that width) — 860px
is a modest +11% step, verified live against that exact non-grid Archive
home view (not just the card grid) before landing on it, specifically to
avoid repeating the already-known failure. Desktop grid gap (980px
tier) 36/28px → 44/32px for "generous spacing" between the now-larger
cards.

**Mobile — "portrait-focused, no crowded information."** Confirmed
already correct structurally (single column, 5:7 aspect card, no
change needed) — verified live at a 390px viewport that the new footer
line doesn't crowd the nameplate (kept deliberately tiny for exactly
this reason).

### Architecture

- Every change lives in presentation code: CSS layer values,
  `buildTradingCard`, `buildCharacterTradingCard`, and one new small
  pure formatting helper (`formatCardNumber`). The Character Identity
  Engine (Phase 17) was read from (`identity.id`) but never modified,
  per this session's explicit scope.
- `bleed`, `rarityLabel`, and `cardNumber` are ordinary `buildTradingCard`
  opts, following the same pattern every existing opt already does
  (optional, no-op when omitted) — a standalone/demo card built without
  them renders exactly as it did before this session.
- The footer's visibility rule (only when `rarityLabel || cardNumber`
  is present) means it costs nothing for any future caller of
  `buildTradingCard` that doesn't pass either — not Character-Archive-
  specific despite currently only being wired up there.

### Files Modified

`index.html` only. New: `.tcg-card-footer`/`.tcg-card-rarity`/
`.tcg-card-number` CSS, `formatCardNumber`. Changed: `.tcg-card-art`/
`.tcg-card-vignette`/`.tcg-card-foil`/`.tcg-card-glare`/
`.tcg-card-art-bleed`/`.tcg-skel-art` (25%→22% art/nameplate split),
`.tcg-card-genre-ornament`/`.tcg-card-personal` (bottom offset matches
the new split), `.tcg-card-frame-shadow` (top highlight), `--archive-max-width`,
`.tcg-grid`'s 980px-tier gap, `buildTradingCard` (footer markup + opts
doc comments for `bleed`/`rarityLabel`/`cardNumber`),
`buildCharacterTradingCard` (`bleed:true`, `rarityLabel`, `cardNumber`).

### Known Limitations

- No real content-aware cropping/focal-point detection exists — "smart
  positioning" here means a larger, less-cropped art panel plus bleed,
  not per-character intelligent framing. See Future Improvements.
- Card Number's padded-id format (`№ 000101`) has no real-world
  meaning beyond "this character's own stable identifier, formatted
  consistently" — it is not a print-run position and doesn't imply a
  fixed collection size, by design (see above).
- `--archive-max-width`'s new 860px value is a verified-comfortable
  step from 780px, not a from-scratch optimization — a future session
  wanting an even larger grid should re-verify the non-grid Archive
  views again before pushing further, for the same reason this session
  didn't just revert to 1120px.

### Future Improvements

- Wire the existing-but-unused `opts.focalPoint`/`resolveCharacterArtwork`
  artwork pipeline into `buildCharacterTradingCard` for genuine
  per-character crop framing, instead of the fixed default this session
  relied on.
- A settings-level way to view a character's full Card Number context
  (e.g. sorted/ranked views in the catalogue) if that ever becomes a
  real feature ask, rather than just a footer label.

### Testing

Verified live with Playwright throughout, not just read from the CSS.
Before/after screenshots of a synthetic-but-realistically-proportioned
portrait (AniList's real 230×350 character-art aspect ratio, with
distinct edge shapes so bleed is visible) confirmed: the art panel
genuinely occupies more of the card, bleed visibly extends art past the
frame border, and the new footer renders "ICONIC" / `№ 000101` exactly
as designed. Confirmed a locked card never builds the footer at all
(`hasFooter:false`, `hasRarityGem:false` on a real locked catalogue
card) — rarity stays a secret until unlock, matching the existing gem
precedent. Confirmed a six-genre grid still renders one consistent card
silhouette per Phase 16's fix (solid borders, differing only by accent/
ornament/pattern) with bleed and the new footer active on every one of
them simultaneously — the two sessions' work composes cleanly.
Confirmed the 860px `--archive-max-width` change doesn't make the
non-grid Archive home view look sparse (the exact regression a prior
session already hit once at 1120px). Re-ran the full existing
regression suite (`test-char-archive`, `test-char-catalogue` — including
its explicit 1/2/3-column breakpoint assertions, still passing at every
tier — `test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`,
every migration/observer-isolation script, and critically
`test23-character-identity`/`test24-identity-deck-stats`, confirming
the Character Identity Engine's own behavior is provably unaffected)
plus Phase 15's `test35-shared-transition` — zero regressions, zero
console errors.

---

## Session: Character Identity Engine — provider-aware matching + future media compatibility (Phase 17)

**An architectural task, not a UI pass — no layout, CSS, or card
visuals were touched this session.** The brief asked for a "Character
Identity Engine" that collects unique characters, not unique
appearances, with the Trading Card referencing one Universal Character
Identity instead of duplicating per-appearance. Before writing any
code, this session read `CLAUDE.md`, every file in `/docs`, and the
full `PROJECT_STATUS.md` history as instructed — and found that the
core of this request already exists: **Phase 10, "Character Identity
system — one character, one card,"** already built exactly this —
`CharacterIdentity`/`buildCharacterIdentityMap`, one card per unique
character, an "Appears In" list, unlock state merged across every
appearance — and it's been the Codex's real rendering path (both the
per-show tab and the cross-series catalogue) ever since, verified by
its own regression suite (`test23-character-identity.js`,
`test24-identity-deck-stats.js`) using the exact Megalobox/Megalobox 2
scenario this brief describes.

So this session did not rebuild that — it read the existing engine
against the brief line by line, found the real, specific gaps, and
closed those:

1. Matching was keyed on a raw AniList numeric id alone — correct for
   a single-provider app, but not "architecture should support
   multiple metadata providers in the future" (a real, standing goal —
   `API_SOURCES.md` already names TMDB/MangaDex/MyAnimeList/Kitsu as
   planned sources). Two different providers could mint the same
   number for two different characters, and there was no fallback
   matching by name/native name, and no way to manually correct a
   missed merge.
2. `buildCharacterMetaGrid` hardcoded exactly two appearance-count
   buckets ("Anime Appearances" / "Manga Appearances") — the one place
   in the whole engine that assumed exactly two media types, which
   would need editing the moment a third one (movie/TV/game/comic/
   novel) was ever added, contradicting "should already support future
   media types... without changing the architecture."

### What already existed (Phase 10) and was left untouched

`mergeCharacterAppearances`, the merged-record fallback logic (first
non-empty field across appearances), voice-actor/alias unioning,
`identity.unlocked` (true the moment any appearance qualifies),
`identity.primaryItem` (visual-context-only, never used for
filtering/counting), the "Appears In" pill list, and every catalogue/
deck/stats call site that already reads `identity.appearances` instead
of a single item. None of this needed to change to satisfy this
session's brief — it already IS the Universal Character / Appearance
model the brief describes, just under the name `CharacterIdentity`
rather than "Universal Character." This document uses both names
side by side deliberately, so a future reader searching for either
term finds the same thing.

### What this session added

**Provider-qualified identity keys.** `characterProviderKey(character)`
→ `` `${character.provider || "anilist"}:${character.id}` ``. Every
character record that exists in this app today has no `provider`
field, so every key resolves to `"anilist:<id>"` — identical grouping
to before, for every real appearance that exists right now. This is
the addition that makes a second provider safe to add later without a
silent id collision, at zero cost to current behavior.

**"Existing mapped identity."** `characterIdentityOverrides()` /
`setCharacterIdentityOverride()` — a small `{ providerKey:
canonicalProviderKey }` table in `localStorage`
(`anitrack_char_identity_overrides`). Empty by default; nothing writes
to it yet (no UI, per the brief's "do not redesign the UI yet"). It's
the hook a future "merge these characters" control calls into — the
matching engine already checks it, before anything else.

**Cross-provider Name + Native Name fallback matching.**
`findFallbackIdentityKey` — only ever consulted for a provider:id pair
never seen before, with no override present (meaning: a genuine no-op
today, since AniList-only data never reaches this path — every
character's provider:id is either brand new or already resolved
directly). Deliberately conservative in both directions: it never
matches two characters from the SAME provider (that provider's own ids
are already the trustworthy signal), and it refuses to guess — falls
through to "new identity" instead of merging — whenever a name match is
ambiguous (matches more than one existing character) or the native
names actively disagree. A missed merge is a small, recoverable
annoyance (fixable via the override table); a wrong merge silently
corrupts a character's data across every show they're in. The
algorithm is biased hard toward the former, on purpose.

**Generalized appearance counting.** `appearanceCountRows` replaces
`buildCharacterMetaGrid`'s two hardcoded ternaries with a small
extensible label table (`MEDIA_TYPE_APPEARANCE_LABELS`) plus a
Title-Case fallback for any type not in it — a future media type shows
up as its own correctly labeled row automatically. Known types
(anime/manga) still always render, even at a real 0 count, matching
this grid's own pre-existing "every field always rendered" rule — this
was verified to produce byte-identical output to the old hardcoded
version for every case that exists in production today.

### A real bug caught during this session's own verification, not shipped

The Map returned by `buildCharacterIdentityMap` needed a second index —
every raw `provider:id` an appearance was ever seen under is a valid
lookup alias for whichever identity it resolved into (needed because a
caller holding one specific appearance's raw character record has no
way to know in advance which merged identity it landed in, once
fallback matching or an override is actually in play). Adding those
aliases as extra Map entries silently broke `Array.from(map.values())`
— the exact pattern three existing call sites and `allCharacterIdentities`
itself used — because an aliased identity would then appear once per
alias key, not once per real character, **reintroducing the literal
duplicate-card bug this whole engine exists to prevent**, the moment a
real cross-provider merge or override was ever in play. Caught by the
new fallback-matching test script itself, not by inspection: an
assertion expecting 5 unique identities returned 6. Fixed by extracting
a shared `dedupeIdentities(map)` (dedupes on each identity's own stable
`identityKey`, which every alias for the same character shares) and
routing every `.values()`-style consumer through it —
`allCharacterIdentities()` and `renderCatalogue`'s own identity list
both now go through the same function, so this can't drift apart again.
A second, related bug in the same pass: three call sites
(`catalogueDecksFrom`, `renderShowCharacterGrid` ×2) did
`identityMap.get(character.id)` using the OLD raw-numeric-id key
convention — broke immediately once the map's real keys became
provider-qualified strings, caught by the full regression suite
(`Cannot read properties of undefined (reading 'unlocked')` across
five existing test scripts). Fixed by switching all three to
`identityMap.get(characterProviderKey(character))`.

### Architecture

- Media → Character Appearance → Universal Character stays a pure,
  read-only computation over `list` — nothing new is persisted per
  character (the override table is the one small exception, and even
  that only maps a key to another key, never stores character data
  itself).
- The matching engine has zero knowledge of `item.type` — grouping
  Appearances into a Universal Character never branches on what kind
  of media the Appearance came from. The only place that ever knew
  about specific media types was a rendering helper
  (`buildCharacterMetaGrid`), not the identity engine itself — see
  above.
- `identity.id` (raw provider id, kept for backward-compatible lookups
  like `getCharJourney`/timeline dedup that predate this session) and
  `identity.identityKey` (the true provider-qualified key) are
  deliberately two different fields — changing every existing
  `character.id`-keyed lookup elsewhere in the app (journal entries,
  timeline unlock notifications) to the new key was out of scope for
  this session and carries no benefit until a second provider actually
  exists; documented as a known limitation below, not silently done.

### Files Modified

`index.html` only (plus documentation, below). New:
`characterProviderKey`, `DEFAULT_CHARACTER_PROVIDER`,
`characterIdentityOverrides`/`setCharacterIdentityOverride`,
`normalizeMatchText`, `findFallbackIdentityKey`, `dedupeIdentities`,
`MEDIA_TYPE_APPEARANCE_LABELS`, `appearanceCountRows`. Changed:
`buildCharacterIdentityMap` (canonical-key resolution + alias
indexing), `allCharacterIdentities` (now routes through
`dedupeIdentities`), `buildCharacterMetaGrid` (uses
`appearanceCountRows`), `catalogueDecksFrom`/`renderShowCharacterGrid`/
`renderCatalogue` (provider-qualified lookups, `dedupeIdentities`).
`docs/DATABASE_SCHEMA.md` — the `characters` section split into "raw,
per-appearance" and a new "Character Identity Engine — Universal
Character / Appearance" section documenting the model, the matching
priority order, and future media compatibility.

### Known Limitations

- `character.provider` is never actually set to anything but
  `undefined` anywhere in this app today — no second metadata provider
  is wired into the fetch pipeline yet. Every piece of this session's
  work is real, tested architecture, but it has no live second-provider
  data to prove itself against beyond the synthetic test data described
  below; it's verified to be correct and to leave 100%-AniList data
  completely unchanged, not verified against an actual second live API.
- The override table (`characterIdentityOverrides`) has no UI — reading
  and applying it is fully wired, writing to it requires calling
  `setCharacterIdentityOverride` directly (e.g. from a browser console)
  until a future session builds a "merge these characters" control, per
  this session's explicit "do not redesign the UI yet" scope.
- The override table is a single-level map, not transitive — mapping
  A→B and separately B→C will not automatically also resolve A→C.
  Acceptable for the scale this table is meant for (occasional manual
  corrections), not built as a general union-find structure.
- `identity.id` still exposes only the primary appearance's raw
  provider id, not the full provider-qualified key — every existing
  `character.id`-keyed consumer outside this session's scope (My
  Journey entries, character-unlock timeline notifications) still keys
  on that raw id. This is fine for AniList-only data (today, 100% of
  real usage) but would need its own follow-up pass to become fully
  provider-aware if a second provider is ever actually wired in.
- `item.type` itself is still only ever `"anime"` or `"reading"`
  anywhere else in this app (hundreds of call sites across the whole
  file use this two-value enum for episode/chapter terminology, tick
  buttons, stats, etc.) — this session made the Character Identity
  Engine and its own appearance-count rendering agnostic to that, which
  is the part of "future media types" actually in scope for a
  Character Identity task, but did not (and was explicitly told not to)
  attempt the much larger, unrelated project of generalizing `item.type`
  itself across the entire app.

### Future Improvements

- A settings UI for `characterIdentityOverrides` (view/create/remove a
  manual character merge) once there's a second provider's data to
  actually need it against.
- If a second provider is wired in, extend `identity.id`'s consumers
  (My Journey, unlock notifications) to key on `identityKey` instead of
  the raw provider id, so a character merged across providers gets one
  journal entry and one unlock notification, not one per provider.

### Testing

Verified live with Playwright (temporary `window.__IDENTITY_TEST__`
hook, removed before finishing). New synthetic multi-provider dataset
(a "Joe" character appearing under the same AniList id in two shows
plus a THIRD, different-provider "manga" appearance with a different
numeric id but matching name/native name, plus a synthetic future
"game" appearance under the AniList id; two "Kai" characters from two
different non-AniList providers with matching names but DIFFERENT
native names; two different AniList characters who happen to share a
name): confirmed Joe's three same-provider appearances plus the
cross-provider manga appearance all merge into one identity (4
appearances, spanning anime/reading/game types); confirmed the two
Kais stay separate (native name mismatch correctly blocks an automatic
merge); confirmed the two same-provider "Random" characters never
fuzzy-merge on name alone (the same-provider safety guard); confirmed
an explicit override successfully force-merges the two Kais when
called; confirmed `appearanceCountRows` produces the correct extensible
labels ("Anime Appearances," "Manga Appearances," "Game Appearances")
including a preserved zero-count row for a manga-only character;
confirmed the raw map's alias keys are real (more keys than unique
identities) AND that `dedupeIdentities`/`allCharacterIdentities` still
agree on the correct count despite them — this is what caught and
proved the fix for the duplicate-card regression described above.
Re-ran the full existing regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`, every migration/observer-isolation
script, and critically `test23-character-identity`/
`test24-identity-deck-stats` — the exact Megalobox/Megalobox 2 scenario
this session's brief describes — plus Phase 15's
`test35-shared-transition`) after every change, including after
removing the test hook: zero regressions, zero console errors,
byte-identical behavior for every real (single-provider) dataset that
existed before this session.

---

## Session: Senior design review + quality-pass refactor of the Character Card system (Phase 16)

**A quality pass, not a feature pass** — the explicit brief was to
critique the entire 15-phase TradingCard system like a senior product
designer, then refactor toward production quality, prioritizing
elegance over complexity, with permission to replace parts of the
implementation outright rather than patch around them. Nothing in this
session adds a new capability; several things were deleted.

### The review

Read every layer of the system (rarity engine, genre frame recipes,
evolution ladder, series decoration, interaction wiring — roughly 500
lines of CSS and 1200 lines of JS) and verified the suspicious parts
live in a browser rather than trusting the code's own comments.

**The headline finding:** no two cards in a collection read as the same
object. `GENRE_FRAME_RECIPES` gave each of 13 genres its own
`border-radius` shorthand *and* its own native CSS `border-style`
keyword (`double`/`ridge`/`dashed`/`dotted`/`groove`) or `border-image`
repeating-gradient motif. Screenshotting a six-genre grid confirmed it
live: six completely different card silhouettes side by side — soft
rounded corners next to a black-and-white dashed border next to a thick
pink groove border next to a diamond-cut corner. Every commercial
digital card game (Hearthstone, MTG Arena, Pokémon TCG Live, Marvel
Snap) keeps one silhouette across an entire collection and lets rarity —
not a fixed, non-progressing property like genre — carry the "this one
is special" signal. Native `ridge`/`groove` also render a
browser-computed fake-bevel that can't be art-directed, reading as a
default form input rather than card stock.

**Two concrete bugs, confirmed in the live DOM, not just by reading the
code:**
1. The Series Decoration System (Phase 6) was 100% redundant with the
   pre-existing theme crest on every series it covered. `SERIES_THEMES`
   (the card's top-right crest) and `SERIES_DECORATION_SETS` (a
   bottom-right "series emblem") both covered the identical six shows
   with the identical crest SVG — verified with
   `crest.innerHTML === emblem.innerHTML → true`. An entire subsystem —
   its own resolver, its own corner, six border-image edge motifs — never
   added information beyond what the card already showed.
2. The personal-marker heart and the theme crest occupied the same
   corner. Measured via `getBoundingClientRect()`: a 13×13px overlap
   between `.tcg-card-personal` and `.tcg-card-crest` whenever a card
   had both.
3. The card itself had zero keyboard/screen-reader affordance on the
   desktop click path — no `role`, `tabindex`, or `aria-label` — despite
   every other interactive control in this file having one. A
   keyboard-only or screen-reader user could not discover, focus, or
   open a single character card anywhere in the Archive.

**What was already good and stayed untouched:** the rarity engine's
weighted scoring, the evolution ladder's material progression
(tint → ring → foil, unlocking in clean stages), the cursor tilt/
parallax/glare effects (correctly gated behind real hover+fine-pointer
detection and `prefers-reduced-motion`), the three-tier nameplate
typography (Phase 13 already cut this to name/series/role with no
uppercase — restrained and correct as-is), the grid's fixed 1/2/3-column
breakpoints, and the Phase 15 mobile tap-select/shared-transition model.
None of these were implicated by the findings above.

### The refactor

1. **Unified card silhouette.** `GENRE_FRAME_RECIPES` no longer carries
   `border-radius` or `border-style`/`border-image` fields — every card
   renders the same `border-radius:14px` and a plain solid border,
   regardless of genre. `applyGenreFrame` and `applyRarityEvolution`
   were simplified to match (both used to branch on the recipe's border
   *technique*; both now just set a solid color + width). `darkenHex`
   — which existed solely to compute a border-image's second gradient
   stop — had zero remaining callers and was deleted. Genre identity is
   still fully legible per-card through three real, non-colliding cues
   that were already working: the accent color, the corner ornament SVG,
   and the nameplate's background pattern.
2. **Removed the Series Decoration System outright** — `SERIES_
   DECORATION_SETS`, `resolveSeriesDecoration`, `applySeriesDecoration`,
   `.tcg-card-series-emblem`, `.tcg-card-series-edge`, and its six
   `.tcg-series-edge-*` border-image motifs are all gone, along with the
   `seriesTitle` opt threaded through `buildTradingCard`/
   `buildCharacterTradingCard`. Not repositioned — deleted, since the
   existing top-right theme crest already carries series identity for
   every show it ever covered.
3. **Moved the personal marker into the corner the deletion above
   freed** (bottom-right, `right:8px; bottom:calc(25% + 8px)`,
   matching the emblem's old coordinates) instead of its old top-right
   position, ending the crest collision. Re-measured after the change:
   0px actual overlap (13px of shared horizontal range, 0px of vertical
   range — the two no longer occupy the same band at all).
4. **Real keyboard/screen-reader access.** Any card built with
   `opts.onClick` now gets `role="button"`, `tabindex="0"`, a computed
   `aria-label` (`"{name}, {subtitle}"`), an Enter/Space keydown handler
   that fires the same callback a click would, and an on-brand
   `:focus-visible` ring (the card's own accent color, not the browser
   default) that only shows for keyboard/AT navigation. Verified live:
   `Tab` focuses a real catalogue card, `Enter` opens the character
   detail overlay.
5. **Replaced the locked-card seal's plain "?" text glyph** with a real
   padlock SVG (`TCG_LOCK_SVG`), matching the hand-drawn stroke style
   every other crest/ornament in the system already uses — a text
   character read closer to a placeholder than a sealed collectible.
6. **A modest nameplate type bump at the 3-column desktop tier** (name
   14.5px→16px, subtitle 11px→11.5px), reusing the grid's own existing
   980px breakpoint rather than introducing a container query this file
   doesn't otherwise use — cards only ever grow at wider tiers, but the
   nameplate text didn't scale with them, reading proportionally light
   on the largest cards.

### Architecture

Every change stayed inside the existing layer/z-index model — no new
DOM layers were added (the marker moved corners; nothing new was built)
and one full subsystem was removed. `buildTradingCard` remains fully
agnostic of Character Archive state, unchanged from every prior phase's
boundary. The genre recipe table's shape changed (`border` is now
always just `{ width }`, no `style`/`image`/`radius`) but its keys and
call sites did not, so no other caller needed touching.

### Files Modified

`index.html` only. Removed: `darkenHex`, `SERIES_DECORATION_SETS`,
`resolveSeriesDecoration`, `applySeriesDecoration`, their CSS
(`.tcg-card-series-emblem`, `.tcg-card-series-edge`, six edge-motif
rules), and the `border.style`/`border.image`/`radius` fields from all
12 `GENRE_FRAME_RECIPES` entries. Changed: `applyGenreFrame`,
`applyRarityEvolution` (solid-border-only), `.tcg-card-personal`
(repositioned + new locked-state rule), `buildTradingCard` (a11y
wiring, lock seal markup), `.tcg-card-lock-seal-mark` (SVG sizing
instead of font sizing), `buildCharacterTradingCard` (dropped
`seriesTitle`). New: `TCG_LOCK_SVG`, `.tcg-card:focus-visible`, the
980px nameplate type-scale rule.

### Known Limitations

- Genre is now differentiated by exactly three cues (accent, ornament,
  pattern) instead of four (those plus a structural border treatment).
  This is the deliberate trade-off the whole refactor is built on, not
  an oversight — but it does mean two genres that happen to share a
  similar accent hue are a little closer to each other visually than
  before.
- The mobile tap-select ring (`.tcg-selected`, Phase 15) still has no
  on-screen teaching affordance beyond the colored ring itself; a
  first-time touch user has no explicit hint that a second tap does
  something different from the first. Noted in review, deliberately not
  addressed here — adding a new decorative affordance to teach a gesture
  would work against this session's own "elegance over complexity"
  mandate.

### Future Improvements

- If a future genre is added, it only ever needs an accent color, an
  ornament SVG, and a nameplate pattern key — the recipe table no
  longer has a border-technique decision to make at all.
- Could extend the same `role`/`tabindex`/keyboard pattern to any other
  future TradingCard-based surface if one gets built outside the
  Character Archive.

### Testing

Verified live with Playwright throughout, not just read from the code.
Confirmed via a seeded six-genre grid (screenshotted before and after):
every card now computes the same `border-radius` and `border-style:
solid`, differing only in border color/ornament/pattern — a real
visual fix, not just a code change. Confirmed the crest/emblem
duplication bug (`crestEqualsEmblem: true`) and the marker/crest pixel
overlap (13×13px) both before the fix and their resolution after
(0px actual overlap post-fix, measured the same way). Confirmed
keyboard access end-to-end against a real catalogue card: `Tab` sets
focus, `Enter` opens the Character Detail overlay. Re-ran the full
existing regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`,
plus every migration/observer-isolation/identity script from Phases
8–10) and Phase 15's `test35-shared-transition` (the mobile tap-select →
shared-transition flow against a real catalogue card) — all passed with
zero console errors, confirming this refactor introduced no
regressions. (`test34`/`test36` from Phase 15 were not re-run to
completion — both depend on the `window.__MOBILE_TEST__` hook that
phase intentionally removed at its own completion, consistent with this
project's established convention that phase-specific test hooks are
expected to go stale once removed.)

---

## Session: Mobile interaction redesign — tap-to-select, shared element transition (Phase 15)

**A functional (not decorative) pass on how the TradingCard responds to
touch.** Every prior phase's polish (tilt/parallax/glare, hover lift)
was built on the assumption of a cursor — genuinely meaningless on a
touch screen, where there is no "hover" state to preview before commit.
This session gives touch-primary devices their own interaction model
instead of quietly falling back to "hover never fires, first tap just
opens" — the desktop click-to-open path is left completely untouched.

### The core design decision

**Touch-primary vs. desktop is decided once per card, at build time,
from the same signal the existing tilt system already uses to decide
the opposite question.** `tcgTiltCapable()` (Phase 9) gates decoration
to `(hover:hover) and (pointer:fine)` devices; the new
`tcgIsTouchPrimary()` is its inverse. A card never runs both
interaction models — a touch-primary card never gets `.tcg-tilt-ready`,
and a mouse/trackpad card never gets `.tcg-selected`. This keeps the
"is this a touch device" question answered in exactly one place per
concern, not re-derived ad hoc.

**Single tap selects, second tap or long-press opens — implemented as a
plain timer, not a touch-event-specific API.** `wireCardTapInteraction`
uses `pointerdown`/`pointermove`/`pointerup`/`pointercancel` with a
500ms threshold and a 10px movement tolerance (so a scroll gesture
starting on a card doesn't get misread as a press-and-hold), and
explicitly ignores `pointerType === "mouse"` — a hybrid touchscreen
laptop's actual mouse still gets the plain click-opens-immediately
path. Only one card is ever selected app-wide (`tcgSelectedCard`, a
module-level singleton) — selecting a second card, or tapping anywhere
outside the selected one, clears it. `.tcg-selected` is a real
JS-toggled class, not a CSS-only state, since there is nothing for
`:hover` to key off on a touch device.

**The shared element transition uses the browser's native View
Transitions API, not a hand-rolled animation.** Tapping open a card
morphs its own portrait into the Character Detail overlay's hero image
via `document.startViewTransition`, feature-detected and gated on
`prefers-reduced-motion` with a plain instant-open fallback either way.
The API's own default behavior (cross-fading a screenshot of the
*entire* page) is suppressed (`::view-transition-old(root),
::view-transition-new(root){ animation:none; }`) so only the tagged
portrait animates — letting the existing `.epmodal-sheet` slide-up
entrance keep working unmodified alongside it, instead of two motion
systems fighting over the same moment.

### A real bug caught before it shipped, not after

First implementation set `view-transition-name` on both the tapped
card's art AND `#charDetailHero` before calling
`startViewTransition()`. Since `#charDetailHero` is permanently present
in the DOM (only its ancestor overlay toggles `display`), both elements
claimed the same name at once and Chromium aborted the transition
outright (`Unexpected duplicate view-transition-name`), caught via a
Playwright console-error listener, not silently. Fixed by handing the
name off explicitly: only the card claims it before the transition
starts (for the "old" snapshot); inside the transition callback the
card's name is cleared *first*, then the detail overlay opens, *then*
the hero claims the name (for the "new" snapshot) — exactly one element
ever holds it at either snapshot moment.

### A testing lesson, not an app bug

Playwright's `page.mouse.down()/up()` always dispatches
`pointerType: "mouse"`, even in a `hasTouch:true, isMobile:true`
context — which `wireCardTapInteraction` correctly (and deliberately)
ignores for long-press, so the first version of the long-press/
quick-tap tests silently exercised the wrong code path and produced
wrong-but-plausible-looking results. Fixed by dispatching synthetic
`PointerEvent`s with `pointerType: 'touch'` directly via
`page.evaluate()`. Separately, verifying the "unsupported browser"
fallback required `document.startViewTransition = undefined` rather
than `delete document.startViewTransition` — the property lives on
`Document.prototype`, so `delete` on the instance is a silent no-op and
`typeof` still resolves truthy through the prototype, sending the test
down the (async) transition path instead of the intended synchronous
fallback.

### Completed

`tcgIsTouchPrimary()`, `wireCardTapInteraction()`, `tcgSelectedCard` +
`tcgDeselectCard()` (new). `buildTradingCard`'s `onClick` wiring now
branches on `tcgIsTouchPrimary()` between the new tap-interaction
wrapper and the original plain click listener — desktop behavior is
byte-for-byte unchanged. `.tcg-selected` CSS (lift + shadow + an
accent-colored ring — the one visual cue hover doesn't need, since
hover has no "tap again to open" affordance to signal), plus a reduced-
motion override matching the existing `.tcg-card:hover{ transform:none;
}` pattern. `openCharacterDetailTransitioned(identity, cardEl)` (new),
wrapping `openCharacterDetail` with the View Transitions API and used
for *both* input paths (touch and desktop) — the nicer transition isn't
reserved for one input method, only the select-then-open interaction
*model* leading to it differs by device. `buildCharacterTradingCard`
updated to pass its own live card element through via a
declared-before/assigned-after closure variable.

### Architecture

`buildTradingCard` remains fully agnostic of Character Archive
state — it only ever sees `opts.onClick` as a no-argument callback and
decides *when* to call it (immediately vs. select-then-confirm); it has
no idea a shared-element transition or a detail overlay exists. All of
that orchestration (which DOM element is the transition source, which
element is the target hero) lives in `openCharacterDetailTransitioned`
and `buildCharacterTradingCard`, preserving the "component has zero
dependency on Character Archive state" boundary every prior phase has
maintained.

### Files Modified

`index.html` only. New: `tcgIsTouchPrimary`, `wireCardTapInteraction`,
`tcgSelectedCard`/`tcgDeselectCard`, `.tcg-selected` CSS + its reduced-
motion override, the view-transition CSS block, `openCharacterDetail
Transitioned`. Changed: `buildTradingCard`'s `onClick` wiring + its
opts doc comment, `buildCharacterTradingCard`'s card construction (adds
the `cardEl` closure variable, switches `onClick` to call
`openCharacterDetailTransitioned`).

### Known Limitations

- `tcgSelectedCard` is a single module-level slot, not scoped per-grid —
  correct for how this app actually renders (one grid visible at a
  time) but would need revisiting if two card grids were ever shown
  simultaneously.
- The shared-element transition only has one source per open (the
  tapped card's art or lock face) — there's no equivalent reverse
  transition morphing the hero back into the grid on close; closing
  the detail overlay uses its existing plain dismiss animation
  unchanged.
- Long-press threshold (500ms) and movement tolerance (10px) are fixed
  constants, not user-configurable or platform-adaptive.

### Future Improvements

- A reverse (closing) shared-element transition, morphing the hero back
  into its originating card, if the grid is still the visible parent.
- Scoping `tcgSelectedCard` per-container if a future feature ever
  shows two independent card grids on screen at once.

### Testing

Verified live with Playwright (temporary `window.__MOBILE_TEST__` hook,
removed before finishing): touch-primary context — first tap selects
without opening, second tap opens and deselects, switching the tapped
card deselects the old one and selects the new one without opening
either, tapping outside any card deselects, a genuine `pointerType:
'touch'` long-press (>500ms, dispatched via synthetic `PointerEvent`s
since Playwright's `page.mouse` is mouse-only) opens directly bypassing
selection, a quick tap under the threshold only selects. Desktop
context — single click opens immediately, `.tcg-selected` is never
applied. End-to-end against the real Character Catalogue (seeded show,
MAIN character, always unlocked): tap-select then tap-open on a real
`.tcg-card`, confirmed `document.startViewTransition` was genuinely
invoked (monkey-patched to track calls), correct character rendered in
the detail body, `#charDetailHero`'s `view-transition-name` cleared
after the transition finished, zero console errors (this is what
caught the duplicate-transition-name bug above). Fallback paths
verified directly: a `reducedMotion:'reduce'` browser context never
invokes `startViewTransition` and still opens correctly; an
"unsupported browser" context (`document.startViewTransition =
undefined`, shadowing the prototype) still opens correctly via the
plain fallback with the correct character name rendered. Took a
screenshot and confirmed via computed styles that `.tcg-selected`
applies a real lift transform, layered box-shadow, and an accent-
colored ring matching the card's own theme. Re-ran the full Character
Archive regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`)
plus every migration/observer-isolation/identity script from Phases
8–10 — zero regressions.

---

## Session: Visual depth — the card as physical layers, not a flat face (Phase 14)

**A presentation-only pass making the card's existing layer stack
actually read as layers.** The TradingCard component has had roughly
ten stacked elements (plate, art, vignette, foil, glare, hairline,
header, nameplate, ornaments, lock overlay) since Phase 2 — genuinely
layered in z-index, but visually coplanar: nothing cast a shadow on
anything else, and the one element specifically meant to read as "the
frame sitting slightly apart from the art" (the hairline) was fully
invisible at Standard rarity, the tier most cards actually are. This
session doesn't add DOM complexity so much as make the complexity
already there actually visible.

### The core design decision

**"Artwork overlaps the frame" was already half-built and mostly
invisible, not missing.** The art panel already filled edge-to-edge to
the card's own true boundary; the hairline (an inset decorative line
meant to sit in front of it) already existed. What was missing was
(a) the hairline actually being visible on most cards (Standard's
`hairlineAlpha` was a literal `0`), and (b) enough distance between the
art's true edge and the hairline's position for the art to visibly
extend past it before the line takes over — the original 3px inset
left almost no "reveal" room. Moving the floor to a small non-zero
alpha and widening the inset to 8px is a small, surgical change that
makes an existing mechanism finally do what it was always described as
doing.

**No restructuring of the clipping model.** The tempting-but-risky
approach would have been removing `.tcg-card`'s own `overflow:hidden`
so art could genuinely spill past the card's outer edge. That would
have meant re-verifying every other inset layer (evolution ring,
series edge, lock overlay, genre frame border-image) against a whole
new clipping boundary — a lot of risk for a "slightly" effect. The
hairline-based approach delivers the same *perceived* overlap (art
visibly continuing past a decorative frame line, right up to where the
card's own physical edge is) without touching how anything is clipped.

**Shadows are cast BY frame elements ONTO the art, in both directions
the frame actually has edges.** A new `.tcg-card-frame-shadow` layer
(an inset box-shadow ring, one line of CSS) handles the top/sides —
the card's structural border zone. The nameplate, large and opaque
enough to earn its own dedicated shadow rather than sharing the ring
treatment, got a `box-shadow` cast upward onto the art above it. Both
reuse the exact same idea (a physically-elevated frame piece darkens
whatever's beneath its edge) rather than inventing two different
depth techniques.

### A real regression caught before it shipped, not after

Widening the hairline's inset from 3px to a first-attempt 6px landed
it entirely inside the Rarity Evolution ring's existing 5–7px band
(Phase 5) — same z-index, so on any evolved character (level 2+) the
ring would have painted directly over the hairline and made it
disappear again, silently undoing this session's own change on exactly
the cards rare enough to matter most. Caught by reasoning through the
existing inset layout (hairline, evolution ring, series decoration
edge all share the same few pixels near the card edge) before writing
the CSS, then confirmed live: built a card with `evolutionLevel: 5`
and asserted the hairline's own inset is `>=` the ring's outer edge.
Fixed by moving to 8px instead — clears the ring with room to spare,
lands just inside (not on top of) the Series Decoration edge at 9px.

### Completed

**`.tcg-card-frame-shadow`** — new layer, inset box-shadow ring,
applied only to unlocked cards (a locked card's opaque lock overlay
sits at a higher z-index and would fully hide it, so it's simply never
built there — no wasted DOM). **`.tcg-card-hairline`** — inset moved
3px → 8px, `TCG_RARITY_CONFIG.standard.hairlineAlpha` moved 0 → .14
(the .25/.40/.55 progression for Featured/Signature/Iconic is
untouched — rarity still reads as "a stronger frame," just never a
literally invisible one). **`.tcg-card-nameplate`** — new `box-shadow`
cast upward onto the art panel above it. **Ornament shadows enhanced**
— the gem, crest, personal marker, and genre ornament's existing
`drop-shadow` filters all moved from `0 1px 2px` to `0 2px 3px` (a
consistent, modest bump across all four in one pass), reinforcing that
they're floating in front of the art rather than painted flush onto
it — verified this didn't also touch the unrelated `.char-deck-crest`,
which uses the same shadow value in a different, untouched part of the
card system.

### Architecture

- Every change here operates entirely within `.tcg-card`'s existing
  `overflow:hidden` clip — nothing was made to literally exceed the
  card's own bounding box. The "overlap" is perceptual (art visible
  past an inner frame line), not a structural change to what can
  render where.
- The frame-shadow/hairline/nameplate-shadow trio are documented (in
  code) as one consistent idea — "a physically-elevated frame element
  casts a shadow on the art beneath it" — applied per-element rather
  than as a single shared mechanism, since the three elements (a full
  inset ring, a thin line, an opaque band) don't share a single CSS
  technique that would suit all three equally well.

### Files Modified

`index.html` only. New: `.tcg-card-frame-shadow` CSS + its
`buildTradingCard` element creation (unlocked branch only). Changed:
`.tcg-card-hairline` (inset, border-radius, and its own rationale
comment), `TCG_RARITY_CONFIG.standard.hairlineAlpha`,
`.tcg-card-nameplate` (new box-shadow), the gem/crest/personal-marker/
genre-ornament `drop-shadow` filter values.

### Known Limitations

- The frame-shadow/nameplate-shadow treatment doesn't vary by rarity
  or genre — every card gets the same depth cues regardless of tier.
  A future session could scale shadow strength with rarity the way
  `hairlineAlpha` already does, but that wasn't asked for here and
  risks turning a physicality cue into an accidental second rarity
  signal.

### Testing

Verified live with Playwright (temporary `window.__DEPTH_TEST__` hook,
removed before finishing): `.tcg-card-frame-shadow` exists on an
unlocked card and is never built at all for a locked one; a
Standard-rarity card's hairline computes to a real, non-transparent
border color (previously fully transparent); a card with
`evolutionLevel: 5` confirms the hairline's inset is safely outside
the evolution ring's own outer edge, and the ring itself still renders
a real visible border (color or border-image, since tier 5 specifically
switches to a border-image "prismatic" ring — the test's first version
only checked border-color and had to be corrected to also accept
border-image, a test bug caught immediately by the assertion failing
honestly rather than passing on a wrong premise); the nameplate
computes a real `box-shadow`; all four ornament elements' computed
`filter` values include the enhanced `drop-shadow`. Took a screenshot
of three cards (Standard, an evolved Adventure card, a Supernatural
card with a personal marker) and visually confirmed the hairline is
now visible on the plain Standard card, the nameplate casts a visible
shadow onto the art directly above it, and no ring/hairline collision
artifacts appear on the evolved card. Then re-ran the full Character
Archive regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`)
plus every migration/observer-isolation/identity script from Phases
8–10 — zero regressions.

---

## Session: Nameplate typography simplified to three tiers (Phase 13)

**A presentation-only pass on the card's nameplate** — the text stack
under the portrait. The old nameplate carried up to four lines (name,
native name, a combined "theme · role" subtitle, and a catalogue-only
duplicate series caption), two of which were rendered in full
uppercase. This session cuts it down to exactly three: **Primary**
(character name), **Secondary** (series), **Tertiary** (role) — every
other line removed, not hidden — and drops uppercase everywhere in the
nameplate, since nothing there is a rarity badge.

### The core design decision

**Genre becomes an icon by *not* being text anymore, not by adding a
new icon.** The old subtitle line read `{theme name} · {ROLE}` —
`theme name` was usually a franchise label like "Straw Hat," but for
any show outside the six hardcoded franchises it silently fell back to
the raw genre name (`resolveCharacterTheme`'s own `GENRE_THEMES`
fallback), so genre was leaking into the nameplate as text for most of
the library. Rebuilding the subtitle to be the literal series title
(not a theme label) removes that leak entirely — with the Genre Frame
System's own bottom-left ornament (built in Phase 4, unchanged) left
as the sole genre indicator, exactly satisfying "genre should become
an icon, not text" without adding a second, redundant icon next to it.

**Series now always shows, in every context — not just the
catalogue.** The old nameplate only showed the series title when
`opts.showSeries` was set (true in the global catalogue, false in a
show's own Character Archive tab, where it was judged "redundant since
you're already looking at that show"). That conditional added a
parameter, a code path, and a real inconsistency: the same character's
card looked different depending on which screen found it. Making
series unconditional — always the secondary line, everywhere — is
simpler code (one less opt, one less branch at both call sites) *and*
matches the "a card always represents the character the same way,
regardless of context" principle the Character Identity system (Phase
10) already established for lock state; typography now follows the
same rule.

**Native name and the catalogue-only meta line are gone, not
hidden.** Neither fits in a strict three-tier hierarchy, and keeping
either "just in case" would have meant the component still carrying
unused rendering logic for a fourth line nothing calls anymore —
exactly the kind of dead capability the project's own coding standards
ask to be removed rather than kept dormant.

### Completed

**`buildTradingCard` opts renamed to match the hierarchy by name**:
`subtitle` now means secondary line (was: combined theme+role text),
a new `tertiary` opt is the third line (was: no equivalent — role used
to be baked into `subtitle`). `nativeName`, `metadata`, and
`showMetadata` are removed from the component entirely — passing them
is now a harmless no-op rather than an error, verified live, but they
render nothing.

**`buildCharacterTradingCard`** now passes `subtitle: title` (the
literal series/show title) and `tertiary: <sentence-case role>` — a
small local three-way mapping (`"Main"`/`"Support"`/`"Background"`),
kept local rather than changing the shared `roleLabel()` helper, since
that helper's uppercase output is still correct for the other UI that
already uses it (Character Detail's role badge, the per-show role
filter pills) and this session only had a mandate to simplify the
*card's own* typography, not audit uppercase usage across the whole
app.

**Uppercase removed from every nameplate/caption text element**:
`.tcg-card-subtitle`, and — applying the same rule consistently rather
than only where explicitly asked — the locked-card's own
`.tcg-card-lock-caption`, which showed the same series information in
the same all-caps style and would otherwise have been visibly
inconsistent with the now-sentence-case unlocked nameplate.

**Skeleton loader updated to match** — a third `.skel-line` (a new
`w25` width) added so the loading placeholder previews three lines,
not two, keeping the "loading → content swap never reflows" guarantee
accurate to the real three-tier layout.

### Architecture

- No new opts were added beyond `tertiary` — this was a rename/removal
  pass on an already-small API, not a growth of it.
- `roleLabel()` (the shared, uppercase-output helper used elsewhere in
  the app) was deliberately left untouched — the sentence-case mapping
  for the card's tertiary line lives locally in
  `buildCharacterTradingCard`, scoping this session's casing change to
  exactly the surface it was asked to simplify.

### Files Modified

`index.html` only. Removed: `.tcg-card-native`, `.tcg-card-meta`,
`.tcg-card.tcg-card-meta-visible` CSS; `opts.nativeName`/`opts.metadata`/
`opts.showMetadata` handling in `buildTradingCard`; `opts.showSeries`
from `buildCharacterTradingCard` and its one remaining call site
(`renderCatalogue`). Added: `.tcg-card-tertiary` CSS, `opts.tertiary`
in `buildTradingCard`, the sentence-case role mapping in
`buildCharacterTradingCard`, `.skel-line.w25`. Changed:
`.tcg-card-subtitle` (restyled, no longer uppercase), `.tcg-card-lock-caption`
(no longer uppercase), `buildTradingCard`'s opts doc comment,
`buildCharacterCardSkeletonHtml`.

### Known Limitations

- None specific to this session — self-contained typography/markup
  simplification with no new data or behavior.

### Testing

Verified live with Playwright (temporary `window.__TYPE_TEST__` hook,
removed before finishing): the three nameplate lines render with the
correct content and no native-name/meta elements exist even when those
opts are explicitly passed (confirmed inert, not erroring);
`text-transform` computes to non-uppercase on both the subtitle and
tertiary lines; `buildCharacterTradingCard` correctly maps an identity
to name/series/sentence-case-role; the genre name never appears as
literal text anywhere in the nameplate while the genre ornament icon
is still present; a locked identity's caption now renders
unconditionally (no context flag) and is also non-uppercase. Took a
screenshot of two unlocked cards and one locked card across two
series/genres and visually confirmed the three-tier hierarchy, sentence
case throughout, and the genre icon (not text) in the corner. Then
re-ran the full Character Archive regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`) plus every migration/observer-isolation/
identity script from Phases 8–10 — zero regressions.

---

## Session: Locked cards — premium mystery over placeholder (Phase 12)

**A presentation-only pass on one specific piece of the TradingCard
component**: the lock overlay. Since Phase 2, a locked card showed a
flat gray panel, a generic person-silhouette icon, a floating "?", and
an instructional sentence — functional, but it read as an empty/broken
state rather than something worth coming back for. This session
rebuilds it as a sealed object: textured surface, the series/genre
crest pressed into the material, a wax-seal medallion carrying the
"?", and a slow ambient shimmer — while keeping every guarantee the
lock overlay has always made (zero character identity or rarity
information leaks through it).

### The core design decision

"Premium mystery" needed a concrete visual vocabulary, not just a
mood — this session borrowed from real sealed/certificate objects:
**woven texture** (the surface has material, not a flat fill),
**embossing** (the crest looks pressed into that surface via two
opposed drop-shadows — a faint light catch, a real dark shadow — not
sitting flat on top of it), and a **wax-seal medallion** (two
concentric rings around the "?", the way a stamped seal reads as
"something official is sealed here," not "content missing"). All three
are pure CSS/decoration or the same non-spoiler crest already shown on
an unlocked card's header — nothing here is new spoiler surface.

**The shimmer runs continuously, not on hover.** Every other hover
effect this card system has (tilt, glare, the Iconic foil sweep) is
deliberately hover-gated — but a locked card is the one place hovering
doesn't reward you with anything new, so gating the shimmer behind a
hover a user has no reason to attempt would mean most people never see
it. It sweeps on a slow 5s loop instead, so it catches the eye while
scrolling past — closer to how light catches a physical sealed object
than a UI micro-interaction. Each card gets its own randomized
`animation-delay` (`Math.random() * 4s`) specifically so a grid full of
locked cards never shimmers in unison, which would read as a synced
"blinking wall" rather than an ambient, organic effect.

**"Keep text minimal" meant trusting the new visuals to do the work
the old copy was doing alone.** The instructional message shortened
from "Unlocks when you complete this series" to "Complete to reveal" —
shorter, and "reveal" leans into the mystery framing rather than
reading as a system message. The series-name caption (a real, useful,
non-spoiler piece of information established back in the TradingCard
migration) was kept as-is rather than cut, since removing genuinely
useful information isn't what "minimal" was asking for — only the
filler around it.

### Completed

**New lock overlay structure** (`buildTradingCard`'s locked branch):
`.tcg-card-lock-texture` (a barely-there 5%-opacity crosshatch),
`.tcg-card-lock-crest` (opts.crestSvg, large and centered rather than
the small corner mark it is unlocked, embossed via drop-shadow pair),
`.tcg-card-lock-shimmer` (the continuous sweep), `.tcg-card-lock-seal`
(the medallion — two ring pseudo-elements plus the "?" mark), and the
existing caption/message text, now smaller and quieter so the visual
elements lead. The old `.tcg-card-lock-silhouette`/`.tcg-card-lock-qmark`
markup and the `TCG_LOCK_SILHOUETTE_SVG` constant that fed it are
fully removed, not kept alongside the new version.

**The card's own dormant-state filter softened.** `.tcg-card.locked`
moved from a flat `grayscale(.35)` to `saturate(.8) brightness(.92)` —
grayscale strips color from the genre frame's own border/craftsmanship
too (that border is a property of the card's outer shell and stays
rendered even while locked, per Phase 4's own "regardless of locked
state" design), and a fully desaturated border read as broken/inactive
rather than dormant. The lighter touch keeps the frame's accent color
visible — the wrapper still looks like something worth having even
while what's inside stays sealed.

**A new `--tcg-lock-tint` custom property** (`hexToRgba(accent, .16)`,
set only when `opts.locked`) feeds the lock overlay's own background
gradient — richer than the existing `--tcg-tint` (.06, tuned for the
base plate that's normally hidden under real artwork), since the lock
overlay's background IS the dominant visible surface on a locked card.
Ties the seal's color to the same series/genre identity the crest and
caption already carry, at zero extra JS cost (reuses `hexToRgba`,
already imported/used everywhere else in the component).

### A real regression caught during verification, not a design flaw

The richer lock overlay (6 child elements now, vs. 2 before) makes
each locked card slightly taller in the DOM, which shifted an
existing lazy-load test's timing assumption: it scrolled the catalogue
grid exactly twice, expecting to reach all 30 seeded characters, and
started landing on 24 instead. A manual scroll-loop confirmed the
lazy-loading itself is completely unaffected — it reaches 30
correctly, just needs one more scroll cycle than before to get there,
because the taller cards mean the sentinel doesn't re-enter view as
many times per jump-to-bottom. The test was coupled to an
implementation detail (exactly how many scrolls a specific card height
needs) rather than the actual behavior being tested — fixed by
scrolling in a loop until either 30 is reached or a generous attempt
cap is hit, instead of a hardcoded scroll count.

### Architecture

- Every new lock-overlay element is either non-interactive decoration
  or reuses data (`opts.crestSvg`, the accent color) the component
  already receives — no new `buildTradingCard` opts were added this
  session, matching Phase 9's own "presentation-only, invisible at the
  API level" precedent.
- The embossed crest and seal are explicitly documented (in code) as
  containing zero spoiler-capable information — same non-spoiler
  identity already shown on an unlocked card's header, just rendered
  larger and stylized differently while locked.

### Files Modified

`index.html` only. New: `.tcg-card-lock-texture`/`-crest`/`-shimmer`/
`-seal`/`-seal-mark` CSS, `tcgLockShimmer` keyframe, the
`--tcg-lock-tint` custom property, the shimmer's randomized
`--tcg-lock-shimmer-delay`. Removed: `TCG_LOCK_SILHOUETTE_SVG`,
`.tcg-card-lock-silhouette`, `.tcg-card-lock-qmark`. Changed:
`.tcg-card.locked`'s filter, `buildTradingCard`'s locked branch,
`buildCharacterTradingCard`'s `lockedMessage` copy, the reduced-motion
media query block (new shimmer rule), `buildTradingCard`'s own opts
doc comment.

### Known Limitations

- The shimmer is a single fixed 5s cadence for every card, not tuned
  per rarity/genre — a future session could vary it (e.g. a faster,
  brighter sweep hinting at a higher-rarity character underneath)
  without changing the mechanism, but that would risk turning "subtle
  ambient tease" into an actual rarity leak, so it was deliberately
  left uniform this session.

### Testing

Verified live with Playwright (temporary `window.__LOCK_TEST__` hook,
removed before finishing): every new element (texture, crest, shimmer,
seal, caption, message) renders with the expected content; the old
silhouette/qmark markup is completely gone; a locked card's full text
content never includes the character's name or native name and has no
`.tcg-card-name`/`.tcg-card-gem` element at all (no spoiler leak,
matching the exact guarantee every prior phase established); two
locked cards get demonstrably different shimmer delays; omitting
`crestSvg` renders no crest element rather than crashing; an unlocked
card is completely unaffected (no lock overlay, real name/image
render). A second script confirmed `prefers-reduced-motion` fully
disables the shimmer (`animation-name: none`, `opacity: 0`). Took a
screenshot of three locked cards across two series/genres and visually
confirmed the texture, large embossed crest, seal medallion, and
still-vivid genre-colored borders all read together as intended. Then
re-ran the full Character Archive regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`) plus every migration/observer-isolation/
identity script from Phases 8–10 — zero regressions once the one
scroll-timing assumption above was fixed.

---

## Session: Character Archive grid redesign — large cards over many (Phase 11)

**A layout-only reversal of one specific Phase 8 decision.** Phase 8
deliberately replaced the old `.char-grid`'s fixed 1/2/3-column
breakpoints with CSS `auto-fill`/`minmax(140px, 1fr)`, reasoning that
fluid column-count-follows-width beat "jumping" at fixed breakpoints.
In practice, on a real desktop window that meant 4–5 narrow columns
packed into the Archive overlay's 780px width — cards shrank toward
their 140px floor to fit more of them in, which read as a crowded
dashboard, not a collection. This session reverses that specific call:
fixed breakpoints are back, but tuned for large cards and generous
space rather than the old tuning's own smaller minimums.

### The core design decision

"Never shrink cards just to fit more on screen" is a hard constraint,
not just a preference — the only way to guarantee it in CSS is a fixed
column count per breakpoint (so a wider window makes existing cards
*bigger*, never squeezes in an extra column), not `auto-fill`/`minmax`
(whose entire mechanism is squeezing in an extra column once there's
room). Three tiers, matching the brief exactly:

| Viewport | Columns | Row gap × column gap |
|---|---|---|
| < 640px (mobile) | 1 | 28px × 20px |
| 640–979px (tablet) | 2 | 32px × 24px |
| ≥ 980px (desktop) | 3 | 36px × 28px |

Desktop's ceiling of 3 isn't just a rule that happens to hold today —
the Archive overlay itself is capped at `--archive-max-width` (780px,
a pre-existing Phase 8 constraint, left untouched this session
specifically so the Archive home's plain list views don't regress back
into the "sparse at 1120px" problem that constraint was originally
set to fix). Within that fixed-width container, 3 columns is a real
ceiling no monitor size can push past — verified live at 1400px.

**Row-gap deliberately exceeds column-gap at every tier** — "increase
vertical rhythm" read as its own distinct instruction from "increase
whitespace" generally, not a synonym for it, so the gap is asymmetric
on purpose rather than one uniform number scaled up.

### Completed

**`.tcg-grid`** — `grid-template-columns` moved from a single
`auto-fill`/`minmax(140px, 1fr)` rule to three fixed rules gated by
`@media (min-width:640px)` / `@media (min-width:980px)`, matching the
old (Phase-8-removed) `.char-grid`'s own breakpoint values — reused
rather than invented, since they were already tuned for this exact
overlay once before. `margin-top` (grid to the filter controls above
it) increased from 6px to 20px, its own small piece of "increase
vertical rhythm" beyond just the inter-card gaps.

Verified live at 5 viewport widths against the exact spec: 320px → 1
column, 500px → 1, 700px → 2, 900px → 2, 1000px → 3 — all exact
matches, plus confirmed 1400px still yields exactly 3 (not more).
Screenshotted all three tiers: mobile shows one large dominant card
filling nearly the full viewport width; tablet shows two substantial
cards; desktop shows three, each still clearly larger and more
spaced-out than Phase 8's own auto-fill result was.

**Artwork dominance and "collectible object" feel come for free** from
the card's own existing internal proportions (the art panel has
occupied ~75% of the card since Phase 3.1) — at the new, larger
per-card pixel size this layout produces, that same 75% simply reads
as far more dominant on screen than it did packed into a ~140px-wide
card. No change was needed inside the TradingCard component itself;
this was purely a grid-container-level fix.

### Architecture

- Every consumer of `.tcg-grid` (the global Catalogue's flat view, the
  per-show tab, the deck-view tiles, and the loading skeleton grid) is
  a single shared class — the redesign applies uniformly across all of
  them with one CSS change, not four. Deck tiles (`.char-deck`, a
  different shape than `.tcg-card`) also render fewer-and-larger under
  the new breakpoints, a deliberate non-exception: "collectible object,
  not dashboard widget" is the same intent for the entry-point deck
  tiles as it is for individual character cards, not a rule that only
  applies to one of the two.
- `--archive-max-width` (780px) was deliberately left unchanged rather
  than widened for even bigger cards — that value already balances the
  grid against the Archive home's non-grid views (progress bar,
  category list), and widening it to chase larger cards would have
  reintroduced the exact "sparse and oversized" problem Phase 8's own
  comment on that constant already documented and fixed once.

### Files Modified

`index.html` only — `.tcg-grid`'s `grid-template-columns`/`gap`/
`margin-top` plus two new `@media` breakpoint rules. No JS changes;
no changes to the TradingCard component itself.

### Known Limitations

- None specific to this session — this was a self-contained CSS
  layout change with no new data, state, or behavior.

### Testing

Updated `test-char-catalogue.js`'s own grid-column assertions, which
had been written for Phase 8's auto-fill behavior and would otherwise
have silently stopped meaning anything (they'd have kept "passing" by
asserting the new fixed counts were merely "≥1" and "monotonic," never
checking the actual spec) — rewrote them to assert the exact expected
column count at 5 specific viewport widths against the literal 1/2/3
breakpoint spec; all 5 match exactly. Re-ran the full existing
Character Archive regression suite (`test-char-archive`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`)
plus Phase 8/10's own migration/observer-isolation/identity scripts —
zero regressions. Screenshotted mobile (375px), tablet (800px), and
desktop (1400px) and visually confirmed each tier's card count, size,
and spacing against the brief.

---

## Session: Character Identity system — one character, one card (Phase 10)

**A correctness fix, not a presentation pass.** Every prior TradingCard
session (2 through 9) built a real card system, but the Codex still had
a bug underneath all of it: `item.characters` is a per-*show* cache, so
a character appearing in more than one tracked title (a sequel, an OVA,
a movie) had one full copy of their record living inside each show's
array — and the catalogue rendered one card per copy. Joe from
Megalobox and Joe from Megalobox 2 were two different cards. That's the
bug this session fixes: a character now exists exactly once in the
Codex, no matter how many shows they're actually in.

### The core design decision

AniList's own Character type is the proof this was always a bug, not a
feature: name, image, favourites, description are properties of the
*character*, a single global record — only `role` is genuinely
per-media (an edge property on that media's cast list). This app's own
cache just happened to store a full duplicate copy of that global
record inside every show it fetched, and nothing before this session
ever grouped those copies back into one identity before rendering them.

**CharacterIdentity** (`buildCharacterIdentityMap`) is the fix: one
pass over the whole library, grouping every `item.characters` copy by
`character.id` into `{ id, character, appearances, primaryItem, unlocked }`.
`character` is a *merged* display record — `mergeCharacterAppearances`
takes the best-role appearance as primary but falls back through every
appearance for any field that's empty on it (a stale/incomplete fetch
on one copy shouldn't blank out data a different appearance actually
has), unions voice actors and aliases across all appearances (voice
actors are genuinely per-appearance — a movie can recast — so unioning
rather than picking one is the honest merge, not a simplification).
`unlocked` is true the moment **any** appearance qualifies — once
you've met a character through any route, the Codex has nothing left
to hide about who they are, even if a different show they're also in
is still unwatched. `role` is the **best** role earned across every
appearance (MAIN beats SUPPORTING beats BACKGROUND) — a character who's
a background face in a spin-off but the lead in the original series is
a MAIN character, full stop.

**"Only create separate cards when they're genuinely different
versions"** — the brief's own stated exception (e.g. future alternate-
universe variants) — is exactly why merging is keyed on
`character.id`, AniList's own identity for "is this the same character
or a different one," rather than name-matching or anything fuzzier. A
real alternate-version character would arrive as a *different*
AniList character id and correctly stay a separate card; nothing here
merges by name or show.

### Completed

**Card rendering fully deduplicated.** Both the global Character
Catalogue's flat/ungrouped view and each show's own Character Archive
tab now render one `buildCharacterTradingCard(identity, opts)` per
unique character, never per appearance. Verified live with a character
(Joe) seeded into two shows, one MAIN/completed and one SUPPORTING/
incomplete: the flat catalogue renders exactly 3 cards for 4 raw
appearance-records across 2 shows (not 4), and Joe's name appears
exactly once.

**Unlock state, always the same everywhere.** Joe (MAIN in the
completed show, SUPPORTING in the incomplete one) renders unlocked in
every context this session touches: the global catalogue, the
completed show's deck stats, the *incomplete* show's own deck stats
(merged status, not a fresh per-item-only check), and that incomplete
show's own Character Archive tab. One character, one lock state,
regardless of which screen surfaces them — verified live in all four
places.

**"Appears In."** The Character Detail overlay's old single
`#charDetailShowPill` (one clickable row, tied to whichever appearance
built the card) is now a list — one pill per appearance, each still
clickable through to that show's own Show Detail. Verified live with a
4-appearance character (Megalobox / Megalobox 2: Nomad / Megalobox OVA
/ Megalobox Movie) — screenshotted, all 4 pills render and are
individually clickable.

**Global/deck stats now count unique characters, not appearances.**
`computeIdentityUnlockStats`/`statsFromUnlockedFlags` replace the old
`computeUnlockStats` (now fully dead, removed) everywhere a *global* or
*per-deck* count was being shown — the Archive home progress bar, the
catalogue's own progress bar, each deck tile's "N / M Unlocked," and
critically the character-unlock milestone counter
(`CHAR_MILESTONE_THRESHOLDS`, 10/50/100/500) inside `scanCharacterUnlocks`,
which was silently counting a multi-appearance character once per show
and could cross a milestone earlier than the user's Codex actually
warranted. Per-show tab stats still count that show's own cast (as
they always have — a single show's cast list was never duplicated
within itself), just reading each character's *merged* unlock flag now
instead of a fresh per-item check.

**Meta grid and appearance counts can't drift apart.** The old
`characterAppearances(characterId)` helper re-queried
`allArchiveEntries()` independently of whatever built the detail view;
`buildCharacterMetaGrid(identity)` now counts directly from
`identity.appearances` — the exact same list "Appears In" renders — so
the two can never show inconsistent numbers.

### A real bug caught during verification, not by the brief

The "Appears In" pills first shipped as `<button>` elements and
rendered with **invisible text** — confirmed by screenshot, not
inspection. Every other `.title-pill` in this file (`#epShowPill`, the
recommendation card's show-detail pill) is a `<div>`; `.title-pill`'s
own CSS never resets a real `<button>`'s UA-stylesheet background/font,
so a `<button>` version rendered light-on-light (dark theme's light
`--fg` text color over the browser's default light button face).
Fixed by switching to a `<div>` — matching this file's own established
pattern for this exact component rather than introducing a second one
— with `role="button"`, `tabindex="0"`, and an Enter/Space `keydown`
handler added explicitly, since (unlike the older divs it matches)
this is a genuinely new interactive element and deserved real keyboard
access from the start. Added `.title-pill:focus-visible` (previously
absent) and `cursor:pointer` while there, benefiting every existing
`.title-pill` too. Re-screenshotted after the fix to confirm all 4
pills render with visible, legible text.

### Architecture

- `mergeCharacterAppearances`/`buildCharacterIdentityMap` have no
  rendering knowledge — pure data aggregation, same separation-of-
  concerns precedent the Rarity Engine (Phase 7) established between
  computing a value and consuming it.
- `buildRarityInputLookup` and `buildCharacterTradingCard` both changed
  signature to accept a CharacterIdentity instead of a raw
  `(character, item)` pair — a deliberate breaking change to this
  session's own internal API, not a parallel "v2" function kept
  alongside the old one. `appearanceCount` for the Rarity Engine is now
  simply `identity.appearances.length` — the identity grouping made the
  separate appearance-counting pass Phase 8 needed entirely redundant.
- `identity.primaryItem` (best role, then list order) is used **only**
  for the card's visual theme/genre/crest — a single representative
  context, never for filtering, counting, or unlock state, which always
  consider every appearance. Losing sight of that distinction was the
  main risk in this refactor; every call site was written to use
  `identity.appearances`/`identity.unlocked` for anything that isn't
  purely visual.
- Catalogue filters (series/genre/VA/status) now match if **any**
  appearance qualifies, not just the primary one — filtering to
  "Megalobox" correctly surfaces a character whose primary/best-role
  appearance happens to be Megalobox 2.

### Files Modified

`index.html` only. New: `mergeCharacterAppearances`,
`buildCharacterIdentityMap`, `allCharacterIdentities`,
`computeIdentityUnlockStats`, `statsFromUnlockedFlags`,
`identityUnlockedAtEstimate`, `.char-appears-in-list` CSS,
`.title-pill:focus-visible`. Removed: `computeUnlockStats` (dead once
every caller migrated), `characterAppearances` (folded into
`buildCharacterMetaGrid` reading `identity.appearances` directly).
Changed signatures: `buildRarityInputLookup`, `buildCharacterTradingCard`,
`catalogueDecksFrom`, `openCharacterDetail` (all now identity-based, not
character+item-based). Changed: `renderCatalogue`, `renderShowCharacterGrid`,
`renderArchiveHome`, `scanCharacterUnlocks`, `renderCharacterDetail`,
`buildCharacterMetaGrid`.

### Known Limitations

- "Genuinely different versions" (the brief's own stated exception —
  alternate-universe variants) has no support of any kind yet, by
  design — there's no such data from AniList to key a split on today.
  The architecture doesn't block it (a future different-identity
  signal would just be a different grouping key), but nothing here
  invents one speculatively.
- `identity.primaryItem` selection (best role, then list order) has no
  tie-breaking beyond list order for two appearances with the same
  role — acceptable today given how small `list` typically is, but not
  a deliberately "smartest" choice (e.g. most popular) if that ever
  matters more.

### Testing

Verified live with Playwright: a character seeded into two shows (one
MAIN/completed, one SUPPORTING/incomplete) — flat catalogue renders 3
cards for 4 appearance-records (not 4), the character's name appears
exactly once, global progress correctly reads "2 / 3" (not inflated),
the character renders unlocked despite one appearance being incomplete,
a single-appearance locked character still shows its correct series
caption, "Appears In" lists both shows and each pill navigates to the
right Show Detail, the meta grid's "Anime Appearances" count matches
the appearances list exactly, voice actors merge/union from both
appearances rather than only the primary's, and the character shows
unlocked inside the *incomplete* show's own Character Archive tab too
(merged status, not re-derived per-item). A second script confirmed
deck-tile stats also reflect merged status: the completed show's deck
reads "2/2 Unlocked," the incomplete show's own deck still correctly
reads "1/2 Unlocked" (the shared character counted unlocked, the
show-exclusive one still locked). Screenshotted a 4-appearance
character's "Appears In" section, caught and fixed the invisible-pill-
text bug from that screenshot, then re-screenshotted to confirm the
fix. Re-ran the full existing Character Archive regression suite
(`test-char-archive`, `test-char-catalogue`, `test-char-decks`,
`test-char-modal`, `test-char-notifications`, `test-char-sanity`,
`test-scroll-bug`, `test-lazy-load`, `test-stats`) plus Phase 8's
migration/observer-isolation scripts — zero regressions; none of those
existing seeded datasets happen to include a multi-appearance
character, so they confirm the single-appearance case stayed
byte-for-byte correct while the new scripts specifically exercise the
merge.

---

## Session: Character Codex polish — hover, foil, parallax, shadows (Phase 9)

**A presentation-only pass on the TradingCard component** (the
"Character Codex" — the Character Archive's card system, live since
Phase 8). No new opts, no behavior change, no data change — every card
still resolves the exact same genre/rarity/evolution/series/lock state
it did before this session. What changed is how a card *feels* to
actually hold a cursor over: hover, foil, parallax, transitions,
shadows, and their timing, aimed at one goal — read as a premium
commercial digital trading card, not a UI element that happens to be
card-shaped, while staying deliberately calm rather than gamey (per
this project's own design philosophy: no bounce, no flash, nothing
that competes with the content).

### The core design decision

Every new effect shares one easing curve — `cubic-bezier(.22,.61,.36,1)`,
a gentle ease-out with no overshoot — repeated as a literal value at
each use site rather than centralized behind a variable, matching this
file's existing convention of writing out repeated values plainly
rather than introducing indirection for values nothing else computes
from. A handful of separate effects using one consistent motion
signature is what reads as "considered," not each one picking its own
timing.

**Two distinct effects were both asked for under "parallax," and both
were built, deliberately kept separate:**
1. **Whole-card tilt** (`rotateX`/`rotateY`, max 7°) — the card
   responds to the cursor like a physical card tilted in your hand.
   This is what most premium digital card UIs (MTG Arena, Apple Wallet
   cards) actually mean by "3D hover."
2. **Art-layer parallax** (the portrait shifts a few px opposite the
   cursor, max 6px) — the literal meaning of parallax: one layer
   moving at a different rate than the frame around it, selling depth
   between the art and the card body without rotating the whole card
   further.
Both are driven by the same single pointer-tracking handler, at no
extra event-listener cost for the second effect.

**Foil reflections deliberately stayed a two-tier system, not merged
into one:** the existing Iconic-tier `tcgFoilSweep` (a one-time
diagonal light band on hover — a *rarity signal*, gated to
`data-rarity="iconic"` since Phase 2) was left alone except for a
timing/easing refresh, specifically because making it universal would
have diluted what it currently, correctly communicates. Instead, a new
`.tcg-card-glare` layer — a soft, cursor-tracked circular highlight,
present on **every** card regardless of rarity — was added alongside
it as a *physicality* cue, not a rarity cue. On an Iconic card the two
now layer together (sweep + glare), which reads as extra-premium
without either effect having to do double duty as both a material cue
and a rarity cue.

### Completed

**Layered elevation shadows.** Replaced the single flat
`box-shadow` at rest and on hover with a "contact + ambient" pair (a
tight, low-blur shadow close to the card plus a softer, wider one) —
standard elevation-design language (Material, Stripe Dashboard cards)
that reads as real depth rather than a uniform blur getting bigger.

**Refined transition timing.** `transform`/`box-shadow` transitions
moved from a flat `.2s ease-out` to `.15s`/`.22s` on the new signature
cubic-bezier — short enough that cursor-driven tilt tracking feels
connected to the pointer rather than laggy, long enough that the
hover-enter lift and hover-leave return both read as smooth, not
instant/robotic. The Iconic foil sweep and its Rarity-Evolution-tier-4+
twin both moved from `.5s ease-out` to `.6s` on the same curve, for
consistency with everything else rather than because either felt wrong
on its own.

**Cursor-tracked tilt + parallax + glare — `wireCardTilt(card)`.**
New, wired automatically into every unlocked card `buildTradingCard`
produces (locked cards are skipped entirely — no listeners registered
at all, matching the existing "locked cards don't feel interactive"
precedent already established by their suppressed hover-lift and
`cursor:default`). Gated behind a genuine hover-capable, fine-pointer,
motion-allowing device (`(hover: hover) and (pointer: fine)` +
`!prefers-reduced-motion`) — checked once per card build, so a touch
device pays zero listener-registration cost, not just a CSS rule that
silently never matches. Verified live in three separate browser
contexts: a normal desktop context gets `.tcg-tilt-ready` and live
tilt/parallax/glare tracking; a `reducedMotion:'reduce'` context and a
touch/coarse-pointer context both get neither the class nor any
listeners.

Only ever writes CSS custom properties (`--tcg-tilt-x/y`,
`--tcg-parallax-x/y`, `--tcg-glare-x/y`) from JS — the actual
transform/opacity formulas live declaratively in the CSS `.tcg-tilt-ready`
rules, not duplicated as JS-built transform strings. Pointer position
is sampled on every `pointermove` but only ever *applied* once per
animation frame via `requestAnimationFrame` coalescing, so a
high-polling-rate mouse can't force more style writes than the display
can actually show. `pointerleave` cancels any pending frame and resets
tilt/parallax back to zero, letting the card's own existing transition
smoothly carry it back to flat — no separate "return" animation class
or logic needed.

**`.tcg-card-glare`.** New layer, confined to the art-panel bounds
like the vignette/foil above it, a plain white-to-transparent radial
gradient (no `mix-blend-mode` — reads convincingly at low opacity on
its own, and skipping the blend mode keeps compositing cheap across a
lazy-loaded grid that can hold many of these at once). Position tracks
the cursor with no transition of its own (already smooth from the
rAF-coalesced updates); only its opacity fades in/out on hover, via a
plain CSS `:hover` rule rather than a third custom property.

### Optimize performance — concrete, not just "don't make it janky"

- **`will-change: transform` scoped to `:hover` only**, not the resting
  card — a large catalogue grid (Phase 8's whole point was rendering
  hundreds of these) never holds more than the one currently-hovered
  card promoted to its own compositor layer at a time, rather than
  permanently paying that memory cost per card.
- Every animated property across the new effects is `transform` or
  `opacity` (plus a `background`/custom-property change for the glare's
  position, itself compositor-cheap) — nothing here ever touches a
  layout-triggering property (`width`/`height`/`top`/`left`), so tilt
  tracking never forces a reflow.
- `requestAnimationFrame` coalescing (above) caps style writes at the
  display's own refresh rate regardless of how fast `pointermove`
  actually fires.
- The capability gate (fine pointer + real hover + motion allowed) is
  itself a performance measure, not just an accessibility one — mobile
  devices, generally the least powerful, never pay any cost for an
  effect they'd never meaningfully trigger.
- `wireCardTilt` runs once per card at *build* time (not per frame),
  composing with Phase 8's lazy-loading: cards outside the current
  batch simply don't exist yet, so there's nothing to wire until they
  do.

### Architecture

- All new CSS lives under the existing `.tcg-tilt-ready` opt-in class,
  never the bare `.tcg-card` selector — a card built by any future
  caller that doesn't go through `wireCardTilt` (or on a device that
  fails the capability check) renders with exactly the same plain
  `translateY(-6px)` hover lift the component has had since Phase 2,
  byte-for-byte.
- No new `buildTradingCard` opts — this session is presentation-only,
  intentionally invisible at the API level.

### Files Modified

`index.html` only. New: `wireCardTilt`, `tcgTiltCapable`,
`TCG_TILT_MAX_DEG`/`TCG_PARALLAX_MAX_PX`, the `.tcg-card-glare` element
(created in `buildTradingCard`) and its CSS, `.tcg-tilt-ready` CSS
(card transform formula, art-layer parallax, will-change scoping).
Changed: `.tcg-card`/`.tcg-card:hover`/`.tcg-card.locked:hover` shadow
values and transition timing, `tcgFoilSweep` trigger timing (both the
Iconic and Rarity-Evolution-tier-4+ triggers), the reduced-motion media
query block (new selectors added for every new effect).

### Known Limitations

- Tilt/parallax/glare are card-local effects — no cross-card
  choreography (e.g. neighboring cards subtly reacting) was attempted;
  that would risk crossing from "premium" into "flashy" for a grid that
  can hold dozens of cards at once.
- No haptic/audio feedback layer — purely visual, consistent with the
  rest of the app.

### Future Improvements

- If a future session adds a card-detail "inspect" view (a single card
  shown large, not in a grid), the same tilt/parallax pattern could
  extend to a wider max angle there, where there's no grid-scale
  performance concern to weigh against it.

### Testing

Verified live with Playwright (temporary `window.__TILT_TEST__` hook,
removed before finishing): unlocked cards get `.tcg-tilt-ready`, locked
cards never do; simulated `pointermove` events produce tilt/parallax/
glare custom-property values within the configured max range and in
the geometrically correct direction (pointer toward the bottom-right
quadrant tilts and parallaxes accordingly); `pointerleave` resets
tilt/parallax to zero; the glare element exists on every unlocked
card; transition property/duration values reflect the new timing.
Three separate browser contexts confirmed the capability gate:
`reducedMotion:'reduce'` and a touch/coarse-pointer context both get
no tilt wiring at all, a normal desktop context does. Took a
side-by-side screenshot (resting / actively hovered+tilted-toward-
bottom-right / standard-rarity resting) and visually confirmed the
hovered card lifts, tilts, and shows a soft glare in the expected
corner — subtle, not flashy, no distortion of the frame/text. Then
re-ran the full Character Archive regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, `test-scroll-bug`,
`test-lazy-load`, `test-stats`) plus both of Phase 8's own migration/
observer-isolation scripts — zero regressions, zero new console errors
beyond pre-existing unrelated network noise.

---

## Session: Character Archive migrates to the TradingCard component (Phase 8)

**The live wiring session.** Six prior phases (2 through 7) built the
whole TradingCard system — the card shell, Genre Frame System, Rarity
Engine, Rarity Evolution, Series Decoration — as a standalone component
with zero callers, deliberately kept out of the Character Archive until
it was ready as a whole. This session is that wiring: `.char-card` (the
Character Archive's original, simpler collector card) is retired, and
every character card the app renders — the global Character Catalogue
and each show's own Character Archive tab — now builds through
`buildTradingCard`, carrying real computed genre/rarity/evolution/series
data, not placeholder opts. This is also the first session where
`.tcg-*` classes appear on a normal, non-demo page — every prior
session's "isolation" check was specifically confirming that hadn't
happened yet.

### What "maintain existing functionality" meant here

Every existing Character Archive capability was preserved, verified
against the *old* `.char-card`-based regression suite updated to the
new `.tcg-card` markup rather than rewritten from scratch, so the same
behavioral assertions had to keep passing: spoiler-gated locking (MAIN
always visible, SUPPORTING/BACKGROUND hidden until the show is
completed), the deck view (group-by-series, ungroup, regroup, search
bypasses grouping), search/sort/filter in the flat catalogue view, My
Journey (rating/notes/moment/quote, still gated behind deep-unlock),
character-unlock Timeline notifications, and the Character Detail
modal (untouched — it's a different UI, not a grid tile, out of this
session's scope).

**One real gap found and closed, not papered over:** the old locked
card showed a small crest icon and (in the catalogue's `showSeries`
context) the series name next to its "???" placeholder — a locked
card told you *which show* it belonged to even though the character
itself stayed hidden. `buildTradingCard`'s lock overlay (built in
Phase 2) replaces the entire card with one opaque silhouette + message
and nothing else, by design, for genre/rarity/evolution/series. That's
correct for rarity (a real spoiler concern this whole system has
guarded since Phase 2) but was a real loss of existing, useful,
non-spoiler information for series identity. Fixed by extending the
shared component itself (not a Character-Archive-only hack) with two
new opt-in pieces: `opts.lockedCaption` (a small caption line above
the silhouette) and a "?" mark on the lock silhouette (parity with the
old card's floating question mark) — both null/absent by default, so
every other locked-card call site from Phases 2–7 is unaffected.

### Completed

**`buildCharacterTradingCard(character, item, opts)`** — the new single
entry point (replacing `buildCharacterCardHtml`), composing everything
built since Phase 2 from real per-character/per-show data:
- `genre` — the first of `item.genres` that has a `GENRE_FRAME_RECIPES`
  entry (same lookup pattern `resolveCharacterTheme` already uses for
  its own genre fallback).
- `rarityData` — real `computeRarityData()` output (Phase 7's engine),
  fed real inputs (see below) rather than a hand-picked tier.
- `evolutionLevel` — `resolveEvolutionLevel()` (Phase 5), using the
  same real `favouritesPercentileRank` input as the rarity engine.
- `seriesTitle` — the show's own title, resolved through
  `SERIES_DECORATION_SETS` (Phase 6) exactly as everywhere else.
- `personalMarker` — true when the character has any My Journey data
  (rating, favorite moment/quote, or notes) — reuses existing
  `getCharJourney` data, no new storage.
- `locked`/`lockedMessage`/`lockedCaption` — unchanged spoiler gating
  via the existing `isCharacterUnlocked`, now including the
  `lockedCaption` fix above.

**Real Rarity Engine inputs, wired for the first time.** Phase 7
shipped `computeRarityData` with no live caller and documented exactly
this as a Known Limitation. This session closes it, honestly, within
what AniList actually provides:
- `favouritesPercentileRank` — `character.favourites` ranked against
  every other character in the pool currently being rendered (the
  whole catalogue, or a single show's cast), via a new
  `percentileRankMap()` (O(n log n), ties share the average rank).
- `popularityPercentileRank` — AniList has no per-character popularity
  metric (the existing meta-grid comment already documents this), but
  Media (the show) does. A character's parent show's popularity,
  percentile-ranked the same way, is used as an honest, genuinely
  different proxy signal — not a duplicate of favourites.
- `appearanceCount` — always counted against the *full* archive
  (`allArchiveEntries()`), regardless of which pool is being rendered,
  since "recurs across your library" is only meaningful measured
  globally.
- `storyImportance` remains unwired (defaults to the role score inside
  the engine itself, per Phase 7) — still a real, documented limitation,
  not silently faked.
- All three real inputs are computed **once per grid render**
  (`buildRarityInputLookup(entries)`), not recomputed per card — an
  O(entries) pass instead of O(entries²).

**Scrolling / loading / performance.** Both card grids (global
catalogue, per-show tab) now render through `renderLazyCardList`
(Phase 3's own Home-feed infrastructure, previously never used by the
Character Archive, which built its full card list as one HTML string
up front regardless of size) — batches of 8, more appended as an
`IntersectionObserver` sentinel scrolls into view. A catalogue with
hundreds of characters across many tracked shows no longer builds
every card synchronously on open.

**`renderLazyCardList` generalized for independent registries.** Its
observer-cleanup array (`lazyLoadObservers`) was a single module-level
list shared by every caller; wiring a second, third context (the
Archive overlay's two grids) into the same shared list would mean
re-rendering the catalogue could silently disconnect the Home feed's
still-active lazy-load underneath it, or vice versa. `renderLazyCardList`
now takes an optional `registry` array (defaulting to the original
shared `lazyLoadObservers`, so every existing Home/History call site is
byte-for-byte unaffected), and a new `disconnectLazyObservers(registry)`
helper replaces the hardcoded body of `clearLazyObservers()`. The
catalogue and per-show grids each get their own registry
(`catalogueLazyObservers`, `showCharLazyObservers`), disconnected at
the top of their own render functions — never each other's, never
Home's. Verified live: opening/scrolling the Archive overlay while
Home's own lazy-load is mid-batch underneath it does not disconnect
Home's observer, and Home resumes loading correctly once the Archive
closes.

**Loading polish.** The one-time "warming the character cache" skeleton
grid (shown while the first AniList fetch is in flight) now renders
`.tcg-card-skeleton` placeholders shaped like real cards (aspect-ratio
5/7, ~75% art-panel proxy) instead of the old card's fixed 190px
portrait shape — the loading → content swap no longer reflows the grid.

**Responsiveness / spacing.** Both grids switched from `.char-grid`'s
three fixed breakpoints (1 column under 640px, 2 under 980px, 3 above)
to `.tcg-grid`'s `repeat(auto-fill, minmax(140px, 1fr))` — column count
now follows available width continuously rather than jumping at two
fixed points, and every card keeps its own aspect ratio regardless of
how many columns fit. Verified live at 1400/700/400px: column count is
monotonic with width and never collapses to 0. The deck view (still
`.char-deck` tiles, unaffected in markup) shares the same grid
container and benefits from the same fluid layout.

### A real gap found and fixed during verification (not the lock-caption one above)

The first version of the new migration test (seeding a catalogue-warmed
show, then separately opening a single show's own Character Archive
tab) found `item.characters` silently emptied to `[]` by the time the
per-show tab rendered — 0/0 characters, no cards. Root cause: two
different AniList queries hit the same endpoint (`CHAR_BATCH_QUERY`,
the catalogue's batched warm-fetch, expecting `Page.media[]`; and the
pre-existing `SHOW_EXTRA_QUERY`, the single-show About/Characters tab
fetch, expecting a single `Media` object) and the test's mock answered
both with the `Page.media[]` shape — `ensureShowExtra` correctly (this
is pre-existing, unrelated-to-this-session app behavior) re-fetches
whenever `item.extra` is still empty even if `item.characters` is
already populated, and with the wrong response shape it overwrote a
good `item.characters` with an empty array from `data.Media` being
`undefined`. This was a test-mock bug, not an app bug — fixed by
making the mock answer each query shape correctly, matching the
pattern `test-char-archive.js` already used. Documented here because
it's a useful trap for any future test seeding both `CHAR_BATCH_QUERY`
and `SHOW_EXTRA_QUERY` responses on the same route.

### Architecture

- `buildCharacterTradingCard` is the only place Character Archive data
  (character, item, journey) meets the TradingCard component — the
  component itself (`buildTradingCard` and everything it composes with)
  still has zero knowledge of Character Archive state, exactly as every
  prior phase's comments promised.
- `TCG_RARITY_CONFIG` (design) and `computeRarityData` (data) stay as
  separate as Phase 7 established — `buildCharacterTradingCard` only
  ever passes the engine's *output* (`rarityData`) into `buildTradingCard`,
  never touches `TCG_RARITY_CONFIG` itself.
- Dead code removed: `buildCharacterCardHtml`, `wireCharacterGridClicks`
  (delegated click handling is no longer needed — `buildTradingCard`'s
  own `onClick` opt handles it per-card, now that cards are built as
  live nodes via `renderLazyCardList` rather than HTML strings), and
  every `.char-card`/`.char-grid` CSS rule. `.char-role-badge` (still
  used by the Character Detail modal's own header) and `.char-deck*`
  (deck tiles, unaffected) were kept.

### Files Modified

`index.html` only. New: `buildCharacterTradingCard`, `percentileRankMap`,
`buildRarityInputLookup`, `characterHasJourneyMarker`,
`disconnectLazyObservers`, `.tcg-card-skeleton`/`.tcg-skel-*` CSS,
`opts.lockedCaption` + lock-silhouette "?" mark on `buildTradingCard`.
Removed: `buildCharacterCardHtml`, `wireCharacterGridClicks`, all
`.char-card`/`.char-grid` CSS. Changed: `renderCatalogue`,
`renderShowCharacterGrid`, `buildCharacterCardSkeletonHtml`,
`renderLazyCardList`/`clearLazyObservers` (registry parameter), the
`#catalogueGrid`/`#showCharGrid` container class
(`char-grid` → `tcg-grid`).

### Known Limitations

- `storyImportance` (Rarity Engine's fifth signal) is still unwired to
  anything real — same limitation Phase 7 documented, not addressed
  this session since it wasn't part of "replace the cards."
- Character Detail (the full bottom-sheet modal opened by tapping a
  card) is untouched — still its own hero/meta-grid layout, not a
  TradingCard. Only the grid *tiles* were in scope.
- No artwork enhancement source beyond the existing `character.image`
  AniList URL — the Character Artwork Management System's multi-tier
  source resolution (Phase 3) still isn't connected here; `enhance`
  (Phase 3.1's canvas upscale/crop pass) runs on whatever AniList image
  is already cached, same as before.

### Future Improvements

- Wire `storyImportance` from Character Memory data (favorited/
  journaled characters) once that's built out as its own signal.
- Consider connecting the Character Artwork Management System's
  higher-quality source tiers now that cards are actually live.
- Apply the same `renderLazyCardList` + scoped-registry pattern to any
  future grid the app adds, now that it's a documented, reusable
  pattern rather than Home-feed-specific.

### Testing

Verified live with Playwright: the existing 9-script Character Archive
regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, `test-scroll-bug`, `test-lazy-load`, `test-stats`),
updated in place from `.char-card`/`.char-card-name`/fixed-breakpoint
assertions to `.tcg-card`/`.tcg-card-name`/auto-fill assertions — same
behavioral coverage, new selectors — all passing with zero regressions.
Two new scripts added this session: one exercising the full migration
(lazy-load batching and scroll-triggered loading in the catalogue, real
rarity/genre data reaching rendered cards, deck↔flat-view transitions,
and the per-show tab's independent grid) and one specifically proving
observer-registry isolation (Home's lazy-load survives the Archive
overlay being opened, scrolled, searched, and closed on top of it).
Spot-checked a further ~15 unrelated regression scripts (Discover,
Episode/Chapter modals, Notifications, Theme, Responsive, Show Detail)
to confirm nothing outside the Character Archive was disturbed — three
pre-existing scripts (Discover-add-button, Journal notes textarea,
Calendar tomorrow-tab) timed out on selectors this session's diff never
touches, confirmed unrelated by grep (no reference to any changed
function/class) and left as pre-existing flakiness, not treated as a
regression here. Took screenshots of the flat catalogue view (locked
and unlocked cards, genre frames, rarity gems, series captions all
visible together), the deck view (unchanged, laid out correctly inside
the new grid), and a per-show tab with a personal-marker heart visible
on a journaled character — all visually confirmed. Confirmed `.tcg-*`
now appears on a normal page load for the first time ever in this
project (one empty `#catalogueGrid` shell, part of the Archive
overlay's always-present-but-hidden markup — zero actual cards render
until the Archive is actually opened).

---

## Session: Rarity Engine (Phase 7)

**Replaces Phase 2's `resolveCardRarity`** (a 2-signal, role +
favourites-only heuristic) **with a real multi-factor engine.** Genre
Frame System, Rarity Evolution, and Series Decoration are all
untouched. Character Archive still untouched — same boundary every
prior TradingCard session has kept.

### The core design decision

"Rarity should not be hardcoded" + "store rarity separately from
design" together mean two very different things have to stop being one
thing:

- **Design** — what a rarity tier *looks like* (hairline strength,
  ornament scale, foil on/off). This is `TCG_RARITY_CONFIG`, unchanged
  from Phase 2. It knows nothing about characters.
- **Data** — what tier a *character* has actually earned, computed
  from real signals. This is the new Rarity Engine,
  `computeRarityData(input)`. It knows nothing about hairlines,
  ornaments, or foil.

The only thing that crosses the boundary between them is a tier string
(one of `TCG_RARITY_TIERS`). `buildTradingCard` reads
`TCG_RARITY_CONFIG[tier]` for rendering and never touches popularity,
favourites, role, appearances, or story importance directly — "frame
rendering consumes rarity data" in the literal sense that it consumes
the *tier the data produced*, not the data itself.

### The calculation

Five inputs, all normalized to 0–1 before combining, weighted sum,
then thresholded:

| Signal | Weight | Normalization |
|---|---|---|
| `role` (MAIN/SUPPORTING/BACKGROUND) | 0.30 | MAIN=1.00, SUPPORTING=0.55, BACKGROUND/unset=0.15 |
| `popularityPercentileRank` | 0.20 | already 0–1 (caller-computed percentile) |
| `favouritesPercentileRank` | 0.20 | already 0–1 (caller-computed percentile) |
| `appearanceCount` | 0.15 | diminishing returns: `1 − 1/(1+count)` |
| `storyImportance` | 0.15 | 0–1; defaults to the role score when omitted |

```
score = 0.30·roleScore + 0.20·popularity + 0.20·favourites
      + 0.15·appearanceScore + 0.15·storyImportance
```

Weights sum to 1.0, so `score` is itself 0–1. Tier thresholds:
`≥0.85` iconic, `≥0.65` signature, `≥0.40` featured, else standard.

**Why these specific choices**, documented in full at the function
itself (`index.html`, "Rarity Engine" section):
- Role leads because it's the single most reliable signal available
  today; popularity and favourites are both well-normalized
  percentiles so they share the next weight tier equally; appearances
  and story-importance get less weight because they're weaker or
  (for story-importance, when omitted) partially redundant with role.
- Appearance count uses a diminishing-returns curve rather than linear
  scaling deliberately — a character recurring across 4 shows is
  clearly rarer than a single-show character, but the difference
  between 4 and 5 shows shouldn't matter as much as the difference
  between 0 and 1 does.
- `storyImportance` is kept as a genuinely separate input from `role`,
  not derived from it, specifically because AniList's role edge is a
  coarse 3-bucket field — a saga's true deuteragonist and a one-scene
  cameo can both be tagged MAIN. It's left as an explicit (optional)
  input so a finer future source — e.g. the Character Memory system's
  favorited/journaled characters — can feed it later without changing
  the engine's signature. Defaulting it to the role score when omitted
  keeps the engine fully usable today on AniList-native data alone.

### Completed

**`computeRarityData(input)`** — pure function, nothing persisted
(same "derive live" precedent as `isCharacterUnlocked`/
`resolveEvolutionLevel`). Returns `{ tier, score, breakdown }` — the
full breakdown (not just the tier) is retained so a future UI can
explain *why* a character landed on a tier, and so the thresholds can
be tuned later against real score distributions instead of guessed
blind. Verified live: strong-signal MAIN characters land iconic,
weak-signal BACKGROUND characters land standard, a mid-range
SUPPORTING character lands featured; `storyImportance` correctly
defaults to the role score when omitted; the appearance-count curve is
strictly increasing and strictly diminishing; role ordering alone
(BACKGROUND < SUPPORTING < MAIN, all else equal) is monotonic; garbage/
out-of-range inputs (negative counts, percentiles >1 or <0) clamp
cleanly with no `NaN`; missing input entirely still returns a valid
`standard`-tier result with no crash.

**`buildTradingCard(opts)` gained `opts.rarityData`** — the preferred
path once a real character is behind the card. `opts.rarity` (a plain
tier string) remains supported as a manual override for demo/test
cards or placeholders with no real character data yet;
`rarityData.tier` wins when both are given. Verified live: a card
built via `rarityData` and an equivalent card built via the matching
`rarity` string render byte-identical design output (same
`--tcg-ornament-scale`, same `--tcg-hairline`) — proof the design
layer genuinely can't tell which path produced its tier. A card built
with neither still defaults to `standard`, unchanged from every prior
phase.

**`card.dataset.rarityScore`** — set only when `rarityData` was
supplied (omitted entirely for the manual-override/no-data path),
giving a lightweight live-DOM trace of the score that produced a
card's tier without polluting cards that were never run through the
engine.

### Architecture

- `TCG_RARITY_CONFIG`/`TCG_RARITY_TIERS` (design) sit exactly where
  Phase 2 left them; only their section comment changed, to state the
  design/data boundary explicitly.
- The Rarity Engine is its own major section (matching the
  `====` banner convention every other TradingCard subsystem uses),
  placed between the Genre Frame System and Rarity Evolution.
- Rarity Evolution's own `resolveEvolutionLevel` (Phase 5) is
  deliberately **not** rebuilt on top of `computeRarityData` — it
  remains its own simpler, independent role/favourites heuristic
  driving a different 6-step axis, exactly as documented when it was
  built. Unifying the two is listed below as future work, not done
  silently here.

### Files Modified

`index.html` only — removed `resolveCardRarity`, added
`computeRarityData`/`clampUnit` (new "Rarity Engine" section), updated
the `TCG_RARITY_CONFIG` section comment, updated one stale comment
reference in the Rarity Evolution section, extended `buildTradingCard`
opts (`rarityData`) and its doc block, and one new `dataset.rarityScore`
assignment. Character Archive untouched — confirmed again via the same
`[class*="tcg-"]` zero-count check every prior session has used.

### Known Limitations

- `popularityPercentileRank`, `favouritesPercentileRank`,
  `appearanceCount`, and `storyImportance` are all caller-supplied,
  normalized numbers — this session does not compute them from live
  AniList/Character Archive data (no percentile-ranking pass across
  `allArchiveEntries()`, no appearance-counting across tracked shows).
  Same honest-stub boundary as every prior TradingCard subsystem: the
  engine is real and fully tested against the shape of that data, but
  nothing calls it with real data yet.
- `storyImportance` has no independent source yet and silently
  defaults to the role score — until a real source exists (e.g.
  Character Memory), it's a soft signal riding on top of `role` rather
  than a genuinely fifth independent factor.
- No UI entry point — like every TradingCard subsystem so far,
  `rarityData`/`rarity` are `buildTradingCard` opts with no live
  caller.

### Future Improvements

- Wire real percentile computation: a function that takes
  `allArchiveEntries()` (or the relevant pool) and returns each
  character's `popularityPercentileRank`/`favouritesPercentileRank`,
  feeding `computeRarityData` for real.
- Source `storyImportance` from Character Memory (favorited
  characters, journal depth) once that data is reachable from here.
- Consider whether Rarity Evolution's independent heuristic should
  eventually read its role/favourites signals through the same engine
  instead of duplicating similar logic — left alone this session
  deliberately, per "Architecture" above.
- Wire the whole TCG system (genre + evolution + series + rarity) into
  the live Character Archive.

### Testing

Verified live with Playwright (temporary `window.__RARITY_TEST__`
hook, removed before finishing): engine math (strong-MAIN → iconic,
weak-BACKGROUND → standard, mid-SUPPORTING → featured,
`storyImportance` role-default, appearance-count curve
monotonic+diminishing, role-only ordering monotonic, garbage-input
clamping, empty-input safety, breakdown recomputes to the same score);
`buildTradingCard` consumption (`rarityData` flows to
`dataset.rarity`/`dataset.rarityScore`, manual `rarity` still works
with no score attribute, `rarityData` wins when both given, neither
given still defaults to `standard`, same tier via either path produces
identical design output). Then re-ran the full Character Archive
regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, plus `test-scroll-bug`/`test-lazy-load`/
`test-stats`) — zero regressions — and confirmed `.tcg-*` isolation
(`[class*="tcg-"]` count is 0 on a normal page load) and that no
`window.__*_TEST__` hook remains attached.

---

## Session: Series Decoration System (Phase 6)

**Builds directly on the Genre Frame System (Phase 4) and Rarity
Evolution (Phase 5)** — neither was touched. Character Archive still
untouched — same boundary every prior TradingCard session has kept.

### The core design decision

"Genre provides the base frame. Series provides identity." Genre
Frames answer *what kind of story is this* (12 recipes, reusable
across hundreds of shows); Series Decoration answers *which specific
story* — a small, optional identity layer on top, for the handful of
series a user actually has deep history with. The two axes are
architecturally independent: a card can carry a series decoration with
no genre, a genre with no series, both, or neither, and none of the
four combinations require special-casing in `buildTradingCard`.

**Reused, not re-authored.** The original Character Archive session
already built a `SERIES_THEMES` match table (regex → name/accent/crest)
and six `CREST_*` inline SVGs for these exact six series. Series
Decoration's `SERIES_DECORATION_SETS` reuses those same match regexes
and crest constants directly as its `emblem` field, rather than
duplicating six new SVGs — one visual identity per series across the
whole codebase, not two competing ones.

**"Architecture must support every future anime."** `SERIES_DECORATION_SETS`
is a flat array of `{match, series, motifs, emblem, edgeMotif}`
records; `resolveSeriesDecoration(title)` walks it and returns `null`
for anything unmatched — the exact same graceful-fallback shape as
`resolveCharacterTheme`/`SERIES_THEMES` already established. Adding a
7th series later is one new array entry, and any title that doesn't
match one yet (which is most anime, always) silently renders a card
with no series layer at all rather than a placeholder or an error.

### Completed

**All 6 named series** (One Piece, Frieren, Bleach, Naruto, Death
Note, Attack on Titan/Shingeki no Kyojin) resolve to their own emblem
crest and a distinct edge motif — rope, runes, brush, scroll, ink,
steel — implemented as 6 different `repeating-linear-gradient`
`border-image` patterns using `currentColor` (so each automatically
follows whatever tint is already active on the card — genre accent, or
an evolved tier's color — with no new color computation). Verified
live: 6/6 unique emblem SVGs, 6/6 unique edge-motif classes.

**`resolveSeriesDecoration(title)` / `applySeriesDecoration(card,
seriesTitle)`** — the same "plain title string in, not a Character
Archive object" decoupling every TradingCard subsystem has kept since
Phase 2. Verified: unknown/future titles, empty string, and `null` all
resolve to `null` with zero DOM changes and no crash; calling
`applySeriesDecoration` twice on the same card (e.g. swapping series,
or clearing back to none) correctly reuses/removes its own elements
rather than duplicating them.

**Fully opt-in and backward compatible.** `buildTradingCard(opts)`
gained one new optional field, `opts.seriesTitle` — a card built
without it renders with zero series DOM, verified live.

**Locked cards hide the series emblem**, matching the same
rarity-spoiler precedent as the genre ornament (Phase 4) and evolution
ring (Phase 5).

**Composes cleanly with genre + evolution.** Verified live on a card
carrying all three (genre ornament, evolution ring, series
emblem/edge) simultaneously — all four decorative layers render
without conflict.

### A real bug caught during verification, not by the brief

The series edge (`inset:6px` as first written) and the Rarity
Evolution ring (`inset:5px`, 2px border, from Phase 5) occupy
overlapping bands — the ring's border paints the 5–7px region from the
card edge, which fully contains where a 6px-inset edge would sit. Since
the ring's z-index (4) sits above the edge's (3), a card with both an
active evolution level and a resolved series would have silently lost
its entire series edge under the ring — invisible, not just visually
noisy. Caught by reasoning about the two layers' box geometry before
screenshotting, not after. Fixed by moving the series edge out to
`inset:9px`, a clean 2px gap past the ring's outer edge; re-verified
live that both rings render with non-overlapping bands
(`edgeInset >= ringInset + ringWidth`) on a combined genre+evolution+series
card, and confirmed visually via a 6-card side-by-side screenshot.

### Architecture

- `SERIES_DECORATION_SETS` — array of `{match, series, motifs, emblem,
  edgeMotif}`. `motifs` (e.g. One Piece's Rope/Compass/Treasure
  Map/Ocean/Jolly Roger) is stored as documentation of the theming
  intent behind each series' single `edgeMotif` choice, not rendered
  literally — six independent visual motifs per series was judged
  excessive for a "delicate, optional" identity layer; one
  representative texture per series stays consistent with Phase 4/5's
  own "one technique per recipe" precedent.
- Two new card layers: `.tcg-card-series-emblem` (bottom-right corner —
  the one corner Genre Frame's ornament, bottom-left, doesn't already
  use) and `.tcg-card-series-edge` (inset:9px accent ring, 6 swappable
  `border-image-source` motif classes).
- Both layers fall back through `var(--tcg-accent, var(--tcg-genre-accent, #fff))`
  so a series-only card (no genre) still renders a sensible color
  instead of inheriting nothing.

### Files Modified

`index.html` only — new `SERIES_DECORATION_SETS` table (reusing
existing `SERIES_THEMES` regexes and `CREST_*` constants), new JS
(`resolveSeriesDecoration`, `applySeriesDecoration`), new CSS
(`.tcg-card-series-emblem`, `.tcg-card-series-edge` + 6 motif
variants), and one new call site inside `buildTradingCard`. Character
Archive untouched — confirmed again via the same `[class*="tcg-"]`
zero-count check every prior session has used.

### Known Limitations

- Only 6 series have decorations; every other title renders with no
  series layer at all (by design — see "every future anime" above).
- `edgeMotif` is one texture per series, not all of the brief's listed
  motifs per series — the emblem crest carries most of the per-series
  identity; the edge is a secondary, deliberately subtle accent.
- No UI entry point yet — like every TradingCard subsystem so far,
  `seriesTitle` is a `buildTradingCard` opt with no live caller; wiring
  the whole TCG system into the actual Character Archive remains
  future work, same as Phases 2–5.

### Future Improvements

- Wire `buildTradingCard` (genre + evolution + series, all of it) into
  the live Character Archive.
- Consider deriving `seriesTitle` automatically from a character's show
  data at the call site once that wiring happens, rather than requiring
  callers to pass it explicitly.

### Testing

Verified live with Playwright (temporary `window.__SERIES_TEST__`
hook, removed before finishing): all 6 series resolve with distinct
emblem/edge; `null`/empty/unknown titles no-op cleanly; series-only
(no genre) card renders correctly; unrecognized series title still
builds a valid card with zero series DOM; a card with no `seriesTitle`
at all is byte-for-byte unaffected; genre+evolution+series composition
renders all layers with non-overlapping evo-ring/series-edge bands;
locked cards hide the emblem; swapping series then clearing back to
none correctly re-classes/removes elements with no duplicates. Took a
6-card side-by-side screenshot (One Piece/Frieren/Bleach/Naruto/Death
Note/Attack on Titan, each combined with a genre and an evolution
level) and visually confirmed distinct emblems and no ring/edge clash.
Then re-ran the full Character Archive regression suite
(`test-char-archive`, `test-char-catalogue`, `test-char-decks`,
`test-char-modal`, `test-char-notifications`, `test-char-sanity`, plus
`test-scroll-bug`/`test-lazy-load`/`test-stats`) — zero regressions —
and confirmed `.tcg-*` isolation (`[class*="tcg-"]` count is 0 on a
normal page load) and that no `window.__*_TEST__` hook remains
attached.

---

## Session: Rarity Evolution (Phase 5)

**Builds directly on the Genre Frame System (Phase 4)** — no rarity
tiers were touched (the existing `resolveCardRarity`/`TCG_RARITY_CONFIG`
4-tier system is completely untouched and still fully backward
compatible; this is a new, separate, opt-in axis). Character Archive
still untouched — same boundary every prior TradingCard session has
kept.

### The core design decision

Each genre gets its own **named 6-tier evolution ladder** (per the
brief's own Adventure/Fantasy/Sci-Fi examples, matched exactly — see
Testing), but the *mechanism* driving all 72 tiers (12 genres × 6
levels) is a single shared progression model, not 72 bespoke
implementations. What stays constant within a genre across every tier
is its **border technique** from Phase 4 — a Sci-Fi card's fine
chevron motif, Fantasy's double-line, Adventure's rope-braid — so a
card is always recognizably its genre at a glance, whether it's the
weakest or strongest tier. What evolves is the *material* (tint color)
and a small set of shared craftsmanship enrichments that unlock in a
fixed order:

| Level | Adds |
|---|---|
| 0 | Base material, base border width |
| 1 | Richer ("bronze") tint, +1px width |
| 2 | "Silver" tint, +1px, **a new inset accent ring appears** |
| 3 | "Gold" tint, +1px, **the corner ornament starts glowing** |
| 4 | Dark/precious tint, +1px, **foil-sweep-on-hover activates** |
| 5 | Most vivid/otherworldly tint, +1px, **the ring itself becomes a static two-color "prismatic" sweep** |

Every enrichment (ring, glow, foil, prismatic) is additive — nothing
at a higher tier removes what a lower tier already showed — so the
progression reads as *accumulating* craftsmanship, not a palette swap.

### Completed

**All 12 genre evolution ladders**, matching the brief's three given
examples exactly (Adventure: Weathered Wood → Bronze Explorer → Silver
Explorer → Gold Explorer → Black Gold Explorer → Diamond Navigator;
Fantasy: Weathered Oak → Bronze Rune → Silver Rune → Gold Filigree →
White Gold → Celestial Gold; Sci-Fi: Carbon Fiber → Titanium → Chrome →
Quantum Alloy → Crystal Frame → Dark Matter) and extending the same
worn → bronze → silver → gold → dark/precious → mythic arc, re-flavored
per genre, to the remaining 9 (Historical: Cracked Clay → ... →
Eternal Dynasty; Military: Rusted Iron → ... → Medal of Honor;
Mystery: Faded Ink → ... → Forbidden Codex; Horror: Bone Shard → ... →
Abyssal Relic; Romance: Faded Petal → ... → Eternal Bloom; Slice of
Life: Worn Linen → ... → Golden Season; Sports: Scuffed Leather → ... →
Hall of Fame; Music: Cracked Reed → ... → Symphony Eternal;
Supernatural: Faint Mist → ... → Astral Ascension). All 72 tier names
verified distinct within their genre, and all 12 top-tier ("mythic")
names verified distinct across genres.

**`applyRarityEvolution(card, genreKey, level)`** — the shared
mechanism. Verified live, per genre, per level: the genre's own border
technique never changes (only its color/width do), border width is
strictly monotonically increasing across all 6 levels, the accent ring
appears at exactly level 2+, the ornament glow at exactly level 3+,
the foil class at exactly level 4+ — for all 12 genres, zero
exceptions.

**`resolveEvolutionLevel({role, favouritesPercentileRank})`** — pure
function, nothing persisted, same "derive live" precedent as
`resolveCardRarity`/`isCharacterUnlocked`. A finer 6-step scale than
the existing 4-tier rarity buckets specifically because a named
evolution ladder needs more resolution than 4 buckets can express.

**Fully opt-in and backward compatible.** `buildTradingCard(opts)`
gained one new optional field, `opts.evolutionLevel` — a genre card
built without it (every existing call site, including every test from
Phases 2–4) renders byte-for-byte the same as before this session,
verified live (no `evolutionLevel` dataset attribute, no ring element,
untouched border style).

**Locked cards show no evolution spoiler**, matching the existing
rarity-gem/genre-ornament precedent from Phase 2/4: the new accent
ring is explicitly hidden while locked (`.tcg-card.locked
.tcg-card-evo-ring{display:none}`) — the foil and ornament-glow
effects already couldn't show on a locked card for structural reasons
(their elements don't exist, or are already hidden), so the ring was
the one gap, now closed and verified live.

### Architecture

- Converted the 7 gradient-based genre recipes' `border.image` from a
  baked CSS string to a **function of a tint color**
  (`(c1, c2) => gradientString`). `applyGenreFrame` (Phase 4) now
  calls it with the recipe's own base `accent` — identical visual
  output to before this session — and `applyRarityEvolution` calls the
  *exact same function* with each tier's evolved tint. This is what
  keeps a genre's motif shape identical across all 6 tiers while only
  its material changes, without any duplicated gradient-recipe code.
- New `darkenHex(hex, amount)` — the border-image functions need a
  "shadow" tone derived from each tier's single tint color, so
  evolution data only needs one color per tier, not two.
- Width scaling deliberately switched from Phase 2's multiplicative
  model (`base * scale`) to **additive** (`base + level`) specifically
  for this system — caught live during verification that several of
  the smaller base widths in the genre table rounded to the *same*
  integer at adjacent levels under a multiplier (e.g. `3 * 1.15`
  still rounds to 3), silently breaking the "every tier is visibly
  thicker" guarantee. `+1px` per level is small and strictly
  monotonic regardless of a genre's base width. (Phase 2/4's own
  rarity-scale composition inside `applyGenreFrame` is untouched — this
  fix is local to `applyRarityEvolution` only.)

### Files Modified

`index.html` only — extended `GENRE_FRAME_RECIPES` (evolution arrays,
`border.image` converted to functions), new CSS (evolution ring,
locked-state hiding, evo-foil hover trigger), new JS
(`darkenHex`, `resolveEvolutionLevel`, `applyRarityEvolution`), and
one new call site inside `buildTradingCard`. Character Archive
untouched — confirmed again via the same `[class*="tcg-"]` zero-count
check every prior session has used.

### Technical Notes

**A real bug caught by the verification step, not visual inspection.**
The first width-scaling implementation reused Phase 2's multiplicative
formula and looked fine in a screenshot, but a structural check
(comparing each level's actual computed `border-top-width` against the
previous level's) showed it wasn't strictly increasing for *any* of
the 12 genres — rounding was silently collapsing adjacent tiers to the
same width for genres with a small base width. Fixed by switching to
an additive formula; re-verified 12/12 genres strictly increasing
before moving on. A second, smaller issue (the first test pass used
locked test cards, which structurally never have a `.tcg-card-foil`
element, making the foil-threshold check meaningless) led to
deliberately adding the locked-state ring-hiding behavior once the
distinction between "structurally absent" and "intentionally hidden"
became clear — a good outcome from what started as a test bug.

**Testing.** Verified live with Playwright (temporary `window` test
hook, removed before finishing): backward compatibility (a genre card
without `evolutionLevel` has zero evolution DOM/attributes);
`resolveEvolutionLevel`'s six threshold cases; for all 12 genres across
all 6 levels — border technique never changes, width strictly
increases, ring/glow/foil thresholds land exactly at levels 2/3/4, all
6 names distinct per genre; all 12 top-tier names distinct across
genres; the three brief-given examples (Adventure/Fantasy/Sci-Fi) match
exactly; a locked card at the top tier hides its ring. Took a 6-card
side-by-side screenshot of Adventure's full ladder and visually
confirmed the progression reads as genuinely evolving craftsmanship —
recognizable rope-braid motif throughout, a ring appearing partway
through, and a clearly distinct "premium" icy-diamond presence at the
top tier, not a simple recolor. Then re-ran the full Character Archive
regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, plus `test-scroll-bug`/`test-lazy-load`/
`test-stats`) — everything passes identically to before this session,
and the live app still has zero `.tcg-*` DOM footprint.

### Known Limitations

- **Not wired to the existing rarity system's own 4 tiers** —
  `resolveEvolutionLevel` is a separate, parallel resolver, not a
  remapping of `resolveCardRarity`'s output. A card can currently be
  built with a rarity tier, an evolution level, or both independently;
  no code yet enforces a specific relationship between them. Left this
  way deliberately since the brief scoped this session to evolution
  alone ("do not create rarity tiers yet" carried over from Phase 4
  still applies — the *existing* rarity tiers weren't touched, and no
  new ones were added).
- Not wired into the Character Archive, `resolveCharacterTheme`, or
  any automatic rarity/evolution assignment from real character data —
  same deliberate "architecture exists, adoption is a later step"
  boundary as every phase before this one.
- The "prismatic" tier-5 ring is a static two-color gradient, not an
  animated shimmer — a deliberate choice (see Phase 4's own rejection
  of continuous/looping motion as "flashy," `DESIGN_SYSTEM.md`'s "no
  flashy effects"), not a technical limitation.

### Future Improvements

- Decide and implement how `resolveCardRarity` (4 tiers) and
  `resolveEvolutionLevel` (6 tiers) should relate once real data
  wiring happens — likely evolution supersedes the coarser rarity
  tiers entirely for genre-themed cards, but that's a decision for the
  session that actually wires this into the Archive.
- Wire `applyRarityEvolution` into the live Character Archive alongside
  the rest of `buildTradingCard`'s eventual adoption.
- A developer-facing preview surface for browsing all 72 tier
  combinations would help tune the color palette against real artwork
  once real images are involved (this session verified structure and
  progression logic live, but final color tuning was done against
  flat-color synthetic test images only, same limitation Phase 3
  already documented for its own artwork pipeline).

---

## Session: Genre Frame System (Phase 4 — Reusable Architecture Only)

**Reusable architecture only, as instructed — no rarity work this
round** (rarity, built in Phase 2, is untouched). The Character
Archive itself is still untouched too — same boundary every
TradingCard/Artwork session has kept: `buildTradingCard` gains a real
capability, but nothing calls it from the live Archive yet.

### The brief's core constraint, taken literally

"Do NOT simply recolor borders" ruled out the obvious shortcut (reuse
one border, swap `--accent`). Every one of the 12 requested genres
instead uses a genuinely different CSS *border technique* — five use a
native `border-style` keyword (`double`/`ridge`/`dashed`/`dotted`/
`groove`), each of which renders fundamentally different box geometry
and shading, not just a different color; the other seven use a
distinct `repeating-linear-gradient`/`repeating-radial-gradient`
border-image motif (diagonal rope-hatch, fine chevron, jagged
serration, diagonal weave, bold chevron, radial wave, concentric
rings). Verified live that all 12 are structurally unique — not just
by eye, but by comparing the actual computed CSS: 12/12 unique
border-technique signatures, 12/12 unique corner-radius signatures,
12/12 unique ornament SVGs, 12/12 unique accent colors. No two genres
share a technique, a corner silhouette, or a mark.

### Completed

**`GENRE_FRAME_RECIPES`** — one recipe per genre (Fantasy, Adventure,
Sci-Fi, Historical, Military, Mystery, Horror, Romance, Slice of Life,
Sports, Music, Supernatural), each specifying real, distinct values
across every requested axis:
- **Border language** — the technique described above.
- **Corner treatment** — an asymmetric `border-radius` (CSS's 4-corner
  shorthand) per genre, so the card's own *silhouette* differs, not
  just its decoration: uniform-soft (Romance 22px, Music 20px),
  uniform-formal (Historical 14px, Fantasy 16px), sharp-notched
  (Military, Mystery), diagonal-alternating (Adventure, Sports, an
  angular Sci-Fi variant), and asymmetric-jagged (Horror, Supernatural)
  — 12 distinct radius signatures, verified live.
- **Ornament style** — 12 individually hand-authored small inline
  SVGs (a scroll flourish, a compass rose, an angular viewfinder
  bracket, a wax-seal medallion, a rivet cluster, a keyhole, three claw
  scratches, a rose curl, a leaf, a pennant flag, a musical flourish, a
  rune circle) in a brand new dedicated corner — bottom-left of the art
  panel — distinct from the existing rarity gem (top-left) and series/
  franchise crest (top-right), so genre theming gets its own visual
  real estate rather than crowding an already-busy header.
- **Material** — expressed through the border technique + color
  choice itself (gold double-line = polished metal, ridge = carved
  stone, dashed = stitched canvas, groove = soft satin, the seven
  gradient motifs each read as a distinct surface), plus one true
  glow modifier (`.tcg-genre-glow`, opt-in per recipe) for
  Supernatural's ethereal "Veil Walkers" material specifically.
- **Background texture** — reuses Phase 1's existing 13-pattern
  `TCG_GENRE_PATTERNS` nameplate system as-is (already genuinely
  distinct per genre, no need to duplicate it).

**`applyGenreFrame(card, genreKey, scale)`** — the one function every
recipe exists to support. Idempotent (safe to call more than once on
the same card), a no-op for any unrecognized genre (verified with
"Comedy," which has no recipe — builds a completely normal card, no
crash, no `data-genre-frame` attribute), and **composes with rarity
rather than overriding it**: `scale` is the rarity tier's own
`ornamentScale` (already computed in `buildTradingCard`), multiplied
into the genre's base border width — verified live that the same
genre (Fantasy) renders progressively thicker borders across Standard
→ Featured → Signature → Iconic while keeping its own distinct
double-line technique and gold material at every tier. Neither system
silently wins over the other.

### Architecture

- `buildTradingCard` calls `applyGenreFrame` once, near the end,
  **after** the locked/unlocked branch and regardless of which path
  ran — a genre's craftsmanship is a property of the card's outer
  shell, so a locked card still shows its genre's border/ornament even
  with the portrait hidden (only the new ornament specifically hides
  itself under the lock overlay, via `.tcg-card.locked .tcg-card-
  genre-ornament{display:none}`, since that screen real estate is
  already the silhouette's).
- Every genre-specific value lives in the data table; the CSS only
  defines the ornament slot's fixed position/size and the glow
  modifier — identical for all 12 genres. Adding a 13th genre later is
  one data entry, zero new CSS, zero changes to `applyGenreFrame`
  itself — that's what "reusable architecture" means concretely here.
- Deliberately did not touch the existing `TCG_GENRE_PATTERNS`
  nameplate-texture system or `resolveCharacterTheme`'s series →
  franchise → genre → default resolution order — this session enriches
  what a genre-tier theme *renders*, not which theme gets picked.

### Files Modified

`index.html` only — new CSS (ornament slot, glow modifier), new JS
(12 ornament SVGs, `GENRE_FRAME_RECIPES`, `applyGenreFrame`), and one
new call site inside `buildTradingCard`. Character Archive untouched —
confirmed again via the same `[class*="tcg-"]` zero-count check every
prior TradingCard/Artwork session has used.

### Technical Notes

**Why native `border-style` keywords for 5 of 12, not all CSS gradients.**
`ridge`/`groove`/`double`/`dashed`/`dotted` each render genuinely
different box geometry for free, with zero extra markup or gradient
math, and read immediately as different *materials* (carved stone,
soft satin, stitched fabric) rather than different colors of the same
line. Reserving `border-image` gradients for the seven genres whose
craft is more like a repeating printed/woven pattern (rope-braid,
weave, chevron, rings) than a single carved edge kept the recipe table
honest about *why* each genre picked its technique, rather than using
one mechanism everywhere out of convenience.

**Corner radii were tuned twice.** The first pass reused a few radius
values across genres in the same "family" (e.g. Historical/Mystery/
Music/Supernatural all defaulted to a plain 14px) — caught by the
verification step's own uniqueness count (7 unique out of 12), not by
eye. Retuned four of them (Military, Mystery, Sports, Music,
Supernatural) to distinct values within their existing family/feel
before re-verifying at 12/12 — a concrete example of why the
structural-comparison test mattered more than the visual screenshot
alone here.

**Testing.** Verified live with Playwright (temporary `window` test
hook, removed before finishing): built all 12 genres and confirmed
4-way uniqueness (border technique, corner radius, ornament markup,
accent color) via `Set` comparisons on real computed styles, not
visual inspection alone; confirmed rarity composition (same genre,
four rarity tiers, border width scales correctly while the genre's own
technique/color stay constant); confirmed a card with no `opts.genre`
is completely unaffected (no attribute, default 14px radius); confirmed
an unrecognized genre value no-ops safely. Took a 12-card side-by-side
screenshot and visually confirmed each genre reads as distinctly
"handcrafted" — different border rhythm, different corner silhouette,
different ornament, at a glance, not just a different tint. Then
re-ran the full Character Archive regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, plus `test-scroll-bug`/
`test-lazy-load`/`test-stats`) — everything passes identically to
before this session, and the live app still has zero `.tcg-*` DOM
footprint.

### Known Limitations

- **Comedy has no recipe** — the user's 12-genre list for this system
  doesn't include it (unlike the older 13-entry `TCG_GENRE_PATTERNS`
  table, which does). Comedy cards fall back to the existing lighter
  nameplate-pattern-only treatment; adding a 13th recipe later is a
  one-entry addition if that's ever wanted.
- Rarity tiers were explicitly out of scope this session, per the
  brief — genre and rarity compose correctly today (verified), but
  neither system's own internals changed.
- Not wired into the Character Archive or `resolveCharacterTheme` —
  same deliberate "architecture exists, adoption is a later step"
  boundary as Phases 2/3.

### Future Improvements

- Wire `applyGenreFrame` into the live Character Archive alongside the
  rest of `buildTradingCard`'s eventual adoption (Phase 2's own
  documented next step — this session doesn't change that plan, just
  makes the genre layer worth adopting).
- A 13th recipe for Comedy, if genre-frame parity with the older
  nameplate-pattern table ever matters.
- The material axis currently rides entirely on border technique +
  color; a dedicated material *texture* layer (independent of the
  border) was considered and deliberately deferred — the existing
  nameplate pattern system already covers "background texture" without
  it, and adding a second texture layer risked competing visually with
  the character artwork itself for no clear gain this session.

---

## Session: Artwork Quality Improvements (Phase 3.1)

**Improves the pipeline built in Phase 3** — no frame/layout redesign
(explicitly out of scope this round), no new source connected. Same
honesty boundary as last session still applies: tiers 1–3 (transparent
renders / promotional art / official illustrations) remain
unconnected, clearly-labeled stubs — AniTrack still has no backend, no
API keys, no CORS-safe path to those sources. Everything below is a
real, verified improvement to the parts of the pipeline that *are*
real: the one connected source (AniList), the enhancement pipeline,
the caching layer, and how the TradingCard displays the result.

### Completed

**Portrait now occupies ~75% of the card** (up from ~68%) — direct,
one-line consequence for the frame: `.tcg-card-art`/`-vignette`/`-foil`
inset changed from `32%` to `25%` at the bottom. Verified this is safe
by construction: the nameplate below is content-sized and self-
positions above whatever it needs, not a fixed box tied to that
percentage — raising the art panel's share can never clip nameplate
text, only ever show more of the portrait, which is what "not
redesigning frames" while still fixing this meant here: one CSS
value, not a layout rework.

**"Never crop faces aggressively" got a real, working answer instead
of a guess.** The previous session's fixed `object-position:center 12%`
applied the *same* offset to every image regardless of its own shape.
This session moves the actual cropping decision into `enhancePortrait`
itself, where the source image's real aspect ratio is known: when a
crop must come off the top and bottom (a proportionally tall source —
the common case for full-body character art), only **20% of the
trimmed height is taken from the top and 80% from the bottom**, instead
of a centered 50/50 split. A character's head is essentially always
nearer the top of official art than the bottom (empty space, cloak
hems, feet fill the bottom far more often than the top) — this isn't
face detection (still doesn't exist here, still not faked), it's a
principled default that's right far more often than a fixed offset or
a naive center-crop. Verified live against a synthetic tall test image:
the "head" is fully preserved, and the resulting canvas is exactly the
canonical target size — proving a real crop happened, not a stretch.

**Canonical enhancement resolution now exactly matches the art panel's
own aspect ratio** — `480×504` (up from `320×304`), chosen specifically
because `480/504` equals the art panel's own ratio (`160/168` at the
base card unit) to four decimal places. This matters for two reasons:
(1) it raises the actual cached resolution, directly serving "highest
possible image quality," and (2) because the ratio matches exactly,
the enhanced image needs **zero further CSS repositioning** once it
loads — `object-fit:cover` becomes a clean 1:1 fit instead of a second
crop stacked on top of the one the canvas already did. Verified live:
loading the enhanced output back in and measuring it returns exactly
`480×504`, every time, regardless of source shape.

**"Never stretch images" — verified, not just asserted.** The cover-
crop math (compute a source sub-rectangle matching the target's aspect
ratio, then scale uniformly) was already correct before this session;
this session added a live check that actually proves it: enhancing
both a very tall and a very wide synthetic source and confirming the
output is always exactly the canonical size with no distortion,
instead of only checking a data URL was produced.

**"If higher resolution artwork exists, prefer that automatically" —
genuinely implemented, not just assumed from tier order.** Previously
`resolveCharacterArtwork` took the *first* adapter that returned
anything and stopped. Now it collects a candidate from **every**
connected adapter, measures each one's real pixel dimensions, and
picks the largest by pixel area — tier order only breaks a tie. Since
just one source is connected today this is inert in production, but
it's real, working comparison logic, verified two ways: a lower-
priority tier with a genuinely larger image beats a higher-priority
tier with a smaller one, *and* a higher-priority tier wins outright
when it's also the larger image — both directions confirmed live with
temporarily-connected mock adapters before being reverted.

**Improved image loading.** `loadImageWithTimeout()` — every image
load in the pipeline (portrait, grain tile, dimension probes) now has
an 8-second budget; a hanging/very slow source can no longer block
resolution indefinitely, it just fails closed like any other error
path already did. `decoding:"async"` set on every programmatically
created `Image()`. Verified live: a load that can never succeed
rejects promptly rather than hanging.

**Improved image caching, at a second layer.** The existing IndexedDB
persistence (Phase 3) covers *resolved characters* across sessions;
this session adds session-lifetime **in-memory memoization** inside
`enhancePortrait` itself, keyed by URL+target size — this is the path
`buildTradingCard`'s plain `opts.image` takes *without* going through
`resolveCharacterArtwork`/IndexedDB at all, so without this, re-
rendering the same raw URL twice in one session redid the full canvas
pass from scratch for no reason. Verified live by counting actual
`Image()` construction calls across two identical enhancement requests
— zero extra decode on the repeat. A failed enhancement is deliberately
*not* memoized (a transient network hiccup shouldn't be cached as a
permanent failure).

### Architecture

- `probeImageDimensions(url)` extracted as a shared helper (was
  duplicated inline in both `resolveCharacterArtwork` and
  `setManualArtworkOverride`) — now also timeout-guarded via
  `loadImageWithTimeout`, which neither call site had before.
- `ARTWORK_CANONICAL_W`/`ARTWORK_CANONICAL_H` are named constants, not
  magic numbers, specifically so their relationship to the art panel's
  own CSS ratio is documented in one place rather than needing to be
  independently re-derived later.

### Files Modified

`index.html` only — CSS (art panel/vignette/foil insets, bleed
variant, default object-position) and the artwork pipeline JS
(`enhancePortrait`, `resolveCharacterArtwork`, `setManualArtworkOverride`,
new `probeImageDimensions`/`loadImageWithTimeout`). No frame/layer
structure changed, per this session's explicit scope. Character
Archive untouched — confirmed again via the same `[class*="tcg-"]`
zero-count check as every prior TradingCard/artwork session.

### Technical Notes

**Why 480×504 specifically, not just "bigger."** Picking a canonical
size that doesn't match the display box's own ratio would mean the
browser still has to crop the *enhanced* image a second time via
`object-fit:cover` at display time — silently re-introducing exactly
the "aggressive crop" problem this session set out to fix, just one
layer later. Deriving the canonical size directly from the art panel's
own CSS ratio (rather than picking a round number like 500×500) closes
that gap entirely.

**Testing.** Verified live with Playwright (temporary `window` test
hook, removed before finishing, same pattern as every prior session in
this system): canonical resolution ratio matches the art panel exactly;
enhancing both a very tall and a very wide synthetic source produces
correctly-sized, non-stretched output; the enhanced output's own
measured dimensions equal the canonical target exactly; repeat
enhancement of the same URL triggers zero additional image decodes
(memoization); a permanently-failing image load rejects promptly
rather than hanging (timeout path); higher measured resolution wins
regardless of source tier, in both directions; the art panel's resolved
CSS inset reflects the new 25%/75% split. Then re-ran the full existing
Character Archive regression suite (`test-char-archive`,
`test-char-catalogue`, `test-char-decks`, `test-char-modal`,
`test-char-notifications`, `test-char-sanity`, plus `test-scroll-bug`/
`test-lazy-load`/`test-stats`) — everything passes identically to
before this session. Also took a rendered screenshot with a tall
synthetic "full body" test image and visually confirmed the head is
now fully preserved (not cropped) and the art panel is visibly larger
than the previous session's screenshot.

### Known Limitations

- Tiers 1–3 are still not connected to any real source — unchanged
  from Phase 3, still the central documented trade-off of this whole
  system, not an oversight (see the feasibility note in that session).
- The resolution-preference comparison is architecturally real but
  practically inert today, since only one adapter is connected —
  verified with temporarily-mocked adapters, not against genuine
  competing real sources (none exist to compete yet).
- The top-biased crop heuristic (20/80 split) is a principled default
  tuned by reasoning about typical character-art composition, not
  measured against a real, large sample of actual AniList images (no
  reliable network access in this sandbox) — worth revisiting the
  exact ratio once this is used against real artwork at scale.
- Still not wired into `addToList`/`ensureShowExtra` — "works
  automatically whenever added" remains a property of the functions
  themselves, not an active trigger. Unchanged scope boundary from
  Phase 3.

### Future Improvements

- Same as Phase 3's list: connect a real tier 1–3 provider, wire
  automatic resolution into the add-to-list flow, build a developer-
  facing artwork/variant management UI.
- Once real competing sources exist, the resolution-preference logic
  built this session is already ready to make genuine quality
  decisions between them with no further changes needed.

---

## Session: Character Artwork Management System (Phase 3)

**Builds on the TradingCard component (Phase 2).** The Character
Archive is still untouched — `.char-card`/`.char-deck`/
`buildCharacterCardHtml` render exactly as before, and nothing calls
this new system automatically yet (no hook into `addToList`/
`ensureShowExtra`). `buildTradingCard` gained one small, additive,
backward-compatible capability so it can *consume* this system's
output when something eventually wires it up.

### A feasibility note, addressed up front

The requested source priority is five tiers — official transparent
full-body renders, official promotional artwork, official key visuals,
high-resolution official portraits, then AniList. AniTrack is a
client-only static PWA: no backend, no server-side proxy, no API keys,
no build step. It can only ever fetch what a source's own CORS policy
lets a browser request directly, and `API_SOURCES.md`'s own source
list has never included a booru/fan-art-aggregator/promotional-art
provider — only AniList, TMDB (future), MangaDex, MAL, and Kitsu, none
of which expose "official transparent render" style assets. Rather
than silently fabricate search results or fake a 5-source system that
secretly only ever does one thing, this session builds the **entire
pipeline for real** — priority walk, query generation, caching,
quality classing, manual override — with tiers 1–4 as genuine, callable
adapters that currently return `null` with a comment explaining why
(no connected source), and tier 5 (AniList) as the one real,
already-integrated source. This is the same "documented gap, not a
fabricated result" pattern this project has used everywhere real data
doesn't exist (Species/Height rendering "—", "Users Also Added" left
undone) — extended here to an entire source-priority system instead of
a single field.

### Completed

**`resolveCharacterArtwork(character, context, opts)`** — the
orchestrator. Cache-first (an already-resolved character returns
instantly, no re-search, no re-download — verified live: a second call
for the same character doesn't invoke any adapter's `search()` at
all), then walks all five source-priority tiers in order, takes the
first real candidate, measures its actual pixel dimensions, runs it
through Phase 2's `enhancePortrait()` canvas pipeline once, classifies
its quality, and persists the result. Returns `null` — never a
fabricated placeholder — when no source anywhere has anything for that
character.

**`buildArtworkSearchQueries(character, context)`** — real, working
string logic generating every requested combination ("One Piece
Roronoa Zoro," native name + series, every alias + series, then bare
character name as a last resort) from data already on the character
object (`name`/`nativeName`/`aliases`) and caller-supplied series
names. Doesn't depend on any adapter being connected to be useful —
verified it produces exactly the documented example shape.

**Five source adapters**, one shared interface
(`{tier, id, label, connected, search(queries, character)}`):
tiers 1–4 (transparent renders / promo art / key visuals / HD
portraits) are honest stubs; tier 5 (AniList) is real and connected —
it doesn't even need a network call, since `character.image` is
already the mapped `image.large` field sitting in memory.

**Persistent cache — IndexedDB, not localStorage.** A deliberate
deviation from this file's usual `localStorage`-everywhere pattern:
cached artwork is image data, potentially hundreds of characters'
worth, and localStorage's ~5–10MB quota is shared with every other
`anitrack_*` key (list, timeline, journal…) — a large archive caching
images there risks corrupting unrelated app data. IndexedDB is a
native browser API (no library, no build step) with a much larger
practical quota, making it the correct store for this one kind of
data. `getCachedArtwork`/`putCachedArtwork`/`deleteCachedArtwork`/
`listArtworkVariants` are the full CRUD surface.

**Multiple artworks per character** — every record is keyed by
`characterId:variant`, so `Default`/`Official Artwork`/`Alternative
Outfit`/`Timeskip`/etc. all coexist and are independently listable via
`listArtworkVariants(characterId)` — verified live with three variants
stored and retrieved correctly for one character.

**Manual override — `setManualArtworkOverride`/`clearArtworkOverride`.**
Writes only to the artwork cache, never to `item.characters` — verified
live: the character object is byte-identical before and after setting
an override. A `locked:true` flag makes the override survive even a
forced automatic refresh (verified), until explicitly cleared, at
which point automatic resolution resumes normally (also verified).

**Smart cropping — implemented honestly, not as fabricated subject
detection.** "Never cut off weapons/hair/wings/tails" is a computer-
vision subject-detection problem this project has no model or library
for, and pretending to auto-detect them would be exactly the kind of
fabrication this project consistently avoids. What's real and shipped
instead: every `CharacterArtwork` record carries an optional
`focalPoint` (`{x,y}` percentages), which `buildTradingCard` now
applies as the portrait's `object-position` when present — so a
manual override (or a future smarter source) can specify correct
framing per image. "Extend beyond the frame for depth" is a real,
working CSS technique: `opts.bleed` on `buildTradingCard` overshoots
the art panel's edges slightly, clipped back to the card's rounded
shape by its own `overflow:hidden` — verified live on both.

### Architecture

- **`buildTradingCard` now accepts `opts.artwork`** (a
  `CharacterArtwork` record) as the preferred way to supply a
  portrait, extracting `.url` and `.focalPoint` from it and skipping
  the redundant enhancement pass if the record is already enhanced
  (`.enhanced`) — this is what "the TradingCard widget should only
  request CharacterArtwork and never care where the image came from"
  means concretely. `opts.image` (a bare URL string) still works
  unchanged for every existing call site and last session's tests —
  purely additive, verified with both paths live.
- Every function in this system takes plain data (`character`,
  `context`) and returns plain data — zero dependency on `list`,
  Show Detail state, or the Character Archive's own aggregation
  functions. The stated goal ("this system should work automatically
  whenever a character is added") is a property of the functions
  themselves (call them and the full pipeline runs); actually calling
  them automatically from `addToList`/`ensureShowExtra` is deliberately
  left for the wiring session, matching the same scope boundary Phase
  2 already established for the Archive itself.

### Files Modified

`index.html` only. `buildTradingCard`'s signature gained two optional,
backward-compatible options (`artwork`, `bleed`); no other existing
code — Character Archive or otherwise — was touched.

### Technical Notes

**Verifying a system with no UI entry point**, again. Same approach as
the TradingCard session: temporarily exposed the new functions on
`window.__ARTWORK_TEST__`, ran a full behavioral verification pass
(13 checks — see Testing below), then removed the exposure entirely
before finishing. Shipped code has zero `window` footprint.

**Dimension probing loads the image twice** (once to measure
`naturalWidth`/`naturalHeight`, once inside `enhancePortrait`'s own
internal load). Left as-is rather than restructuring `enhancePortrait`'s
return contract to also expose dimensions — the second load is served
from the browser's HTTP/memory cache for the same URL in practice, this
only runs once per character ever (cached after), and changing a
shared function's contract for a minor efficiency gain wasn't judged
worth the risk this session. Flagged here rather than silently accepted.

**Testing.** Verified live with Playwright, 13 checks against the
temporary test hook: search query generation matches the exact
requested combinations; quality classification correct across all six
buckets (thumbnail/low/medium/high/premium/unknown); adapter registry
reports tiers 1–4 disconnected and tier 5 connected; resolving a
character with a real (synthetic test) image returns a fully-formed,
correctly-enhanced `CharacterArtwork` with measured dimensions and
correct quality tier; a second resolve for the same character returns
the identical cached URL and provably does not call the source
adapter again; a character with no image anywhere resolves to `null`,
not a fabricated placeholder; a manual override leaves the character
object provably untouched; the override survives a forced refresh and
is correctly released after `clearArtworkOverride`; three artwork
variants for one character are all stored and listed correctly;
`buildTradingCard` correctly consumes a `CharacterArtwork` via
`opts.artwork` (image src matches exactly, no double-enhancement);
`focalPoint` is correctly applied as `object-position`; `bleed`
correctly applies its modifier class. Then re-ran the full Character
Archive regression suite (`test-char-archive`, `test-char-catalogue`,
`test-char-decks`, `test-char-modal`, `test-char-notifications`,
`test-char-sanity`, plus `test-scroll-bug`/`test-lazy-load`/
`test-stats`) — everything passes identically to before this session,
and `document.querySelectorAll('[class*="tcg-"]')` still returns 0 on
a normal page load, confirming zero live-app impact.

### Known Limitations

- **Tiers 1–4 are not connected to any real source.** This is the
  central, explicitly-documented trade-off of this whole session (see
  the feasibility note above) — not an oversight. Connecting a real
  provider means picking one, confirming its CORS/ToS/key
  requirements, and implementing exactly one adapter's `search()`
  method; everything else in the pipeline is ready today.
- **Nothing calls this system automatically yet.** No hook exists in
  `addToList`/`ensureShowExtra`/`mapCharacterEdges` — "works
  automatically" describes the pipeline's own behavior once invoked,
  not an active trigger wired into the app today. Left for the same
  future wiring session that adopts `buildTradingCard` into the
  Archive.
- **"Occupies roughly 70–80% of the card" isn't independently
  achievable** — that's a property of how tightly an individual source
  image is already framed, not something a generic pipeline can force
  after the fact without real subject detection. `focalPoint` lets a
  human (or a future smarter source) correct framing per image; there
  is no automatic guarantee of a specific occupancy percentage.
- Not verified against real AniList character photography or any real
  external source — this sandbox has no reliable network access. All
  verification used synthetic SVG test images; the pipeline logic,
  caching, and override behavior are confirmed correct, but real-world
  image quality/dimensions from AniList will vary.

### Future Improvements

- Choose and connect a real tier 1–4 provider (see Known Limitations).
- Wire `resolveCharacterArtwork` into `ensureShowExtra`/`addToList` so
  resolution genuinely happens automatically on import, per the
  original ask — a deliberate, explicit next step, not done silently
  this session.
- A small developer-facing UI for browsing `listArtworkVariants` and
  calling `setManualArtworkOverride` — currently only callable
  programmatically; the data layer is ready, no UI exists yet.
- Once wired into the Archive, `.char-card` itself could adopt
  `buildTradingCard`'s `opts.bleed` for the same "extend beyond the
  frame" depth treatment the design doc originally specified.

---

## Session: TradingCard Component (Phase 2 — Reusable Widget Only)

**Builds Phase 1's approved architecture
([`docs/CHARACTER_TCG_DESIGN.md`](docs/CHARACTER_TCG_DESIGN.md)) as a
real, working, reusable component. The Character Archive itself is
still untouched** — `.char-card`/`.char-deck`/`buildCharacterCardHtml`
render exactly as before; nothing calls the new component yet.

### A scoping question, answered before writing any code

The request as given asked for "reusable Flutter widgets" and a
`CustomPainter`-based build. AniTrack is a single `index.html` file —
vanilla JS/CSS, no build step, no framework, and there is no Dart/
Flutter anywhere in this repository (confirmed: zero `.dart` files, no
`pubspec.yaml`). Writing literal Flutter code would have produced a
second, disconnected codebase the running app can't use. Asked the
user directly rather than guessing or silently reinterpreting the
request; confirmed the intent was the same layered/reusable component
*philosophy* Flutter's widget-tree + CustomPainter model implies,
built in AniTrack's actual stack — vanilla JS builders (the
`buildCard`/`buildHistoryRow` pattern) standing in for widgets, and
`<canvas>` standing in for `CustomPainter`. Everything below follows
from that confirmed direction.

### Completed

`buildTradingCard(opts)` — a pure DOM-builder function implementing
every layer from the design doc's §3 hierarchy: base plate, art panel,
depth vignette, foil overlay (Iconic tier only), engraved frame
hairline, header band (rarity gem + crest), nameplate (name/native
name/subtitle + optional metadata caption), personal marker, and a
lock overlay that fully replaces the art/frame/gem when the card is
locked. Ships alongside:

- **`resolveCardRarity({role, favouritesPercentileRank})`** — pure
  function, no persisted state, implementing the doc's §7 tiers
  exactly (BACKGROUND → Standard, SUPPORTING → Featured, MAIN →
  Signature, MAIN + top-10%-favourites → Iconic). Takes a plain
  percentile number rather than reaching into `list`/Archive state
  itself, so the component has zero dependency on Character Archive
  internals — this is what "future expansion without redesign" means
  concretely: a future Quotes/Scenes/Collections archive category
  could compute its own rarity signal and call the exact same builder.
- **`enhancePortrait(imgUrl, w, h)`** — the doc's §8 artwork pipeline,
  for real: draws the source image to an offscreen `<canvas>` at a
  fixed target resolution (never upsampling twice), lifts contrast/
  saturation slightly to counter AniList's soft small source images,
  and composites a procedurally-generated (not a static PNG) film-
  grain tile at low opacity. Resolves `null` on any failure so the
  caller falls back to the plain `<img>` — never blocks rendering,
  per `API_SOURCES.md`'s "never block UI waiting for network."
- **13-entry genre pattern table** (§6) — CSS `repeating-linear-
  gradient`/`radial-gradient` motifs keyed to the same genre
  vocabulary `GENRE_THEMES` already uses, confined to the nameplate
  band only (never behind the character's face).
- Full rarity → frame-weight table (§9): border width, hairline
  opacity, corner-ornament scale, and foil presence, all driven by one
  `data-rarity` attribute + CSS custom properties set per card.
- Hover/shadow/reduced-motion behavior exactly per §12/§13: 6px lift,
  accent-tinted glow (not just a darker shadow), a one-shot foil sweep
  on Iconic-tier hover (not looping), locked cards get no hover state
  at all, `prefers-reduced-motion` disables every transition/animation.
- `.tcg-grid` — the `auto-fill` responsive grid from §14, ready to use
  once/if this is wired into the Archive's catalogue view.

### Architecture

- Every color driving a card (accent tint, hairline, inset glow, hover
  glow, foil tint) is computed once in JS via a new `hexToRgba(hex,
  alpha)` helper and set as inline CSS custom properties per card —
  deliberately not CSS `color-mix()`, matching this file's existing
  convention of computing per-instance colors in JS (`avatarColorFor`/
  `gradientFor` for the Wisdom widget already do this) rather than
  introducing a CSS function nothing else in the file uses yet.
- **Fully namespaced under `.tcg-*`**, zero shared class names with
  `.char-card`/`.char-deck` — the new CSS block sits right after the
  existing Character Archive CSS but cannot collide with or affect it
  in any way. Verified live: `document.querySelectorAll('[class*="tcg-"]')`
  returns 0 on a completely normal page load.
- `buildTradingCard` returns a live DOM element (not an HTML string),
  matching this file's newer builder pattern (`buildCard`,
  `buildHistoryRow`) rather than the older string-concatenation style
  `buildCharacterCardHtml` still uses — chosen because the async
  portrait-enhancement swap needs a live element reference to update
  once it resolves.
- Placed in its own clearly-headed section (`Trading Card component
  (reusable widget)`) directly after the Character Archive's existing
  code block, not interleaved with it — easy to find, impossible to
  mistake for part of the currently-active Archive code path.

### Files Modified

`index.html` only (new CSS block + new JS section). No existing
Character Archive code — HTML, CSS, or JS — was edited.

### Technical Notes

**Verifying a component with no UI entry point.** This codebase's own
documented constraint (see the Notification System session's "Future
Claude Notes") is that closure-scoped functions aren't reachable from
Playwright's `page.evaluate` — normally not a problem, since every
other feature is tested by driving the real UI. This component has no
UI path yet by design (that's next phase's job), so there was nothing
to click. Resolved by temporarily exposing the new functions on
`window.__TCG_TEST__`, running a full structural/visual verification
pass (below), then **removing the exposure** before finishing — the
shipped code has zero `window` footprint, consistent with how
everything else in this file stays closure-scoped.

**The "sharpen" step is a contrast/saturation lift, not a true
unsharp-mask convolution.** The design doc's §8 describes an unsharp
mask; implementing a real kernel convolution pass would have meant
manually walking pixel buffers for marginal, hard-to-verify-in-a-
sandbox visual gain. `contrast(1.06) saturate(1.08)` via the canvas
`filter` API is a legitimate, cheap "punch" pass that's genuinely
using the browser's native filter pipeline (not fabricated), and
was judged sufficient for a Phase 2 component-only pass — flagged
here explicitly as a scope trade-off, not silently downgraded.

**Testing.** Verified live with Playwright: built one card per rarity
tier plus a locked card plus a personal-marker card via the temporary
hook, asserted correct layer presence per card (plate/art/vignette/
foil/hairline/gem/crest), confirmed foil opacity is exactly 0 for
Standard/Featured/Signature and .35 for Iconic, confirmed the locked
card renders the lock overlay with zero gem/crest/art (rarity is never
visible before unlock, per the design doc's explicit requirement),
confirmed `resolveCardRarity` returns the correct tier for all four
role/percentile combinations, confirmed the portrait-enhancement pass
actually swaps each `<img>` to a real `data:image/jpeg` output,
confirmed hover applies the `translateY(-6px)` lift, confirmed
`prefers-reduced-motion:reduce` removes the card's transition entirely,
and took a rendered screenshot of all five card states side by side to
visually sanity-check the layering (all correctly showing rarity-
scaled borders, the gem shape going hollow→filled at Signature, the
Iconic-only glow/heart marker, and genre patterns faintly visible in
the nameplate). Then ran the full existing Character Archive regression
suite (`test-char-archive`, `test-char-catalogue`, `test-char-decks`,
`test-char-modal`, `test-char-notifications`, `test-char-sanity`, plus
the broader `test-arc-grouping`/`test-scroll-bug`/`test-lazy-load`/
`test-stats`/`test-timeline-rework`) — everything passes identically
to before this session, confirming true zero-impact on the live
Archive.

### Known Limitations

- **No persistent caching of enhanced portraits.** `enhancePortrait`
  runs fresh every time a card is built; the doc's §16 checklist calls
  for caching the result alongside `item.characters` with a migration
  guard exactly like `ensureShowExtra`'s existing staleness checks —
  correctly deferred, since that requires touching Archive data
  structures, out of scope for "only create the reusable component."
- **`resolveCardRarity`'s percentile input isn't wired to a real data
  source yet** — nothing currently calls `allArchiveEntries()` to
  compute it. The function is ready; the wiring is next-phase work.
- Component has not been visually verified against real AniList
  character photography — all verification used a synthetic SVG test
  image (no network access in this sandbox). The layering, rarity
  logic, and enhancement pipeline are confirmed correct; final grain/
  contrast tuning against real portraits is worth a look once wired in.

### Future Improvements

- **Phase 3 (next, not started):** wire `buildTradingCard` into the
  Character Archive, replacing `buildCharacterCardHtml`/`.char-card`
  and `.char-deck`'s face card — this is the "redesign" the last two
  sessions have deliberately deferred. Section 16 of the design doc is
  the checklist for that session.
- Persistent enhanced-portrait caching (see Known Limitations).
- Once wired in, `.tcg-grid` replaces `.char-grid` for the catalogue's
  responsive column behavior.

---

## Session: Character Archive → Trading Card Collection (Design Only)

**Design and architecture task — no implementation.** Nothing in
`index.html` changed this session. Full system documented in
[`docs/CHARACTER_TCG_DESIGN.md`](docs/CHARACTER_TCG_DESIGN.md).

### Completed

Audited the current Character Archive implementation (`.char-card`,
`.char-deck`, `resolveCharacterTheme`'s series/franchise/genre/default
theme system, and the real per-character data fields available —
`role`, `favourites`, `journey.rating`) against six reported problems
("looks like an information card," low-res art, aggressive cropping,
weak hierarchy, generic frames, collection doesn't feel exciting), then
designed a complete replacement visual system, referencing the
production quality (not layouts) of Pokémon TCG Pocket, Hearthstone,
Shadowverse, and Legends of Runeterra.

The design document covers, in full: card anatomy, a proper 5∶7
trading-card aspect ratio (replacing today's free-height poster+text
shape), a 10-layer front-to-back stack, typography per element, frame
architecture (formalizing the existing theme-priority system into a
real frame structure — outer border + engraved inner hairline +
corner ornament + nameplate), genre architecture (giving each of the
13 genre themes a background pattern motif, not just a color+icon),
a brand-new **rarity architecture** (Standard/Featured/Signature/Iconic,
derived purely from `role` + a live-computed `favourites` percentile
within the user's own archive — no gacha, no randomness — plus a
cross-cutting personal-favorite marker from `journey.rating`), a
client-side artwork enhancement pipeline (canvas upscale + unsharp
mask + film-grain, cached alongside the existing character cache),
corner treatment, an elevation/shadow scale, a layer-depth policy that
explicitly rejects 3D tilt/parallax as too flashy for this app's
existing motion rules, restrained hover behavior, and a fluid
`auto-fill` mobile grid that only works because the new fixed aspect
ratio makes it safe.

### Architecture

- **Zero new data fields.** Every tier, pattern, and marker reads
  fields that already exist: `character.role`, `character.favourites`,
  `getCharJourney(id).rating`, `item.genres`, and the existing theme
  resolver. Rarity is computed live, never persisted — same pattern
  `isCharacterUnlocked()` already established for unlock state.
- Theme **resolution order** (series → franchise → genre → default)
  is unchanged; this system only enriches how a resolved theme renders.
- Unlock **model** is unchanged; rarity is purely additive on top of
  the existing unlock boolean, never a second gate, and locked cards
  deliberately show no rarity signal at all (so a hidden character's
  importance isn't spoiled before unlock).

### Files Modified

- `docs/CHARACTER_TCG_DESIGN.md` — new, the full design system.
- `PROJECT_STATUS.md` — this entry.
- `index.html` — **untouched**, per explicit instruction.

### Technical Notes

**Why 5∶7 is the single highest-leverage change.** Every named
reference app (and every physical TCG) uses a fixed card silhouette.
Today's `.char-card` has no aspect ratio at all — it's a 190px portrait
plus a variable-height text block, which is exactly why it currently
reads as "an information card" rather than "a collectible." Locking
the ratio is also what makes the mobile grid's `auto-fill` sizing safe
— a fixed-height grid can't reflow without either cropping differently
per column count or leaving dead space, so today's grid uses hard
breakpoints instead. Fix the ratio first and the responsive grid
problem mostly solves itself.

**Why the rarity model has no randomness.** AniTrack is a personal
tracker, not a gacha game — the brief asked for TCG production
*quality*, not TCG monetization mechanics. `favourites` (AniList's real
popularity metric) and `role` are the only two fields that
legitimately vary "how special" a character is without inventing
anything; `journey.rating` is the one field that captures what a
character means to *this specific user*, independent of global
popularity. That split (global rarity vs. personal marker) mirrors
this project's actual identity — CLAUDE.md's "because great stories
deserve to be remembered" is about the user's own relationship to a
story, not a leaderboard.

**Why 3D tilt/parallax was explicitly rejected.** It's the one
signature interaction basically every reference app in the brief uses,
and it was deliberately left out — `DESIGN_SYSTEM.md` rules out "flashy
effects" outright, and cursor-tracked tilt has no equivalent on a touch
device, which is this app's primary surface. Documented as a conscious
trade-off rather than an oversight, per CLAUDE.md's own instruction to
explain trade-offs when a request tension exists.

**Artwork pipeline is presentation, not fabrication.** AniList's
`character.image.large` (~230×350px) is the only art source that
exists — confirmed against `API_SOURCES.md`. The proposed canvas
upscale + unsharp mask + film-grain pipeline improves how that real
image presents; it's explicitly documented as *not* including any
AI upscaling/generation, consistent with this project's established
stance (see the Character Archive session's own Known Limitations) of
showing an honest "—"/placeholder rather than inventing data AniList
doesn't provide.

### Known Limitations

- This is a design document only — no code has been written or tested.
  Section 16 of the doc is an implementation checklist for whichever
  future session builds it.
- The artwork enhancement pipeline's real-world visual impact hasn't
  been verified against actual AniList images (this sandbox has no
  reliable network access for a live check) — the *technique* is sound
  and commonly used, but exact grain/sharpen strength will need tuning
  against real character art once implemented.
- Rarity tier thresholds (top 10% favourites) are a reasoned starting
  point, not a value tested against a real, large archive — may need
  adjustment once implemented against actual user libraries so the
  Iconic tier feels appropriately scarce rather than too common/rare.

### Future Improvements

- Implementation itself (see the doc's §16 checklist) — a natural next
  session, scoped tightly to `.char-card`/`.char-deck` and the
  Character Detail hero, per §15's explicit "what does not change" list.
- If AniList ever exposes tag data (not just genres), the Historical/
  Military genre-theme gap noted in the original Character Archive
  session becomes reachable, and could gain its own pattern motif
  alongside the other 13 in §6.

---

## Session: Home / Discover / Profile UX Pass

### Completed

**Watched History is now a real chronological feed, not a 2-card
preview.** The Home dashboard's "Watched History" section used to show
at most 2 cards (one per show, capped, using `lastWatchedAt`). It now
flattens every item's full `history` log (`{ep, watchedAt}`, already
recorded by `setProgressToEpisode`) across the whole library into one
row-per-watch-event feed — "Bleach Episode 48 — Watched Just now",
newest first, TV-Time style — rendered as compact rows reusing the
Timeline's existing `.tl-row` visual language rather than the heavy
`.card` component, lazy-loaded in batches while scrolling, and
click-through to that title's Show Detail.

**Profile page decluttered; new desktop-settings-style Manage page.**
"Import from TV Time", "Find Missing Sequels", "Notifications", and the
Light/Dark/System Appearance switch moved off the main Profile page into
a new `Manage` overlay (opened via a single new "Manage" row at the
bottom of Profile), alongside three new, fully working (not
placeholder) tools: **Storage Usage** (live sum of every `anitrack_`
localStorage key), **Clear Cached Show Details** (confirms, then clears
`item.extra`/`item.characters` so they refetch next visit), and
**Export Data (Backup)** (downloads every `anitrack_` key as one JSON
file — this app has no cloud, so a local file download *is* the
backup). A dim "More tools — Coming soon" row closes out the page,
matching the Archive hub's existing placeholder convention.

**Discover and Search now hide anything already in your library.**
Anything already tracked — any status (Watching/Completed/Plan to
Watch/Dropped/On Hold/Reading) or in a custom list — is filtered out of
Discover's browse grid and both search surfaces (the fabAdd overlay and
Discover's own inline search). Discover's browse grid tops itself up
automatically (bounded: up to 5 page fetches, targeting 12 untracked
results) so a page never renders empty just because everything on it
happened to already be tracked; if AniList itself is genuinely
exhausted, it shows the specified copy: "🎉 You've already added
everything from this recommendation set. Tap Refresh to discover
more." Both search surfaces get a new **Include Library** toggle
(off by default) to opt back into seeing everything.

**Pull-to-refresh on Discover and Profile.** A new reusable vertical
drag gesture (same pointer-event pattern as the existing swipe-to-watch
card gesture, just vertical) re-runs Discover's active tab or refreshes
Profile's stats when pulled down from the top of the page — minimal
dot-based indicator, no new spinner asset. Deliberately not wired on
Home yet (future architecture, per the brief), but the helper takes any
container + callback, so wiring it there later is one line.

**Discover: "Newly Added" tab + honest randomization on refresh.** A
5th Discover tab (`sort: START_DATE_DESC`) sits alongside Trending/
Popular/This Season/By Genre. "Randomize on refresh" is implemented
honestly — AniList's sort orders are deterministic, so pull-to-refresh
starts from a random early page (1–3) instead of always page 1, rather
than faking a client-side shuffle.

**Profile refresh without a page rebuild.** New `refreshProfile()`
re-runs the existing targeted `renderStats()` (already scoped to
`#statsBody`/`#statsCrossBody` — covers journal/reading/watching
counts, badges, and streak) plus `updateNotifBell()` and, if open,
`renderTimeline()` — no new stats logic needed, just a named entry
point for pull-to-refresh to call.

### Files Modified

`index.html` only.

### Architecture

- `flattenWatchHistory(items)` / `buildHistoryRow(entry)` — new,
  feed the existing `renderLazyCardList` lazy-batch infra.
- `filterUntracked(media, type)` — new, the single check used by
  Discover's browse grid and both search result renderers.
- `DISCOVER_QUERY` gained a `$page: Int` variable (was hardcoded to
  `page: 1`) to support the top-up loop and randomized-refresh start
  page.
- `wirePullToRefresh(pageEl, onRefresh)` — new, reusable vertical
  pointer-drag gesture; wired on `#page-discover` (→
  `runDiscover(true)`) and `#page-more` (→ `refreshProfile()`) only.
- `#manageOverlay` — new overlay, structurally modeled on the existing
  `#listsOverlay` (`.ov-head`/`.ov-body` shell).
- `refreshProfile()` — new, thin wrapper around already-existing
  targeted render functions.

### Follow-up fixes (post-session bug reports)

**Watched History rows weren't dimmed.** The old design's "Watched
History" cards had `opacity:.5` (via `.feed-history`); the new
`.hist-row` rows never picked that up when Task 1 replaced the card
component with a lighter row. Added `opacity:.5` (with a `:hover`
step-up to `.75`, matching the row's existing hover-highlight-title
behavior) directly on `.hist-row`.

**Home kept landing on Watched History instead of Watch Next — and
ticking an episode visibly pushed Watch Next down.** Both symptoms had
the same root cause: Watched History sat *above* Watch Next in the DOM
as real per-episode-event content that only grows over time, unlike
the old design's fixed 2-card preview. Every tick adds a row to
History, and since the page never auto-corrected scroll on ordinary
re-renders (by design — see `shouldScrollToWatchNext`'s own comment),
that growth just shoved everything below it down by one row's height.
The first attempt at a fix (re-running the landing scroll after every
History batch, plus a trailing spacer for cases where there wasn't
enough content below Watch Next to physically scroll that far) got the
*initial* landing right but couldn't fix ticking pushing things around
after the page had already settled, and added real complexity
(`refreshAiring()`'s post-fetch `render()` interrupting an in-flight
correction, a `min-height:100vh` body floor silently absorbing a naive
spacer-size guess, its own lazy-loaded content still racing to settle).

Replaced entirely with a simpler, correct-by-construction fix: **Watch
Next now renders first in the DOM**, with Stale below it and Watched
History moved to the very end. Landing on Watch Next is now just
`window.scrollTo({top:0})` — trivially correct regardless of how tall
History is, since History no longer sits above anything. Ticking an
episode only ever grows the *bottom* of the page now, so it can't move
Watch Next or Stale at all. History is still there exactly as before —
dimmed, chronological, lazy-loaded — just revealed by scrolling down
into it instead of sitting above the fold.

Verified against the project's own pre-existing `test-scroll-bug.js`
(the original regression test for this landing behavior, now trivially
satisfied), a direct ticking repro (Watch Next's position measured
before/after marking an episode watched — unchanged to the pixel), and
`test-lazy-load.js` — whose repeated-scroll-to-bottom methodology
stopped being representative once History's own still-growing tail
sat at the very end of the page (a `scrollTo(document.body.scrollHeight)`
jump keeps landing inside that ever-extending tail and never actually
passes through Stale's sentinel on the way, unlike how a person
scrolls) — updated to scroll incrementally instead, which fully loads
correctly.

**Watched History moved off Home entirely, into its own page.** Rather
than living on the Home dashboard at all (above or below Watch Next),
History now opens from a new clock/history icon in the header, next to
the existing Archive and Notification-bell icons — same `.notif-bell`
button styling, same `.overlay`/`.ov-head`/`.ov-body` shell every other
secondary page already uses. The page shows **anime and manga watch/
read history combined** in one chronological feed (`flattenWatchHistory`
now takes the whole `list`, not just the current mode's `activeItems`),
reusing the exact same dimmed `.hist-row`/lazy-load infra Home's version
used. This is a strict simplification of the "History on Home" work
above — Home no longer needs to reserve any layout space for History at
all, so the Watch-Next-first DOM ordering above is now purely about
Watch Next/Stale, with nothing further to guard against.

### Technical Notes

**A real, pre-existing bug in the shared lazy-load infra surfaced (and
was fixed) by this session's own new use of it.** `renderLazyCardList`'s
`IntersectionObserver` only fires its callback on a threshold
*crossing*, not on every scroll frame. Watched History rows are much
shorter than a poster `.card` (~65px vs ~150px), so on a tall viewport
it's common for the sentinel to stay continuously intersecting across
an entire batch append — the observer's intersection state never
"changes," so it silently stopped loading further batches even with
plenty of history left, which is a direct violation of "continue
loading older history while scrolling downward." Fixed by re-observing
the sentinel (`unobserve` + `observe`) after every successful batch
append, forcing a fresh intersection check at its new position — this
also benefits `Watch Next`/`Haven't Watched For A While`, which share
the same helper. Verified with a 59-entry seeded history list: before
the fix, loading silently capped at 16 rows; after, all 59 load while
scrolling.

**That same fix broke Home's "land on Watch Next" auto-scroll for users
with real watch history, caught by manual testing after this session's
first "done" pass.** Watched History sits above Watch Next, so its own
initial burst-load (multiple batches firing in the first few frames,
per the fix above) can keep growing the page *after* the one-shot
`window.scrollTo` had already computed and applied a target — leaving
the page short of Watch Next, sometimes clamped mid-History. Compounding
it: `refreshAiring()` (pre-existing — fires an async AniList refresh on
load, unrelated to this session) calls `render()` again once it
resolves, which tears down the in-flight lazy-load observer via
`clearLazyObservers()` before the scroll had settled, permanently
abandoning the correction. Fixed by having the scroll-to-anchor
re-apply (debounced) after every History batch, and — the part that
actually closes the race — not clearing `shouldScrollToWatchNext` until
a correction genuinely lands, so if `refreshAiring`'s render interrupts
mid-chase, that render tries again with its own fresh observer instead
of silently giving up. Verified against `test-scroll-bug.js` (a
pre-existing regression test for exactly this landing behavior) plus a
new seeded-library repro (20 history entries + 8 active shows) —
Watch Next now lands directly under the header in both.

**A real bug in this session's own Export Data code was caught and
fixed before shipping.** The naive implementation
`JSON.parse(localStorage.getItem(key))` for every `anitrack_`-prefixed
key throws once a user has ever touched the theme switch, because
`anitrack_theme` stores a plain string (`"light"`), not JSON — the
uncaught exception silently killed the whole export with no visible
error. Fixed with a per-key try/catch that falls back to the raw string
value. Caught via Playwright (a `pageerror` listener during automated
verification, not visual inspection) — worth remembering as a case
where "looks fine, downloads a file the first time" would have shipped
a real bug.

**Top-up loop is bounded, not a background prefetch.** Discover's
top-up loop caps at 5 total page fetches and stops early the moment 12
untracked results are collected — satisfies "never leave empty rows"
without risking unbounded requests. No new caching layer was added;
`item.extra`/`item.characters` (already read by Show Detail) is the
same cache Manage's "Clear Cached Show Details" now manages.

**Testing.** Verified live with Playwright: Watched History order/lazy
load/click-through with a 20-item, 59-event seeded library; Profile
row removal + Manage overlay contents, live Storage Usage value, theme
switch still functional from inside Manage, Clear Cache nulling
`item.extra`/`item.characters`, Export Data producing a real download;
Discover top-up loop fetching exactly the pages needed (mocked
per-page AniList responses) and stopping at the bound when genuinely
exhausted, with the exact specified empty-state copy; both Include
Library toggles (fabAdd search + Discover inline search) switching
between filtered/unfiltered results; Newly Added tab's sort variable;
pull-to-refresh triggering a real re-fetch on Discover and a real
targeted DOM update (via `MutationObserver` on `#statsBody`) on
Profile, and confirmed *absent* on Home.

Full existing regression suite (80+ accumulated scripts) re-run to
catch anything this session's changes broke elsewhere. One genuine
regression surfaced and was fixed before this session ended: Watched
History's rows initially reused the literal `.tl-row` class (not just
its visual language), which collided with the Timeline overlay's own
notification rows for any unscoped `.tl-row` query elsewhere in the
app — a pre-existing test (`test-timeline-rework.js`) caught it
(`.tl-row` count off by one with the Timeline overlay open). Fixed by
giving history rows their own `.hist-row` class with its own copy of
the shared structural rules, instead of sharing the Timeline's literal
class name. Five older tests (`test-theme.js`,
`test-notifications*.js`, `test-review-final.js`) failed only because
they clicked Notifications/Appearance directly on Profile, which is
the deliberate, intended consequence of Task 2/3 relocating both into
Manage — updated all five to open Manage first, mirroring how this
project's own history already handles a test going stale after an
intentional default/location change. A handful of remaining failures
(`test-calendar.js`, `test-detail.js`, `test-journal.js`,
`test-wisdom-dark/light.js`, `test.js`) were confirmed unrelated to
this session — stale selectors or assumptions from UI changes made in
earlier sessions, or (for `test.js`) a hardcoded port with no server
behind it.

### Known Limitations

- "Newly Added" uses AniList's `START_DATE_DESC` (recently started
  airing/publishing) as an honest proxy — AniList has no "date added to
  catalog" field, so this isn't literally "added to AniList most
  recently."
- Pull-to-refresh is intentionally not wired on Home in this session,
  per the brief ("future architecture") — `wirePullToRefresh` is ready
  for it whenever that's requested.
- The Include Library toggle state is not persisted across sessions or
  synced between the two search surfaces — each resets to off on
  reload, and setting one doesn't affect the other. Deliberately simple
  for now; can be unified later if that turns out to matter.

### Future Improvements

- Storage Usage could break down by category (list data vs. cached show
  details vs. timeline) instead of one total, if libraries grow large
  enough for that distinction to matter.
- The Manage page's "More tools" placeholder is a natural landing spot
  for anything added later (e.g. import/export in other formats).

---

## Session: Discover/Search Season Dedup + Archive Responsiveness

### Completed

**Discover tab and search results no longer show one card per season.**
AniList lists every season of a show as a fully separate entry with no
"this show has N seasons" concept of its own — Discover's browse grid,
the fabAdd search overlay, and the Discover tab's own inline search
could all show the same show 2-3 times in a row ("Grand Blue Dreaming
Season 2" and "... Season 3" as separate cards). Fixed at the source
across all three: cards now display the base title only ("Grand Blue
Dreaming"), and duplicate seasons of the same base title are collapsed
to a single card — keeping whichever occurrence AniList's own result
ordering already listed first, not a guessed "best" season.

**Archive page width fixed.** The Archive overlay (hub, Character
Catalogue, deck grid, flat character grid) was capped at 1120px — wide
enough for the catalogue's 3-column grid, but the Archive home's plain
list of category rows, and the catalogue's progress bar/search box/
filter row (none of which are a grid), stretched to that same width on
a real desktop window and read as sparse and oversized rather than
responsive. Narrowed the whole overlay to 780px — still comfortable for
3 solid card columns, but every non-grid part of the page now reads as
an intentionally-sized page rather than an empty stretched one.

### Files Modified

`index.html` only.

### Technical Notes

**Season dedup reuses the season-grouping feature's own regex, not a
new one.** `stripSeasonSuffix()` and `dedupeBySeasonBase()` both call the
already-existing `seasonGroupBaseName()`/`SEASON_SUFFIX_RE` (built for
grouping a user's own tracked seasons under one Episodes-tab view) —
same "same base name after stripping a trailing Season N / Nth Season
suffix" definition, now applied one layer earlier, before anything is
even added to the list.

**One width variable, not per-view overrides.** Considered giving the
Archive home view its own narrower inner max-width while leaving the
catalogue's grid-bearing views at the original 1120px, but that would
have made the page visibly change width as you navigate between its own
sub-views (jarring, not "responsive" in the sense that matters) —
simpler and more coherent to size the whole overlay for its most
space-hungry content (the 3-column grid) at a number that doesn't leave
everything else looking sparse, one `--archive-max-width` value.

**Testing.** Verified live with Playwright: Discover's trending grid,
the fabAdd search overlay, and the Discover tab's inline search all
strip season suffixes and drop duplicate-season cards from mocked
AniList responses matching the exact titles reported ("Mushoku Tensei:
Jobless Reincarnation Season 3" → "Mushoku Tensei: Jobless
Reincarnation", "Grand Blue Dreaming Season 2"/"Season 3" → one "Grand
Blue Dreaming" card). Archive re-screenshotted at 390/700/1024/1440/
1920px — no horizontal overflow at any width, home/catalogue/deck/flat
views all confirmed visibly proportional rather than sparse at desktop
widths, 3-column grid still holds at the narrower cap. Full existing
regression suite (Character Archive + broader app, 20+ scripts)
re-run to confirm zero regressions.

### Known Issues

- None identified for this session's scope.

### Future Improvements

- None identified — both fixes were narrowly scoped to the reported
  issues.

---

## Session: Character Catalogue Deck Grouping

### Completed

The global Character Catalogue (Archive hub → Characters) now opens
grouped into one "deck" per series by default, instead of a flat mixed
grid — closer to a collector's binder than a database table, matching
the Character Archive's original "premium collector's encyclopedia"
brief. Each deck is a themed, stacked-card tile (two rotated layers
behind the face, reusing the same series/franchise/genre theming and
crest every individual card already uses) showing the series title and
an "X / Y Unlocked" count. Clicking a deck ungroups it — drills into
just that show's character grid, with a "Regroup" button to return to
the deck view. A persistent "Show All Characters" / "Group by Series"
toggle lets you leave grouping off entirely and browse the full flat,
filterable grid as before (all 8 sort modes and 5 filters untouched).
Typing a search query automatically bypasses grouping regardless of the
toggle state — searching for a character by name against a stack of
unopened decks doesn't make sense — and restores deck view again once
the query is cleared.

### Files Modified

`index.html` only.

### Technical Notes

**Deck state is separate from, not layered onto, the existing filter
system.** The catalogue already had a "Series" filter dropdown that
narrowed the flat grid to one show; decks don't replace or fight with
it — `catalogueExpandedDeck` filters entries the same way a manually-
picked series filter would, so drilling into a deck and manually setting
the Series filter both funnel through the same entries logic, just via
different state.

**One extra sort pass, no extra data or network calls.** Decks are built
by grouping the exact same `allArchiveEntries()` array the flat grid
already computes (`catalogueDecksFrom`), sorted by unlock percentage
(most-complete decks first) — no new fetch, no new cache.

**Testing.** Verified live with Playwright: default view shows decks not
individual cards with sort/filter controls hidden; clicking a deck shows
only that show's characters (including correctly keeping a locked
`SUPPORTING` character as a "???" card — deck drilling doesn't bypass
the existing spoiler-protection gate); Regroup returns to deck view;
the explicit ungroup/regroup toggle works both directions; typing a
search query bypasses grouping and hides the toggle bar, clearing it
restores deck view. Updated one pre-existing test
(`test-char-catalogue.js`) to explicitly ungroup first, since its
scenario (search/sort/theme/responsive-columns on the flat grid) now
sits one click behind the new default — not a regression, the direct
consequence of intentionally changing the default view. Full existing
regression suite re-run to confirm zero impact elsewhere.

### Known Issues

- None — the per-show Character Archive tab (inside Show Detail) is
  intentionally untouched; it's already scoped to one show, so deck
  grouping doesn't apply there.

### Future Improvements

- Deck sort order (currently unlock-percentage-first) could become
  user-choosable (alphabetical, recently unlocked, etc.) if that turns
  out to matter once libraries grow large.

---

## Session: Show/Manga Details Page UI/UX Fixes

Three scoped fixes to the Details page, per direct brief. No other pages
touched.

### Completed

**Task 1 — Episode cards.** Removed `.card .status-dot`, the small
colored dot at the top-left of every library card's poster. (Confirmed
with the user first: the element as literally described — "blue,
top-left, on episode cards" — didn't exist anywhere on the Details page
itself; the only real match anywhere in the codebase was this status dot
on the general tracked-item card used on Home/status tabs, which the
user confirmed was the intended target.) Purely `position:absolute` and
non-color-coded elsewhere, so removing it didn't disturb any layout —
verified no gap was left behind.

**Task 2 — Expandable synopsis.** The About tab's synopsis now clamps to
~4 lines with a soft fade on the last visible line and a "Read More"
toggle beneath it; expanding/collapsing animates smoothly via a measured
`max-height` transition (not `-webkit-line-clamp`, which can't animate).
Skips the toggle entirely when the text already fits within the clamp.
No modal, no navigation — fully inline.

**Task 3 — Discover More.** Full rebuild. No more `<a href="anilist.co">`
— every recommendation now silently adds the title to your list (if not
already tracked, same precedent as the Discover tab's own browse grid)
and opens its Show Detail page inside AniTrack. Cards were redesigned
landscape/compact (poster left, info right) showing title, original
title when it differs, rating, year, episode/chapter count, status +
format + genre badges, and a small progress bar if you've already
started that title. New subsections: Similar Anime, Similar Manga, Same
Studio, Same Author/Mangaka — each pulling real AniList data (studio and
staff "other credited works" connections, fetched in the same request as
everything else, not a second round trip). Similar Genres kept as-is
functionally (already opened Discover pre-filtered correctly) with a
missing hover state added. Empty state now reads "No recommendations
available yet." instead of rendering nothing.

### Files Modified

`index.html` only.

### Technical Notes

**A render-ordering bug the synopsis toggle had to work around, not
fix.** `openShowDetail()` calls `renderShowDetailAbout()` *before* adding
the overlay's `.open` class, so content paints the instant the overlay
becomes visible rather than after. That means any layout measurement
taken synchronously inside the render function runs against a
`display:none` subtree — `scrollHeight` and computed `line-height` are
meaningless there. Caught live via Playwright (the clamp silently never
engaged, measuring ~331px "collapsed" height on genuinely long text) —
fixed by deferring the measurement one `requestAnimationFrame`, by which
point the overlay's `open` class has already landed. Left the existing
render-before-open ordering itself alone; it's intentional and
unrelated to this task.

**Recommendation data reuses `MEDIA_DETAIL_FIELDS` and the exact field
shape `SEARCH_QUERY`/`DISCOVER_QUERY`/`REFRESH_QUERY` already use**
(`REC_MEDIA_FIELDS`), rather than a new bespoke shape — this is also
deliberately the *same* shape `addToList()` already expects, so a
recommendation card can be added to the list through the same function
Discover/search results already use, no translation layer.

**Same Studio / Same Author fetched as nested connections in the
existing `SHOW_EXTRA_QUERY`**, not a second request:
`studios(isMain:true){ nodes{ id name media(...) } }` and
`staff(...){ edges{ node{ id name staffMedia(...) } } }` pull each
studio's/staff member's other credited titles as a sub-selection of data
already being fetched, keeping this at one network request total per
show — consistent with "avoid unnecessary API calls."

**`pickCreator()` was deliberately left untouched, not restructured.**
The straightforward change would have been making it return `{name, id}`
so the new "Same Author" section could use the id — but `pickCreator()`'s
plain-string return is also relied on by `buildDetailMetaGrid` (the
existing Director/Mangaka row) and, more importantly, by
`computeFavoriteMangaka()` on the Stats page, which tallies it as a bare
string. Changing the contract would have silently broken an unrelated,
already-shipped feature. Instead, factored the shared "find the matching
staff edge" logic into `findCreatorEdge()` and added a second, separate
reader (`pickCreatorMedia()`) — `pickCreator()`'s behavior and return
shape are byte-for-byte identical to before.

**Migration guards for both `item.characters` and `item.extra`.**
Existing users already have `item.extra` cached from before this session
with the old, thin recommendation shape (id/type/title/coverImage only —
no format/status/episodes/genres, which the new cards need). Added the
same kind of staleness check already used for `item.characters`: if a
cached recommendation is missing `format`, treat the whole `item.extra`
as stale and refetch once, rather than serving incomplete cards forever.

**Testing.** Verified live with Playwright: status-dot fully gone from
Home cards with no layout gap; long-vs-short synopsis (clamp engages
only when needed, expand/collapse both animate and measure correctly);
Discover More subsections all render from mocked studio/staff/
recommendation data, zero `anilist.co` links or `target="_blank"`
anywhere in the section, clicking an untracked recommendation adds it
and navigates internally (no new tab/window), clicking an already-
tracked recommendation navigates without creating a duplicate and shows
its real progress bar; empty state renders the exact specified copy.
Full pre-existing regression suite (25+ scripts spanning episode
tracking, season/arc grouping, the episode modal, lazy loading,
timeline/notifications, the responsive shell, and the entire Character
Archive — which shares `ensureShowExtra`/`SHOW_EXTRA_QUERY` with this
session's changes) re-run to confirm zero regressions.

### Known Issues

- **"Users Also Added" not implemented.** Explicitly marked
  "(Optional architecture for future)" in the brief, and there's no
  honest way to source it anyway — AniTrack is a single-user, client-only
  app with no backend or analytics, so "what other users added" is data
  that could never exist here without a server. Left as a documented gap
  rather than fabricated.
- **Studio/staff nested-query shape not verified against the live
  AniList API.** This sandbox can't reach the real network — every test
  above mocks the GraphQL response. The nested `studios.media` /
  `staff.staffMedia` connections are standard, well-established AniList
  API v2 fields used exactly this way by other AniList clients, but a
  live smoke-test against the real endpoint is worth doing in a
  follow-up session before fully trusting the Same Studio/Same Author
  sections in production.
- **Recommendation subsections cap at 5 cards each** — a scope/length
  judgment call to keep the collapsed-by-default "Discover More" section
  digestible, not a spec requirement either way.

### Future Improvements

- Live-verify the studio/staff query shape against real AniList once
  network access allows it (see Known Issues).
- "Users Also Added" becomes buildable if AniTrack ever grows a backend.
- Recommendation score/sort could incorporate weighted signals across
  sources (shared genres + rating + recency) rather than each
  subsection's own AniList-provided order, if that turns out to matter
  in practice.

---

## Session: Character Archive System

### Completed

AniTrack's full Character Archive — the app's collector-card character
system, replacing the old 6-character horizontal scroll strip in Show
Detail's About tab.

- **Section rename**: "Characters" → "Character Archive," promoted from a
  sub-section of About to its own 4th Show Detail tab (About | Episodes |
  Character Archive | Journal).
- **Collector card grid**, responsive 3/2/1 columns (desktop/tablet/
  mobile), in two places: the per-show tab (that title's deck only) and a
  new cross-series **Character Catalogue** inside a new **Archive** hub,
  opened via a new header icon beside the notification bell.
- **Archive hub**: a data-driven category list (`ARCHIVE_CATEGORIES`) —
  only Characters is implemented; Quotes/Scenes/Locations/Items/Journal
  Entries/Collections render as dim "Coming soon" rows, so adding a real
  future category is a one-line addition, not a redesign.
- **Theme system**: series → franchise → genre → default priority, each
  with a hand-authored monochrome inline-SVG crest. Series themes cover
  the 5 shows named in the brief (Attack on Titan/Survey Corps, One
  Piece/Straw Hat, Naruto/Leaf Village, Bleach/Soul Society, Frieren/
  Magic Crest, Death Note/Notebook); franchise theming reuses the
  existing season-grouping feature's `seasonGroupBaseName` rather than a
  second detection system, so e.g. all tracked Frieren seasons share one
  deck; genre theming covers all 14 genres named in the brief.
- **Spoiler protection**: role-only gating (see Technical Notes for why
  this diverges from the original brief) — `MAIN` characters always
  visible, `SUPPORTING`/`BACKGROUND` silhouetted with "???" until the
  series is completed. A separate, uniform "deep content" gate (full
  spoiler-tagged biography, My Journey, Quotes, Relationships) requires
  series completion regardless of role. A Spoiler Protection toggle in
  the Archive hub disables every gate at once.
- **Character detail page**: large art, universal metadata grid (every
  field always rendered, "—" for anything AniList doesn't have — see
  Known Limitations), Voice Actors (Japanese + English, avatar/name/
  language), and collapsible widgets: Biography (spoiler-tag aware),
  Gallery, Relationships (honest empty state), Timeline (repurposed as
  the user's own personal encounter history), My Journey (private form:
  favorite moment/quote/notes/10-star rating), Quotes (the user's own
  Favorite Quote plus any matching entries from the existing
  `WISDOM_QUOTES` set).
- **Unlock progress**: "N% · X / Y Characters Unlocked" readout, both
  per-show and global, computed live (not stored) from role + completion
  state across every cached character.
- **Notifications**: new `characterUnlocks` category in the existing
  Notification Settings page (purely additive to the existing
  data-driven `NOTIF_CATEGORY_DEFS` list — no new UI template). A
  character unlocking logs a Timeline entry and, for a single unlock,
  fires the normal live notification; multiple simultaneous unlocks in
  one show log individually but alert via one combined toast instead of
  a notification burst. Archive milestones (10/50/100/500 characters)
  reuse the exact `record()`/first-run-silent-baseline pattern
  Statistics Milestones already established.
- **Performance**: characters are cached directly on `item.characters`
  (already-existing, already-persisted field — just enriched, not
  duplicated into a second store); the global catalogue lazily
  batch-warms only uncached tracked items on first visit, chunked 50 ids
  per request via a new `CHAR_BATCH_QUERY` mirroring `REFRESH_QUERY`'s
  existing pattern; grids render with skeleton placeholders, never
  spinners.

### Architecture

- `item.characters`: enriched in place (id, name, nativeName, aliases,
  image, role, gender, age, birthday, bloodType, favourites, description,
  voiceActors[]) via `mapCharacterEdges()`, shared by the single-show
  fetch (`ensureShowExtra`, extending the existing `SHOW_EXTRA_QUERY`)
  and the new batched cross-library fetch (`warmCharacterCache`,
  `CHAR_BATCH_QUERY`). Old thinner cached shapes (from before this
  feature existed) are detected and transparently refetched once.
- Two new small localStorage stores: `anitrack_char_journey_v1` (private
  per-character notes, keyed by AniList character id) and
  `anitrack_spoiler_protection_v1` (boolean). Deliberately **no** stored
  "unlocked" or "already notified" flag — `isCharacterUnlocked(character,
  item)` is a pure function of role + status, and unlock notifications
  reuse `addTimelineEntry`'s existing id-based dedup
  (`char-unlock-<characterId>`) as the single source of truth, the same
  pattern every other notification category already uses.
- `resolveCharacterTheme(item)`, `buildCharacterCardHtml()`,
  `wireCharacterGridClicks()` are the shared building blocks behind both
  the per-show tab and the global catalogue — one card component, one
  theme resolver, not two parallel implementations.
- `scanCharacterUnlocks()` slots into the existing `scanForTimelineEvents`
  single choke point (periodic 5-minute cycle + boot), alongside
  `scanStatisticsMilestones` and the other established scan functions —
  no new interval, no new trigger architecture.

### Files Modified

`index.html` only — no new files, no build step, consistent with the
rest of the app. New CSS is scoped under a single "Character Archive"
comment block near the end of the stylesheet; new JS is grouped under a
single "Character Archive" section rather than scattered.

### Technical Notes

**Why spoiler unlocking is role + completion only, not per-episode.**
The original brief asked for "Watch Episode X to unlock" messaging.
AniList's Character API has no per-episode "first appears in episode X"
data — nothing free does. Confirmed directly with the user before
building: rather than fabricate an estimated reveal episode, unlock
gating is simply `MAIN` role → always visible (never a real spoiler,
already in every show's own promotional art), `SUPPORTING`/`BACKGROUND`
→ locked until the series is completed. No episode number is ever shown
or implied.

**Why Relationships is empty and Timeline is personal, not in-fiction.**
Same reasoning — AniList has no character-relationship graph and no
in-fiction timeline data at all. Relationships renders an honest "not
available yet" state rather than fabricated data. Timeline was
repurposed as the user's own encounter history (first seen / last seen,
derived from real data: `item.startedDate`/`updatedAt` for when a MAIN
character became visible, `item.finishedDate` for when a
SUPPORTING/BACKGROUND character did), which is both honest and
genuinely useful, consistent with AniTrack's journal-first identity.

**Star-rating widget rebuild bug caught during testing.** The first
implementation of My Journey's rating stars called a full
`renderCharacterDetail()` on every click — since the rating widget lives
inside a collapsible `<details>` that isn't open by default, this
silently collapsed the very section the user was rating on every star
click. Fixed by updating star visuals in place instead of a full
re-render; caught live via Playwright, not by inspection.

**A `pointer-events` bug on the detail hero's gradient overlay** briefly
made the close button unclickable — the `::after` gradient pseudo-element
painted on top of the button (same stacking context, no z-index) and
intercepted the click. Fixed with `pointer-events:none` on the overlay,
since it's purely decorative.

**Reused rather than duplicated:** `seasonGroupBaseName` (season-grouping
feature) for franchise theme matching; `lastWatchedAt` for the personal
Timeline's "last seen"; `cleanDescription` for bio text cleanup;
`escapeHtml`/`loadingHtml`/`STAR_SVG`/the `.detail-meta-grid` and
`.sheet-row`/`.notes`/`.stars` CSS patterns from the existing per-show
Journal tab; `WISDOM_QUOTES` for the Quotes widget's known-quote lookup;
`GENRE_LIST` for catalogue genre filtering; the existing
`NOTIF_CATEGORY_DEFS`/`addTimelineEntry`/`TL_ICONS` notification
architecture end to end.

**Testing.** Verified live with Playwright against the real running app
across four scripts: core unlock/spoiler-gating flows (role gating,
completion transition, spoiler-protection toggle, My Journey persistence),
the global catalogue (cross-series aggregation, search, sort, theme
resolution including the series/genre/default fallback chain, responsive
grid columns at desktop/tablet/mobile widths), notification integration
(unlock entry created once, no duplicate on re-scan, visible in the
Timeline UI), and the full pre-existing regression suite (16 scripts
covering episode tracking, season/arc grouping, the episode modal,
lazy loading, timeline/notifications, and the responsive app shell) to
confirm zero regressions outside the character surface.

### Known Limitations

- **No per-episode unlock data.** See Technical Notes — unlock is role +
  completion only, not truly progressive mid-watch.
- **Relationships has no real data source** — empty-state widget only,
  architecturally ready for when/if that data exists.
- **Gallery is typically single-image** — AniList's Character type only
  exposes one portrait (`image.large`), not a gallery.
- **Species, Height, Occupation, Affiliation, and Popularity always
  render "—".** AniList's Character type has no structured fields for
  any of these (sometimes prose buried in `description`, never reliably
  parseable); Popularity specifically has no separate metric from
  Favorites at the character level, so showing the same number under two
  labels would be dishonest rather than "unknown." Species/Occupation
  are therefore also not offered as catalogue filters — filtering on a
  field that's always "Unknown" wouldn't do anything useful.
- **"Historical" and "Military" genre themes are defined but unreachable
  today** — AniList classifies both as tags, not genres, and this
  session doesn't fetch tags. Ready for tag-based matching later.
- **Global catalogue/progress only reflects series whose characters have
  been fetched at least once** (lazy per-show caching, plus a one-time
  batch warm-up on first Archive visit) — not a background fetch of the
  entire library on every boot, per the "avoid unnecessary API calls"
  performance principle. A show you've never opened either tab for won't
  contribute to the global count until you do.
- **Per-show tab's sort/filter is intentionally lighter than the global
  catalogue's** (search + role filter only, vs. the catalogue's full
  8-option sort + 5-filter toolkit) — a single show's cast doesn't need
  the same power-user controls a library-wide catalogue does; this was a
  scope judgment call, not a spec requirement either way.

### Future Improvements

- Wire the other Archive categories (Quotes, Scenes, Locations, Items,
  Journal Entries, Collections) — the hub's data-driven
  `ARCHIVE_CATEGORIES` list and the overlay's view-swap structure were
  built to support this without redesign.
- Tag-based genre theme matching (AniList `tags`) to actually reach the
  Historical/Military themes.
- If AniList ever exposes richer character data (multiple art pieces,
  structured species/occupation, a relationship graph), the metadata
  grid and Gallery/Relationships widgets are structured to absorb it
  without a redesign — they're built around "always render the field,
  '—' if empty," not "hide the row if data is missing."

---

## Session: Whole-Codebase Quality Review

Full audit of `index.html` (4,170 lines) for duplicate code, dead code,
performance, spacing/naming, state management, accessibility, dark-mode
consistency, and responsive layout. Pure cleanup — no functional or
layout changes, verified live after every category via Playwright
against the real running app.

### Completed

**Duplicate code removed:**
- The `cap = item.type === "anime" ? item.totalEpisodes : item.totalChapters`
  ternary was copy-pasted identically in 7 places — extracted to `capFor(item)`.
- The filled-star SVG path (~500 chars) was inlined verbatim in 7 places —
  extracted to a `STAR_SVG` constant. Caught and fixed two real bugs this
  introduced along the way (see Technical Notes).
- `#3A4353`, the hover-state border color, was a literal repeated in 16
  separate CSS rules — extracted to `--border-hover`.

**Dead code removed:**
- `formatCountdown()` — leftover from the old airing-card widget, fully
  superseded by the Release Timeline's `daysHoursUntil()`.
- 5 orphaned CSS rules with zero matching elements anywhere: `.actionable`
  modifier, `.lbl.est`, `.meta-icons-row` (×3 rules) and `.show-info-line`
  (both leftover from the pre-redesign Show Detail page), `.watchnext`.
- `activeTab` — a state variable that was assigned on every tab switch but
  never once read anywhere.

**Real bug found and fixed:** `resolverSearch()` (TV Time import's title
resolver) was missing the "abort the previous request" step that the
identical pattern already has correctly in `doSearch`/`doDiscoverSearch`/
`runDiscover` — a slow, stale search response could have overwritten
newer results. Fixed to match the proven pattern.

**Accessibility:** 22 icon-only buttons had no accessible name at all
(close buttons, stepper +/-, episode tick buttons, the Discover add
button, the Show Detail "..." menu) — a screen reader would have
announced every one of them as just "button." All now have descriptive
`aria-label`s, several dynamic (e.g., the episode tick button correctly
announces "Mark this episode watched" vs. "...unwatched" depending on
state). Also found and fixed a genuine WCAG contrast failure: `--fg-faint`
only reached 3.3–3.9:1 against the app's card backgrounds at the small
sizes it's actually used at (hints, timestamps), below the 4.5:1 AA
minimum — lightened from `#6B7280` to `#8A91A0`, same hue family, now
5.0–6.0:1 everywhere it's used.

**Dark-mode/design-token consistency:** several places used a literal hex
value that exactly duplicated an existing CSS variable (`::selection`'s
text color, the Wisdom widget's avatar hash palette, its quote text
color) — all now reference the variable instead, so the palette has one
source of truth.

**Hover states:** several interactive elements had `cursor:pointer` but
no actual visual feedback — tabs, the Stats mode toggle, genre chips,
status pills, notification toggles, Calendar rows, Timeline rows, and the
Daily Wisdom widget's clickable area. Added consistent feedback matching
the app's existing hover convention; verified active/selected states
correctly survive being hovered (no specificity conflicts).

### Findings documented but *not* executed

**No `max-width` constraint anywhere in the shell.** On a wide desktop
browser window (a real scenario — the app's own Design Philosophy cites
GitHub Desktop/VS Code as references), the UI stretches edge-to-edge.
Investigated a fix (centering `body`/`header`/`main`/`.tabbar` at a
capped width) but the FAB and full-screen overlays use viewport-relative
`position:fixed` offsets that don't share a containing block with a
centered `body` — a naive fix would've centered the content while
leaving the FAB floating disconnected near the real viewport edge, a
more visible regression than the current behavior. Fixing this properly
means recalculating the FAB's and overlays' positioning together as one
coordinated change, which is real layout-restructuring risk to a
heavily-tested, critical navigation element — out of scope for a
"quality, not functionality" pass. Documented for a future session with
its own explicit go-ahead.

### Files Modified

`index.html` only. No files added or removed.

### Technical Notes

**The STAR_SVG extraction caught two real bugs during its own
verification** — a good example of why every mechanical-looking
refactor still needs a live check. `replace_all` on the SVG markup also
matched the constant's own definition (turning it into
`const STAR_SVG = '${STAR_SVG}'`, i.e. self-referential and broken), and
two usage sites had the interpolation nested inside single-quoted strings
(where `${...}` is just literal text, not interpolated) rather than
backtick template literals. Both caught immediately via a live DOM check
across every star-rendering location (cards, Show Detail score, edit
sheet, Journal, earned badges) before moving on — not by inspection alone.

**Why `resolverSearchToken` looked "unused" but wasn't a dead-code
case.** The low-usage-count scan that found `activeTab` also flagged
this one, but reading its context showed it was a genuine bug (a bare
token pattern missing its abort step), not orphaned state. Worth noting
for future audits: a "referenced only twice" signal means "look closer,"
not "delete."

### Next Recommended Task

The responsive/max-width fix documented above, if wide-window/desktop
usage turns out to matter in practice — needs its own session since it
touches the FAB and overlay positioning as a coordinated unit.

---

## Session: Daily Anime Wisdom Dashboard Widget

### Completed

Built the actual Home-dashboard widget for Today's Anime Wisdom —
closing out the "Next Recommended Task" flagged at the end of the
previous session. Reuses `WISDOM_QUOTES`, `getTodaysWisdom()`, and the
`#wisdomOverlay` detail modal built then; this session added the
dashboard-facing widget itself.

- Retro "desktop gadget" card per the supplied reference design: chrome
  header (label + Japanese subtitle + Refresh/Hide icon buttons),
  atmospheric dark scene with date, character avatar, decorative left
  dots, centered quote, vertical character/series text on the right
  edge, and a bottom row (quote id, series name, pixel-dot accent).
- **Refresh** — swaps to a random other quote, ephemeral (not persisted;
  a reload returns to today's deterministic quote).
- **Hide** — persists (`localStorage`), replaced by a one-line "Daily
  Wisdom widget hidden — Show" reactivation row in its place, so it's
  never lost, just quiet.
- Clicking the scene (not the two icon buttons) opens the existing
  `#wisdomOverlay`, updated to accept the *currently displayed* quote
  rather than always re-deriving today's, so opening it after a Refresh
  shows what's actually on screen.
- Positioned on the Home feed right after the Calendar/Notification
  widgets, before "Haven't Watched For A While" — matches Dashboard
  Philosophy's ordering and doesn't sit above Continue Watching.

### Trade-offs

- **No real character art or background photos.** A static, single-file
  app with no asset pipeline has no legitimate local source for either;
  the widget instead generates a colored monogram avatar (hashed from
  the character's name, so it's stable per character) and picks from 5
  built-in dark atmospheric gradients (deterministic per quote id, so
  the same quote always reads the same "scene"). The data shape
  (`character_avatar_url` / a future `background_url`) still has room to
  swap in real assets later without any structural change.
- **Retro monospace typography is scoped to this one widget on
  purpose** — added `--font-mono` (JetBrains Mono) alongside the
  existing Space Grotesk/Inter system rather than replacing it anywhere
  else. This is a deliberate, contained exception matching the supplied
  reference design, not a drift in the app's type system.
- **Vertical side text is truncated** (character and series both capped
  around 15 characters with an ellipsis) — a name like "Fullmetal
  Alchemist: Brotherhood" would otherwise overflow the widget's fixed
  height in the narrow mobile layout. The full, untruncated series name
  is always still shown on the horizontal "— series —" line at the
  bottom, so nothing is actually hidden, just not repeated twice in full.

### Next Recommended Task

Nothing blocking. If revisited: expand `WISDOM_QUOTES` past 16 entries
(currently repeats on a ~16-day cycle), or wire real per-character
artwork if/when the project adopts an asset pipeline.

### Files Modified

- `index.html` only — CSS (`.wisdom-widget` and children, `--font-mono`),
  `WISDOM_QUOTES` gained `id` fields, new `buildWisdomWidgetBlock()` /
  `gradientFor()` / `avatarColorFor()` / `avatarInitial()` /
  `truncateMid()`, `openWisdomOverlay()` now accepts an optional quote
  override, wired into `renderHomeFeed()`.

---

## Session: Notification System + Timeline

### Completed

**Timeline** (renamed from "Notification Center" per direct feedback —
see Technical Notes) — a combined, permanent log of system notifications
*and* the user's own journal history, grouped by relative time (Today,
Yesterday, Earlier This Week, Last Week, N Weeks Ago, N Months Ago, N
Years Ago). Opened from the dashboard widget's "View All" or **More →
Timeline**. Tapping an entry navigates to the related title's Show
Detail, the Daily Wisdom overlay, or the Statistics page, depending on
type.

**Notification categories implemented** (all independently toggleable
in **More → Notifications**):

| Category | Detection source | Notes |
|---|---|---|
| New Episode | `refreshAiring`'s existing `availableCount` before/after diff | Already existed as "Alerts"; now routed through Timeline |
| New Chapter | **New**: `totalChapters` before/after diff for RELEASING reading items, added to `refreshAiring` | AniList has no per-chapter release-date field; a chapter-count increase is the closest real signal |
| Airing Reminders | Calendar's existing weekly-cadence episode projection | Covers airing-today, season premiere (ep 1), season finale (ep === totalEpisodes) — mutually exclusive per episode |
| Release Countdown | Same projection, `airingAt - now <= 1h` | |
| Continue Watching / Continue Reading | Home feed's existing "stale" idle-time definition, hoisted into shared `lastWatchedAt`/`daysSince` helpers | Configurable frequency (default 10 days) |
| Watch Later Reminders | `status === "planned"` + `updatedAt` age | Configurable frequency (default 30 days); see Technical Notes on the `updatedAt` approximation |
| Daily Anime Wisdom | New minimal local quote set (16 quotes), deterministic by day-of-year | Notification opens a new lightweight Wisdom overlay |
| Anime Journal Anniversaries | `item.startedDate`/`finishedDate` (Journal tab fields) matched against today's month+day | Also backfills a *silent* historical entry dated to the actual started/finished date, independent of the anniversary re-celebration |
| Statistics Milestones | Completed count, episodes/chapters watched, hours watched, journal entry count vs. fixed thresholds | First-ever scan silently baselines already-crossed thresholds so an existing library doesn't fire a burst of retroactive achievements |

**Dashboard widget**: small `🔔 Notifications (N)` card on the Home
feed (both Anime and Reading tabs), showing the 3 most recent entries
and a "View All" button. Positioned after the Calendar widgets, before
"Haven't Watched For A While" — does not sit above Watch Next.

**Persistent storage**: `anitrack_timeline_v1` (capped at 500 entries,
deduplicated by a stable per-event id) and `anitrack_notif_settings_v1`
in localStorage. The old `anitrack_alerts` flag is read once as the
master switch's initial value on first load, then superseded.

### In Progress

Nothing left mid-implementation — this session's scope is fully built,
tested, and documented.

### Next Recommended Task

The **Daily Anime Wisdom dashboard widget** itself (FEATURE_ROADMAP
Phase 4) is still not built. This session only added the minimum needed
for the *notification* to have somewhere real to open (a 16-quote local
set + a lightweight overlay) — deliberately did not build the recurring
Home-feed widget CLAUDE.md's Dashboard Philosophy describes, since that
is a separate, not-yet-started roadmap item and this session's brief was
notifications specifically ("do not begin unrelated features"). Building
the actual widget would mostly be UI work reusing `getTodaysWisdom()`
and `openWisdomOverlay()`, which already exist.

Other reasonable follow-ups, roughly in priority order:
1. Daily Wisdom dashboard widget (see above).
2. Expand the wisdom quote set past 16 (currently repeats every ~16 days).
3. A per-title "mute notifications for this title" override, if usage
   reveals the global category toggles are too coarse.

### Files Modified

- `index.html` — all of this session's work; see Technical Notes for the
  shape of the additions. No new files, no build step — everything stays
  in the single-file architecture the rest of the app already uses.
- `README.md` — the old "Alerts" bullet (described UI that no longer
  exists) replaced with a short description of the new Notifications
  entry point, pointing here for the full picture.
- `docs/FEATURE_ROADMAP.md` — checked off Anniversary Reminders and
  Timeline in Phase 7; added a Notification System sub-list.
- `docs/DATABASE_SCHEMA.md` — added `timeline` and `notification_settings`
  table descriptions, matching the doc's existing (aspirational, not
  literally SQL) schema style.
- `PROJECT_STATUS.md` — this file, new.

### Technical Notes

**Why "Timeline" and not "Notification Center."** Direct user feedback
mid-session: a notification inbox is a generic pattern; AniTrack's
identity is the Journal. The fix wasn't cosmetic renaming — it's that
Timeline entries include the user's own journal history (started/
finished dates, backfilled with their *actual* date as the timestamp, not
"when you entered the data") sitting in the same list as system events,
bucketed by genuine relative time ("2 Years Ago") rather than collapsing
into a flat "Older." That's what makes it read as journal, not inbox.

**No push notifications while closed — by necessity, not choice.**
AniTrack is a static, single-file, client-only PWA with no backend
server (confirmed via `sw.js`: shell-caching only, no `push` event
listener, no VAPID keys). True background push requires a server to hold
subscriptions and send payloads, which doesn't exist here and wasn't
asked for. Every category in this system can only actually fire while
the app is open and its periodic scan runs (every 5 minutes for local
detectors, piggybacking on the existing 15-minute `refreshAiring`
network cycle for episode/chapter detection). This is the same honest
limitation the pre-existing "Alerts" feature already documented in its
own comments — this session extends that constraint consistently rather
than overclaiming a capability the architecture can't deliver. It's
called out in the Notification Settings page copy itself, not just in
code comments.

**Single choke point for dedup.** `addTimelineEntry(entry)` is the only
place that writes to the timeline array, and it no-ops if `entry.id`
already exists. Every detector computes a *stable, deterministic* id
from the real-world event it represents (e.g. `ep-<mediaId>-<episode>`,
`annv-started-<mediaId>-<yearsAgo>`, `milestone-completed-anime-<n>`) —
never a random or timestamp-based id — so re-running a scan (which
happens constantly: every 5 minutes, every reload, after every
`refreshAiring` cycle) can never produce a duplicate, and a dismissed
system notification still has its record intact in Timeline, per the
original brief. Verified live with Playwright: seeded data, ran multiple
scan/reload cycles, confirmed zero duplicate ids and zero double-fires
of the same real event.

**`silent` entries.** Not every Timeline entry should interrupt with a
live popup. `addTimelineEntry` accepts `entry.silent: true`, used for
two cases: (1) backfilled journal history (setting a `startedDate` for a
show you started two years ago shouldn't pop a notification *right now*
for something that already happened), and (2) the first-ever milestone
scan's baseline (a returning user who already has 300 completed titles
shouldn't get slammed with 10/25/50/100/250 all firing at once the
moment this feature ships). Silent entries are marked `read: true` on
creation and still fully visible in Timeline — they're just quiet.

**Chapter-released detection is new derived data, not a new API call.**
AniList has no equivalent of `nextAiringEpisode` for manga — there is no
published chapter release schedule. `refreshAiring` already re-fetches
`totalChapters` for every tracked, non-dropped item every 15 minutes (to
keep progress caps accurate); this session added a before/after diff on
that same already-fetched field for RELEASING reading items. A chapter
count going up is a reliable, honest proxy for "a new chapter now
exists" — reusing data already being pulled, not an additional request,
consistent with the Performance principle (avoid unnecessary API calls).

**Calendar's "Manga chapters releasing today" honesty gap carries over.**
The same constraint means "today" specifically can't be determined for
manga the way it can for anime (AniList simply doesn't publish a date).
The Today's Calendar widget already handled this earlier in the project
by showing ongoing titles instead of fabricating a release day; this
session's chapter-released notification instead fires whenever a chapter
increase is *detected* (i.e., dated to whenever the periodic refresh
happens to notice it), which is real information, just not perfectly
timed to the actual publish moment.

**Watch Later's `updatedAt` approximation.** No field tracks "when did
this item enter Plan to Watch/Read" specifically — `updatedAt` (bumped
on *any* edit) is the closest available signal without adding a new
field for a single reminder type. Noted as an explicit trade-off in
code; worth a dedicated `plannedAt` field if this reminder type turns
out to matter a lot in practice.

**Reused rather than duplicated:**
- `getUpcomingEpisodesInRange` / `projectEpisodesInRange` (Calendar) for
  every airing-related detector.
- `computeTotalHours`, `hasJournalEntry` (Statistics) for milestone
  thresholds.
- `.result`-adjacent list-row visual language for Timeline rows (new
  `.tl-row`, matching the same image+title+meta shape already
  established for search results and Calendar rows).
- `lastWatchedAt`/`daysSince` were previously private to
  `renderHomeFeed`; hoisted to shared module-level functions since both
  the Home feed's "Haven't Watched For A While" section and the new
  Continue Watching/Reading detector need the exact same definition of
  "idle" — one judgment, not two.

**Testing.** Verified live end-to-end with Playwright against the real
running app (not just code review): all nine detector categories,
dedup across repeated scans and reloads, live `Notification` firing
gated correctly by the master switch (confirmed silent while off, fires
once turned on with a genuinely new event), Timeline's relative-time
bucketing, tap-to-navigate into Show Detail, the dashboard widget, and
the Settings page's 11 toggles (master + 10 categories) persisting
correctly. One real test-script bug caught and fixed along the way
(UTC-vs-local date mismatch in a seed helper, made the anniversary
detector look broken when it wasn't) — documented in case it comes up
again in future test-writing.

### Future Claude Notes

- The whole app is one `index.html` file, deliberately — no build step,
  no bundler, no framework. Match that; don't introduce a multi-file
  split or a build pipeline unless explicitly asked.
- `list` (the tracked items array) and every function defined inside the
  page's top-level `(() => { ... })()` IIFE are **not reachable from
  Playwright's `page.evaluate`** — they're closure-scoped, not on
  `window`. When testing, either read/write `localStorage` directly, or
  use `page.addInitScript` to patch a global (like `window.Notification`)
  *before* the page's own script runs. Don't waste time trying to call
  in-page functions directly from a test script; it will fail with
  "X is not a function" and it's not a bug.
- `refreshAiring()` refreshes metadata for every tracked item with a
  small AniList id — if you seed test data with small sequential
  fake ids (1, 2, 3...), they will very likely collide with **real**
  AniList media and get silently overwritten by the background refresh
  mid-test. Either block `**/graphql.anilist.co/**` entirely, or mock
  `REFRESH_QUERY` responses (its query text uniquely contains
  `$ids: [Int]`) if you need the real refresh path exercised.
- The Notification Settings page's category toggles are disabled (not
  hidden) while the master switch is off, so re-enabling the master
  switch restores whatever granular choices were already made — don't
  "fix" this by hiding them, it's intentional.
