<script>
  import { onMount } from 'svelte';

  let isLoading = false;
  let progressText = 'Initializing model...';
  let progressPercent = 0;
  let isReady = false;
  let errorMessage = '';
  let autoCloseTimer = null;
  let showInfo = false;

  const quickFeatures = [
    { icon: '⚡', text: 'Instant Summaries' },
    { icon: '🔒', text: 'Completely Private' },
    { icon: '🎯', text: 'Multiple Formats' },
    { icon: '⌨️', text: 'Keyboard Shortcut' }
  ];

  const fullInfo = {
    why: 'Summaryse uses a powerful AI model that runs entirely on your device. No data leaves your computer, it works offline, and processes text instantly.',
    how: [
      'Select text on any webpage',
      'Right-click → "Summarize with Summaryse"',
      'Choose your preferred format',
      'Get summary instantly'
    ]
  };

  function updateProgress(text, percent) {
    progressText = text;
    if (percent) {
      progressPercent = Math.min(percent, 99);
    }
    console.log('[onboarding] Progress:', text, percent);
  }

  function handleReady() {
    isLoading = false;
    isReady = true;
    console.log('[onboarding] Model ready!');

    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => {
      window.close();
    }, 3000);
  }

  function handleError(error) {
    isLoading = false;
    errorMessage = error;
    console.error('[onboarding] Model loading failed:', error);
  }

  function startModelLoading() {
    isLoading = true;
    errorMessage = '';
    progressPercent = 0;
    progressText = 'Starting model download...';

    chrome.runtime.sendMessage({ type: 'LOAD_MODEL' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[onboarding] Failed to send LOAD_MODEL:', chrome.runtime.lastError);
        handleError('Failed to start model loading');
      } else {
        console.log('[onboarding] LOAD_MODEL sent successfully');
      }
    });
  }

  function handleRetry() {
    startModelLoading();
  }

  function closeWindow() {
    window.close();
  }

  onMount(() => {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[onboarding] Service worker not responding');
        return;
      }
    });

    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'PROGRESS') {
        updateProgress(message.text, message.percent || 0);
      } else if (message.type === 'READY') {
        handleReady();
      } else if (message.type === 'ERROR') {
        handleError(message.error);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  });
</script>

<style>
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    height: 100vh;
    overflow: hidden;
  }

  .screen-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    transition: opacity 0.2s;
  }

  .top-section {
    text-align: center;
    padding-top: 20px;
  }

  .title {
    color: white;
    margin: 0 0 4px 0;
    font-size: 28px;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  .center-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    width: 100%;
  }

  .download-btn {
    background: white;
    border: none;
    border-radius: 16px;
    padding: 20px 40px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transition: all 0.3s;
    font-family: inherit;
  }

  .download-btn:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(14, 165, 168, 0.25);
  }

  .download-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 28px;
  }

  .btn-text {
    text-align: left;
  }

  .btn-main {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
  }

  .btn-sub {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }

  .features-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
    max-width: 400px;
  }

  .quick-feature {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    backdrop-filter: blur(10px);
  }

  .quick-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }

  .quick-text {
    font-size: 11px;
    color: #475569;
    font-weight: 600;
    line-height: 1.3;
  }

  .bottom-section {
    width: 100%;
    text-align: center;
    padding-bottom: 16px;
  }

  .info-toggle {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .info-toggle:hover {
    color: white;
  }

  .info-popup {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 16px 20px;
    margin-top: 12px;
    backdrop-filter: blur(10px);
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    text-align: left;
  }

  .info-section {
    margin-bottom: 12px;
  }

  .info-section:last-child {
    margin-bottom: 0;
  }

  .info-title {
    color: #1e293b;
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 700;
  }

  .info-text {
    color: #475569;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .guide-list {
    color: #475569;
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    line-height: 1.6;
  }

  .guide-list li {
    margin-bottom: 4px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
  }

  .modal-section {
    padding: 40px;
    text-align: center;
  }

  .modal-icon {
    font-size: 48px;
    margin-bottom: 16px;
    animation: pulse 2s infinite;
  }

  .modal-icon.error {
    animation: none;
  }

  .modal-section h2 {
    color: #1e293b;
    margin: 0 0 12px 0;
    font-size: 20px;
  }

  .modal-section p {
    color: #64748b;
    margin: 12px 0 24px 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .primary-btn {
    background: linear-gradient(135deg, #0ea5a8, #06b6d4);
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(14, 165, 168, 0.3);
  }

  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .primary-btn.error {
    background: #C5221F;
  }

  .primary-btn.error:hover {
    box-shadow: 0 8px 16px rgba(197, 34, 31, 0.3);
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
    margin: 16px 0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #0ea5a8, #06b6d4);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 12px;
    color: #64748b;
    margin: 8px 0 0 0;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  @media (max-width: 480px) {
    .features-row {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .download-btn {
      padding: 16px 28px;
    }

    .btn-main {
      font-size: 16px;
    }

    .title {
      font-size: 24px;
    }
  }
</style>

{#if isLoading}
  <div class="modal-overlay">
    <div class="modal-content">
      {#if isReady}
        <div class="modal-section">
          <div class="modal-icon">✨</div>
          <h2>Ready to Summarize!</h2>
          <p>The AI model is loaded and ready to use.</p>
          <button on:click={closeWindow} class="primary-btn">Got it!</button>
        </div>
      {:else if errorMessage}
        <div class="modal-section">
          <div class="modal-icon error">⚠️</div>
          <h2>Setup Failed</h2>
          <p style="color: #5F6368;">{errorMessage}</p>
          <button on:click={handleRetry} class="primary-btn error">Retry</button>
        </div>
      {:else}
        <div class="modal-section">
          <div class="modal-icon loading">⚙️</div>
          <h2>{progressText}</h2>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progressPercent}%"></div>
          </div>
          <p class="progress-text">{progressPercent}% complete</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<div class="screen-container" style="opacity: {isLoading ? 0.5 : 1}; pointer-events: {isLoading ? 'none' : 'auto'};">
  <div class="top-section">
    <h1 class="title">Summaryse</h1>
    <p class="subtitle">Summarize any text instantly</p>
  </div>

  <div class="center-section">
    <button on:click={startModelLoading} class="download-btn" disabled={isLoading}>
      <div class="btn-icon">⚡</div>
      <div class="btn-text">
        <div class="btn-main">{isLoading ? 'Downloading...' : 'Get Started'}</div>
        <div class="btn-sub">Setup takes ~1 min</div>
      </div>
    </button>

    <div class="features-row">
      {#each quickFeatures as feature (feature.text)}
        <div class="quick-feature">
          <div class="quick-icon">{feature.icon}</div>
          <div class="quick-text">{feature.text}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="bottom-section">
    <button class="info-toggle" on:click={() => showInfo = !showInfo}>
      {showInfo ? '▼ Hide Details' : '▶ Learn More'}
    </button>

    {#if showInfo}
      <div class="info-popup">
        <div class="info-section">
          <h3 class="info-title">🤖 How it Works</h3>
          <p class="info-text">{fullInfo.why}</p>
        </div>

        <div class="info-section">
          <h3 class="info-title">📖 Quick Guide</h3>
          <ol class="guide-list">
            {#each fullInfo.how as step, i}
              <li>{step}</li>
            {/each}
          </ol>
        </div>
      </div>
    {/if}
  </div>
</div>
