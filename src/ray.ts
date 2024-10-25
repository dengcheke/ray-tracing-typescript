import { Vector3 } from "./vec3";

export class Ray {
    origin: Vector3;
    dir: Vector3;
    norm_dir: Vector3; //归一化dir
    constructor(
        origin: Vector3,
        direction: Vector3
    ) {
        this.origin = origin;
        this.dir = direction;
        this.norm_dir = direction.clone().normalize();
    }

    at(t: number, normal = true) {
        return this.origin
            .clone()
            .addScaledVector(
                normal ? this.norm_dir : this.dir,
                t
            );
    }
}