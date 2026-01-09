// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.strata-lang.dev',
	integrations: [
		starlight({
			title: 'Strata Documentation',
			logo: {
				src: './public/strata-logo.svg',
				alt: 'Strata Logo',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/VSS-CO/Strata' },
			],
			editLink: {
				baseUrl: 'https://github.com/VSS-CO/Strata/tree/main/web/docs/src/content/docs/',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Language Guide',
					items: [
						{ label: 'Variables & Types', slug: 'guide/variables-and-types' },
						{ label: 'Functions', slug: 'guide/functions' },
						{ label: 'Control Flow', slug: 'guide/control-flow' },
						{ label: 'Type System', slug: 'guide/type-system' },
					],
				},
				{
					label: 'API Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Examples',
					autogenerate: { directory: 'examples' },
				},
			],
		}),
	],
});
