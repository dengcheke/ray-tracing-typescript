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