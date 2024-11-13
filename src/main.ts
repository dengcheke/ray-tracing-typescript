import { ref, watch } from "vue";
import { initWorker } from "./worker/initial";

import { Camera } from "./camera";
import { DiffuseLightMaterial, LambertianMaterial, Material } from "./material/material";
import { create_box, HittableList, Quad, Rotate_Y, Translate } from "./object/hittable";
import { Color, Vector3 } from "./vec3";
import CustomWorker from './worker/remote-client?worker';
type Client = ReturnType<typeof initWorker> & { _busy?: boolean };
const workers = [] as Client[];
const workerNum = Math.max(navigator.hardwareConcurrency - 2, 1);
for (let i = 0; i < workerNum; i++) {
    const worker = initWorker(new CustomWorker(), i);
    workers.push(worker);
}

function getScene() {
    const world = new HittableList();

    const red = new LambertianMaterial(new Color(0.65, 0.05, 0.05));
    const white = new LambertianMaterial(new Color(0.73, 0.73, 0.73));
    const green = new LambertianMaterial(new Color(0.12, 0.45, 0.15));

    const light = new DiffuseLightMaterial(new Color(15, 15, 15));

    [
        { Q: new Vector3(555, 0, 0), u: new Vector3(0, 0, 555), v: new Vector3(0, 555, 0), mat: green },
        { Q: new Vector3(0, 0, 555), u: new Vector3(0, 0, -555), v: new Vector3(0, 555, 0), mat: red },
        { Q: new Vector3(0, 555, 0), u: new Vector3(555, 0, 0), v: new Vector3(0, 0, 555), mat: white },
        { Q: new Vector3(0, 0, 555), u: new Vector3(555, 0, 0), v: new Vector3(0, 0, -555), mat: white },
        { Q: new Vector3(555, 0, 555), u: new Vector3(-555, 0, 0), v: new Vector3(0, 555, 0), mat: white },
        { Q: new Vector3(213, 554, 227), u: new Vector3(130, 0, 0), v: new Vector3(0, 0, 105), mat: light },
    ].forEach(({ Q, u, v, mat }) => {
        world.add(new Quad(Q, u, v, mat));
    });


    const box1 = create_box(new Vector3(0, 0, 0), new Vector3(165, 330, 165), white);
    world.add(new Translate(
        new Rotate_Y(box1, 15),
        new Vector3(265, 0, 295),
    ));

    const box2 = create_box(new Vector3(0, 0, 0), new Vector3(165, 165, 165), white);
    world.add(new Translate(
        new Rotate_Y(box2, -18),
        new Vector3(130, 0, 65),
    ));

    const empty_material = new Material();
    const lights = new Quad(
        new Vector3(343, 554, 332),
        new Vector3(-130, 0, 0),
        new Vector3(0, 0, -105),
        empty_material
    );

    const camera = new Camera({
        aspect_ratio: 1,
        image_width: 600,
        samples_per_pixel: 10,
        max_depth: 50,
        background: new Color(0, 0, 0),
        vfov: 40,
        lookfrom: new Vector3(278, 278, -800),
        lookat: new Vector3(278, 278, 0),
        vup: new Vector3(0, 1, 0),
        defocus_angle: 0
    });
    return { camera, world, lights }
}

const { world, camera, lights } = getScene();


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
                const lightsJSON = lights.toJSON();
                buildScenePromise = Promise.all(workers.map(w => w.buildScene(worldJSON, cameraJSON, lightsJSON)))
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
