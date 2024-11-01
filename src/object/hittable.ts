import { Interval } from "../interval";
import { Material } from "../material";
import { Ray } from "../ray";
import { Vector3 } from "../vec3";
import { AABB } from "./aabb";
export class HitRecord {
    p: Vector3; //交点
    normal: Vector3; //法向量
    t: number; //射线t
    front_face: boolean;
    mat: Material; //材质
    set_face_normal(ray: Ray, outward_normal: Vector3) {
        this.front_face = ray.dir.dot(outward_normal) < 0;
        this.normal = this.front_face ? outward_normal : outward_normal.clone().multiplyScalar(-1);
    }
}

export interface Hittable {
    hit(ray: Ray, ray_t: Interval): false | HitRecord;
    bounding_box(): AABB;
    toJSON(): any;
}