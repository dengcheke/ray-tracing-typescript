import seedrandom from "seedrandom";
import { Vector3 } from "./vec3";
import { assertEqual, fract } from "./utils";

export class Perlin {
    static type = "_Perlin";
    static point_count = 256;

    seed: string;
    private prng: seedrandom.PRNG;
    private randvec: Vector3[];
    private perm_x: number[];
    private perm_y: number[];
    private perm_z: number[];

    constructor(seed: string) {
        this.seed = seed;
        this.prng = seedrandom(seed);
        this.randvec = [];
        for (let i = 0; i < Perlin.point_count; i++) {
            this.randvec[i] = new Vector3(
                this.random(-1, 1),
                this.random(-1, 1),
                this.random(-1, 1),
            ).normalize();
        }
        this.perm_x = this.perlin_generate_perm();
        this.perm_y = this.perlin_generate_perm();
        this.perm_z = this.perlin_generate_perm();
    }

    noise(p: Vector3) {
        const u = fract(p.x);
        const v = fract(p.y);
        const w = fract(p.z);

        const i = Math.floor(p.x);
        const j = Math.floor(p.y);
        const k = Math.floor(p.z);

        const c = [[[], []], [[], []]] as Vector3[][][];

        for (let di = 0; di < 2; di++)
            for (let dj = 0; dj < 2; dj++)
                for (let dk = 0; dk < 2; dk++)
                    c[di][dj][dk] = this.randvec[
                        this.perm_x[(i + di) & 255] ^
                        this.perm_y[(j + dj) & 255] ^
                        this.perm_z[(k + dk) & 255]
                    ];

        return Perlin.trilinear_interp(c, u, v, w);
    }

    turb(p: Vector3, depth: number) {
        let accum = 0;
        const temp_p = p.clone();
        let weight = 1;

        for (let i = 0; i < depth; i++) {
            accum += weight * this.noise(temp_p);
            weight *= 0.5;
            temp_p.multiplyScalar(2);
        }
        return Math.abs(accum);
    }


    static hermite_cubic_interp(t: number) {
        //return t * t * t * (6 * t * t - 15 * t + 10);
        return t * t * (3 - 2 * t);
    }
    static trilinear_interp(c: Vector3[][][], u: number, v: number, w: number) {
        const uu = Perlin.hermite_cubic_interp(u);
        const vv = Perlin.hermite_cubic_interp(v);
        const ww = Perlin.hermite_cubic_interp(w);
        let accum = 0;
        const weight_v = new Vector3();
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                for (let k = 0; k < 2; k++) {
                    weight_v.set(u - i, v - j, w - k);
                    accum += (i * uu + (1 - i) * (1 - uu))
                        * (j * vv + (1 - j) * (1 - vv))
                        * (k * ww + (1 - k) * (1 - ww))
                        * weight_v.dot(c[i][j][k]);
                }


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