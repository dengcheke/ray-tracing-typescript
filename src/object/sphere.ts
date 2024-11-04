import { Interval } from "../interval";
import { Material, materialFromJSON } from "../material";
import { Ray } from "../ray";
import { assertEqual } from "../utils";
import { Vector3 } from "../vec3";
import { AABB } from "./aabb";
import { HitRecord, Hittable } from "./hittable";

export class Sphere implements Hittable {
    static type = '_Sphere';

    bbox: AABB;
    center: Ray;
    radius: number;
    material: Material;

    constructor()
    constructor(static_center: Vector3, radius: number, material: Material)
    constructor(center1: Vector3, center2: Vector3, radius: number, material: Material)
    constructor(...args: any[]) {
        if (args.length === 0) return;
        if (typeof args[1] === 'number') {
            const [static_center, radius, material] = args;
            this.center = new Ray(static_center, new Vector3(0, 0, 0), 0);
            this.radius = radius;
            this.material = material;
        } else {
            const [center1, center2, radius, material] = args as [Vector3, Vector3, number, Material];
            this.center = new Ray(center1, center2.clone().sub(center1), 0);
            this.radius = radius;
            this.material = material;
        }
        this.update_bbox();
    }

    static get_sphere_uv(p: Vector3) {
        // p: a given point on the sphere of radius one, centered at the origin.
        // u: returned value [0,1] of angle around the Y axis from X=-1.
        // v: returned value [0,1] of angle from Y=-1 to Y=+1.
        //     <1 0 0> yields <0.50 0.50>       <-1  0  0> yields <0.00 0.50>
        //     <0 1 0> yields <0.50 1.00>       < 0 -1  0> yields <0.50 0.00>
        //     <0 0 1> yields <0.25 0.50>       < 0  0 -1> yields <0.75 0.50>
        const { x, y, z } = p;
        const theta = Math.acos(-y);
        const phi = Math.atan2(-z, x) + Math.PI;
        return [
            phi / (2 * Math.PI),
            theta / Math.PI
        ];
    }

    private update_bbox() {
        const { center, radius } = this;
        const rvec = new Vector3(radius, radius, radius);
        const box1 = new AABB(center.at(0).sub(rvec), center.at(0).add(rvec));
        const box2 = new AABB(center.at(1).sub(rvec), center.at(1).add(rvec));
        this.bbox = new AABB(box1, box2);
    }

    bounding_box(): AABB {
        return this.bbox
    }

    hit(ray: Ray, ray_t: Interval) {
        const current_center = this.center.at(ray.tm);
        const oc = current_center.clone().sub(ray.origin);
        const a = ray.dir.lengthSquared();
        const h = ray.dir.dot(oc);
        const c = oc.lengthSquared() - this.radius * this.radius;
        const discriminant = h * h - a * c;
        if (discriminant < 0) return false;

        const sqrtd = discriminant ** 0.5;
        let root = (h - sqrtd) / a;
        if (!ray_t.surrounds(root)) {
            root = (h + sqrtd) / a;
            if (!ray_t.surrounds(root)) {
                return false;
            }
        }
        const rec = new HitRecord();
        rec.t = root;
        rec.p = ray.at(rec.t);
        rec.mat = this.material;
        const outward_normal = rec.p.clone().sub(current_center).divideScalar(this.radius);
        rec.set_face_normal(ray, outward_normal);
        const uv = Sphere.get_sphere_uv(outward_normal);
        rec.u = uv[0];
        rec.v = uv[1];
        return rec;
    }

    toJSON() {
        return {
            type: Sphere.type,
            center: this.center.toJSON(),
            radius: this.radius,
            material: this.material.toJSON()
        }
    }

    static fromJSON(opts: any) {
        assertEqual(opts.type, Sphere.type);
        const s = new Sphere();
        s.center = Ray.fromJSON(opts.center);
        s.radius = opts.radius;
        s.material = materialFromJSON(opts.material);
        s.update_bbox();
        return s;
    }
}