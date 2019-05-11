import tinycolor from 'tinycolor2';
import SVG from 'svgjs';
import perlinNoise3d from 'perlin-noise-3d';

function colorPalette(color) {
    // Creates a new colour palette ( 6 analogous and complementary )
    // Input : a colour string
    // Retuns : Object { self, analogous, complementary }
    // i.e: let _colour = colorPalette('234');

    const _default = '#30609f';
    const self = (tinycolor(color).isValid())
        ? tinycolor(color).toHexString()
        : _default;

    const analogous = (function() {
        let _analogous = tinycolor(self).analogous(7, 30);
            _analogous.shift();
            _analogous = _analogous.map((c) => c.toHex() );

        // Make them always go Light to Dark
        if ( tinycolor(_analogous[_analogous.length-1]).getLuminance() > tinycolor(_analogous[0]).getLuminance() ) {
            _analogous.reverse();
        }

        // Darken the darks and Lighten the lights
        _analogous = _analogous.map((el, i, arr) => {

            let _i = ((i+1) - (arr.length/2)) * 15; // let _i = (i - (arr.length/2)) * 15;
            let _elem = tinycolor(el);
            let _el = _elem;

                if ( _i < 0 ) { _el = _elem.lighten( Math.abs(_i) ) }
                if ( _i > 0 ) { _el = _elem.darken( Math.abs(_i) ) }

            return _el.desaturate(30).toHexString();
        });
        return _analogous
    })();

    const complementary = tinycolor(self).complement().brighten(40).desaturate(40).toHexString();

    return { self, analogous, complementary }
}


const config = {
    width : 920,
    height : 600
}

const app = {
    color : colorPalette('fff'),
    background : null
}

const draw = SVG('app').size(config.width, config.height);
      draw.viewbox({ x: 0, y: 0, width: config.width, height: config.height });

function createBackground() {
    // Creates the background in case it doesn't exists
    // Otherwise, updates its colour

    if (!app.background) {

        // Solid Background
        app.background = draw.rect(config.width, config.height).fill(app.color.complementary);

        // Foggy floor
        draw.rect(config.width, config.height).fill(draw.gradient('linear', function(stop) {

            stop.at({ offset: 0, color: '#fff', opacity: 0 })
            stop.at({ offset: .65, color: '#fff', opacity: .8 })
            stop.at({ offset: 1, color: '#fff', opacity: .8 })

        }).from(0, 0).to(0, 1));

        // Sunlight
        const sun = { size : Math.min(config.width, config.height) }
              sun.offset = {
                x : Math.round((config.width - sun.size) / 2),
                y : Math.round((config.height - sun.size) / 2)
              }
        draw.rect(sun.size, sun.size).x(sun.offset.x).y(sun.offset.y).fill(draw.gradient('radial', function(stop) {

            stop.at({ offset: 0, color: '#fff', opacity: .5 })
            stop.at({ offset: 1, color: '#fff', opacity: 0 })

        }).from(.5, .5).to(.5, .5).radius(.45) );

    } else {

        app.background.animate(500, '-', 0).fill(app.color.complementary);
    }
}

// -----------------------

window.addEventListener('load', () => {

    // Init
    createBackground();

    // Smooth entry
    window.setTimeout(() => {
        app.color = colorPalette('20391b');
        createBackground();
    }, 500);

    // Button action
    document.getElementById('bg').addEventListener('click', () => {
        app.color = colorPalette(tinycolor.random().toHexString());
        createBackground();
    });
});














// ...
