import { Camera, renderPixel } from "../camera";
import { LambertianMaterial, Material } from "../material/material";
import { BvhNode } from "../object/bvh";
import { HittableList } from "../object/hittable-list";
import { linearToSRGB } from "../utils";
import { BuildScene_req, BuildScene_res, EventKey, Message, RenderPixels_res } from "./interface";


let world: HittableList;
let bvh: BvhNode;
let camera: Camera;
self.onmessage = e => {
    const data = e.data as Message;
    const taskId = data.taskId;
    if (data.type === EventKey.构建场景) {
        try {
            world = HittableList.fromJSON(data.data.world);
            bvh = new BvhNode(world.objects);
            camera = Camera.fromJSON(data.data.camera);
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
                const py = index / camera.image_width >> 0;
                const px = index - py * camera.image_width;
                const color = renderPixel(camera, bvh, px, py);
                const data_index = (index - start) * 4;
                result[data_index] = linearToSRGB(color.r) * 255 >> 0;
                result[data_index + 1] = linearToSRGB(color.g) * 255 >> 0;
                result[data_index + 2] = linearToSRGB(color.b) * 255 >> 0;
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