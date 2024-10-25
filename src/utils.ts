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

export function degToRad(d: number) {
    return d / 180 * Math.PI;
}


export class Interval {
    static Empty = new Interval(Infinity, -Infinity);
    static Universe = new Interval(-Infinity, Infinity);
    constructor(public min: number, public max: number) { };
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