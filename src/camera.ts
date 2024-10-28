import { HittableList } from "./object";
import { Ray } from "./ray";
import { deg_to_rad, Interval, random_in_unit_disk } from "./utils";
import { Color, Vector3 } from "./vec3";


function resolveDefaults(opts: ConstructorParameters<typeof Camera>[0]) {
    opts.aspect_ratio = opts.aspect_ratio ?? 1;
    opts.image_width = opts.image_width ?? 100;
    opts.samples_per_pixel = opts.samples_per_pixel ?? 10;
    opts.max_depth = opts.max_depth ?? 10;

    opts.vfov = opts.vfov ?? 90;
    opts.lookfrom = opts.lookfrom ?? new Vector3(0, 0, 0);
    opts.lookat = opts.lookat ?? new Vector3(0, 0, -1);
    opts.vup = opts.vup ?? new Vector3(0, 1, 0);

    opts.defocus_angle = opts.defocus_angle ?? 90;
    opts.focus_dist = opts.focus_dist ?? 10;

    return opts;
}

export class Camera {
    aspect_ratio: number;
    image_width: number;
    image_height: number;
    //
    center: Vector3;
    lookfrom: Vector3;
    lookat: Vector3;
    vup: Vector3;
    focus_dist: number;
    defocus_angle: number;
    //
    samples_per_pixel: number; //Count of random samples for each pixel
    max_depth: number; //Maximum number of ray bounces into scene
    //
    pixel_delta_u: Vector3;
    pixel_delta_v: Vector3;
    pixel00_loc: Vector3;
    defocus_disk_u: Vector3;
    defocus_disk_v: Vector3;

    constructor(opts: Partial<{
        aspect_ratio: number,
        image_width: number,
        samples_per_pixel: number,
        max_depth: number,
        vfov: number,
        lookfrom: Vector3,
        lookat: Vector3,
        vup: Vector3,
        focus_dist: number,
        defocus_angle: number,
    }>) {
        const {
            aspect_ratio, image_width, samples_per_pixel, max_depth,
            vfov, lookfrom, lookat, vup,
            focus_dist, defocus_angle
        } = resolveDefaults(opts);
        //
        this.samples_per_pixel = samples_per_pixel;
        this.max_depth = max_depth;
        //
        this.aspect_ratio = aspect_ratio;
        this.image_width = image_width;
        const image_height = this.image_height = image_width / aspect_ratio >> 0;
        //
        this.lookfrom = lookfrom;
        this.lookat = lookat;
        this.vup = vup;
        this.center = lookfrom;

        this.focus_dist = focus_dist;
        this.defocus_angle = defocus_angle;

        const h = Math.tan(deg_to_rad(vfov) / 2);
        const viewport_height = 2 * h * focus_dist;
        const viewport_width = viewport_height * image_width / image_height;

        //
        const w = lookfrom.clone().sub(lookat).normalize();
        const u = vup.clone().cross(w).normalize();
        const v = w.clone().cross(u);

        const viewport_u = u.clone().multiplyScalar(viewport_width);
        const viewport_v = v.clone().multiplyScalar(-viewport_height);

        this.pixel_delta_u = viewport_u.clone().divideScalar(image_width);
        this.pixel_delta_v = viewport_v.clone().divideScalar(image_height);

        this.pixel00_loc = this.center.clone()
            .addScaledVector(w, -focus_dist)
            .addScaledVector(viewport_u, -0.5)
            .addScaledVector(viewport_v, -0.5)
            .addScaledVector(this.pixel_delta_u, 0.5)
            .addScaledVector(this.pixel_delta_v, 0.5);

        const defocus_radius = focus_dist * Math.tan(deg_to_rad(defocus_angle / 2));
        this.defocus_disk_u = u.clone().multiplyScalar(defocus_radius);
        this.defocus_disk_v = v.clone().multiplyScalar(defocus_radius);
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
    const { max_depth, defocus_angle,
        pixel00_loc, pixel_delta_u, pixel_delta_v,
        center, samples_per_pixel,
        defocus_disk_u, defocus_disk_v
    } = camera;
    const total_color = new Color(0, 0, 0);
    for (let i = 0; i < samples_per_pixel; i++) {
        //sample_square
        const offset_x = Math.random() - 0.5;
        const offset_y = Math.random() - 0.5;
        const pixel_sample = pixel00_loc.clone()
            .addScaledVector(pixel_delta_u, pixel_x + offset_x)
            .addScaledVector(pixel_delta_v, pixel_y + offset_y);

        const ray_origin = defocus_angle <= 0 ? center : defocus_disk_sample();
        const ray_dir = pixel_sample.sub(ray_origin);
        const sample_color = rayColor(
            new Ray(ray_origin, ray_dir),
            max_depth,
            scene
        );
        total_color.add(sample_color);
    }
    return total_color.divideScalar(samples_per_pixel); ///颜色平均

    function defocus_disk_sample() {
        const p = random_in_unit_disk();
        return center.clone()
            .addScaledVector(defocus_disk_u, p[0])
            .addScaledVector(defocus_disk_v, p[1]);
    }
}