# GitHub Pages deployment

The static user interface is stored at repository root as `index.html`, `style.css`, and `app.js`. It has no build dependencies.

1. Go to **GitHub → SensorBridge-Emulator → Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/(root)`, then save.
4. Wait for GitHub Pages to publish the site.
5. Open **https://vadergit.github.io/SensorBridge-Emulator/**.

For Web Bluetooth, use supported desktop Chrome/Edge with HTTPS, or `http://localhost` when developing locally. The first firmware prototype is BLE-only; the live bridge hardware does not yet exist as a validated design.

## GitHub Pages caveat

Publishing the repository does not automatically mean GitHub Pages is enabled. The URL only works once deployment is configured and complete.
