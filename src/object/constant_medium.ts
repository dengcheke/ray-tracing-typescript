import { Interval } from "../interval";
import { IsotropicMaterial, Material, materialFromJSON } from "../material/material";
import { Texture, textureFromJSON } from "../material/texture";
import { Ray } from "../ray";
import { assertEqual, random } from "../utils";
import { Color, Vector3 } from "../vec3";
import { AABB } from "./aabb";
import { HitRecord, Hittable } from "./hittable";
import { objFromJson } from "./hittable-list";

export class ConstantMedium implements Hittable {
    static type = '_ConstantMedium';
    private _density: number;
    private _tex_or_albedo: Texture | Color;
    boundary: Hittable;
    neg_inv_density: number;
    phase_function: Material;

    constructor(boundary: Hittable, density: number, tex_or_albedo: Texture | Color) {
        this._density = density;
        this._tex_or_albedo = tex_or_albedo;
        this.boundary = boundary;
        this.neg_inv_density = -1 / density;
        this.phase_function = new IsotropicMaterial(tex_or_albedo);
    }

    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        const rec1 = this.boundary.hit(ray, Interval.Universe);
        if (!rec1) return false;

        const rec2 = this.boundary.hit(ray, new Interval(rec1.t + 0.0001, Infinity));
        if (!rec2) return false;

        if (rec1.t < ray_t.min) rec1.t = ray_t.min;
        if (rec2.t > ray_t.max) rec2.t = ray_t.max;

        if (rec1.t > rec2.t) return false;
        if (rec1.t < 0) rec1.t = 0;

        const ray_length = ray.dir.length();
        const distance_inside_boundary = (rec2.t - rec1.t) * ray_length;
        const hit_distance = this.neg_inv_density * Math.log(random());

        if (hit_distance > distance_inside_boundary) return false;

        const rec = new HitRecord();
        rec.t = rec1.t + hit_distance / ray_length;
        rec.p = ray.at(rec.t);
        rec.normal = new Vector3(1, 0, 0); //arbitrary
        rec.front_face = true; //also arbitrary
        rec.mat = this.phase_function;
        return rec;
    }

    bounding_box(): AABB {
        return this.boundary.bounding_box();
    }

    toJSON() {
        return {
            type: ConstantMedium.type,
            boundary: this.boundary.toJSON(),
            density: this._density,
            tex_or_albedo: this._tex_or_albedo.toJSON(),
        }
    }

    static fromJSON(opts: ReturnType<ConstantMedium['toJSON']>) {
        assertEqual(opts.type, ConstantMedium.type);
        return new ConstantMedium(
            objFromJson(opts.boundary),
            opts.density,
            opts.tex_or_albedo.type === Color.type ? Color.fromJSON(opts.tex_or_albedo) : textureFromJSON(opts.tex_or_albedo)
        );
    }
}