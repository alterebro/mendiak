import tinycolor from 'tinycolor2';
import SVG from 'svgjs';
import perlinNoise3d from 'perlin-noise-3d';

const config = {
    output: 'mendiak',
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

const draw = SVG(config.output).size(config.width, config.height);
      draw.viewbox({ x: 0, y: 0, width: config.width, height: config.height });


// -----------------------

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


// -----------------------

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
        Mendiak.UI.createBackground();

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
        Mendiak.UI.createForeground();
    },

    update : function(baseColor) {
        app.color = colorPalette(baseColor);
        Mendiak.UI.createBackground();

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

    },

    UI : {

        createBackground : function() {
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
        },

        createForeground : function() {


            let vignette = { size : Math.max(config.width, config.height) }
                vignette.offset = {
                    x : Math.round((config.width - vignette.size) / 2),
                    y : Math.round((config.height - vignette.size) / 2)
                }
            draw.rect(vignette.size, vignette.size).x(vignette.offset.x).y(vignette.offset.y).fill(draw.gradient('radial', function(stop) {

                stop.at({ offset: 0, color: '#000', opacity: 0 })
                stop.at({ offset: .5, color: '#000', opacity: 0 })
                stop.at({ offset: 1, color: '#000', opacity: .25 })

            }).from(.5, .5).to(.5, .5).radius(.75) );


            let pattern = draw.pattern(48, 48, function(add) {

                add.image("data:image/png;base64,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", 48, 48);

            });
            draw.rect(config.width, config.height).fill(pattern).opacity(.15);

        },

        saveImage : function() {

            let _trigger = document.createElement('a');
                _trigger.id = 'mendiak-image-trigger';
                _trigger.target = '_blank';

            let _svg = "data:image/svg+xml;base64," + btoa(draw.node.outerHTML);

            let _canvas = document.createElement("canvas");
        		_canvas.width = config.width*2;
        		_canvas.height = config.height*2;
        	let _ctx = _canvas.getContext("2d");

            let img = document.createElement("img");
        		img.setAttribute("src", _svg);
                img.addEventListener('load', function() {

                    _ctx.drawImage(img, 0, 0, config.width*2, config.height*2);

                    _trigger.href = _canvas.toDataURL("image/jpeg");
                    _trigger.addEventListener('click', function() {
                        this.download = 'mendiak.moro.es.jpg';
                    }, false);
                    _trigger.click();

                });
        },

        isVisible : true,
        show : function() {
            Array.from(document.querySelectorAll("section header, section footer")).forEach(el => {
                el.classList.remove('hidden');
            })
            Mendiak.UI.isVisible = true;
        },
        hide : function() {

            Array.from(document.querySelectorAll("section header, section footer")).forEach(el => {
                el.classList.add('hidden');
            })
            Mendiak.UI.isVisible = false;
        }
    }
}


// -----------------------
class rotatingText {

    constructor(host, guests, delay = 3000) {
        this.host = document.querySelector(host);
        this.guests = Array.from(guests);
        this.delay = delay;
        this.timeout = null;
        this.rotation = true;
        this.current = 0;
        this.next = 1;
        if (this.guests.length > 1) { this.init() }
    }

    init() {
        this.host.innerHTML = '';
        this.guests.forEach((el, i) => {
            el.classList.add( (i == 0) ? 'rotating-text-guest' : 'rotating-text-guest-hidden' )
            this.host.appendChild(el);
        });
        this.play();
    }

    play() {
        if ( this.rotation ) {
            let _self = this;
            window.clearTimeout(this.timeout);
            this.timeout = window.setTimeout(function() { _self.rotate() }, this.delay);
        }
    }

    stop() {
        this.rotation = false
        window.clearTimeout(this.timeout);
    }

    restart() {
        this.rotation = true;
        this.play();
    }

    rotate() {
        this.guests[this.current].classList.add('rotating-text-guest-hidden');
        this.guests[this.next].classList.remove('rotating-text-guest-hidden');
        this.guests[this.next].classList.add('rotating-text-guest');
        this.current = this.next;
        this.next = (this.current+1 >= this.guests.length) ? 0 : this.current+1;
        this.play();
    }
}



// -----------------------
window.addEventListener('load', () => {

    // Init
    Mendiak.init();
    Mendiak.UI.hide();

    // Smooth entry / Start after 500ms
    window.setTimeout(() => {
        Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] )
        document.body.classList.add('ready');

    }, 500);

    // Follow up... after 1000ms
    window.setTimeout(() => {

        Mendiak.UI.show();

        // Stop this with rotatingHeader.stop();
        app.rotatingHeader = new rotatingText('header h1', document.querySelectorAll('header h1 span[lang]'), 3500);

    }, 1200);


    // Buttons action
    document.getElementById('update').addEventListener('click', (e) => {
        e.preventDefault();
        Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] );
    });
    document.getElementById('update').addEventListener('mouseout', (e) => { e.target.blur() });

    document.getElementById('save').addEventListener('click', (e) => {
        e.preventDefault();
        Mendiak.UI.saveImage();
    });
    document.getElementById('save').addEventListener('mouseout', (e) => { e.target.blur() });

    // Keyboard action
    document.addEventListener('keyup', e => {

        switch (e.keyCode) {

            // Enter key
            case 13:
                Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] );
                break;

            // Delete Key
            case 8:
                if ( Mendiak.UI.isVisible ) {
                    Mendiak.UI.hide();
                    app.rotatingHeader.stop();
                } else {
                    Mendiak.UI.show();
                    app.rotatingHeader.restart();
                }
                break;

            default: break;
        }
	});
});




// ...
