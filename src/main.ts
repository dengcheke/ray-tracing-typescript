import { Camera, renderPixel } from "./camera";
import { DielectricMaterial, LambertianMaterial, MetalMaterial } from "./material";
import { HittableList, Sphere } from "./object";
import { distance_between, linearToSRGB, random } from "./utils";
import { Color, Vector3 } from "./vec3";

const world = new HittableList();

const mat_ground = new LambertianMaterial(new Color(0.5, 0.5, 0.5));
world.add(new Sphere(new Vector3(0, -1000, 0), 1000, mat_ground));

const p1 = new Vector3(4, 0.2, 0);
for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
        const choose_mat = Math.random();
        const center = new Vector3(
            a + 0.9 * Math.random(),
            0.2,
            b + 0.9 * Math.random()
        );
        if (distance_between(p1, center) > 0.9) {
            if (choose_mat < 0.8) {
                const albedo = new Color().random().multiply(new Color().random());
                const material = new LambertianMaterial(albedo);
                world.add(new Sphere(center, 0.2, material));
            } else if (choose_mat < 0.95) {
                const albedo = new Color().random(0.5, 1);
                const fuzz = random(0, 0.5);
                const material = new MetalMaterial(albedo, fuzz);
                world.add(new Sphere(center, 0.2, material));
            } else {
                //glass
                world.add(new Sphere(center, 0.2, new DielectricMaterial(1.5)));
            }
        }
    }
}

const material1 = new DielectricMaterial(1.5);
world.add(new Sphere(new Vector3(0, 1, 0), 1, material1));

const material2 = new LambertianMaterial(new Color(0.4, 0.2, 0.1));
world.add(new Sphere(new Vector3(-4, 1, 0), 1, material2));

const material3 = new MetalMaterial(new Color(0.7, 0.6, 0.5), 0);
world.add(new Sphere(new Vector3(4, 1, 0), 1, material3));

const camera = new Camera({
    aspect_ratio: 16 / 9,
    image_width: 400,
    samples_per_pixel: 500,
    max_depth: 50,

    vfov: 20,
    lookfrom: new Vector3(13, 2, 3),
    lookat: new Vector3(0, 0, 0),
    vup: new Vector3(0, 1, 0),

    defocus_angle: 0.6,
    focus_dist: 10,
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
