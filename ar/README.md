# Bitcoin Pizza Blastoff AR

Static WebAR prototype for the hot-air food truck model.

Public URL after GitHub Pages deploy:

`https://c-r-x-s-s.github.io/Bitcoin-Pizza-Blastoff/ar/`

## What it does

- Opens from a normal HTTPS URL, so it can sit behind a QR code.
- Uses the 8th Wall engine binary from `@8thwall/engine-binary`.
- Loads `assets/hot_air_food_truck_ar.glb`.
- Places the model about 3.05 meters, roughly 10 feet, above the viewer with a small forward offset.
- Adds a slow float and spin so the truck reads as suspended in the sky.

## Local preview

Desktop preview can only verify that the page and assets load. Actual AR camera tracking must be tested on a phone over HTTPS.

```powershell
cd "C:\Users\cross\Documents\Codex\2026-05-17\clean-up-this-image-so-that\ar-experience"
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Phone test

Phone camera access requires HTTPS unless you are on localhost. Deploy this folder to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static HTTPS host.

Then create a QR code pointing to the deployed URL.

## Best deployment target

For lowest friction at an event, use Netlify Drop or Cloudflare Pages:

1. Upload the entire `ar-experience` folder.
2. Open the deployed HTTPS URL on iPhone Safari and Android Chrome.
3. Generate the QR from that final URL.
4. Print the QR with short text: `Scan, allow camera, point at the sky.`

## Important notes

- The 8th Wall engine binary is included from the public npm CDN. For production, pin or self-host `@8thwall/engine-binary` assets under `external/xr/`.
- Sky has fewer trackable visual features than ground or walls. This build uses world tracking plus a fixed overhead placement. If tracking feels unstable in a real venue, the next iteration should add a one-tap calibration: scan the ground first, then lift the model overhead.
