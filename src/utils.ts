import { Vector3 } from "./vec3";
export function assertEqual(s1: any, s2: any, msg?: string) {
    if (s1 !== s2) throw new Error(msg || 'not equal!');
}
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

export function random_int(min: number, max: number) {
    return random(min, max + 1) >> 0;
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
export function distance_between(v1: Vector3, v2: Vector3) {
    return Math.hypot(
        v1.x - v2.x,
        v1.y - v2.y,
        v1.z - v2.z
    );
}
//Schlick Approximation
export function reflectance(cos: number, refraction_index: number) {
    let r0 = (1 - refraction_index) / (1 + refraction_index);
    r0 = r0 * r0;
    return r0 + (1 - r0) * Math.pow(1 - cos, 5);
}

export function random_unit_direction() {
    // https://mathworld.wolfram.com/SpherePointPicking.html
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const c = Math.sqrt(1 - u * u);

    const x = c * Math.cos(theta);
    const y = u;
    const z = c * Math.sin(theta);

    return new Vector3(x, y, z);
}

export function random_in_unit_disk() {
    const r = Math.random();
    const theta = Math.PI * 2 * Math.random();
    return [
        Math.cos(theta) * r,
        Math.sin(theta) * r
    ]
}

export function deg_to_rad(d: number) {
    return d / 180 * Math.PI;
}

export function linearToSRGB(v: number) {
    return Math.sqrt(v);
}

export enum AXIS {
    X = 0,
    Y = 1,
    Z = 2
}

export function resolve_image_url(url: string) {
    return new URL(url, location.href).href;
}

export async function load_image(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
    });
}

export async function load_imagebitmap(url: string) {
    return new Promise<ImageBitmap>((resolve, reject) => {
        fetch(url)
            .then(res => res.blob())
            .then(blob => createImageBitmap(blob))
            .then(imagebitmap => resolve(imagebitmap))
            .catch(reject)
    });
}