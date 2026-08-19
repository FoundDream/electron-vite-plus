---
layout: home
title: Electron build tooling powered by Vite+

hero:
  name: BUILT FOR VITE+
  text: One build rhythm. Every Electron process.
  tagline: A focused Electron toolchain that coordinates main, preload, and renderer from one typed Vite+ configuration.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Explore the build model
      link: /guide/build-model
---

<section class="demo-stage" aria-label="Development loop preview">
  <div class="demo-stage__glow demo-stage__glow--violet"></div>
  <div class="demo-stage__glow demo-stage__glow--mint"></div>
  <div class="terminal-window">
    <div class="terminal-window__bar">
      <div class="terminal-window__lights" aria-hidden="true"><span></span><span></span><span></span></div>
      <span class="terminal-window__title">electron-vite-plus · dev</span>
      <span class="terminal-window__status"><i></i> running</span>
    </div>
    <div class="terminal-window__body">
      <p><span class="terminal-window__prompt">$</span> vp run dev</p>
      <p class="terminal-window__muted">VITE+ running task <b>dev</b></p>
      <div class="terminal-window__targets">
        <div class="terminal-target terminal-target--main">
          <span class="terminal-target__index">01</span>
          <div><strong>main</strong><small>Node runtime · ESM</small></div>
          <span class="terminal-target__event">restart ↻</span>
        </div>
        <div class="terminal-target terminal-target--preload">
          <span class="terminal-target__index">02</span>
          <div><strong>preload</strong><small>Secure bridge · CJS</small></div>
          <span class="terminal-target__event">reload ↗</span>
        </div>
        <div class="terminal-target terminal-target--renderer">
          <span class="terminal-target__index">03</span>
          <div><strong>renderer</strong><small>Chromium · Vite HMR</small></div>
          <span class="terminal-target__event">update ⚡</span>
        </div>
      </div>
      <p class="terminal-window__ready"><span>✓</span> Electron ready in 684ms <i></i></p>
    </div>
  </div>
  <div class="demo-stage__caption">
    <span>One config</span><i></i><span>Three targets</span><i></i><span>One dev loop</span>
  </div>
</section>

<section class="quickstart" aria-labelledby="quickstart-title">
  <div class="quickstart__intro">
    <p class="section-kicker">GETTING STARTED</p>
    <h2 id="quickstart-title">From zero to a running desktop app.</h2>
    <p>Scaffold a vanilla, React, or Vue project. The generator wires every Electron entry and Vite+ task for you.</p>
    <a class="text-link" href="./guide/getting-started">Read the guide <span>→</span></a>
  </div>
  <div class="command-stack" aria-label="Quick start commands">
    <div class="command-line"><span>01</span><code>npm create electron-vite-plus@alpha my-app</code></div>
    <div class="command-line"><span>02</span><code>cd my-app && vp install</code></div>
    <div class="command-line command-line--active"><span>03</span><code>vp run dev</code><i>↵</i></div>
  </div>
</section>

<section class="feature-matrix" aria-label="Core capabilities">
  <article class="feature-cell feature-cell--config">
    <p class="feature-cell__number">01 / CONFIG</p>
    <h3>One source of truth</h3>
    <p>Keep Electron targets, renderer plugins, linting, tests, and task settings together in <code>vite.config.ts</code>.</p>
    <div class="config-orbit" aria-hidden="true">
      <span class="config-orbit__core">vite.config.ts</span>
      <span class="config-orbit__node config-orbit__node--one">main</span>
      <span class="config-orbit__node config-orbit__node--two">preload</span>
      <span class="config-orbit__node config-orbit__node--three">renderer</span>
    </div>
  </article>
  <article class="feature-cell">
    <p class="feature-cell__number">02 / FEEDBACK</p>
    <h3>Desktop-aware development</h3>
    <p>Main changes restart Electron. Preload changes refresh the bridge. Renderer changes stay on the fast HMR path.</p>
    <div class="event-strip" aria-hidden="true"><span>restart</span><span>reload</span><span>hot update</span></div>
  </article>
  <article class="feature-cell">
    <p class="feature-cell__number">03 / DEFAULTS</p>
    <h3>Correct output by default</h3>
    <p>Node-oriented builds for privileged code, a familiar Vite pipeline for the web surface, and predictable output under <code>out/</code>.</p>
    <div class="output-tree" aria-hidden="true">
      <span>out/</span><span>├─ main/</span><span>├─ preload/</span><span>└─ renderer/</span>
    </div>
  </article>
  <article class="feature-cell feature-cell--plus">
    <p class="feature-cell__number">04 / VITE+</p>
    <h3>Native to the Vite+ workflow</h3>
    <p>Use one task runner from the first local edit to the production build.</p>
    <div class="task-chips" aria-hidden="true"><span>vp dev</span><span>vp check</span><span>vp test</span><span>vp build</span></div>
  </article>
</section>

<section class="build-system" aria-labelledby="build-system-title">
  <div class="build-system__heading">
    <p class="section-kicker">THE ELECTRON-AWARE LAYER</p>
    <h2 id="build-system-title">Three environments.<br>Precisely coordinated.</h2>
    <p>electron-vite-plus adds the desktop lifecycle Vite+ needs without hiding the Vite APIs you already know.</p>
  </div>
  <div class="build-lanes">
    <article class="build-lane build-lane--main">
      <div class="build-lane__copy">
        <span>01 · NODE RUNTIME</span><h3>Main process</h3>
        <p>Build Electron lifecycle code, keep native dependencies external, and restart only when the main bundle changes.</p>
      </div>
      <div class="build-lane__visual" aria-hidden="true">
        <code><i>main</i>  ✓ built in 84ms</code><span class="pulse-line"></span><b>Electron ↻</b>
      </div>
    </article>
    <article class="build-lane build-lane--preload">
      <div class="build-lane__copy">
        <span>02 · SECURE BRIDGE</span><h3>Preload scripts</h3>
        <p>Compile the context bridge with safe defaults, then reload connected renderers when its contract changes.</p>
      </div>
      <div class="build-lane__visual" aria-hidden="true">
        <code><i>preload</i>  ✓ built in 31ms</code><span class="pulse-line"></span><b>Bridge ↗</b>
      </div>
    </article>
    <article class="build-lane build-lane--renderer">
      <div class="build-lane__copy">
        <span>03 · CHROMIUM</span><h3>Renderer app</h3>
        <p>Keep the full Vite plugin ecosystem, asset pipeline, framework integrations, and near-instant hot updates.</p>
      </div>
      <div class="build-lane__visual" aria-hidden="true">
        <code><i>renderer</i>  update /src/App.tsx</code><span class="pulse-line"></span><b>HMR ⚡</b>
      </div>
    </article>
  </div>
</section>

<section class="closing-cta" aria-labelledby="closing-title">
  <span class="closing-cta__mark" aria-hidden="true">E<span>+</span></span>
  <p class="section-kicker">OPEN SOURCE · MIT LICENSE</p>
  <h2 id="closing-title">Build Electron apps<br>in the Vite+ rhythm.</h2>
  <div class="closing-cta__actions">
    <a class="cta-button cta-button--primary" href="./guide/getting-started">Start building <span>→</span></a>
    <a class="cta-button" href="https://github.com/FoundDream/electron-vite-plus">View on GitHub ↗</a>
  </div>
</section>
