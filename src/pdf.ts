import { ONB } from "./onb";
import { random_cosine_direction, random_unit_direction } from "./utils";
import { Vector3 } from "./vec3";

export abstract class Pdf {
    abstract value(direction: Vector3): number;
    abstract generate(): Vector3;
}

export class SpherePdf extends Pdf {
    static _pdf = 1 / 4 / Math.PI;
    value(direction: Vector3): number {
        return SpherePdf._pdf;
    }
    generate(): Vector3 {
        return random_unit_direction();
    }
}


export class CosinePdf extends Pdf {
    private uvw: ONB;
    constructor(w: Vector3) {
        super();
        this.uvw = new ONB(w);
    }

    value(direction: Vector3): number {
        const cos = direction.clone().normalize().dot(this.uvw.w);
        return Math.max(0, cos / Math.PI);
    }

    generate(): Vector3 {
        return this.uvw.transform(random_cosine_direction());
    }
}