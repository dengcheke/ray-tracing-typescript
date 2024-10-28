import { HitRecord } from "./object"
import { Ray } from "./ray"
import { is_near_zero, random_unit_direction, reflect, reflectance, refract } from "./utils";
import { Color, Vector3 } from "./vec3";

export interface Material {
    scatter(
        ray_in: Ray,
        hit_record: HitRecord,
    ): false | {
        ray_scatter: Ray,
        attenuation: Color
    };
}


export class LambertianMaterial implements Material {
    constructor(public albedo: Color) { };
    scatter(ray_in: Ray, hit_record: HitRecord) {
        let scatter_dir = random_unit_direction().add(hit_record.normal);
        if (is_near_zero(scatter_dir)) {
            scatter_dir = hit_record.normal;
        }
        return {
            ray_scatter: new Ray(hit_record.p, scatter_dir),
            attenuation: this.albedo
        }
    }
}

export class MetalMaterial implements Material {
    constructor(public albedo: Color, public fuzz: number) { }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const reflect_dir = reflect(ray_in.dir, hit_record.normal);
        reflect_dir.normalize()
            .addScaledVector(random_unit_direction(), this.fuzz);
        if (reflect_dir.dot(hit_record.normal) <= 0) return false;
        return {
            ray_scatter: new Ray(hit_record.p, reflect_dir),
            attenuation: this.albedo
        }
    }
}


export class DielectricMaterial implements Material {
    static Attenuation = new Color(1, 1, 1);
    // Refractive index in vacuum or air, or the ratio of the material's refractive index over
    // the refractive index of the enclosing media
    constructor(public refraction_index: number) { }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const ri = hit_record.front_face ? (1 / this.refraction_index) : this.refraction_index;
        const cos_theta = Math.min(-ray_in.norm_dir.dot(hit_record.normal), 1);
        const sin_theta = Math.sqrt(1 - cos_theta * cos_theta);

        const cannot_refract = sin_theta * ri > 1;

        const refract_dir = cannot_refract || (reflectance(cos_theta, ri) > Math.random())
            ? reflect(ray_in.norm_dir, hit_record.normal)
            : refract(ray_in.norm_dir, hit_record.normal, ri);
        return {
            ray_scatter: new Ray(hit_record.p, refract_dir),
            attenuation: DielectricMaterial.Attenuation
        }
    }
}