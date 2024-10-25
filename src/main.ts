import { Camera, renderPixel } from "./camera";
import { DielectricMaterial, LambertianMaterial, MetalMaterial } from "./material";
import { HittableList, Sphere } from "./object";
import { linearToSRGB } from "./utils";
import { Color, Vector3 } from "./vec3";

const world = new HittableList();

const mat_ground = new LambertianMaterial(new Color(0.8, 0.8, 0));
const mat_center = new LambertianMaterial(new Color(0.1, 0.2, 0.5));
const mat_left = new DielectricMaterial(1 / 1.33);
const mat_right = new MetalMaterial(new Color(0.8, 0.6, 0.2), 1.0);

world.add(new Sphere(new Vector3(0, -100.5, -1), 100, mat_ground));
world.add(new Sphere(new Vector3(0, 0, -1.2), 0.5, mat_center));
world.add(new Sphere(new Vector3(-1, 0, -1), 0.5, mat_left));
world.add(new Sphere(new Vector3(1, 0, -1), 0.5, mat_right));


const camera = new Camera({
    aspect_ratio: 16 / 9,
    image_width: 400,
    center: new Vector3(0, 0, 0),
    focal_length: 1,
    samples_per_pixel: 50,
    max_depth: 10
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
        if (performance.now() - start > 10) break;
    }
    ctx.putImageData(imagedata, 0, 0);
    if (y === image_height) return;
    timer = requestAnimationFrame(loop);
});

function writePixel(x: number, y: number, color: Color) {
    const index = (x + y * image_width) * 4;
    arraybuffer[index] = linearToSRGB(color.r) * 255 >> 0;
    arraybuffer[index + 1] = linearToSRGB(color.g) * 255 >> 0;
    arraybuffer[index + 2] = linearToSRGB(color.b) * 255 >> 0;
    arraybuffer[index + 3] = 255;
}

ctx.putImageData(imagedata, 0, 0);
