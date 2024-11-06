import { Interval } from "../interval";
import { Material, materialFromJSON } from "../material/material";
import { Ray } from "../ray";
import { assertEqual } from "../utils";
import { Vector3 } from "../vec3";
import { AABB } from "./aabb";
import { HitRecord, Hittable } from "./hittable";
import { HittableList } from "./hittable-list";

export class Quad implements Hittable {
    static type = '_Quad';
    Q: Vector3;
    u: Vector3;
    v: Vector3;
    material: Material;
    //
    bbox: AABB;
    normal: Vector3;
    D: number;
    w: Vector3;
    constructor(Q: Vector3, u: Vector3, v: Vector3, mat: Material) {
        this.Q = Q;
        this.u = u;
        this.v = v;
        this.material = mat;
        const n = u.clone().cross(v);
        this.normal = n.clone().normalize();
        this.D = this.normal.dot(Q);
        this.w = n.clone().divideScalar(n.dot(n));
        this.update_bbox();
    }

    private update_bbox() {
        const bbox_diagonal1 = new AABB(
            this.Q,
            this.Q.clone().add(this.u).add(this.v)
        );
        const bbox_diagonal2 = new AABB(
            this.Q.clone().add(this.u),
            this.Q.clone().add(this.v)
        );
        this.bbox = new AABB(bbox_diagonal1, bbox_diagonal2);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        const denom = this.normal.dot(ray.dir);
        // No hit if the ray is parallel to the plane.
        if (Math.abs(denom) < 1e-8) return false;

        // Return false if the hit point parameter t is outside the ray interval.
        const t = (this.D - this.normal.dot(ray.origin)) / denom;
        if (!ray_t.contains(t)) return false;

        // Determine if the hit point lies within the planar shape using its plane coordinates.
        const intersection = ray.at(t);
        const planer_hitpr_vector = intersection.clone().sub(this.Q);
        const alpha = this.w.dot(planer_hitpr_vector.clone().cross(this.v));
        const beta = this.w.dot(this.u.clone().cross(planer_hitpr_vector));

        if (alpha < 0 || alpha > 1 || beta < 0 || beta > 1) return false;

        const rec = new HitRecord();
        rec.p = intersection;
        rec.t = t;
        rec.mat = this.material;
        rec.u = alpha;
        rec.v = beta;
        rec.set_face_normal(ray, this.normal);
        return rec;
    }

    toJSON() {
        return {
            type: Quad.type,
            Q: this.Q.toJSON(),
            u: this.u.toJSON(),
            v: this.v.toJSON(),
            material: this.material.toJSON()
        }
    }
    static fromJSON(opts: ReturnType<Quad['toJSON']>) {
        assertEqual(opts.type, Quad.type);
        return new Quad(
            Vector3.fromJSON(opts.Q),
            Vector3.fromJSON(opts.u),
            Vector3.fromJSON(opts.v),
            materialFromJSON(opts.material)
        );
    }
}

export function create_box(a: Vector3, b: Vector3, mat: Material) {
    const sides = new HittableList();
    const min = new Vector3(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.min(a.z, b.z),
    );
    const max = new Vector3(
        Math.max(a.x, b.x),
        Math.max(a.y, b.y),
        Math.max(a.z, b.z),
    );

    const dx = new Vector3(max.x - min.x, 0, 0);
    const dy = new Vector3(0, max.y - min.y, 0);
    const dz = new Vector3(0, 0, max.z - min.z);

    const ndx = dx.clone().multiplyScalar(-1);
    const ndz = dz.clone().multiplyScalar(-1);


    sides.add(new Quad(new Vector3(min.x, min.y, max.z), dx, dy, mat))//front
    sides.add(new Quad(new Vector3(max.x, min.y, max.z), ndz, dy, mat))//right
    sides.add(new Quad(new Vector3(max.x, min.y, min.z), ndx, dy, mat))//back
    sides.add(new Quad(new Vector3(min.x, min.y, min.z), dz, dy, mat))//left
    sides.add(new Quad(new Vector3(min.x, max.y, max.z), dx, ndz, mat))//top
    sides.add(new Quad(new Vector3(min.x, min.y, min.z), dx, dz, mat))//bottom

    return sides;
}