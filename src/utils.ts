import { Vector3 } from "./vec3";

export function lerp(min: number, max: number, t: number) {
    return (max - min) * t + min;
}
export function random(min?: number, max?: number) {
    if (min === undefined || min === null) {
        return Math.random();
    } else {
        return lerp(min, max, Math.random());
    }
}
const epsilon = 1e-6;
export function is_near_zero(v: Vector3) {
    return [...v].every(comp => Math.abs(comp) < epsilon);
}

export function reflect(v: Vector3, n: Vector3) {
    return v.clone().addScaledVector(n, -2 * v.dot(n));
}

export function refract(v: Vector3, n: Vector3, etai_over_etat: number) {
    const cos_theta = Math.min(-v.dot(n), 1);
    const r_perp = v.clone().addScaledVector(n, cos_theta).multiplyScalar(etai_over_etat);
    const s = -Math.sqrt(1.0 - r_perp.lengthSquared());
    return r_perp.addScaledVector(n, s);
}



export function deg_to_rad(d: number) {
    return d / 180 * Math.PI;
}

export function linearToSRGB(v: number) {
    return Math.sqrt(v);
}
export class Interval {
    static Empty = new Interval(Infinity, -Infinity);
    static Universe = new Interval(-Infinity, Infinity);
    constructor(public min: number, public max: number) { };
    clamp(x: number) {
        if (x < this.min) return this.min;
        if (x > this.max) return this.max;
        return x;
    }
    size() {
        return this.max - this.min;
    }
    contains(x: number) {
        return x >= this.min && x <= this.max;
    }
    surrounds(x: number) {
        return x > this.min && x < this.max;
    }

}