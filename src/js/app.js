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
    background : null, // It gets created later
    hills : [] // Will get populated later
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



class Hill {

    constructor(properties) {

        this.element = false;
        this.properties = properties;

        console.log('hi from the constructor');
        console.log('element:', this.element);
    }

    createPoints() {

        const _points = [];
        let _hSpacing = config.width / this.properties.points;
        let _halfAmplitude = Math.round(this.properties.amplitude / 2);
        let _noise = new perlinNoise3d();
        let _noiseStep = 0;

        for (let i=0; i<=this.properties.points; i++) {

            let _x = Math.round(_hSpacing * i);
            let _y = this.properties.y + (parseInt((_noise.get(_noiseStep) * this.properties.amplitude) - _halfAmplitude));
                _noiseStep += this.properties.increment;

            _points.push({x:_x, y:_y});
        }
        _points.push({ x: config.width, y: config.height });
        _points.push({ x: 0, y: config.height });

        return _points;
    }

    createPath(points) {

        const _d = points.map( (el, i) => (i==0) ? `M ${el.x} ${el.y}` : `L ${el.x} ${el.y}` );
        return `${_d.join(' ')} Z`;
    }

    drawPath(newProperties = {}) {

        this.properties = Object.assign(this.properties, newProperties);

        const points = this.createPoints();
        const path = this.createPath(points);

        if (!this.element) {

            this.element = draw.path(path).fill(this.properties.color).opacity(.5);

        } else {

            this.element.animate(500).plot(path).fill(this.properties.color);
        }

    }


}



// -----------------------

window.addEventListener('load', () => {

    // Init
    createBackground();
    let hill = new Hill({ y: 200, points : 100, amplitude: 50, increment: .1, color: app.color.self, mist: .35 });
        hill.drawPath();


    // Smooth entry
    window.setTimeout(() => {
        app.color = colorPalette('20391b');
        createBackground();
        hill.drawPath( {color: app.color.self} );

    }, 500);


    // Button action
    document.getElementById('color').addEventListener('click', () => {

        const _colours = ['#d08635','#5638a4','#626866','#1e6686','#86233d','#4182d9','#3b6e9e','#3669a2'];
        const _colour = _colours[Math.floor(Math.random() * _colours.length)];
        // const _colour = tinycolor.random().toHexString();

        app.color = colorPalette(_colour);
        createBackground();
        hill.drawPath( {color: app.color.self} );
    });
});














// ...
