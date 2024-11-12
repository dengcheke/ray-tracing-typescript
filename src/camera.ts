import { Interval } from "./interval";
import { Hittable } from "./object/hittable";
import { Ray } from "./ray";
import { assertEqual, deg_to_rad, random, random_in_unit_disk } from "./utils";
import { Color, Vector3 } from "./vec3";


function resolveDefaults(opts: CameraOptions) {
    opts.aspect_ratio = opts.aspect_ratio ?? 1;
    opts.image_width = opts.image_width ?? 100;
    opts.samples_per_pixel = opts.samples_per_pixel ?? 10;
    opts.max_depth = opts.max_depth ?? 10;
    opts.background = opts.background ?? new Color(0.70, 0.80, 1.00);

    opts.vfov = opts.vfov ?? 90;
    opts.lookfrom = opts.lookfrom ?? new Vector3(0, 0, 0);
    opts.lookat = opts.lookat ?? new Vector3(0, 0, -1);
    opts.vup = opts.vup ?? new Vector3(0, 1, 0);

    opts.defocus_angle = opts.defocus_angle ?? 0;
    opts.focus_dist = opts.focus_dist ?? 10;

    return opts;
}
export type CameraOptions = {
    aspect_ratio: number,
    image_width: number,
    samples_per_pixel: number,
    max_depth: number,
    background: Color,
    vfov: number,
    lookfrom: Vector3,
    lookat: Vector3,
    vup: Vector3,
    focus_dist: number,
    defocus_angle: number,
}
export class Camera {
    static type = "_Camera";
    //config
    aspect_ratio: number;
    image_width: number;
    image_height: number;
    //
    vfov: number;
    center: Vector3;
    lookfrom: Vector3;
    lookat: Vector3;
    vup: Vector3;
    focus_dist: number;
    defocus_angle: number;
    //
    samples_per_pixel: number; //Count of random samples for each pixel
    max_depth: number; //Maximum number of ray bounces into scene
    background: Color;


    //计算得到
    pixel_samples_scale: number;//Color scale factor for a sum of pixel samples
    sqrt_spp: number;//Square root of number of samples per pixel
    recip_sqrt_spp: number;//1 / sqrt_spp
    pixel_delta_u: Vector3;
    pixel_delta_v: Vector3;
    pixel00_loc: Vector3;
    defocus_disk_u: Vector3;
    defocus_disk_v: Vector3;

    constructor(opts: Partial<CameraOptions>) {
        const {
            aspect_ratio, image_width, samples_per_pixel, max_depth,
            vfov, lookfrom, lookat, vup,
            focus_dist, defocus_angle, background
        } = resolveDefaults((opts || {}) as CameraOptions);
        //
        this.samples_per_pixel = samples_per_pixel;
        this.sqrt_spp = Math.floor(samples_per_pixel ** 0.5);
        this.pixel_samples_scale = 1 / this.sqrt_spp ** 2;
        this.recip_sqrt_spp = 1 / this.sqrt_spp;
        this.max_depth = max_depth;
        this.background = background;
        //
        this.aspect_ratio = aspect_ratio;
        this.image_width = image_width;
        this.vfov = vfov;
        const image_height = this.image_height = Math.floor(image_width / aspect_ratio);
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

    toJSON() {
        return {
            type: Camera.type,
            aspect_ratio: this.aspect_ratio,
            image_width: this.image_width,
            samples_per_pixel: this.samples_per_pixel,
            max_depth: this.max_depth,
            background: this.background.toJSON(),
            vfov: this.vfov,
            lookfrom: this.lookfrom.toJSON(),
            lookat: this.lookat.toJSON(),
            vup: this.vup.toJSON(),
            focus_dist: this.focus_dist,
            defocus_angle: this.defocus_angle,
        }
    }
    static fromJSON(opts: ReturnType<Camera['toJSON']>) {
        assertEqual(opts.type, Camera.type);
        const camera = new Camera({
            ...opts,
            background: Color.fromJSON(opts.background),
            lookfrom: Vector3.fromJSON(opts.lookfrom),
            lookat: Vector3.fromJSON(opts.lookat),
            vup: Vector3.fromJSON(opts.vup)
        });
        return camera;
    }
}

function rayColor(ray: Ray, depth: number, world: Hittable, camera: Camera): Color {
    if (depth <= 0) return new Color(0, 0, 0);

    const hit_record = world.hit(ray, new Interval(0.001, Infinity));
    if (!hit_record) return camera.background.clone();

    //用一个新的颜色存储, 避免修改 texture 或者 material 内的color属性值
    const final_color = new Color(0, 0, 0);

    const color_from_emission = hit_record.mat.emitted(
        hit_record.u,
        hit_record.v,
        hit_record.p
    );
    final_color.add(color_from_emission);

    const scatter_result = hit_record.mat.scatter(ray, hit_record);
    if (!scatter_result) return final_color;
    const scatter_pdf = hit_record.mat.scattering_pdf(ray, hit_record, scatter_result.ray_scatter);
    const pdf_value = scatter_pdf;

    const color_from_scatter = rayColor(scatter_result.ray_scatter, depth - 1, world, camera)
        .multiply(scatter_result.attenuation)
        .multiplyScalar(scatter_pdf / pdf_value);

    final_color.add(color_from_scatter);

    return final_color;
}


export function renderPixel(camera: Camera, scene: Hittable, pixel_x: number, pixel_y: number) {
    const { max_depth, defocus_angle,
        pixel00_loc, pixel_delta_u, pixel_delta_v,
        center, sqrt_spp,
        recip_sqrt_spp, pixel_samples_scale,
        defocus_disk_u, defocus_disk_v
    } = camera;
    const total_color = new Color(0, 0, 0);

    for (let s_j = 0; s_j < sqrt_spp; s_j++) {
        for (let s_i = 0; s_i < sqrt_spp; s_i++) {
            const ray = get_ray(pixel_x, pixel_y, s_i, s_j);
            const sample_color = rayColor(ray, max_depth, scene, camera);
            total_color.addScaledVector(sample_color, pixel_samples_scale);
        }
    }

    return total_color; ///颜色平均

    function get_ray(i: number, j: number, s_i: number, s_j: number) {
        // Construct a camera ray originating from the defocus disk and directed at a randomly
        // sampled point around the pixel location i, j for stratified sample square s_i, s_j.
        const offset = sample_square_stratified(s_i, s_j);
        const pixel_sample = pixel00_loc.clone()
            .addScaledVector(pixel_delta_u, i + offset.x)
            .addScaledVector(pixel_delta_v, j + offset.y);

        const ray_origin = defocus_angle <= 0 ? center : defocus_disk_sample();
        const ray_dir = pixel_sample.sub(ray_origin);
        const ray_time = Math.random();
        return new Ray(ray_origin, ray_dir, ray_time);
    }

    function sample_square_stratified(s_i: number, s_j: number) {
        // Returns the vector to a random point in the square sub-pixel specified by grid
        // indices s_i and s_j, for an idealized unit square pixel [-.5,-.5] to [+.5,+.5].
      
        const px = ((s_i + random()) * recip_sqrt_spp) - 0.5;
        const py = ((s_j + random()) * recip_sqrt_spp) - 0.5;

        return new Vector3(px, py, 0);

    }

    function defocus_disk_sample() {
        const p = random_in_unit_disk();
        return center.clone()
            .addScaledVector(defocus_disk_u, p[0])
            .addScaledVector(defocus_disk_v, p[1]);
    }
}