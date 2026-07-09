# Leaves and Bark — Task Tracker

## Done
- [x] Toon-shaded puppy with ink outlines (capsule body, sphere head, floppy ears, tail, legs)
- [x] WASD / arrow key controls with rotation
- [x] Floaty jump with forward momentum and air steering
- [x] Squash & stretch animation on movement and jump
- [x] Third-person camera following behind puppy
- [x] 30-leaf canopy with staggered spawn and pool respawn
- [x] Shadow blobs beneath leaves for depth perception
- [x] Touch joystick + jump button (mobile only)

## Done (continued)
- [x] Ground leaf accumulation — missed leaves settle and build a colorful carpet
- [x] Scatter explosion — running through ground leaves bursts them into the air

## To Do
- [ ] Golden leaves (5% spawn rate, 50pts, falls fast or zooms horizontally, chime on catch)
- [ ] Wind gusts — periodic bursts that push leaves in a direction, creating swarms to chase
- [ ] 3-phase sky timeline (90s total)
  - 0–45s: warm cream sky, normal leaf speed
  - 45–75s: lerp to peach/lavender, wind doubles, leaves speed up, banner "The evening breeze awakens..."
  - 75–90s: deep violet sky, golden leaf rate increases
- [ ] Investigate migrating to React Three Fiber + @react-three/rapier (or Rapier.js standalone) to replace manual physics and reduce low-level Three.js boilerplate
- [ ] "Good Day's Rest" end scorecard
  - Physics freeze at 90s, camera pans to puppy
  - Puppy idles, circles 3x, curls up
  - Parchment overlay with typewriter text
  - "Play in the wind again" reset button
