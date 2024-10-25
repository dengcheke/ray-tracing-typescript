import { Camera, renderPixel } from "./camera";
import { HittableList, Sphere } from "./object";
import { Color, Vector3 } from "./vec3";

const world = new HittableList();
world.add(new Sphere(new Vector3(0, 0, -1), 0.5));
world.add(new Sphere(new Vector3(0, -100.5, -1), 100));


const camera = new Camera({
    aspect_ratio: 16 / 9,
    image_width: 400,
    center: new Vector3(0, 0, 0),
    focal_length: 1,
    samples_per_pixel: 10,
});

const { image_height, image_width } = camera;
/////
const canvas = document.createElement('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = image_width;
canvas.height = image_height;
const imagedata = ctx.createImageData(canvas.width, canvas.height);
const arraybuffer = imagedata.data;


let x = 0, y = 0;
let timer = requestAnimationFrame(function loop() {
    const start = performance.now();
    while (true) {
        const pixel_color = renderPixel(camera, world, x, y);
        writePixel(x, y, pixel_color);
        x++;
        if (x === image_width) {
            x = 0;
            y += 1;
        }
        if (y === image_height) break;
        if (performance.now() - start > 15) break;
    }
    ctx.putImageData(imagedata, 0, 0);
    if (y === image_height) return;
    timer = requestAnimationFrame(loop);
});

function writePixel(x: number, y: number, color: Color) {
    const index = (x + y * image_width) * 4;
    arraybuffer[index] = color.r * 255 >> 0;
    arraybuffer[index + 1] = color.g * 255 >> 0;
    arraybuffer[index + 2] = color.b * 255 >> 0;
    arraybuffer[index + 3] = 255;
}

ctx.putImageData(imagedata, 0, 0);
