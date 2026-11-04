<script lang="ts">
  import { browser } from '#imports';
  import { PROVIDER_HOSTS } from '@/lib/providers/origins';
  import { authorizeUrl, codeFromCallback, createPkce, exchangeCode, randomToken } from '@/lib/providers/openrouter-auth';
  import Button from '@/ui/kit/Button.svelte';
  import Field from '@/ui/kit/Field.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';

  // Sign in with OpenRouter instead of pasting a key. If the sign-in window can't hand back to Carrel,
  // OpenRouter can show a one-time code to paste here instead.
  let { onkey, onmanual }: { onkey: (key: string) => Promise<void>; onmanual: () => void } = $props();

  let step = $state<{ state: 'idle' } | { state: 'busy' } | { state: 'code'; verifier: string }>({ state: 'idle' });
  let code = $state('');
  let error = $state('');
  /** Shown after a sign-in window closes without a key, in case the hand-back is what failed. */
  let offerCode = $state(false);

  /** Must run first in a click, while it still counts as a user gesture. */
  async function allowOpenRouter() {
    if (!(await browser.permissions.request({ origins: [...PROVIDER_HOSTS.openrouter] }))) {
      throw new Error('Permission to contact OpenRouter was declined.');
    }
  }

  async function connect() {
    step = { state: 'busy' };
    error = '';
    try {
      await allowOpenRouter();
      const { verifier, challenge } = await createPkce();
      const state = randomToken(16);
      const callback = browser.identity.getRedirectURL('openrouter');
      let redirect: string | undefined;
      try {
        redirect = await browser.identity.launchWebAuthFlow({ url: authorizeUrl({ challenge, callback, state }), interactive: true });
      } catch {
        // Closed, cancelled, or OpenRouter never sent the user back.
        offerCode = true;
        step = { state: 'idle' };
        return;
      }
      if (!redirect) throw new Error('OpenRouter sign-in was cancelled.');
      await onkey(await exchangeCode(codeFromCallback(redirect, state), verifier));
      step = { state: 'idle' };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = { state: 'idle' };
    }
  }

  async function getCode() {
    error = '';
    try {
      await allowOpenRouter();
      const { verifier, challenge } = await createPkce();
      await browser.tabs.create({ url: authorizeUrl({ challenge }) });
      code = '';
      step = { state: 'code', verifier };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function useCode() {
    if (step.state !== 'code' || !code.trim()) return;
    const { verifier } = step;
    step = { state: 'busy' };
    error = '';
    try {
      await onkey(await exchangeCode(code, verifier));
      step = { state: 'idle' };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = { state: 'code', verifier };
    }
  }
</script>

{#if step.state === 'code'}
  <Field label="Code from OpenRouter" hint="Shown by OpenRouter after you approve. Works once, for 10 minutes.">
    <Input spellcheck="false" autocomplete="off" placeholder="Paste the code" bind:value={code} />
  </Field>
  <div class="row">
    <Button size="sm" disabled={!code.trim()} onclick={useCode}>Use code</Button>
    <Button size="sm" kind="ghost" onclick={() => (step = { state: 'idle' })}>Cancel</Button>
  </div>
{:else}
  <div class="row">
    <Button size="sm" kind="primary" disabled={step.state === 'busy'} onclick={connect}>
      {#if step.state === 'busy'}<Spinner size={10} />{/if} Connect OpenRouter
    </Button>
    <button type="button" class="link" onclick={onmanual}>Paste a key instead</button>
  </div>
  <p class="hint">
    Opens OpenRouter so you can sign in and approve Carrel. Usage is paid from your OpenRouter credit; Carrel never sees your
    password.
  </p>
  {#if offerCode}
    <p class="hint">
      Sign-in didn't finish? <button type="button" class="link" onclick={getCode}>Get a code from OpenRouter instead</button>
    </p>
  {/if}
{/if}
{#if error}<p class="error-text small">{error}</p>{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hint {
    margin: 0;
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--text-3);
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-size: var(--text-sm);
    color: var(--text-2);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
</style>
