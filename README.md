# HUD — Giri Sainath's 3D portfolio

A sci-fi HUD portfolio built from the reference frames in `../ezgif-7b551395ae20858a-jpg`: a neural-network
hero, a "mission control" dashboard, a corridor you fly through (one floating code window per system), and a
holographic globe with the contact console. React + React Three Fiber + Three.js, bloom post-processing, Lenis
smooth scrolling. It builds to plain static files — no server, no API keys.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve dist/ locally to check the build
```

## Deploying

`dist/` is self-contained and uses relative paths, so it works at a domain root or a sub-path
(GitHub Pages, Netlify, Vercel, S3, any static host). Drag `dist/` into Netlify, or point Vercel at this folder
(framework: Vite). Open it through a server rather than double-clicking `index.html` — browsers block
ES modules on `file://`.

## Where things live

| File | What it controls |
| --- | --- |
| `src/data.js` | **All text and numbers**: profile, hero monitor, impact gauges, career log, agent graph, stack, projects (including the code shown on each corridor window), the "ask" knowledge chunks |
| `public/resume.pdf` | The PDF every "Résumé" button opens (currently the 2027 résumé) |
| `src/ui/Hero.jsx` | Hero text, top-left icon cluster, top-right monitor |
| `src/ui/Overview.jsx` | Dashboard panels: `whoami`, impact, `git log`, agent topology, stack radar, ask console |
| `src/ui/Systems.jsx` | Corridor section: scroll pinning, the readable project cards, the jump rail |
| `src/ui/Contact.jsx` | Globe frame, contact form (opens a pre-filled `mailto:`), social buttons, footer |
| `src/three/NeuralNet.jsx` | Hero network, pulses, bokeh, node labels |
| `src/three/Corridor.jsx` | Corridor geometry, binary rain, warp streaks, code windows, camera flight |
| `src/three/Globe.jsx` | Globe, land dots, Telangana marker, orbits, side polyhedra |
| `src/three/landmask.js` | Continents for the globe, pre-baked from Natural Earth (public domain) |
| `src/styles.css` | Design tokens at the top; everything else by section |

## Notes

- **GitHub button**: set `profile.github` in `src/data.js` and it appears in the contact section.
- **Ask console**: keyword retrieval over the `knowledge` chunks in `data.js`, entirely in the browser. When the
  résumé changes, update those chunks too.
- **Motion**: the cube button pauses all 3D motion and animation (and the choice is remembered). Visitors with
  "reduce motion" turned on start paused. Each 3D scene only renders while it's on screen.
- **Phone number** is deliberately left off the public site.
