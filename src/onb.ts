import { Vector3 } from "./vec3";

export class ONB {
    axis: Vector3[];

    constructor(n: Vector3) {
        const w = n.clone().normalize();
        const a = Math.abs(w.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        const v = w.clone().cross(a).normalize();
        const u = w.clone().cross(v);
        this.axis = [u, v, w]
    }

    get u() { return this.axis[0] }
    get v() { return this.axis[1] }
    get w() { return this.axis[2] }

    transform(v: Vector3) {
        // Transform from basis coordinates to local space.
        return new Vector3(0, 0, 0)
            .addScaledVector(this.axis[0], v.x)
            .addScaledVector(this.axis[1], v.y)
            .addScaledVector(this.axis[2], v.z)
    }
}