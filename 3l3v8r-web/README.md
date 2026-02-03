# 3L3V8R Web App

A web version of the 3L3V8R dual-channel audio mixer, built with React + Vite.

## Features

- YouTube video player with search
- Browser-based transcript extraction (works better than mobile!)
- Dual-channel audio mixing
- Local MP3 playback
- Session notes with AI expansion
- Teenage Engineering-inspired UI
- Mode-based color themes (FOCUS, STUDY, CHILL, FLOW, DEEP)

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in this directory
3. Follow the prompts

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up / Log in with GitHub, Google, or email
3. Click "Add New..." → "Project"
4. Import this repository or upload the folder
5. Vercel auto-detects Vite - just click Deploy!

### Option 3: Drag & Drop

1. Run `bun run build` locally
2. Go to [vercel.com](https://vercel.com)
3. Drag the `dist` folder directly onto the dashboard

## Embedding in Shopify

Once deployed, you'll get a URL like `https://3l3v8r.vercel.app`

Add this to your Shopify page (in the HTML/Liquid editor):

```html
<div style="width: 100%; max-width: 800px; margin: 0 auto;">
  <iframe
    src="https://YOUR-APP-URL.vercel.app"
    width="100%"
    height="900px"
    frameborder="0"
    allow="autoplay; clipboard-write"
    style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
  </iframe>
</div>
```

## Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Tech Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- Zustand (state management)
- react-youtube (YouTube player)
- lucide-react (icons)

## Project Structure

```
src/
├── components/     # UI components
│   ├── ChannelA.tsx       # YouTube player
│   ├── ChannelB.tsx       # Music player
│   ├── MixerPanel.tsx     # Volume controls
│   ├── Header.tsx         # App header
│   ├── NotesModal.tsx     # Notes feature
│   ├── TranscriptModal.tsx # Transcript viewer
│   └── SettingsModal.tsx  # Settings
├── state/          # Zustand store
├── api/            # API functions
└── App.tsx         # Main app
```
