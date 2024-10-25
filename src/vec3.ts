import { random } from "./utils";

export class Vector3 {
    constructor(public x = 0, public y = 0, public z = 0) { }

    set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    add(v: Vector3) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    addScalar(s: number) {
        this.x += s;
        this.y += s;
        this.z += s;
        return this;
    }

    addScaledVector(v: Vector3, s: number) {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        return this;
    }

    sub(v: Vector3) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    //按位乘
    multiply(v: Vector3) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    multiplyScalar(scalar: number) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    divide(v: Vector3) {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
        return this;
    }

    divideScalar(scalar: number) {
        return this.multiplyScalar(1 / scalar);
    }

    dot(v: Vector3) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(b: Vector3) {

        const ax = this.x, ay = this.y, az = this.z;
        const bx = b.x, by = b.y, bz = b.z;

        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;

        return this;

    }
    lengthSquared() {

        return this.x * this.x + this.y * this.y + this.z * this.z;

    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    random(min?: number, max?: number) {
        this.x = random(min, max);
        this.y = random(min, max);
        this.z = random(min, max);

        return this;
    }
    randomDirection() {
        // https://mathworld.wolfram.com/SpherePointPicking.html
        const theta = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const c = Math.sqrt(1 - u * u);

        this.x = c * Math.cos(theta);
        this.y = u;
        this.z = c * Math.sin(theta);

        return this;

    }
    lerpVectors(v1: Vector3, v2: Vector3, alpha: number) {
        this.x = v1.x + (v2.x - v1.x) * alpha;
        this.y = v1.y + (v2.y - v1.y) * alpha;
        this.z = v1.z + (v2.z - v1.z) * alpha;
        return this;
    }
    normalize() {

        return this.divideScalar(this.length() || 1);

    }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
    }
}


export class Color extends Vector3 {
    static Red = new Color(1, 0, 0);
    get r() { return this.x }
    get g() { return this.y }
    get b() { return this.z }
}