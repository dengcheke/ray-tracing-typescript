import { HitRecord } from "../object/hittable";
import { Ray } from "../ray";
import { assertEqual, is_near_zero, random_unit_direction, reflect, reflectance, refract } from "../utils";
import { Color, Vector3 } from "../vec3";
import { ImageTexture, SolidColorTexture, Texture, textureFromJSON } from "./texture";

export abstract class Material {
    scatter(ray_in: Ray, hit_record: HitRecord): false | {
        ray_scatter: Ray, attenuation: Color
    } {
        return false;
    }
    abstract toJSON(): any;
    emitted(u: number, v: number, p: Vector3) {
        return new Color(0, 0, 0);
    }
}

export class LambertianMaterial extends Material {
    static type = '_LambertianMaterial'
    tex: Texture;

    constructor(albedo_or_tex: Color | Texture) {
        super();
        if (albedo_or_tex instanceof Color) {
            this.tex = new SolidColorTexture(albedo_or_tex);
        } else {
            this.tex = albedo_or_tex;
        }
    }
    load() {
        if (this.tex instanceof ImageTexture) {
            return this.tex.load();
        } else {
            return Promise.resolve();
        }
    }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        let scatter_dir = random_unit_direction().add(hit_record.normal);
        if (is_near_zero(scatter_dir)) {
            scatter_dir = hit_record.normal;
        }
        const attenuation = this.tex.value(hit_record.u, hit_record.v, hit_record.p);
        return {
            ray_scatter: new Ray(hit_record.p, scatter_dir, ray_in.tm),
            attenuation
        }
    }
    toJSON() {
        return {
            type: LambertianMaterial.type,
            tex: this.tex.toJSON()
        }
    }
    static fromJSON(opts: any) {
        assertEqual(opts.type, LambertianMaterial.type);
        return new LambertianMaterial(textureFromJSON(opts.tex));
    }
}

export class MetalMaterial extends Material {
    static type = '_MetalMaterial'
    constructor(public albedo: Color, public fuzz: number) { super() }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const reflect_dir = reflect(ray_in.dir, hit_record.normal);
        reflect_dir.normalize()
            .addScaledVector(random_unit_direction(), this.fuzz);
        if (reflect_dir.dot(hit_record.normal) <= 0) return false;
        return {
            ray_scatter: new Ray(hit_record.p, reflect_dir, ray_in.tm),
            attenuation: this.albedo
        }
    }
    toJSON() {
        return {
            type: MetalMaterial.type,
            albedo: this.albedo.toJSON(),
            fuzz: this.fuzz
        }
    }
    static fromJSON(opts: any) {
        assertEqual(opts.type, MetalMaterial.type);
        return new MetalMaterial(Color.fromJSON(opts.albedo), opts.fuzz);
    }
}


export class DielectricMaterial extends Material {
    static type = '_DielectricMaterial';
    static Attenuation = new Color(1, 1, 1);
    // Refractive index in vacuum or air, or the ratio of the material's refractive index over
    // the refractive index of the enclosing media
    constructor(public refraction_index: number) { super() }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const ri = hit_record.front_face ? (1 / this.refraction_index) : this.refraction_index;
        const cos_theta = Math.min(-ray_in.norm_dir.dot(hit_record.normal), 1);
        const sin_theta = Math.sqrt(1 - cos_theta * cos_theta);

        const cannot_refract = sin_theta * ri > 1;

        const refract_dir = cannot_refract || (reflectance(cos_theta, ri) > Math.random())
            ? reflect(ray_in.norm_dir, hit_record.normal)
            : refract(ray_in.norm_dir, hit_record.normal, ri);
        return {
            ray_scatter: new Ray(hit_record.p, refract_dir, ray_in.tm),
            attenuation: DielectricMaterial.Attenuation,
        }
    }
    toJSON() {
        return {
            type: DielectricMaterial.type,
            refraction_index: this.refraction_index
        }
    }
    static fromJSON(opts: any) {
        assertEqual(opts.type, DielectricMaterial.type);
        return new DielectricMaterial(opts.refraction_index);
    }
}

export class DiffuseLightMaterial extends Material {
    static type = '_DiffuseLightMaterial';
    tex: Texture;
    constructor(tex: Texture)
    constructor(emit: Color)
    constructor(emit_or_tex: Color | Texture) {
        super();
        if (emit_or_tex instanceof Color) {
            this.tex = new SolidColorTexture(emit_or_tex);
        } else {
            this.tex = emit_or_tex;
        }
    }
   
    emitted(u: number, v: number, p: Vector3): Color {
        return this.tex.value(u, v, p);
    }

    toJSON() {
        return {
            type: DiffuseLightMaterial.type,
            tex: this.tex.toJSON()
        }
    }
    static fromJSON(opts: ReturnType<DiffuseLightMaterial['toJSON']>) {
        assertEqual(opts.type, DiffuseLightMaterial.type);
        return new DiffuseLightMaterial(textureFromJSON(opts.tex));
    }
}


export function materialFromJSON(opts: any) {
    switch (opts.type) {
        case LambertianMaterial.type:
            return LambertianMaterial.fromJSON(opts);
        case MetalMaterial.type:
            return MetalMaterial.fromJSON(opts);
        case DielectricMaterial.type:
            return DielectricMaterial.fromJSON(opts);
        case DiffuseLightMaterial.type:
            return DiffuseLightMaterial.fromJSON(opts);
        default:
            throw new Error("错误的material类型:" + opts.type);
    }
}
