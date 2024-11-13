import { Hittable } from "./object/hittable";
import { ONB } from "./onb";
import { random, random_cosine_direction, random_unit_direction } from "./utils";
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


export class HittablePdf extends Pdf {
    private objects: Hittable;
    private origin: Vector3;
    constructor(objects: Hittable, origin: Vector3) {
        super();
        this.objects = objects;
        this.origin = origin;
    }

    value(direction: Vector3): number {
        return this.objects.pdf_value(this.origin, direction)
    }
    generate(): Vector3 {
        return this.objects.random(this.origin);
    }
}

export class MixturePdf extends Pdf {
    p: Pdf[];
    constructor(p0: Pdf, p1: Pdf) {
        super();
        this.p = [p0, p1];
    }
    value(direction: Vector3): number {
        return 0.5 * this.p[0].value(direction) + 0.5 * this.p[1].value(direction)
    }
    generate(): Vector3 {
        if(random() < 0.5) {
            return this.p[0].generate()
        }else{
            return this.p[1].generate()
        }
    }
}