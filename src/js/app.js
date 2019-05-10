import tinycolor from 'tinycolor2';
import SVG from 'svgjs';
import perlinNoise3d from 'perlin-noise-3d';

const color = tinycolor('70693b');
const draw = SVG('app').size(640, 480);
      draw.viewbox({ x: 0, y: 0, width: 640, height: 480 })
const bg = draw.rect(640, 480).fill( color.toHexString() );
const noise = new perlinNoise3d();
  let noiseStep = 0;

for(let x = 0; x < 50; x++ ) {
	let y = noise.get(noiseStep) * 480;
    draw.circle(5).cx( Math.round((640/50)*x) ).cy( Math.floor(y) ).fill('#fff');
	noiseStep += 0.05;
}
