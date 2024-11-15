import { HitRecord, ScatterRecord } from "../object/hittable";
import { ONB } from "../onb";
import { CosinePdf, SpherePdf } from "../pdf";
import { Ray } from "../ray";
import { assertEqual, random_cosine_direction, random_unit_direction, reflect, reflectance, refract, Serializable } from "../utils";
import { Color, Vector3 } from "../vec3";
import { ImageTexture, SolidColorTexture, Texture, textureFromJSON } from "./texture";

export class Material implements Serializable {
    static type = '_Material'
    toJSON() {
        return { type: Material.type }
    }
    scatter(ray_in: Ray, hit_record: HitRecord): false | ScatterRecord {
        return false;
    }
    scattering_pdf(ray_in: Ray, hit_record: HitRecord, scattered: Ray) {
        return 0;
    }
    emitted(
        ray_in: Ray,
        hit_record: HitRecord,
        u: number,
        v: number,
        p: Vector3
    ) {
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
    scattering_pdf(ray_in: Ray, hit_record: HitRecord, scattered: Ray): number {
        const cos = hit_record.normal.dot(scattered.norm_dir);
        return cos < 0 ? 0 : cos / Math.PI;
    }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const result = new ScatterRecord();
        result.attenuation = this.tex.value(hit_record.u, hit_record.v, hit_record.p);
        result.pdf = new CosinePdf(hit_record.normal);
        result.skip_pdf = false;
        return result;
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
        const reflect_dir = reflect(ray_in.dir, hit_record.normal)
            .normalize()
            .addScaledVector(random_unit_direction(), this.fuzz);
        const result = new ScatterRecord();
        result.attenuation = this.albedo;
        result.pdf = null;
        result.skip_pdf = true;
        result.skip_pdf_ray = new Ray(hit_record.p, reflect_dir, ray_in.tm);
        return result;
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
        const result = new ScatterRecord();

        result.attenuation = DielectricMaterial.Attenuation;
        result.pdf = null;
        result.skip_pdf = true;
        result.skip_pdf_ray = new Ray(hit_record.p, refract_dir, ray_in.tm);
        return result;
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

    emitted(ray_in: Ray, hit_record: HitRecord, u: number, v: number, p: Vector3): Color {
        if (!hit_record.front_face) return new Color(0, 0, 0);
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

export class IsotropicMaterial extends Material {
    static type = '_IsotropicMaterial';
    static _pdf = 1 / 4 / Math.PI;
    tex: Texture;
    constructor(albedo_or_texture: Texture | Color) {
        super();
        if (albedo_or_texture instanceof Color) {
            this.tex = new SolidColorTexture(albedo_or_texture);
        } else {
            this.tex = albedo_or_texture;
        }
    }
    scattering_pdf(ray_in: Ray, hit_record: HitRecord, scattered: Ray): number {
        return IsotropicMaterial._pdf
    }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const result = new ScatterRecord();
        result.attenuation = this.tex.value(hit_record.u, hit_record.v, hit_record.p);
        result.pdf = new SpherePdf();
        result.skip_pdf = false;
        return result;
    }
    toJSON() {
        return {
            type: IsotropicMaterial.type,
            tex: this.tex.toJSON()
        }
    }

    static fromJSON(opts: ReturnType<IsotropicMaterial['toJSON']>) {
        assertEqual(opts.type, IsotropicMaterial.type);
        return new IsotropicMaterial(textureFromJSON(opts.tex));
    }
}


export function materialFromJSON(opts: any) {
    switch (opts.type) {
        case Material.type:
            return new Material();
        case LambertianMaterial.type:
            return LambertianMaterial.fromJSON(opts);
        case MetalMaterial.type:
            return MetalMaterial.fromJSON(opts);
        case DielectricMaterial.type:
            return DielectricMaterial.fromJSON(opts);
        case DiffuseLightMaterial.type:
            return DiffuseLightMaterial.fromJSON(opts);
        case IsotropicMaterial.type:
            return IsotropicMaterial.fromJSON(opts);
        default:
            throw new Error("错误的material类型:" + opts.type);
    }
}
