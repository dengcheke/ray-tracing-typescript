import { Interval } from "../interval";
import { Ray } from "../ray";
import { AXIS } from "../utils";
import { Vector3 } from "../vec3";

export class AABB {
    x: Interval;
    y: Interval;
    z: Interval;
    static Empty = new AABB(Interval.Empty, Interval.Empty, Interval.Empty);
    static Universe = new AABB(Interval.Universe, Interval.Universe, Interval.Universe);

    constructor()
    constructor(x: Interval, y: Interval, z: Interval)
    constructor(a: Vector3, b: Vector3)
    constructor(box0: AABB, box1: AABB)
    constructor(...args: any[]) {
        if (!args.length) {
            this.x = new Interval();
            this.y = new Interval();
            this.z = new Interval();
            return;
        }
        const first = args[0];
        if (first instanceof Interval) {
            const [x, y, z] = args as Interval[];
            this.x = x;
            this.y = y;
            this.z = z;
        } else if (first instanceof Vector3) {
            const [a, b] = args as Vector3[];
            this.x = a.x < b.x ? new Interval(a.x, b.x) : new Interval(b.x, a.x);
            this.y = a.y < b.y ? new Interval(a.y, b.y) : new Interval(b.y, a.y);
            this.z = a.z < b.z ? new Interval(a.z, b.z) : new Interval(b.z, a.z);
        } else if (first instanceof AABB) {
            const [b0, b1] = args as AABB[];
            this.x = new Interval(b0.x, b1.x);
            this.y = new Interval(b0.y, b1.y);
            this.z = new Interval(b0.z, b1.z);
        }
        this.pad_to_minimums();
    }
    static delta = 0.0001;
    private pad_to_minimums() {
        // Adjust the AABB so that no side is narrower than some delta, padding if necessary
        if (this.x.size() < AABB.delta) this.x.expand(AABB.delta);
        if (this.y.size() < AABB.delta) this.y.expand(AABB.delta);
        if (this.z.size() < AABB.delta) this.z.expand(AABB.delta);
    }
    get_axis_interval(n: number) {
        if (n === AXIS.Y) return this.y;
        if (n === AXIS.Z) return this.z;
        return this.x;
    }

    hit(ray: Ray, ray_t: Interval) {
        const { origin, dir } = ray;
        const interval = ray_t.clone();

        for (let axis = 0; axis < 3; axis++) {
            const ax = this.get_axis_interval(axis);
            const adinv = 1 / dir.getComponent(axis);

            const t0 = (ax.min - origin.getComponent(axis)) * adinv;
            const t1 = (ax.max - origin.getComponent(axis)) * adinv;

            if (t0 < t1) {
                if (t0 > interval.min) interval.min = t0;
                if (t1 < interval.max) interval.max = t1;
            } else {
                if (t1 > interval.min) interval.min = t1;
                if (t0 < interval.max) interval.max = t0;
            }
            if (interval.max <= interval.min) return false;
        }
        return true;
    }
    longest_axis() {
        const size_x = this.x.size();
        const size_y = this.y.size();
        const size_z = this.z.size();
        if (size_x > size_y) {
            return size_x > size_z ? AXIS.X : AXIS.Z;
        } else {
            return size_y > size_z ? AXIS.Y : AXIS.Z;
        }
    }
    add_offset(offset: Vector3) {
        this.x.add_offset(offset.x);
        this.y.add_offset(offset.y);
        this.z.add_offset(offset.z);
        return this;
    }
    clone() {
        return new AABB(
            this.x.clone(),
            this.y.clone(),
            this.z.clone(),
        );
    }
}