GXA CRICKET CHALLENGE — ONLINE PREVIEW
=====================================

This is an OPTIONAL CDN-based static preview, NOT the production portal submission package.

TO TRY ON HOSTINGER:
1. Back up existing website files.
2. Create public_html/games/cricket-preview/ (do not replace the main website index.html).
3. Upload all three files (index.html, App.mjs, main.mjs) into that folder.
4. Open https://YOURDOMAIN/games/cricket-preview/ using an Internet-connected browser.

OR RUN ON YOUR COMPUTER:
1. In the extracted preview folder run: python -m http.server 8000
2. Open http://localhost:8000/ in Chrome.
3. A direct file:// double-click may fail because ES modules require a web server.

IMPORTANT:
- React, Three.js, Lucide icons, and Tailwind styles are downloaded from public CDNs at runtime.
- Needs unrestricted HTTPS access to esm.sh and cdn.tailwindcss.com.
- Tailwind Play CDN is not a production CSS build. CDN failures can leave the screen blank.
- This preview could not be browser-tested in the offline build environment.
- No real ads have been connected. The reward button is intentionally disabled.
- For standalone, portal-compatible production assets, use the Vite SOURCE ZIP and run npm install / npm run build on your Windows PC.
