import { Interval } from "../interval";
import { IsotropicMaterial, Material, materialFromJSON } from "../material/material";
import { Texture, textureFromJSON } from "../material/texture";
import { ONB } from "../onb";
import { Pdf } from "../pdf";
import { Ray } from "../ray";
import { assertEqual, AXIS, deg_to_rad, random, random_int } from "../utils";
import { Color, Vector3 } from "../vec3";
import { AABB } from "./aabb";
export class ScatterRecord {
    attenuation: Color;
    pdf: Pdf;
    skip_pdf: boolean;
    skip_pdf_ray: Ray;
}
export class HitRecord {
    p: Vector3; //交点
    normal: Vector3; //法向量
    t: number; //射线t
    front_face: boolean;
    mat: Material; //材质
    //纹理坐标
    u: number;
    v: number;
    set_face_normal(ray: Ray, outward_normal: Vector3) {
        this.front_face = ray.dir.dot(outward_normal) < 0;
        this.normal = this.front_face ? outward_normal : outward_normal.clone().multiplyScalar(-1);
    }
}

export abstract class Hittable {
    abstract hit(ray: Ray, ray_t: Interval): false | HitRecord;
    abstract bounding_box(): AABB;
    abstract toJSON(): any;
    pdf_value(origin: Vector3, direction: Vector3) { return 0 }
    random(origin: Vector3) { return new Vector3(1, 0, 0) }
}

export class Translate extends Hittable {
    static type = '_Translate';
    offset: Vector3;
    object: Hittable;
    bbox: AABB;
    constructor(object: Hittable, offset: Vector3) {
        super();
        this.object = object;
        this.offset = offset;
        this.bbox = object.bounding_box().clone().add_offset(offset);
    }

    bounding_box(): AABB {
        return this.bbox;
    }
    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        // Move the ray backwards by the offset
        const offset_ray = new Ray(
            ray.origin.clone().sub(this.offset),
            ray.dir,
            ray.tm
        );
        // Determine whether an intersection exists along the offset ray (and if so, where)
        const hit = this.object.hit(offset_ray, ray_t)
        if (!hit) return false;

        hit.p.add(this.offset);

        return hit;
    }
    toJSON() {
        return {
            type: Translate.type,
            offset: this.offset.toJSON(),
            object: this.object.toJSON()
        }
    }

    static fromJSON(opts: ReturnType<Translate['toJSON']>) {
        assertEqual(Translate.type, opts.type);
        return new Translate(
            objFromJson(opts.object),
            Vector3.fromJSON(opts.offset)
        );
    }
}

export class Rotate_Y extends Hittable {
    static type = '_Rotate_Y';
    sin_theta: number;
    cos_theta: number;
    bbox: AABB;
    object: Hittable;
    angle: number;
    constructor(object: Hittable, angle: number) {
        super();
        this.angle = angle;
        this.object = object;
        const radians = deg_to_rad(angle);
        this.sin_theta = Math.sin(radians);
        this.cos_theta = Math.cos(radians);
        const bbox = object.bounding_box();

        const min = new Vector3(Infinity, Infinity, Infinity);
        const max = new Vector3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 2; k++) {
                    const x = i * bbox.x.max + (1 - i) * bbox.x.min;
                    const y = j * bbox.y.max + (1 - j) * bbox.y.min;
                    const z = k * bbox.z.max + (1 - k) * bbox.z.min;

                    const newx = this.cos_theta * x + this.sin_theta * z;
                    const newz = -this.sin_theta * x + this.cos_theta * z;

                    //
                    min.x = Math.min(min.x, newx);
                    min.y = Math.min(min.y, y);
                    min.z = Math.min(min.z, newz);
                    //
                    max.x = Math.max(max.x, newx);
                    max.y = Math.max(max.y, y);
                    max.z = Math.max(max.z, newz);
                }
            }
        }
        this.bbox = new AABB(min, max);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        // Transform the ray from world space to object space.
        const { cos_theta, sin_theta } = this;
        const origin = new Vector3(
            (cos_theta * ray.origin.x - sin_theta * ray.origin.z),
            ray.origin.y,
            (sin_theta * ray.origin.x + cos_theta * ray.origin.z)
        );
        const direction = new Vector3(
            cos_theta * ray.dir.x - sin_theta * ray.dir.z,
            ray.dir.y,
            sin_theta * ray.dir.x + cos_theta * ray.dir.z
        );

        const rotated_ray = new Ray(origin, direction, ray.tm);

        const hit = this.object.hit(rotated_ray, ray_t);
        if (!hit) return false;

        hit.p = new Vector3(
            cos_theta * hit.p.x + sin_theta * hit.p.z,
            hit.p.y,
            -sin_theta * hit.p.x + cos_theta * hit.p.z
        );

        hit.normal = new Vector3(
            cos_theta * hit.normal.x + sin_theta * hit.normal.z,
            hit.normal.y,
            -sin_theta * hit.normal.x + cos_theta * hit.normal.z
        );

        return hit;
    }

    toJSON() {
        return {
            type: Rotate_Y.type,
            object: this.object.toJSON(),
            angle: this.angle,
        }
    }

    static fromJSON(opts: ReturnType<Rotate_Y['toJSON']>) {
        assertEqual(opts.type, Rotate_Y.type);
        return new Rotate_Y(
            objFromJson(opts.object),
            opts.angle
        );
    }
}

export class HittableList extends Hittable {
    static type = '_HittableList';
    objects: Hittable[];
    bbox: AABB;

    constructor(object?: Hittable) {
        super();
        this.objects = [];
        this.bbox = new AABB();
        this.add(object);
    }
    pdf_value(origin: Vector3, direction: Vector3): number {
        const weight = 1 / this.objects.length;
        let sum = 0;
        for (let obj of this.objects) sum += obj.pdf_value(origin, direction);
        return sum;
    }

    random(origin: Vector3): Vector3 {
        const i = random_int(0, this.objects.length - 1);
        return this.objects[i].random(origin);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    add(obj: Hittable) {
        if (!obj) return this;
        this.objects.push(obj);
        this.bbox = new AABB(this.bbox, obj.bounding_box());
        return this;
    }

    hit(ray: Ray, ray_t: Interval): false | HitRecord {
        let hit_result = false as false | HitRecord;
        let closest_so_far = ray_t.max;
        for (let obj of this.objects) {
            const hit = obj.hit(ray, new Interval(ray_t.min, closest_so_far));
            if (hit) {
                closest_so_far = hit.t;
                hit_result = hit;
            }
        }
        return hit_result;
    }

    toJSON() {
        return {
            type: HittableList.type,
            objects: this.objects.map(i => i.toJSON())
        }
    }

    static fromJSON(opts: any) {
        assertEqual(opts.type, HittableList.type);
        const list = new HittableList();
        opts.objects.forEach((o: any) => {
            list.add(objFromJson(o));
        });
        return list;
    }
}

export class Quad extends Hittable {
    static type = '_Quad';
    Q: Vector3;
    u: Vector3;
    v: Vector3;
    area: number;
    material: Material;
    //
    bbox: AABB;
    normal: Vector3;
    D: number;
    w: Vector3;
    constructor(Q: Vector3, u: Vector3, v: Vector3, mat: Material) {
        super();
        this.Q = Q;
        this.u = u;
        this.v = v;
        this.material = mat;
        const n = u.clone().cross(v);
        this.area = n.length();
        this.normal = n.clone().normalize();
        this.D = this.normal.dot(Q);
        this.w = n.clone().divideScalar(n.dot(n));
        this.update_bbox();
    }

    private update_bbox() {
        const bbox_diagonal1 = new AABB(
            this.Q,
            this.Q.clone().add(this.u).add(this.v)
        );
        const bbox_diagonal2 = new AABB(
            this.Q.clone().add(this.u),
            this.Q.clone().add(this.v)
        );
        this.bbox = new AABB(bbox_diagonal1, bbox_diagonal2);
    }

    bounding_box(): AABB {
        return this.bbox;
    }

    pdf_value(origin: Vector3, direction: Vector3): number {
        const hit = this.hit(new Ray(origin, direction, 0), new Interval(0.001, Infinity));
        if (!hit) return 0;

        const distance_squared = hit.t * hit.t * direction.lengthSquared();
        const cos = Math.abs(direction.dot(hit.normal) / direction.length());
        return distance_squared / (cos * this.area);
    }
    random(origin: Vector3): Vector3 {
        return this.Q.clone()
            .addScaledVector(this.u, random())
            .addScaledVector(this.v, random())
            .sub(origin);
    }

    hit(ray: Ray, ray_t: Interval) {
        const denom = this.normal.dot(ray.dir);
        // No hit if the ray is parallel to the plane.
        if (Math.abs(denom) < 1e-8) return false;

        // Return false if the hit point parameter t is outside the ray interval.
        const t = (this.D - this.normal.dot(ray.origin)) / denom;
        if (!ray_t.contains(t)) return false;

        // Determine if the hit point lies within the planar shape using its plane coordinates.
        const intersection = ray.at(t);
        const planer_hitpr_vector = intersection.clone().sub(this.Q);
        const alpha = this.w.dot(planer_hitpr_vector.clone().cross(this.v));
        const beta = this.w.dot(this.u.clone().cross(planer_hitpr_vector));

        if (alpha < 0 || alpha > 1 || beta < 0 || beta > 1) return false;

        const rec = new HitRecord();
        rec.p = intersection;
        rec.t = t;
        rec.mat = this.material;
        rec.u = alpha;
        rec.v = beta;
        rec.set_face_normal(ray, this.normal);
        return rec;
    }

    toJSON() {
        return {
            type: Quad.type,
            Q: this.Q.toJSON(),
            u: this.u.toJSON(),
            v: this.v.toJSON(),
            material: this.material.toJSON()
        }
    }
    static fromJSON(opts: ReturnType<Quad['toJSON']>) {
        assertEqual(opts.type, Quad.type);
        return new Quad(
            Vector3.fromJSON(opts.Q),
            Vector3.fromJSON(opts.u),
            Vector3.fromJSON(opts.v),
            materialFromJSON(opts.material)
        );
    }
}

export class Sphere extends Hittable {
    static type = '_Sphere';

    bbox: AABB;
    center: Ray;
    radius: number;
    material: Material;

    constructor()
    constructor(static_center: Vector3, radius: number, material: Material)
    constructor(center1: Vector3, center2: Vector3, radius: number, material: Material)
    constructor(...args: any[]) {
        super();
        if (args.length === 0) return;
        if (typeof args[1] === 'number') {
            const [static_center, radius, material] = args;
            this.center = new Ray(static_center, new Vector3(0, 0, 0), 0);
            this.radius = radius;
            this.material = material;
        } else {
            const [center1, center2, radius, material] = args as [Vector3, Vector3, number, Material];
            this.center = new Ray(center1, center2.clone().sub(center1), 0);
            this.radius = radius;
            this.material = material;
        }
        this.update_bbox();
    }

    static get_sphere_uv(p: Vector3) {
        // p: a given point on the sphere of radius one, centered at the origin.
        // u: returned value [0,1] of angle around the Y axis from X=-1.
        // v: returned value [0,1] of angle from Y=-1 to Y=+1.
        //     <1 0 0> yields <0.50 0.50>       <-1  0  0> yields <0.00 0.50>
        //     <0 1 0> yields <0.50 1.00>       < 0 -1  0> yields <0.50 0.00>
        //     <0 0 1> yields <0.25 0.50>       < 0  0 -1> yields <0.75 0.50>
        const { x, y, z } = p;
        const theta = Math.acos(-y);
        const phi = Math.atan2(-z, x) + Math.PI;
        return [
            phi / (2 * Math.PI),
            theta / Math.PI
        ];
    }

    private update_bbox() {
        const { center, radius } = this;
        const rvec = new Vector3(radius, radius, radius);
        const box1 = new AABB(center.at(0).sub(rvec), center.at(0).add(rvec));
        const box2 = new AABB(center.at(1).sub(rvec), center.at(1).add(rvec));
        this.bbox = new AABB(box1, box2);
    }

    bounding_box(): AABB {
        return this.bbox
    }

    pdf_value(origin: Vector3, direction: Vector3): number {
        const hit = this.hit(new Ray(origin, direction, 0), new Interval(0.0001, Infinity));
        if (!hit) return 0;

        const distance_squared = this.center.at(0).sub(origin).lengthSquared();
        const cos_max = (1 - this.radius * this.radius / distance_squared) ** 0.5;
        const solid_angle = 2 * Math.PI * (1 - cos_max);
        return 1 / solid_angle;
    }
    random(origin: Vector3): Vector3 {
        const direction = this.center.at(0).sub(origin);
        const distance_squared = direction.lengthSquared();
        const uvw = new ONB(direction);
        return uvw.transform(Sphere.random_to_sphere(this.radius, distance_squared));
    }

    hit(ray: Ray, ray_t: Interval) {
        const current_center = this.center.at(ray.tm);
        const oc = current_center.clone().sub(ray.origin);
        const a = ray.dir.lengthSquared();
        const h = ray.dir.dot(oc);
        const c = oc.lengthSquared() - this.radius * this.radius;
        const discriminant = h * h - a * c;
        if (discriminant < 0) return false;

        const sqrtd = discriminant ** 0.5;
        let root = (h - sqrtd) / a;
        if (!ray_t.surrounds(root)) {
            root = (h + sqrtd) / a;
            if (!ray_t.surrounds(root)) {
                return false;
            }
        }
        const rec = new HitRecord();
        rec.t = root;
        rec.p = ray.at(rec.t);
        rec.mat = this.material;
        const outward_normal = rec.p.clone().sub(current_center).divideScalar(this.radius);
        rec.set_face_normal(ray, outward_normal);
        const uv = Sphere.get_sphere_uv(outward_normal);
        rec.u = uv[0];
        rec.v = uv[1];
        return rec;
    }

    static random_to_sphere(radius: number, distance_squared: number) {
        const r1 = random();
        const r2 = random();
        const cos_max = (1 - radius * radius / distance_squared) ** 0.5;
        const z = 1 + r2 * (cos_max - 1);
        const t = 2 * Math.PI * r1;
        const t1 = (1 - z ** 2) ** 0.5;
        return new Vector3(
            Math.cos(t) * t1,
            Math.sin(t) * t1,
            z
        );
    }
    toJSON() {
        return {
            type: Sphere.type,
            center: this.center.toJSON(),
            radius: this.radius,
            material: this.material.toJSON()
        }
    }

    static fromJSON(opts: any) {
        assertEqual(opts.type, Sphere.type);
        const s = new Sphere();
        s.center = Ray.fromJSON(opts.center);
        s.radius = opts.radius;
        s.material = materialFromJSON(opts.material);
        s.update_bbox();
        return s;
    }
}

export class ConstantMedium extends Hittable {
    static type = '_ConstantMedium';
    private _density: number;
    private _tex_or_albedo: Texture | Color;
    boundary: Hittable;
    neg_inv_density: number;
    phase_function: Material;

    constructor(boundary: Hittable, density: number, tex_or_albedo: Texture | Color) {
        super();
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

export class BvhNode extends Hittable {
    static type = '_BvhNode';
    private objects: Hittable[];
    left: Hittable;
    right: Hittable;
    bbox: AABB;

    constructor(objects: Hittable[]) {
        super();
        this.objects = objects;
        this.bbox = objects.reduce((box, object) => {
            box = new AABB(box, object.bounding_box());
            return box;
        }, AABB.Empty);
        const axis = this.bbox.longest_axis();

        const comparator = axis === AXIS.X
            ? BvhNode.box_x_compare
            : axis === AXIS.Y
                ? BvhNode.box_y_compare
                : BvhNode.box_z_compare;

        const len = objects.length;
        if (len === 1) {
            this.left = this.right = objects[0]
        } else if (len === 2) {
            this.left = objects[0];
            this.right = objects[1];
        } else {
            objects.sort(comparator);
            const mid = Math.floor(len / 2);
            this.left = new BvhNode(objects.slice(0, mid));
            this.right = new BvhNode(objects.slice(mid));
        }
    }

    hit(ray: Ray, ray_t: Interval) {
        if (!this.bbox.hit(ray, ray_t)) return false;

        const hit_left_result = this.left.hit(ray, ray_t);
        const hit_right_result = this.right.hit(
            ray,
            new Interval(
                ray_t.min,
                hit_left_result ? hit_left_result.t : ray_t.max
            )
        );
        //注意这里返回的是 hitRecord;
        return hit_right_result || hit_left_result;
    }


    bounding_box(): AABB {
        return this.bbox;
    }


    toJSON() {
        return {
            type: BvhNode.type,
            objects: this.objects.map(o => o.toJSON())
        }
    }

    static fromJSON(opts: ReturnType<BvhNode['toJSON']>) {
        assertEqual(opts.type, BvhNode.type);
        return new BvhNode(opts.objects.map(o => objFromJson(o)))
    }

    static box_compare(a: Hittable, b: Hittable, axis_index: number) {
        const a_axis_interval = a.bounding_box().get_axis_interval(axis_index);
        const b_axis_interval = b.bounding_box().get_axis_interval(axis_index);
        return a_axis_interval.min - b_axis_interval.min;

    }
    static box_x_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.X);
    }
    static box_y_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.Y);
    }
    static box_z_compare(a: Hittable, b: Hittable) {
        return BvhNode.box_compare(a, b, AXIS.Z);
    }
}

export function create_box(a: Vector3, b: Vector3, mat: Material) {
    const sides = new HittableList();
    const min = new Vector3(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.min(a.z, b.z),
    );
    const max = new Vector3(
        Math.max(a.x, b.x),
        Math.max(a.y, b.y),
        Math.max(a.z, b.z),
    );

    const dx = new Vector3(max.x - min.x, 0, 0);
    const dy = new Vector3(0, max.y - min.y, 0);
    const dz = new Vector3(0, 0, max.z - min.z);

    const ndx = dx.clone().multiplyScalar(-1);
    const ndz = dz.clone().multiplyScalar(-1);


    sides.add(new Quad(new Vector3(min.x, min.y, max.z), dx, dy, mat))//front
    sides.add(new Quad(new Vector3(max.x, min.y, max.z), ndz, dy, mat))//right
    sides.add(new Quad(new Vector3(max.x, min.y, min.z), ndx, dy, mat))//back
    sides.add(new Quad(new Vector3(min.x, min.y, min.z), dz, dy, mat))//left
    sides.add(new Quad(new Vector3(min.x, max.y, max.z), dx, ndz, mat))//top
    sides.add(new Quad(new Vector3(min.x, min.y, min.z), dx, dz, mat))//bottom

    return sides;
}


export function objFromJson(opts: any): Hittable {
    switch (opts.type) {
        case BvhNode.type: return BvhNode.fromJSON(opts);
        case Sphere.type: return Sphere.fromJSON(opts);
        case Quad.type: return Quad.fromJSON(opts);
        case Translate.type: return Translate.fromJSON(opts);
        case Rotate_Y.type: return Rotate_Y.fromJSON(opts);
        case HittableList.type: return HittableList.fromJSON(opts);
        case ConstantMedium.type: return ConstantMedium.fromJSON(opts);
        default: {
            throw new Error('无效的object类型:' + opts.type);
        }
    }
}