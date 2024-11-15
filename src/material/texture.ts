import { clamp } from "lodash-es";
import { RtwImage } from "./rtw-image";
import { assertEqual } from "../utils";
import { Color, Vector3 } from "../vec3";
import { Perlin } from "../perlin";

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
        const x_int = Math.floor(this.inv_scale * point.x);
        const y_int = Math.floor(this.inv_scale * point.y);
        const z_int = Math.floor(this.inv_scale * point.z);
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

export class ImageTexture implements Texture {
    static type = '_ImageTexture';
    private image: RtwImage;

    src: string;
    constructor(src: string) {
        this.src = src;
        this.image = new RtwImage(src);
    }

    load() {
        return this.image.load();
    }

    value(u: number, v: number, point: Vector3): Color {
        // If we have no texture data, then return solid cyan as a debugging aid.
        if (!this.image.loaded) return new Color(0, 1, 1);
        u = clamp(u, 0, 1);
        v = 1.0 - clamp(v, 0, 1); // Flip V to image coordinates
        const i = Math.floor(u * this.image.width);
        const j = Math.floor(v * this.image.height);
        const pixel = this.image.pixel_data(i, j);
        return new Color(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255);
    }

    toJSON() {
        return {
            type: ImageTexture.type,
            src: this.src,
        }
    }

    static fromJSON(opts: ReturnType<ImageTexture['toJSON']>) {
        assertEqual(opts.type, ImageTexture.type);
        return new ImageTexture(opts.src);
    }
}

export class NoiseTexture implements Texture {
    static type = '_NoiseTexture';
    private noise: Perlin;
    private scale: number;
    constructor(scale: number) {
        this.scale = scale;
        this.noise = new Perlin("perlin-noise-seed");
    }

    value(u: number, v: number, point: Vector3): Color {
        return new Color(1, 1, 1)
            .multiplyScalar(0.5)
            .multiplyScalar(
                1 + Math.sin(
                    this.scale * point.z + 10 * this.noise.turb(point, 7)
                )
            )
    }

    toJSON() {
        return {
            type: NoiseTexture.type,
            noise: this.noise.toJSON(),
            scale: this.scale,
        }
    }

    static fromJSON(opts: ReturnType<NoiseTexture['toJSON']>) {
        assertEqual(opts.type, NoiseTexture.type);
        return new NoiseTexture(opts.scale);
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
        case ImageTexture.type:
            return ImageTexture.fromJSON(opts);
        case NoiseTexture.type:
            return NoiseTexture.fromJSON(opts);
        default:
            throw new Error("无效的texture类型:" + opts.type);
    }
}