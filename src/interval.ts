export class Interval {
    static Empty = new Interval(Infinity, -Infinity);
    static Universe = new Interval(-Infinity, Infinity);

    min: number;
    max: number;
    constructor()
    constructor(min: number, max: number)
    constructor(a: Interval, b: Interval)
    constructor(...args: any[]) {
        if (!args.length) {
            this.min = Infinity;
            this.max = -Infinity;
            return;
        }
        const first = args[0];
        if (typeof first === 'number') {
            this.min = args[0];
            this.max = args[1];
        } else {
            const [a, b] = args as Interval[];
            this.min = a.min <= b.min ? a.min : b.min;
            this.max = a.max >= b.max ? a.max : b.max;
        }
    };

    expand(delta: number) {
        const padding = delta / 2;
        this.min -= padding;
        this.max += padding;
        return this;
    }
    clamp(x: number) {
        if (x < this.min) return this.min;
        if (x > this.max) return this.max;
        return x;
    }
    size() {
        return this.max - this.min;
    }
    contains(x: number) {
        return x >= this.min && x <= this.max;
    }
    surrounds(x: number) {
        return x > this.min && x < this.max;
    }

    add_offset(dis: number) {
        this.min += dis;
        this.max += dis;
        return this;
    }

    clone() {
        return new Interval(this.min, this.max);
    }
}
