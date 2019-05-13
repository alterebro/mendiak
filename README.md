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
$ parcel build src/index.html --no-source-maps && cp src/_redirects dist/
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
