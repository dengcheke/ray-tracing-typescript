import { ref, watch } from "vue";
import { initWorker } from "./worker/initial";

import CustomWorker from './worker/remote-client?worker';
import { scene_bouncing_shperes } from "./scene/bouncing_sphere";
import { scene_checkered_spheres } from "./scene/checkered_spheres";
import { scene_earth } from "./scene/earth";
import { scene_perlin_spheres } from "./scene/perlin_sphere";
import { scene_quads } from "./scene/quads";
import { scene_simple_light } from "./scene/simple-light";
type Client = ReturnType<typeof initWorker> & { _busy?: boolean };
const workers = [] as Client[];
const workerNum = Math.max(navigator.hardwareConcurrency / 2, 1);
for (let i = 0; i < workerNum; i++) {
    const worker = initWorker(new CustomWorker(), i);
    workers.push(worker);
}

function getScene() {
    const n = 6 as number;
    switch (n) {
        case 1: return scene_bouncing_shperes();
        case 2: return scene_checkered_spheres();
        case 3: return scene_earth();
        case 4: return scene_perlin_spheres();
        case 5: return scene_quads();
        case 6: return scene_simple_light();
    }
}

const { world, camera } = getScene();


const div = document.body.querySelector('#info');
const btn = document.body.querySelector('#button');

const renderer = createRenderer();
btn.addEventListener('click', () => {
    if (renderer.running) {
        btn.innerHTML = '开始';
        renderer.stop();
    } else {
        btn.innerHTML = '暂停';
        renderer.start();
    }
});

function createRenderer() {
    const { image_height, image_width } = camera;
    /////
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
    canvas.width = image_width;
    canvas.height = image_height;
    const allPixelNums = image_width * image_height;
    const renderPixelCount = ref(0);
    watch(() => renderPixelCount.value, v => {
        div.innerHTML = `${v}/${allPixelNums}`;
    });

    const step_forward = 50;

    let rafFlag = false;
    let curIndex = 0;
    let running = false;
    let buildScenePromise: Promise<any>;

    type T = { dxdy: number[], imageData: ImageData };
    const commits = [] as T[];
    return {
        get running() { return running },
        start() {
            if (running) return;
            running = true;
            if (!buildScenePromise) {
                const worldJSON = world.toJSON();
                const cameraJSON = camera.toJSON();
                buildScenePromise = Promise.all(workers.map(w => w.buildScene(worldJSON, cameraJSON)))
            }
            buildScenePromise.then(() => {
                workers.forEach(w => assignTask(w));
            });
        },
        stop() {
            if (!running) return;
            running = false;
        }
    }

    function assignTask(w: Client) {
        if (!running) return;
        if (w._busy) return;
        if (curIndex >= allPixelNums) return;
        w._busy = true;
        const start = curIndex;
        const row_index = Math.floor(start / image_width);
        const max_index = (row_index + 1) * image_width;
        const end = curIndex = Math.min(start + step_forward, max_index);
        const dxdy = [start - row_index * image_width, row_index];
        w.renderPixels([start, end]).then(pixel_data => {
            const imageData = genImage(pixel_data);
            renderPixelCount.value += end - start;
            requestRender({ dxdy, imageData });
        }).finally(() => {
            w._busy = false;
            assignTask(w);
        });
    }

    function genImage(pixel_data: Uint8ClampedArray) {
        const pixel_count = pixel_data.length / 4;
        const imageData = ctx.createImageData(pixel_count, 1);
        const arrbuffer = imageData.data;
        arrbuffer.set(pixel_data);
        return imageData;
    }

    function requestRender(opts: T) {
        commits.push(opts);
        if (rafFlag) return;
        rafFlag = true;
        requestAnimationFrame(() => {
            const copys = [...commits];
            commits.length = 0;
            copys.forEach(item => {
                ctx.putImageData(item.imageData, item.dxdy[0], item.dxdy[1]);
            });
            rafFlag = false;
        });
    }
}