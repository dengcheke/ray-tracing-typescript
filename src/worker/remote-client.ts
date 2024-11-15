import { Camera, renderPixel } from "../camera";
import { LambertianMaterial, Material } from "../material/material";
import { BvhNode, HittableList, objFromJson } from "../object/hittable";
import { linearToSRGB } from "../utils";
import { BuildScene_res, EventKey, Message, RenderPixels_res } from "./interface";


let world: HittableList;
let bvh: BvhNode;
let camera: Camera;
let lights: HittableList;
self.onmessage = e => {
    const data = e.data as Message;
    const taskId = data.taskId;
    if (data.type === EventKey.构建场景) {
        try {
            world = HittableList.fromJSON(data.data.world);
            bvh = new BvhNode(world.objects);
            camera = Camera.fromJSON(data.data.camera);
            lights = HittableList.fromJSON(data.data.lights);
            Promise.all(load_material(world)).then(() => {
                self.postMessage({
                    taskId,
                    type: EventKey.回复构建场景,
                    success: true,
                } as BuildScene_res);
            }).catch(e => {
                throw e;
            });
        } catch (e) {
            self.postMessage({
                taskId,
                type: EventKey.回复构建场景,
                success: false,
                error: e,
            } as BuildScene_res);
        }
    } else if (data.type === EventKey.渲染像素) {
        try {
            const [start, end] = data.data;
            const len = end - start;
            const result = new Uint8ClampedArray(len * 4);
            for (let index = start; index < end; index++) {
                const py = Math.floor(index / camera.image_width);
                const px = index - py * camera.image_width;
                const color = renderPixel(camera, bvh, lights, px, py);
                const data_index = (index - start) * 4;
                color.r = isNaN(color.r) ? 0 : color.r;
                color.g = isNaN(color.g) ? 0 : color.g;
                color.b = isNaN(color.b) ? 0 : color.b;
                result[data_index] = Math.floor(linearToSRGB(color.r) * 255);
                result[data_index + 1] = Math.floor(linearToSRGB(color.g) * 255);
                result[data_index + 2] = Math.floor(linearToSRGB(color.b) * 255);
                result[data_index + 3] = 255;
            }
            self.postMessage({
                taskId,
                type: EventKey.回复渲染像素,
                data: result,
                success: true,
            } as RenderPixels_res, [result.buffer]);
        } catch (e) {
            self.postMessage({
                taskId,
                type: EventKey.回复渲染像素,
                data: null,
                success: false,
                error: e
            } as RenderPixels_res);
        }
    }
}

function load_material(world: HittableList) {
    return world.objects.map(obj => {
        if ('material' in obj) {
            const mat = obj.material as Material;
            return mat instanceof LambertianMaterial ? mat.load() : null;
        }
    });
}