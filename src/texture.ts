import { assertEqual } from "./utils";
import { Color, Vector3 } from "./vec3";

export interface Texture {
    value(u: number, v: number, point: Vector3): Color;
    toJSON(): any;
}


export class SolidColorTexture implements Texture {
    static type = '_SolidColorTexture';
    albedo: Color;
    constructor(albedo: Color)
    constructor(r: number, g: number, b: number)
    constructor(...args: any[]) {
        if (typeof args[0] === 'number') {
            this.albedo = new Color(args[0], args[1], args[2]);
        } else {
            this.albedo = args[0];
        }
    }
    value(u: number, v: number, point: Vector3): Color {
        return this.albedo;
    }

    toJSON() {
        return {
            type: SolidColorTexture.type,
            albedo: this.albedo.toJSON()
        }
    }

    static fromJSON(opts: ReturnType<SolidColorTexture['toJSON']>) {
        assertEqual(opts.type, SolidColorTexture.type);
        return new SolidColorTexture(Color.fromJSON(opts.albedo));
    }
}

export class CheckerTexture implements Texture {
    static type = '_CheckerTexture';
    even: Texture;
    odd: Texture;
    inv_scale: number;
    constructor(scale: number, even: Texture, odd: Texture)
    constructor(scale: number, c1: Color, c2: Color)
    constructor(...args: any[]) {
        if (args[1] instanceof Color) {
            this.inv_scale = 1 / args[0];
            this.even = new SolidColorTexture(args[1]);
            this.odd = new SolidColorTexture(args[2]);
        } else {
            this.inv_scale = 1 / args[0];
            this.even = args[1];
            this.odd = args[2];
        }
    }
    value(u: number, v: number, point: Vector3): Color {
        const x_int = this.inv_scale * point.x >> 0;
        const y_int = this.inv_scale * point.y >> 0;
        const z_int = this.inv_scale * point.z >> 0;
        const isEven = (x_int + y_int + z_int) % 2 === 0;
        return isEven ? this.even.value(u, v, point) : this.odd.value(u, v, point);
    }

    toJSON() {
        return {
            type: CheckerTexture.type,
            scale: 1 / this.inv_scale,
            even: this.even.toJSON(),
            odd: this.odd.toJSON()
        }
    }
    static fromJSON(opts: ReturnType<CheckerTexture['toJSON']>): CheckerTexture {
        assertEqual(opts.type, CheckerTexture.type);
        return new CheckerTexture(
            opts.scale,
            textureFromJSON(opts.even),
            textureFromJSON(opts.odd)
        );
    }
}

export function textureFromJSON(opts: any) {
    switch (opts.type) {
        case Color.type:
            return new SolidColorTexture(Color.fromJSON(opts));
        case SolidColorTexture.type:
            return SolidColorTexture.fromJSON(opts);
        case CheckerTexture.type:
            return CheckerTexture.fromJSON(opts);
        default:
            throw new Error("无效的texture类型:" + opts.type);
    }
}