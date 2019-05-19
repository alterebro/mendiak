# ⛰️ mendiak &rsaquo; [mendiak.moro.es](https://mendiak.moro.es)

> **Basque Mountains Generator / Generador de Montañas Vascas / Euskal Herriko Mendiak Sortzailea**.
> SVG, JavaScript and Perlin Noise generation of Basque Mountains Landscape Wallpaper Images.
> Built using: [Parcel](https://parceljs.org/), [SVG,js](https://svgjs.com/), [TinyColor](https://github.com/bgrins/TinyColor) + [Perlin Noise](https://www.npmjs.com/package/perlin-noise-3d).

[![mendiak](src/static/mendiak.jpg)](https://mendiak.moro.es)

---

## Development

```sh
$ npm run dev
# or =
$ parcel src/index.html
```

## Build

```sh
$ npm run build
# or =
$ rm -rf dist
$ parcel build src/index.html --no-source-maps && cp -a src/static/. dist/
```

## Serve (/dist files)

```sh
$ npm run serve
# or =
$ npm run build
$ ip=`ipconfig getifaddr en0`; php -S $ip:8000 -t dist/
```

## Deploy (via Netlify)

<mark>No need for this: <em>Auto publishing is on. Deploys from master are published automatically</em>.</mark>

```sh
$ npm run deploy
# or =
$ npm run build && netlify deploy --prod
```
