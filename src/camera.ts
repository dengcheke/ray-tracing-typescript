import { HittableList } from "./object";
import { Ray } from "./ray";
import { deg_to_rad, Interval } from "./utils";
import { Color, Vector3 } from "./vec3";


export class Camera {
    aspect_ratio: number;
    image_width: number;
    image_height: number;
    center: Vector3;
    lookfrom: Vector3;
    lookat: Vector3;
    vup: Vector3;
    //
    samples_per_pixel: number; //Count of random samples for each pixel
    max_depth: number; //Maximum number of ray bounces into scene
    //
    pixel_delta_u: Vector3;
    pixel_delta_v: Vector3;
    pixel00_loc: Vector3;

    constructor(opts: {
        aspect_ratio: number,
        image_width: number,
        samples_per_pixel: number,
        max_depth: number,
        vfov: number,
        lookfrom: Vector3,
        lookat: Vector3,
        vup: Vector3
    }) {
        const {
            aspect_ratio, image_width, samples_per_pixel,
            max_depth, vfov, lookfrom, lookat, vup
        } = opts;
        //
        this.samples_per_pixel = samples_per_pixel;
        this.max_depth = max_depth;
        //
        this.aspect_ratio = aspect_ratio;
        this.image_width = image_width;
        this.image_height = image_width / aspect_ratio >> 0;
        this.lookfrom = lookfrom;
        this.lookat = lookat;
        this.vup = vup;
        this.center = lookfrom;

        const focal_length = lookfrom.clone().sub(lookat).length();
        debugger
        const h = Math.tan(deg_to_rad(vfov) / 2);
        const viewport_height = 2 * h * focal_length;
        const viewport_width = viewport_height * image_width / this.image_height;

        //
        const w = lookfrom.clone().sub(lookat).normalize();
        const u = vup.clone().cross(w).normalize();
        const v = w.clone().cross(u);

        const viewport_u = u.clone().multiplyScalar(viewport_width);
        const viewport_v = v.clone().multiplyScalar(-viewport_height);

        this.pixel_delta_u = viewport_u.clone().divideScalar(image_width);
        this.pixel_delta_v = viewport_v.clone().divideScalar(this.image_height);

        this.pixel00_loc = this.center.clone()
            .addScaledVector(w, -focal_length)
            .addScaledVector(viewport_u, -0.5)
            .addScaledVector(viewport_v, -0.5)
            .addScaledVector(this.pixel_delta_u, 0.5)
            .addScaledVector(this.pixel_delta_v, 0.5);
        debugger
    }
}

const c1 = new Color(1, 1, 1);
const c2 = new Color(0.5, 0.7, 1);

function rayColor(ray: Ray, depth: number, world: HittableList): Color {
    if (depth <= 0) return new Color(0, 0, 0);
    const hit_record = world.hit(ray, new Interval(0.001, Infinity));
    if (hit_record) {
        const scattered = hit_record.mat.scatter(ray, hit_record);
        if (scattered) {
            return rayColor(scattered.ray_scatter, depth - 1, world)
                .multiply(scattered.attenuation);
        }
        return new Color(0, 0, 0);
    }
    const a = 0.5 * (ray.norm_dir.y + 1.0);
    return new Color().lerpVectors(c1, c2, a);
}


export function renderPixel(camera: Camera, scene: HittableList, pixel_x: number, pixel_y: number) {
    const { max_depth, pixel00_loc, pixel_delta_u, pixel_delta_v, center, samples_per_pixel } = camera;
    const total_color = new Color(0, 0, 0);
    for (let i = 0; i < samples_per_pixel; i++) {
        const offset_x = Math.random() - 0.5;
        const offset_y = Math.random() - 0.5;
        const pixel_sample = pixel00_loc.clone()
            .addScaledVector(pixel_delta_u, pixel_x + offset_x)
            .addScaledVector(pixel_delta_v, pixel_y + offset_y);
        const ray_dir = pixel_sample.sub(center);
        const sample_color = rayColor(
            new Ray(center, ray_dir),
            max_depth,
            scene
        );
        total_color.add(sample_color);
    }
    return total_color.divideScalar(samples_per_pixel); ///颜色平均
}