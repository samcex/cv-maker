# CV Maker

A beautiful, fast, and fully client-side web app for creating professional resumes / CVs.

Built with React + TypeScript + Vite + Tailwind.

## Features

- **Live preview** — See your CV update instantly as you type
- **Photo upload** — Add a professional headshot (stored locally as base64). Appears nicely in all templates.
- **6 professional templates**:
  - Professional
  - Minimal
  - Modern
  - Classic (centered traditional)
  - Sidebar (popular two-column layout)
  - Compact (dense one-page friendly)
- **Custom accent colors**
- **Rich sections**:
  - Personal info + summary + photo
  - Work experience with multiple bullet points
  - Education
  - Skills (tag input)
  - Projects
- **Powerful export**
  - High-quality **PDF** export (A4, print-ready via canvas)
  - **DOCX** (Word) export — fully editable document
  - Browser Print (optimized)
  - Export / import JSON
- **Autosave** to localStorage
- **Mobile friendly** — Editor / Preview tabs on small screens
- Everything stays in your browser. No accounts or uploads.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- jsPDF + html2canvas (PDF generation)
- Sonner (toasts)
- Lucide icons
- Framer Motion (available for future polish)
- date-fns

## Keyboard / UX Notes

- Press Enter in the skills input to quickly add a skill
- Dates use native month pickers (YYYY-MM)
- Use the "Present" checkbox for current roles
- Everything auto-saves

## Links

- **Live Demo**: https://cv-maker-eta-lake.vercel.app
- **GitHub**: https://github.com/samcex/cv-maker
- **Vercel Project**: https://vercel.com/samirs-projects-9699f0cc/cv-maker

## Deploy to Vercel (via Git)

This repo is already set up for Vercel.

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the GitHub repo `samcex/cv-maker`
3. Vercel will auto-detect Vite and deploy.

Every push to `main` will trigger a new production deployment. Pull requests will get preview deployments.

You'll get:
- Instant production URL (e.g. `cv-maker.vercel.app`)
- Preview URLs for every push
- Custom domains for free

### Alternative: Direct CLI deploy

If you have a Vercel Personal Access Token:

```bash
# On your machine or here
VERCEL_TOKEN=your_token_here vercel --prod --yes --name cv-maker
```

I can run the direct deploy for you from this environment if you paste a token.

## Future ideas / Roadmap

- Drag & drop reordering of sections & entries
- More templates + custom fonts
- Optional photo / headshot
- Multi-language support
- One-click tailoring from job description (AI)

## License

MIT

