import { ref, watch } from "vue";
import { Camera } from "./camera";
import { DielectricMaterial, LambertianMaterial, MetalMaterial } from "./material";
import { Sphere } from "./object/sphere";
import { distance_between, random } from "./utils";
import { Color, Vector3 } from "./vec3";
import { initWorker } from "./worker/initial";

const world = new HittableList();

const mat_ground = new LambertianMaterial(new Color(0.5, 0.5, 0.5));
world.add(new Sphere(new Vector3(0, -1000, 0), 1000, mat_ground));

const p1 = new Vector3(4, 0.2, 0);
for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
        const choose_mat = Math.random();
        const center = new Vector3(
            a + 0.9 * Math.random(),
            0.2,
            b + 0.9 * Math.random()
        );
        if (distance_between(p1, center) > 0.9) {
            if (choose_mat < 0.8) {
                const albedo = new Color().random().multiply(new Color().random());
                const material = new LambertianMaterial(albedo);
                const center2 = center.clone();
                center2.y += random(0, 0.5);
                world.add(new Sphere(center, center2, 0.2, material));
            } else if (choose_mat < 0.95) {
                const albedo = new Color().random(0.5, 1);
                const fuzz = random(0, 0.5);
                const material = new MetalMaterial(albedo, fuzz);
                world.add(new Sphere(center, 0.2, material));
            } else {
                //glass
                world.add(new Sphere(center, 0.2, new DielectricMaterial(1.5)));
            }
        }
    }
}

const material1 = new DielectricMaterial(1.5);
world.add(new Sphere(new Vector3(0, 1, 0), 1, material1));

const material2 = new LambertianMaterial(new Color(0.4, 0.2, 0.1));
world.add(new Sphere(new Vector3(-4, 1, 0), 1, material2));

const material3 = new MetalMaterial(new Color(0.7, 0.6, 0.5), 0);
world.add(new Sphere(new Vector3(4, 1, 0), 1, material3));

const camera = new Camera({
    aspect_ratio: 16 / 9,
    image_width: 400,
    samples_per_pixel: 100,
    max_depth: 50,

    vfov: 20,
    lookfrom: new Vector3(13, 2, 3),
    lookat: new Vector3(0, 0, 0),
    vup: new Vector3(0, 1, 0),

    defocus_angle: 0.6,
    focus_dist: 10,
});


import CustomWorker from './worker/remote-client?worker';
import { HittableList } from "./object/hittable-list";
type Client = ReturnType<typeof initWorker> & { _busy?: boolean };
const workers = [] as Client[];
const workerNum = Math.max(navigator.hardwareConcurrency / 2, 1);
for (let i = 0; i < workerNum; i++) {
    const worker = initWorker(new CustomWorker(), i);
    workers.push(worker);
}

const worldJSON = world.toJSON();
const cameraJSON = camera.toJSON();
const div = document.body.querySelector('#info');
const btn = document.body.querySelector('#button');

let renderer: ReturnType<typeof createRenderer>;
btn.addEventListener('click', () => {
    if (!renderer) {
        renderer = createRenderer();
    }
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
        const row_index = start / image_width >> 0;
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