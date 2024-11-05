import { Interval } from "../interval";
import { Ray } from "../ray";
import { AXIS, random_int } from "../utils";
import { AABB } from "./aabb";
import { Hittable } from "./hittable";

export class BvhNode implements Hittable {
    left: Hittable;
    right: Hittable;
    bbox: AABB;

    constructor(objects: Hittable[]) {
        this.bbox = objects.reduce((box, object) => {
            box = new AABB(box, object.bounding_box());
            return box;
        }, AABB.Empty);
        const axis = this.bbox.longest_axis();

        const comparator = axis === AXIS.X
            ? BvhNode.box_x_compare
            : axis === AXIS.Y
                ? BvhNode.box_y_compare
                : BvhNode.box_z_compare;

        const len = objects.length;
        if (len === 1) {
            this.left = this.right = objects[0]
        } else if (len === 2) {
            this.left = objects[0];
            this.right = objects[1];
        } else {
            objects.sort(comparator);
            const mid = Math.floor(len / 2);
            this.left = new BvhNode(objects.slice(0, mid));
            this.right = new BvhNode(objects.slice(mid));
        }
    }

    hit(ray: Ray, ray_t: Interval) {
        if (!this.bbox.hit(ray, ray_t)) return false;

        const hit_left_result = this.left.hit(ray, ray_t);
        const hit_right_result = this.right.hit(
            ray,
            new Interval(
                ray_t.min,
                hit_left_result ? hit_left_result.t : ray_t.max
            )
        );
        //注意这里返回的是 hitRecord;
        return hit_right_result || hit_left_result;
    }


    bounding_box(): AABB {
        return this.bbox;
    }


    toJSON() {
        throw new Error("Method not implemented.");
    }

    static box_compare(a: Hittable, b: Hittable, axis_index: number) {
        const a_axis_interval = a.bounding_box().get_axis_interval(axis_index);
        const b_axis_interval = b.bounding_box().get_axis_interval(axis_index);
        return a_axis_interval.min - b_axis_interval.min;

    }
    static box_x_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.X);
    }
    static box_y_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.Y);
    }
    static box_z_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.Z);
    }
}