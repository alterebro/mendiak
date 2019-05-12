# mendiak

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
$ parcel build src/index.html --no-source-maps
```

## Serve (/dist files)

```sh
$ npm run serve
# or =
$ npm run build
$ ip=`ipconfig getifaddr en0`; php -S $ip:8000 -t dist/
```

## Deploy (via Netlify)

```sh
$ npm run deploy
# or =
$ npm run build && netlify deploy --prod
```
