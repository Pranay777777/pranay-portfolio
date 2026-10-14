# Pranay Yadagiri — Portfolio

Personal portfolio of **Pranay Yadagiri**, Data Engineer & AI Enthusiast. A cinematic, full-screen scrolling experience built with Next.js 16, GSAP, Three.js and CSS Modules.

## Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Framework  | Next.js 16.2 (App Router, React Compiler)      |
| Animations | GSAP 3 + Three.js                              |
| Styling    | CSS Modules + Tailwind v4 (tokens only)        |
| Icons      | react-icons                                    |
| Fonts      | Geist, Baloo 2, Dancing Script (via next/font) |
| Resume     | jsPDF (generated in the browser)               |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

## Editing content

- `data/profile.json` — name, bio, roles, stats, skills, experience, projects, publications, socials, education and the data used for the downloadable CV.
- `data/content.json` — site copy that isn't personal data (taglines, pills, footer CTA).
- `app/globals.css` — colour and type tokens under `:root`.
- `public/assets/` — photos, intro video and project images.
- `assets/og-photo.jpg` — photo used in the social-share preview image.

## Deployment

Deploys on [Vercel](https://vercel.com) with zero configuration; the site URL used for SEO and share previews is detected automatically. For a custom domain, set `NEXT_PUBLIC_SITE_URL` (e.g. `https://example.com`) in the project's environment variables.

## Contact

[GitHub](https://github.com/Pranay777777) · [LinkedIn](https://www.linkedin.com/in/pranay-yadagiri-90bb60362) · [Email](mailto:pranayyadagiri04@gmail.com)
