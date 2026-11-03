import { mount } from 'svelte';
import '@/assets/tokens.css';
import Popup from './Popup.svelte';

mount(Popup, { target: document.getElementById('app')! });
