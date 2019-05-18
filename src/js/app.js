import tinycolor from 'tinycolor2';
import SVG from 'svgjs';
import filter from 'svg.filter.js';
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

            let pattern = draw.pattern(48, 48, function(add) {

                add.image("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADNElEQVRoQ+2ZIWwqQRCG71QxRYECRZMJqKLAgAIFCgwoUK0BBQoUqihQYEBR1ZqiWgUKDChQkJcUVRSoYqji5a36ks0lz11JtqKZbHb3tplv/39ma69WK4lGo38sy7J8Pp8cj0cV39zcyM/Pj4pTqZRMp1MVNxoNabfbKv78/JS7uzsVTyYTSafTKt5sNhKJRLS17+/vks1m1XgsFpPlcqnih4cHGQ6HKr6/v5f1eq3icDgs2+1WG7csSyzLUuP2v1/X/HP9fwBT9vb2Jvl8XkOI2HQ6HanX62pOLpeT8Xis4kqlIv1+X8OJ41xbKBTk9fVVQ4Xfenl5kWKxqM3hOa8/A9fMv7rEVJjv72/xer3arafafH19STAY1BSGykC1ISqMD4eD+P1+tQ/Renp6kmazqcZns5kkk0ntW4vFQuLxuFGhX0GfTSPjredN55xQKCS73U4zrEQiIfP5XFMnIkdFulwuYtu2mk/kaKY0OO5zPp/F4/EYhH4HQplMRj4+PrRUUpFY21Albm9v5XQ6qbWj0UjK5bJmZL1eT6rVqmZ2nM/YaT5rJ6qiMTK3ObKpKqVSSZ6fn1W6iRYViabDkpuqQlMjilQh1lE0JtZmTtgQOYOQ6wgx9UyNU2fE+qRWq0m329XMi/UVY6oZ1YaoENHBYCCPj4/a/kTXIOQ6QlQAIkGcWHsQiVarJa1WS1MtqpkTcoFAQPb7vVrLOofYEGNiYzoyt7Hh9+3/qW1oQHyr4VqWwTQyKgxNk6hQCYkTEeL+PINRIbdxsqkkjHnrqUjEiUrCjowqxHQ7qQ3Ni3tSFVm6E0WDkOsIMWXsdPjEx9KXr9A0NaabCkP1cCrLiSjfi/iYwPMQJ4OQ6wixrKUxsSMjBkSOqsVxKg8x47sTMaCR8S2INRhVkecxCLmOEFPDBpzKQDWgShAbp1qFpsO1RIVo0dQYU8GIvUHIdYRoTEwxFYnNOOsZp2dJpptKQoPjHJoUkWbM81DZDEKuI8TuiWllJ0VjInJ8EGBMlWBT71R+U+WoPFRCqhbPYBByHSGW0LzdTBNjqgrViannPvz/F7s5dm3s5qg2XMtzEieDkNsI/QWIT/FeU6PInQAAAABJRU5ErkJggg==", 48, 48);

                add.image("data:image/png;base64,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", 48, 48);

            });
            draw.rect(config.width, config.height).fill(pattern).opacity(.25);

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

            // let fg = draw.rect(config.width, config.height).fill('black').opacity(.25);
            //     fg.filter(function(add) {
            //         add.turbulence(.7, 10, 0, 'stitch', 'fractalNoise').colorMatrix('saturate', 0);
            //         add.turbulence(3, 1, 0, 'noStitch', 'fractalNoise');
            //     });
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
