# MSS-NK

A private management website for the Director of Mahi Solar Solution. It contains:

- the 45 points, with a status, owner and note for each
- the issues and pending-work list (point 40)
- departments and the people register
- the sheets and data register
- the operating rhythm
- the R1–R15 recommendations

## How the password works

- The plan content comes from `../docs/DIRECTOR_COMPANY_IMPROVEMENT_PLAN.md`.
- At build time it is **encrypted with the portal password**, using PBKDF2 and AES-GCM, into `public/plan.enc.json`.
- The site contains no readable plan text and no password. The plan can only be decrypted with the right password.
- After a successful login, the password is saved in `localStorage`, so you stay logged in on that browser.
- **Lock** clears the saved password.
- Use an HTTPS host or `localhost`, because browsers only allow WebCrypto in a secure context.

The password is set in `.env.local`. This file is not committed.

```
DIRECTOR_PASSWORD=<your-password>
```

**To change the password:** edit `.env.local`, then rebuild and redeploy. Everyone who had the old password saved will be logged out.

## Where your entries are stored

Statuses, pending items, people and sheets are stored in **this browser's localStorage**. They are not on a server, so they are not shared between devices.

- Use **Backup** to download a JSON copy of everything you entered.
- Use **Restore** on another device, or after clearing the browser, to load that copy.
- The saved data is not encrypted on the device.

## Commands

```bash
npm install
npm run dev       # http://localhost:5180 (regenerates the encrypted plan first)
npm run build     # outputs the static site to dist/
npm run content   # re-encrypt only, after editing the plan .md
```

When you edit the plan markdown, run `npm run content` locally and **commit `public/plan.enc.json`**. Hosts like Vercel do not have the plan markdown or the password, so they build from that committed encrypted file. Don't set `DIRECTOR_PASSWORD` on the host.

When you edit the plan markdown, run the build again. The site reads the plan's headings, numbered points and tables, so keep the existing format.

## Deploying

`dist/` is a plain static site. It can go on any HTTPS static host, for example Netlify, Vercel, Cloudflare Pages or S3 with CloudFront. Keep this repository **private**, because it links to the plan source.
