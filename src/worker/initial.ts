import { BuildScene_req, BuildScene_res, EventKey, RenderPixels_req, RenderPixels_res } from "./interface";

const getTaskId = (() => {
    let id = 1;
    return () => id++;
})();
export function initWorker(thread: Worker, id: number) {
    type Task<T> = {
        resolve: (data: T) => void;
        reject: (error: any) => void;
    }
    const taskMap = new Map<number, Task<any>>();
    thread.onmessage = e => {
        const data = e.data as BuildScene_res | RenderPixels_res;
        const item = taskMap.get(data.taskId);
        if (!item) return;
        if (data.success) {
            item.resolve(data.data);
        } else {
            item.reject(data.error);
        }
    }
    return {
        id,
        buildScene(worldJSON: any, cameraJSON: any) {
            const taskId = getTaskId();
            const { resolve, reject, promise } = Promise.withResolvers<void>();
            thread.postMessage({
                taskId,
                type: EventKey.构建场景,
                data: {
                    world: worldJSON,
                    camera: cameraJSON
                },
            } as BuildScene_req);
            taskMap.set(taskId, { resolve, reject });
            return promise;
        },
        renderPixels(pixelIndexs: number[]) {
            const taskId = getTaskId();
            const { resolve, reject, promise } = Promise.withResolvers<RenderPixels_res['data']>();
            thread.postMessage({
                taskId,
                type: EventKey.渲染像素,
                data: pixelIndexs,
            } as RenderPixels_req);
            taskMap.set(taskId, { resolve, reject });
            return promise;
        },
        close() {
            taskMap.clear();
            thread.terminate();
        }
    }
}