# Neon Tilt

A small browser pinball game built with TypeScript, Vite, and Phaser 3.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Controls

- **A / Left Shift:** left flipper
- **L / Right Shift:** right flipper
- **Space:** hold to charge the launcher, release to launch (maximum power after 2 seconds)
- **Escape:** pause or resume
- **Touch:** hold the left or right playfield side to operate its flipper; hold and release **Launch** to charge and fire

## The table: Classic Orbit

The playfield is modelled on classic solid-state layouts:

- **Shooter lane** on the right with a plunger. A one-way gate at the top lets the ball
  out onto the arch but stops it falling back in. A weak plunge that rolls back down is
  re-armed automatically ("SHOOT AGAIN").
- **Top arch** that carries the launched ball around the top of the table into the **left
  orbit**. Left and right **orbit lanes** run down both sides behind guide rails; a
  left→right (or right→left) orbit within 3 seconds scores a loop bonus.
- **Three top rollover lanes** (A/B/C) above **three pop bumpers**.
- **Standup target banks** on the left and right orbit guides. Light all three in a
  bank to collect a bonus.
- **Mid-field obstacles**: rubber posts, a diamond **island**, and two **mini bumpers**
  that split shots into several paths.
- **Slingshots**, **inlanes** that feed the flippers, and **outlanes** with posts.

## Architecture

- `src/table/` holds the **pure table geometry** (`TableGeometry.ts` types/helpers and
  `layouts/classicOrbit.ts`). It has no colors and no engine code.
- `src/themes/` holds the **visual themes** (Neon Blue, Space, Industrial, Retro Arcade,
  Jungle), one file per theme. They style elements by role only, never by position. The
  selected theme is saved in `localStorage` and can be changed on the start and pause
  screens.
- `src/render/TableRenderer.ts` draws any geometry with any theme.
- `src/physics/TableWorld.ts` builds the Matter bodies from the geometry and handles
  scoring. It is engine-agnostic, so it runs headlessly in tests.
  `src/physics/TablePhysics.ts` binds it to Phaser.
- Physics run on a fixed 60 Hz clock, with 4 sub-steps per frame so the fast ball cannot
  tunnel through rails. Ball, flipper and material values are unchanged from the
  original game.
- A ball wedged or balanced in place above the flippers for 2 seconds gets a small
  "ball search" nudge.

A ramp is planned as phase 2.

Run `npm test` for the session and headless physics tests, `npm run typecheck` for strict
TypeScript validation, and `npm run build` to create the production bundle in `dist/`.
