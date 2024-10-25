import { HittableList, Sphere } from "./object";
import { Ray } from "./ray";
import { Color, Vector3 } from "./vec3";

const aspect_radio = 16 / 9;
const image_width = 400;
const image_height = image_width / aspect_radio >> 0;

const focal_length = 1;
const viewport_height = 2;
const viewport_width = viewport_height * (image_width / image_height);
const camera_center = new Vector3(0, 0, 0);

const viewport_u = new Vector3(viewport_width, 0, 0);
const viewport_v = new Vector3(0, -viewport_height, 0);
const pixel_delta_u = viewport_u.clone().divideScalar(image_width);
const pixel_delta_v = viewport_v.clone().divideScalar(image_height);

const viewport_upper_left = camera_center.clone()
    .add(new Vector3(0, 0, -focal_length))
    .addScaledVector(viewport_u, -0.5)
    .addScaledVector(viewport_v, -0.5);
const pixel00_loc = viewport_upper_left.clone()
    .addScaledVector(pixel_delta_u, 0.5)
    .addScaledVector(pixel_delta_v, 0.5);

/////
const canvas = document.createElement('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = image_width;
canvas.height = image_height;
const imagedata = ctx.createImageData(canvas.width, canvas.height);
const arraybuffer = imagedata.data;

const c1 = new Color(1, 1, 1);
const c2 = new Color(0.5, 0.7, 1);
const world = new HittableList();
world.add(new Sphere(new Vector3(0, 0, -1), 0.5));
world.add(new Sphere(new Vector3(0, -100.5, -1), 100));
for (let j = 0; j < image_height; j++) {
    for (let i = 0; i < image_width; i++) {
        const pixel_center = pixel00_loc.clone()
            .addScaledVector(pixel_delta_u, i)
            .addScaledVector(pixel_delta_v, j);
        const ray_dir = pixel_center.clone().sub(camera_center);
        const ray = new Ray(camera_center, ray_dir);
        const pixel_color = ray_color(ray, world);
        const index = (j * image_width + i) * 4;
        arraybuffer[index] = pixel_color.r * 255 >> 0;
        arraybuffer[index + 1] = pixel_color.g * 255 >> 0;
        arraybuffer[index + 2] = pixel_color.b * 255 >> 0;
        arraybuffer[index + 3] = 255;
    }
}
ctx.putImageData(imagedata, 0, 0);




function ray_color(ray: Ray, world: HittableList) {
    const hit_record = world.hit(ray, 0, Infinity);
    if (hit_record) {
        return new Color(...hit_record.normal).addScalar(1).multiplyScalar(0.5);
    }
    const a = 0.5 * (ray.norm_dir.y + 1.0);
    return new Color().lerpVectors(c1, c2, a);
}