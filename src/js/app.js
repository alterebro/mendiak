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
    height : 600,
    ms : 800 // Transition duration in milliseconds
}

// Create app Object. It gets populated on initialization
const app = {
    color : {},
    background : null,
    hills : []
}

const draw = SVG('mendiak').size(config.width, config.height);
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

        app.background.animate(config.ms, '-', 0).fill(app.color.complementary);
    }
}



class Hill {

    constructor(properties) {

        this.element = false;
        this.mist = false;
        this.mistDensity = false;
        this.properties = properties;
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

    drawMist() {

        let _mist = {
            x : 0,
            y : this.properties.y,
            w : config.width,
            h : config.height - this.properties.y
        }
        let _mistPercentHeight = (this.properties.amplitude * 100) / _mist.h;
            _mistPercentHeight = _mistPercentHeight / 100;

        let _mistGradient = function(stop) {
            stop.at({ offset: 0, color: '#fff', opacity: 0 })
            stop.at({ offset: _mistPercentHeight, color: '#fff', opacity: 1 })
            stop.at({ offset: _mistPercentHeight, color: '#fff', opacity: 1 })
            stop.at({ offset: 1, color: '#fff', opacity: 1 })
        }

        // Create or update if mist element already exists
        if ( !this.mist ) {

            this.mistDensity = draw.gradient('linear', _mistGradient).from(0, 0).to(0, 1);
            this.mist = draw.rect(_mist.w, _mist.h).x(_mist.x).y(_mist.y).fill(this.mistDensity).opacity(this.properties.mist)

        }  else {

            this.mistDensity.update( _mistGradient );
            this.mist.animate(config.ms).y(_mist.y).height(_mist.h);
        }
    }

    drawPath(newProperties = {}) {

        this.properties = Object.assign(this.properties, newProperties);
        const points = this.createPoints();
        const path = this.createPath(points);

        // Create or update if path element already exists
        if (!this.element) {

            this.element = draw.path(path).fill(this.properties.color);

        } else {

            this.element.animate(config.ms, '<>').plot(path).fill(this.properties.color);
        }

        // Render mist SVG element only when value is > 0
        if ( !!this.properties.mist ) { this.drawMist() }
    }
}


// -----------------------
const randomInt = function(min, max) {
	// Returns a random integer between @min and @max (inclusive)
	let _max = parseInt(max);
	let _min = parseInt(min);
	return Math.floor(Math.random() * ((_max - _min) + 1)) + _min;
}

const Mendiak = {

    colors : ['d08635', '5638a4', '626866', '1e6686', '86233d', '4182d9', '3b6e9e', '3669a2', '793961', 'ca78c6', '306dbd', '464d32', 'ab4a5b', '5a28c2', '623373', '9a4743', '64bfbd', '20391b'],

    init : function() {
        app.color = colorPalette('fff');
        createBackground();
        for ( let i = 0; i < app.color.analogous.length; i++ ) {
            let _y = 200 + (i*50);
            let _inc =  (10 - (i*1.2)) / 100;
            let _points = 120 + ((app.color.analogous.length-i) * 5);
            let _amp = 120 - ((app.color.analogous.length-i) * 10);
            let _mist = 1 - (1 / app.color.analogous.length) * (i+1);
                _mist = Math.floor(_mist * 100) / 100;
                _mist = ( (_mist - .1) > 0 ) ? (_mist - .1) : _mist;

            app.hills.push( new Hill({ y: _y, points : _points, amplitude: _amp, increment: _inc, color: app.color.self, mist: _mist }) );
        }
        app.hills.forEach( el => el.drawPath() );
    },

    update : function(baseColor) {
        app.color = colorPalette(baseColor);
        createBackground();

        let _yStart = randomInt(config.height/4, config.height/3);
        let _ySpacing = randomInt(20, 30);
        let _yInc = randomInt(15, 35) / 100;

        app.hills.forEach( (el, i) => {
            let _y = _yStart + ((_ySpacing * i) * (_yInc * i));
            el.drawPath( {y: _y, color: app.color.analogous[i]} )
        });

        // UI Colors
        let root = document.documentElement;
            root.style.setProperty('--color-primary', app.color.self);
            root.style.setProperty('--color-complementary', app.color.complementary);
            root.style.setProperty('--color-dark', app.color.analogous[app.color.analogous.length-2]);
            root.style.setProperty('--color-light', app.color.analogous[1]);

    }
}



window.addEventListener('load', () => {

    // Init
    Mendiak.init();

    // Smooth entry / Start after 500ms
    window.setTimeout(() => {
        Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] )
        document.body.classList.add('ready');
    }, 500);

    // Buttons action
    document.getElementById('update').addEventListener('click', () => {

        Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] );
    });
    document.getElementById('save').addEventListener('click', () => { console.log('save clicked!') });

    // Keyboard action
    document.addEventListener('keyup', e => {

		if ( e.keyCode === 13 ) { // Enter key to update

            Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] );
        }
	})
});














// ...
