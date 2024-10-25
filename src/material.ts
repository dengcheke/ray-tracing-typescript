import { HitRecord } from "./object"
import { Ray } from "./ray"
import { is_near_zero, reflect } from "./utils";
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
        let scatter_dir = new Vector3().randomDirection().add(hit_record.normal);
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
    constructor(public albedo: Color) { }
    scatter(ray_in: Ray, hit_record: HitRecord) {
        const reflect_dir = reflect(ray_in.dir, hit_record.normal);
        return {
            ray_scatter: new Ray(hit_record.p, reflect_dir),
            attenuation: this.albedo
        }
    }
}