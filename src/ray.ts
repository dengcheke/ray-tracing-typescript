import { assertEqual } from "./utils";
import { Vector3 } from "./vec3";

export class Ray {
    static type = '_Ray';
    origin: Vector3;
    dir: Vector3;
    norm_dir: Vector3; //归一化dir
    tm: number;
    constructor(
        origin: Vector3,
        direction: Vector3,
        time: number
    ) {
        this.origin = origin;
        this.dir = direction;
        this.norm_dir = direction.clone().normalize();
        this.tm = time;
    }

    at(t: number) {
        return this.origin
            .clone()
            .addScaledVector(this.dir, t);
    }

    toJSON() {
        return {
            type: Ray.type,
            origin: this.origin.toJSON(),
            dir: this.dir.toJSON(),
            tm: this.tm
        }
    }
    static fromJSON(opts: any) {
        assertEqual(opts.type, Ray.type);
        return new Ray(
            Vector3.fromJSON(opts.origin),
            Vector3.fromJSON(opts.dir),
            opts.tm
        );
    }
}