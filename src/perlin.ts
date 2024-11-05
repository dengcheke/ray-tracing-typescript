import seedrandom from "seedrandom";
import { Vector3 } from "./vec3";
import { assertEqual } from "./utils";

export class Perlin {
    static type = "_Perlin";
    static point_count = 256;

    seed: string;
    private prng: seedrandom.PRNG;
    private randfloat: number[];
    private perm_x: number[];
    private perm_y: number[];
    private perm_z: number[];

    constructor(seed?: string) {
        this.seed = seed || (new Date().getTime() + '');
        this.prng = seedrandom(seed);
        this.randfloat = [];
        for (let i = 0; i < Perlin.point_count; i++) {
            this.randfloat[i] = this.random();
        }
        this.perm_x = this.perlin_generate_perm();
        this.perm_y = this.perlin_generate_perm();
        this.perm_z = this.perlin_generate_perm();
    }

    noise(p: Vector3) {
        const i = (4 * p.x >> 0) & 255;
        const j = (4 * p.y >> 0) & 255;
        const k = (4 * p.z >> 0) & 255;
        return this.randfloat[
            this.perm_x[i] ^ this.perm_y[j] ^ this.perm_z[k]
        ];
    }

    toJSON() {
        return {
            type: Perlin.type,
            seed: this.seed,
        }
    }

    static fromJSON(opts: ReturnType<Perlin['toJSON']>) {
        assertEqual(opts.type, Perlin.type);
        return new Perlin(opts.seed);
    }

    private random(min = 0, max = 1) {
        return (max - min) * this.prng() + min;
    }

    private random_int(min: number, max: number) {
        return this.random(min, max + 1) >> 0;
    }

    private perlin_generate_perm() {
        const p = [];
        for (let i = 0; i < Perlin.point_count; i++) p[i] = i;
        this.permute(p, Perlin.point_count);
        return p;
    }

    private permute(p: number[], n: number) {
        for (let i = n - 1; i > 0; i--) {
            const target = this.random_int(0, i);
            const temp = p[i];
            p[i] = p[target];
            p[target] = temp;
        }
    }
}