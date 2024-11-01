import { Interval } from "../interval";
import { Material, materialFromJSON } from "../material";
import { Ray } from "../ray";
import { assertEqual } from "../utils";
import { Vector3 } from "../vec3";
import { HitRecord, Hittable } from "./hittable";

export class Sphere implements Hittable {
    static type = '_Sphere';
    constructor(public center: Vector3, public radius: number, public material: Material) { };
    hit(ray: Ray, ray_t: Interval) {
        const oc = this.center.clone().sub(ray.origin);
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
        const outward_normal = rec.p.clone().sub(this.center).divideScalar(this.radius);
        rec.set_face_normal(ray, outward_normal);
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
        return new Sphere(
            Vector3.fromJSON(opts.center),
            opts.radius,
            materialFromJSON(opts.material)
        );
    }
}