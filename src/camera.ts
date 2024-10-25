import { HittableList } from "./object";
import { Ray } from "./ray";
import { Interval } from "./utils";
import { Color, Vector3 } from "./vec3";


export class Camera {
    aspect_ratio: number;
    image_width: number;
    image_height: number;
    center: Vector3;
    pixel_delta_u: Vector3;
    pixel_delta_v: Vector3;
    pixel00_loc: Vector3;

    constructor(opts?: {
        aspect_ratio: number,
        image_width: number,
        center: Vector3,
        focal_length: number,
    }) {
        this.aspect_ratio = opts.aspect_ratio;
        this.image_width = opts.image_width;
        this.image_height = this.image_width / this.aspect_ratio >> 0;
        this.center = opts.center;
        const viewport_height = 2;
        const viewport_width = viewport_height * this.image_width / this.image_height;

        const viewport_u = new Vector3(viewport_width, 0, 0);
        const viewport_v = new Vector3(0, -viewport_height, 0);

        this.pixel_delta_u = viewport_u.clone().divideScalar(this.image_width);
        this.pixel_delta_v = viewport_v.clone().divideScalar(this.image_height);

        this.pixel00_loc = this.center.clone()
            .add(new Vector3(0, 0, -opts.focal_length))
            .addScaledVector(viewport_u, -0.5)
            .addScaledVector(viewport_v, -0.5)
            .addScaledVector(this.pixel_delta_u, 0.5)
            .addScaledVector(this.pixel_delta_v, 0.5);
    }
}

const c1 = new Color(1, 1, 1);
const c2 = new Color(0.5, 0.7, 1);

function ray_color(ray: Ray, world: HittableList) {
    const hit_record = world.hit(ray, new Interval(0, Infinity));
    if (hit_record) {
        return new Color(...hit_record.normal).addScalar(1).multiplyScalar(0.5);
    }
    const a = 0.5 * (ray.norm_dir.y + 1.0);
    return new Color().lerpVectors(c1, c2, a);
}

export function renderPixel(camera: Camera, scene: HittableList, pixel_x: number, pixel_y: number) {
    const { pixel00_loc, pixel_delta_u, pixel_delta_v, center } = camera;
    const pixel_center = pixel00_loc.clone()
        .addScaledVector(pixel_delta_u, pixel_x)
        .addScaledVector(pixel_delta_v, pixel_y);
    const ray_dir = pixel_center.clone().sub(center);
    const ray = new Ray(center, ray_dir);
    return ray_color(ray, scene);
}