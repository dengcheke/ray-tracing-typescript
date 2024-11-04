import { clamp } from "lodash-es";
import { load_imagebitmap } from "./utils";
const isWorker = typeof importScripts !== 'undefined';
const canvas = isWorker ? new OffscreenCanvas(1, 1)
    : document.createElement('canvas');
const ctx = canvas.getContext("2d");

function get_image_bytes(img: ImageBitmap) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}

export class RtwImage {
    public src: string;

    private image_width: number;
    private image_height: number;
    private clamp_range: number[];
    private bdata: ImageData;

    constructor(src: string) {
        this.src = src;
    }

    get loaded() { return !!this.bdata }
    get width() { return this.image_width }
    get height() { return this.image_height }

    async load() {
        const img = await load_imagebitmap(this.src);
        this.image_width = img.width;
        this.image_height = img.height;
        this.clamp_range = [img.width - 1, img.height - 1];
        this.bdata = get_image_bytes(img);
    }

    pixel_data(x: number, y: number) {
        // Return the address of the three RGB bytes of the pixel at x,y. If there is no image
        // data, returns magenta.
        if (!this.bdata) return [255, 0, 255, 255];
        const [xmax, ymax] = this.clamp_range;
        x = clamp(x, 0, xmax);
        y = clamp(y, 0, ymax);
        const index = (y * this.image_width + x) * 4;
        const data = this.bdata.data;
        return [
            data[index],
            data[index + 1],
            data[index + 2],
            data[index + 3],
        ]
    }
}