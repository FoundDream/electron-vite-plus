---
layout: home
title: Electron build tooling powered by Vite+

hero:
  name: electron-vite-plus
  text: Electron, built in the Vite+ rhythm.
  tagline: One typed configuration coordinates main, preload, and renderer builds — with fast feedback in development and predictable output in production.
  image:
    src: /build-rail.svg
    alt: One configuration feeding three Electron build targets
  actions:
    - theme: brand
      text: Start building →
      link: /guide/getting-started
    - theme: alt
      text: Read the config model
      link: /guide/configuration

features:
  - icon: "01 / CONFIG"
    title: One source of truth
    details: Keep Electron targets, renderer plugins, linting, and tests together in vite.config.ts.
  - icon: "02 / LOOP"
    title: Desktop-aware development
    details: Renderer HMR stays fast while main changes restart Electron and preload changes refresh the page.
  - icon: "03 / OUTPUT"
    title: Sensible target defaults
    details: Main and preload use Node-oriented builds; the renderer keeps the familiar Vite web pipeline.
  - icon: "04 / VITE+"
    title: Native Vite+ workflow
    details: Run development, checks, tests, builds, and previews through the same Vite+ task runner.
---

<section class="architecture" aria-labelledby="architecture-title">
  <p class="architecture__eyebrow">The three-target build rail</p>
  <h2 id="architecture-title">One command, three environments, no split-brain configuration.</h2>
  <div class="architecture__rail">
    <div class="architecture__card">
      <code>01 / Node runtime</code>
      <strong>Main</strong>
      <span>Electron lifecycle, native APIs, windows, and application orchestration.</span>
    </div>
    <div class="architecture__card">
      <code>02 / Secure bridge</code>
      <strong>Preload</strong>
      <span>A CommonJS-by-default boundary between privileged code and the web surface.</span>
    </div>
    <div class="architecture__card">
      <code>03 / Chromium</code>
      <strong>Renderer</strong>
      <span>Your Vite web application, with plugins, assets, and HMR intact.</span>
    </div>
  </div>
</section>
