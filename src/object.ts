import { Material } from "./material";
import { Ray } from "./ray";
import { Interval } from "./utils";
import { Vector3 } from "./vec3";

export class HitRecord {
    p: Vector3;
    normal: Vector3;
    t: number;
    front_face: boolean;
    mat: Material;
    set_face_normal(ray: Ray, outward_normal: Vector3) {
        this.front_face = ray.dir.dot(outward_normal) < 0;
        this.normal = this.front_face ? outward_normal : outward_normal.clone().multiplyScalar(-1);
    }
}

export interface Hittable {
    hit(ray: Ray, ray_t: Interval): false | HitRecord;
}

export class HittableList implements Hittable {
    objects = [] as Hittable[];
    add(obj: Hittable) {
        this.objects.push(obj);
        return this;
    }
    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        let hit_result = false as false | HitRecord;
        let closest_so_far = ray_t.max;
        for (let obj of this.objects) {
            const hit = obj.hit(ray, new Interval(ray_t.min, closest_so_far));
            if (hit) {
                closest_so_far = hit.t;
                hit_result = hit;
            }
        }
        return hit_result;
    }
}

export class Sphere implements Hittable {
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
}