import { mount } from 'svelte';
import '@/assets/tokens.css';
import SidePanel from './SidePanel.svelte';

mount(SidePanel, { target: document.getElementById('app')! });
