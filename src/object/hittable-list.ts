import { Sphere } from "./sphere";
import { Ray } from "../ray";
import { assertEqual } from "../utils";
import { HitRecord, Hittable } from "./hittable";
import { Interval } from "../interval";
import { AABB } from "./aabb";

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
            list.add(Sphere.fromJSON(o));
        });
        return list;
    }
}