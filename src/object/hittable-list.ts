import { Sphere } from "./sphere";
import { Ray } from "../ray";
import { assertEqual } from "../utils";
import { HitRecord, Hittable, Rotate_Y, Translate } from "./hittable";
import { Interval } from "../interval";
import { AABB } from "./aabb";
import { Quad } from "./quad";

export class HittableList implements Hittable {
    static type = '_HittableList';
    objects: Hittable[];
    bbox: AABB;

    constructor(object?: Hittable) {
        this.objects = [];
        this.bbox = new AABB();
        this.add(object);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    add(obj: Hittable) {
        if (!obj) return this;
        this.objects.push(obj);
        this.bbox = new AABB(this.bbox, obj.bounding_box());
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

    toJSON() {
        return {
            type: HittableList.type,
            objects: this.objects.map(i => i.toJSON())
        }
    }

    static fromJSON(opts: any) {
        assertEqual(opts.type, HittableList.type);
        const list = new HittableList();
        opts.objects.forEach((o: any) => {
            list.add(objFromJson(o));
        });
        return list;
    }
}


export function objFromJson(opts: any): Hittable {
    switch (opts.type) {
        case Sphere.type: return Sphere.fromJSON(opts);
        case Quad.type: return Quad.fromJSON(opts);
        case Translate.type: return Translate.fromJSON(opts);
        case Rotate_Y.type: return Rotate_Y.fromJSON(opts);
        case HittableList.type: return HittableList.fromJSON(opts);
        default: {
            throw new Error('无效的object类型:' + opts.type);
        }
    }
}