import { mount } from 'svelte';
import '@/assets/tokens.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
