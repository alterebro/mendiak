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


            let pattern = draw.pattern(24, 24, function(add) {

                add.image("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADTElEQVRoQ+1ZXyjzYRT+FtmVIqJERC4UkZWmSVGKSHlyITW5UESW5UpZraxciciaciFKLjQl2kpRIksRUS5ENCmiKVc09d1837l46k1fW37fW7/drKfz/tvOc8553vNaMjIy8Pb2Fvz15zM2NobJyUnBHx8fsFqtgl9eXpCdnS04FAqhpaVF8NXVFcrKygQPDw9jbm5OsNPpxMrKiuDe3l4sLS0JjkajKCgoENzX14fFxUXBnZ2dWF9fF2z5e3Bdv80fYLTnLPPz8xgaGlJybGJiAh6PR+zl5eW4vLwUXF1djdPTU8GBQAADAwOC39/fkZ6erowp5vz09DTcbreM5/NxzJoUMpxCRh8g0f0tsVgMmZmZwrmtrS20tbUJXltbQ1dXl+CbmxuUlJQIbm1txfb2tmCv1wuv16vkfDweR2pqqtj7+/uxsLAgeHZ2Fi6XSzDH4OPjI/Ly8sw6kKjnkzZf/yzkcDhweHio1DIXFxeoqKhQ5mXWNqyNBgcH4ff7Zf74+Dh8Pp/g/Px8PDw8KGNoZ2cHTU1NYk9JScHX15cZA0njcKIL6R8DrFW6u7uxuroqHCssLMT9/b1g1ionJyew2WxK/c7zOzo6sLGxIeNzcnLw/PysxFwHuA7p74FEOWj0fP098PT0hNzcXCXHOe+2t7djc3NTxnMMBINBABC73W5HJBIRzHdu1jasvTgmuS7o7wGjOZzo/vp7gO+crF1Y2xQXF+P29lY4nZWVhdfXV8GlpaW4vr5W3he4z8R9o4aGBuzt7cl85jzXLf09kCgHjZ6vvwe4lzk6OoqpqSmlPmeOMuYY+e4+sLu7i8bGRuWd+OzsDFVVVWI3e6NGc5731z8GWF9zXua8zXdk1jYcA1xHOK83NzcjHA4Lxzmm0tLS8Pn5KXazDpgxkOR/wHJwcIC6ujrhGL+BMWeZk6yleD3uG3HM1dfXY39/X/bn+wb3rXg9/bNQkj3648vp7wHuu3B/n7URvx9wX6eyshLn5+fCaa4LR0dHqK2tFfvd3R2KiooEM+e5TphvZD9O8m821D8GWMtwHmctxG9YIyMjmJmZEQ5zX4h7o8fHx6ipqZHxrL2Wl5fR09OjrAtcN/T3wP/G6X89j/Ye+A06mEBPA04cLwAAAABJRU5ErkJggg==", 24, 24);

            });
            draw.rect(config.width, config.height).fill(pattern).opacity(.25);

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

    // Image Action
    document.getElementById('mendiak').addEventListener('dblclick', () => {

        Mendiak.update( Mendiak.colors[Math.floor(Math.random() * Mendiak.colors.length)] );
    });

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
