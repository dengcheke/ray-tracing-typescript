import { Interval } from "../interval";
import { Material } from "../material/material";
import { Ray } from "../ray";
import { assertEqual, deg_to_rad } from "../utils";
import { Vector3 } from "../vec3";
import { AABB } from "./aabb";
import { objFromJson } from "./hittable-list";
export class HitRecord {
    p: Vector3; //交点
    normal: Vector3; //法向量
    t: number; //射线t
    front_face: boolean;
    mat: Material; //材质
    //纹理坐标
    u: number;
    v: number;
    set_face_normal(ray: Ray, outward_normal: Vector3) {
        this.front_face = ray.dir.dot(outward_normal) < 0;
        this.normal = this.front_face ? outward_normal : outward_normal.clone().multiplyScalar(-1);
    }
}

export interface Hittable {
    hit(ray: Ray, ray_t: Interval): false | HitRecord;
    bounding_box(): AABB;
    toJSON(): any;
}


export class Translate implements Hittable {
    static type = '_Translate';
    offset: Vector3;
    object: Hittable;
    bbox: AABB;
    constructor(object: Hittable, offset: Vector3) {
        this.object = object;
        this.offset = offset;
        this.bbox = object.bounding_box().clone().add_offset(offset);
    }

    bounding_box(): AABB {
        return this.bbox;
    }
    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        // Move the ray backwards by the offset
        const offset_ray = new Ray(
            ray.origin.clone().sub(this.offset),
            ray.dir,
            ray.tm
        );
        // Determine whether an intersection exists along the offset ray (and if so, where)
        const hit = this.object.hit(offset_ray, ray_t)
        if (!hit) return false;

        hit.p.add(this.offset);

        return hit;
    }
    toJSON() {
        return {
            type: Translate.type,
            offset: this.offset.toJSON(),
            object: this.object.toJSON()
        }
    }

    static fromJSON(opts: ReturnType<Translate['toJSON']>) {
        assertEqual(Translate.type, opts.type);
        return new Translate(
            objFromJson(opts.object),
            Vector3.fromJSON(opts.offset)
        );
    }
}


export class Rotate_Y implements Hittable {
    static type = '_Rotate_Y';
    sin_theta: number;
    cos_theta: number;
    bbox: AABB;
    object: Hittable;
    angle: number;
    constructor(object: Hittable, angle: number) {
        this.angle = angle;
        this.object = object;
        const radians = deg_to_rad(angle);
        this.sin_theta = Math.sin(radians);
        this.cos_theta = Math.cos(radians);
        const bbox = object.bounding_box();

        const min = new Vector3(Infinity, Infinity, Infinity);
        const max = new Vector3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 2; k++) {
                    const x = i * bbox.x.max + (1 - i) * bbox.x.min;
                    const y = j * bbox.y.max + (1 - j) * bbox.y.min;
                    const z = k * bbox.z.max + (1 - k) * bbox.z.min;

                    const newx = this.cos_theta * x + this.sin_theta * z;
                    const newz = -this.sin_theta * x + this.cos_theta * z;

                    //
                    min.x = Math.min(min.x, newx);
                    min.y = Math.min(min.y, y);
                    min.z = Math.min(min.z, newz);
                    //
                    max.x = Math.max(max.x, newx);
                    max.y = Math.max(max.y, y);
                    max.z = Math.max(max.z, newz);
                }
            }
        }
        this.bbox = new AABB(min, max);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        // Transform the ray from world space to object space.
        const { cos_theta, sin_theta } = this;
        const origin = new Vector3(
            (cos_theta * ray.origin.x - sin_theta * ray.origin.z),
            ray.origin.y,
            (sin_theta * ray.origin.x + cos_theta * ray.origin.z)
        );
        const direction = new Vector3(
            cos_theta * ray.dir.x - sin_theta * ray.dir.z,
            ray.dir.y,
            sin_theta * ray.dir.x + cos_theta * ray.dir.z
        );

        const rotated_ray = new Ray(origin, direction, ray.tm);

        const hit = this.object.hit(rotated_ray, ray_t);
        if (!hit) return false;

        hit.p = new Vector3(
            cos_theta * hit.p.x + sin_theta * hit.p.z,
            hit.p.y,
            -sin_theta * hit.p.x + cos_theta * hit.p.z
        );

        hit.normal = new Vector3(
            cos_theta * hit.normal.x + sin_theta * hit.normal.z,
            hit.normal.y,
            -sin_theta * hit.normal.x + cos_theta * hit.normal.z
        );

        return hit;
    }

    toJSON() {
        return {
            type: Rotate_Y.type,
            object: this.object.toJSON(),
            angle: this.angle,
        }
    }

    static fromJSON(opts: ReturnType<Rotate_Y['toJSON']>) {
        assertEqual(opts.type, Rotate_Y.type);
        return new Rotate_Y(
            objFromJson(opts.object),
            opts.angle
        );
    }
}