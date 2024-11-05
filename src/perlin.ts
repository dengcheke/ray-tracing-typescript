import seedrandom from "seedrandom";
import { Vector3 } from "./vec3";
import { assertEqual, fract } from "./utils";

export class Perlin {
    static type = "_Perlin";
    static point_count = 256;

    seed: string;
    private prng: seedrandom.PRNG;
    private randfloat: number[];
    private perm_x: number[];
    private perm_y: number[];
    private perm_z: number[];

    constructor(seed: string) {
        this.seed = seed;
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
        const u = Perlin.hermite_cubic_interp(fract(p.x));
        const v = Perlin.hermite_cubic_interp(fract(p.y));
        const w = Perlin.hermite_cubic_interp(fract(p.z));

        const i = Math.floor(p.x);
        const j = Math.floor(p.y);
        const k = Math.floor(p.z);

        const c = [[[], []], [[], []]] as number[][][];

        for (let di = 0; di < 2; di++)
            for (let dj = 0; dj < 2; dj++)
                for (let dk = 0; dk < 2; dk++)
                    c[di][dj][dk] = this.randfloat[
                        this.perm_x[(i + di) & 255] ^
                        this.perm_y[(j + dj) & 255] ^
                        this.perm_z[(k + dk) & 255]
                    ];

        return Perlin.trilinear_interp(c, u, v, w);
    }
    static hermite_cubic_interp(t: number) {
        //return t * t * t * (6 * t * t - 15 * t + 10);
        return t * t * (3 - 2 * t);
    }
    static trilinear_interp(c: number[][][], u: number, v: number, w: number) {
        let accum = 0;
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                for (let k = 0; k < 2; k++)
                    accum += (i * u + (1 - i) * (1 - u))
                        * (j * v + (1 - j) * (1 - v))
                        * (k * w + (1 - k) * (1 - w))
                        * c[i][j][k];

        return accum;
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
        return Math.floor(this.random(min, max + 1));
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