import { Interval } from "./interval";
import { Hittable } from "./object/hittable";
import { Ray } from "./ray";
import { assertEqual, deg_to_rad, random_in_unit_disk } from "./utils";
import { Color, Vector3 } from "./vec3";


function resolveDefaults(opts: ConstructorParameters<typeof Camera>[0]) {
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

export class Camera {
    static type = "_Camera";
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
    background: Color;
    //
    pixel_delta_u: Vector3;
    pixel_delta_v: Vector3;
    pixel00_loc: Vector3;
    defocus_disk_u: Vector3;
    defocus_disk_v: Vector3;

    constructor(opts?: Partial<{
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
    }>) {
        if (!opts) return;
        const {
            aspect_ratio, image_width, samples_per_pixel, max_depth,
            vfov, lookfrom, lookat, vup,
            focus_dist, defocus_angle, background
        } = resolveDefaults(opts);
        //
        this.samples_per_pixel = samples_per_pixel;
        this.max_depth = max_depth;
        this.background = background;
        //
        this.aspect_ratio = aspect_ratio;
        this.image_width = image_width;
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
            image_height: this.image_height,
            //
            center: this.center.toJSON(),
            lookfrom: this.lookfrom.toJSON(),
            lookat: this.lookat.toJSON(),
            vup: this.vup.toJSON(),
            focus_dist: this.focus_dist,
            defocus_angle: this.defocus_angle,
            //
            samples_per_pixel: this.samples_per_pixel,
            max_depth: this.max_depth,
            background: this.background.toJSON(),
            //
            pixel_delta_u: this.pixel_delta_u.toJSON(),
            pixel_delta_v: this.pixel_delta_v.toJSON(),
            pixel00_loc: this.pixel00_loc.toJSON(),
            defocus_disk_u: this.defocus_disk_u.toJSON(),
            defocus_disk_v: this.defocus_disk_v.toJSON()
        }
    }
    static fromJSON(opts: ReturnType<Camera['toJSON']>) {
        assertEqual(opts.type, Camera.type);
        const camera = new Camera();
        camera.aspect_ratio = opts.aspect_ratio;
        camera.image_width = opts.image_width;
        camera.image_height = opts.image_height;
        //
        camera.center = Vector3.fromJSON(opts.center);
        camera.lookfrom = Vector3.fromJSON(opts.lookfrom);
        camera.lookat = Vector3.fromJSON(opts.lookat);
        camera.vup = Vector3.fromJSON(opts.vup);
        camera.focus_dist = opts.focus_dist;
        camera.defocus_angle = opts.defocus_angle;
        //
        camera.samples_per_pixel = opts.samples_per_pixel;
        camera.max_depth = opts.max_depth;
        camera.background = Color.fromJSON(opts.background);
        //
        camera.pixel_delta_u = Vector3.fromJSON(opts.pixel_delta_u);
        camera.pixel_delta_v = Vector3.fromJSON(opts.pixel_delta_v);
        camera.pixel00_loc = Vector3.fromJSON(opts.pixel00_loc);
        camera.defocus_disk_u = Vector3.fromJSON(opts.defocus_disk_u);
        camera.defocus_disk_v = Vector3.fromJSON(opts.defocus_disk_v);
        return camera;
    }
}

function rayColor(ray: Ray, depth: number, world: Hittable, camera: Camera): Color {
    if (depth <= 0) return new Color(0, 0, 0);

    const hit_record = world.hit(ray, new Interval(0.001, Infinity));
    if (!hit_record) return camera.background.clone();

    //用一个新的颜色存储, 避免修改 texture 或者 material 内的color属性值
    const blend_color = new Color(0, 0, 0);

    const color_from_emission = hit_record.mat.emitted(
        hit_record.u,
        hit_record.v,
        hit_record.p
    );
    blend_color.add(color_from_emission);

    const scatter_result = hit_record.mat.scatter(ray, hit_record);
    if (!scatter_result) return blend_color;

    const color_from_scatter = rayColor(scatter_result.ray_scatter, depth - 1, world, camera)
        .multiply(scatter_result.attenuation);

    blend_color.add(color_from_scatter);

    return blend_color;
}


export function renderPixel(camera: Camera, scene: Hittable, pixel_x: number, pixel_y: number) {
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
        const ray_time = Math.random();
        const sample_color = rayColor(
            new Ray(ray_origin, ray_dir, ray_time),
            max_depth,
            scene,
            camera
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