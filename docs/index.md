---
layout: home
title: Electron build and runtime validation powered by Vite+

hero:
  name: BUILT FOR VITE+
  text: One build rhythm. Every Electron process.
  tagline: Develop, build, and validate main, preload, and renderer from one typed Vite+ configuration.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Validate the runtime
      link: /guide/runtime-validation
---

<section class="demo-stage" aria-label="Runtime smoke check preview">
  <div class="demo-stage__glow demo-stage__glow--violet"></div>
  <div class="demo-stage__glow demo-stage__glow--mint"></div>
  <div class="terminal-window">
    <div class="terminal-window__bar">
      <div class="terminal-window__lights" aria-hidden="true"><span></span><span></span><span></span></div>
      <span class="terminal-window__title">electron-vite-plus · smoke</span>
      <span class="terminal-window__status"><i></i> verified</span>
    </div>
    <div class="terminal-window__body">
      <p><span class="terminal-window__prompt">$</span> vp run smoke</p>
      <p class="terminal-window__muted">Waiting for the explicit runtime readiness handshake</p>
      <div class="terminal-window__targets">
        <div class="terminal-target terminal-target--main">
          <span class="terminal-target__index">build</span>
          <div><strong>main</strong><small>Electron lifecycle</small></div>
          <span class="terminal-target__event">bundle ready</span>
        </div>
        <div class="terminal-target terminal-target--preload">
          <span class="terminal-target__index">load</span>
          <div><strong>preload</strong><small>Sandboxed bridge</small></div>
          <span class="terminal-target__event">bridge loaded</span>
        </div>
        <div class="terminal-target terminal-target--renderer">
          <span class="terminal-target__index">open</span>
          <div><strong>renderer</strong><small>Application entry</small></div>
          <span class="terminal-target__event">window ready</span>
        </div>
      </div>
      <p class="terminal-window__ready"><span>✓</span> EVP_SMOKE_READY · Runtime smoke check passed. <i></i></p>
    </div>
  </div>
  <div class="demo-stage__caption">
    <span>Build complete</span><i></i><span>Preload loaded</span><i></i><span>Renderer ready</span>
  </div>
</section>

<aside class="release-rail" aria-label="Current release">
  <div>
    <span class="release-rail__version">0.1.0-alpha.2</span>
    <strong>Responsive HMR release</strong>
    <p>Persistent process watchers, coordinated reloads, renderer-only mode, and observable HMR timing.</p>
  </div>
  <a href="https://github.com/FoundDream/electron-vite-plus/blob/main/CHANGELOG.md">Read the release notes <span>↗</span></a>
</aside>

<section class="quickstart" aria-labelledby="quickstart-title">
  <div class="quickstart__intro">
    <p class="section-kicker">GETTING STARTED</p>
    <h2 id="quickstart-title">From zero to a verified desktop app.</h2>
    <p>Scaffold a vanilla, React, or Vue project. The generator wires every Electron entry, Vite+ task, and runtime readiness hook.</p>
    <a class="text-link" href="./guide/getting-started">Read the guide <span>→</span></a>
  </div>
  <div class="command-stack" aria-label="Quick start commands">
    <div class="command-line"><span>01</span><code>npm create electron-vite-plus@alpha my-app</code></div>
    <div class="command-line"><span>02</span><code>cd my-app && vp install</code></div>
    <div class="command-line"><span>03</span><code>vp run dev</code></div>
    <div class="command-line command-line--active"><span>04</span><code>vp run smoke</code><i>↵</i></div>
  </div>
</section>

<section class="feature-matrix" aria-label="Core capabilities">
  <article class="feature-cell feature-cell--config">
    <p class="feature-cell__number">CONFIGURATION</p>
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
    <p class="feature-cell__number">DEVELOPMENT</p>
    <h3>Desktop-aware feedback</h3>
    <p>Main changes restart Electron. Preload changes refresh the bridge. Renderer changes stay on the fast HMR path.</p>
    <div class="event-strip" aria-hidden="true"><span>restart</span><span>reload</span><span>hot update</span></div>
  </article>
  <article class="feature-cell">
    <p class="feature-cell__number">OUTPUT</p>
    <h3>Correct builds by default</h3>
    <p>Runtime-derived targets for privileged code, a familiar Vite pipeline for the web surface, and predictable output under <code>out/</code>.</p>
    <div class="output-tree" aria-hidden="true">
      <span>out/</span><span>├─ main/</span><span>├─ preload/</span><span>└─ renderer/</span>
    </div>
  </article>
  <article class="feature-cell feature-cell--plus">
    <p class="feature-cell__number">VALIDATION</p>
    <h3>Know what actually passed</h3>
    <p>Separate configuration health, production output, and real Electron startup instead of treating them as one green check.</p>
    <div class="task-chips" aria-hidden="true"><span>doctor</span><span>build</span><span>preview</span><span>smoke</span></div>
  </article>
</section>

<section class="runtime-proof" aria-labelledby="runtime-proof-title">
  <div class="runtime-proof__copy">
    <p class="section-kicker">RUNTIME VALIDATION</p>
    <h2 id="runtime-proof-title">Configuration is not runtime.</h2>
    <p>Each command answers a different question. Use all three gates when an application needs evidence, not just a successful config load.</p>
    <a class="text-link" href="./guide/runtime-validation">See the validation model <span>→</span></a>
  </div>
  <ol class="validation-stack">
    <li>
      <span>doctor</span>
      <div><strong>Can the project be resolved?</strong><p>Checks configuration, Electron targets, Vite compatibility, outputs, and dependency setup.</p></div>
      <b>diagnose</b>
    </li>
    <li>
      <span>build</span>
      <div><strong>Can every target compile?</strong><p>Produces main, preload, and renderer output with Electron-aware defaults.</p></div>
      <b>produce</b>
    </li>
    <li class="validation-stack__active">
      <span>smoke</span>
      <div><strong>Did the application really open?</strong><p>Waits for renderer, preload, and main to complete one explicit readiness handshake.</p></div>
      <b>prove</b>
    </li>
  </ol>
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
        <span>NODE RUNTIME</span><h3>Main process</h3>
        <p>Build Electron lifecycle code, keep native dependencies external, and restart only when the main bundle changes.</p>
      </div>
      <div class="build-lane__visual" aria-hidden="true">
        <code><i>main</i>  ✓ bundle ready</code><span class="pulse-line"></span><b>Electron ↻</b>
      </div>
    </article>
    <article class="build-lane build-lane--preload">
      <div class="build-lane__copy">
        <span>SECURE BRIDGE</span><h3>Preload scripts</h3>
        <p>Compile the context bridge with safe defaults, then reload connected renderers when its contract changes.</p>
      </div>
      <div class="build-lane__visual" aria-hidden="true">
        <code><i>preload</i>  ✓ bundle ready</code><span class="pulse-line"></span><b>Bridge ↗</b>
      </div>
    </article>
    <article class="build-lane build-lane--renderer">
      <div class="build-lane__copy">
        <span>CHROMIUM</span><h3>Renderer app</h3>
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
  <p class="section-kicker">OPEN SOURCE / MIT LICENSE</p>
  <h2 id="closing-title">Build Electron apps<br>with runtime confidence.</h2>
  <div class="closing-cta__actions">
    <a class="cta-button cta-button--primary" href="./guide/getting-started">Start building <span>→</span></a>
    <a class="cta-button" href="https://github.com/FoundDream/electron-vite-plus">View on GitHub ↗</a>
  </div>
</section>
