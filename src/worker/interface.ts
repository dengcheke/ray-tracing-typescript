export enum EventKey {
    '构建场景' = 1,
    "回复构建场景" = 2,
    "渲染像素" = 3,
    "回复渲染像素" = 4
}

export interface EventBase {
    taskId: number;
    success: boolean;
    error?: any;
}

export interface BuildScene_req extends EventBase {
    type: EventKey.构建场景,
    data: {
        world: any,
        camera: any
    }
}

export interface BuildScene_res extends EventBase {
    type: EventKey.回复构建场景,
    data: void,
}

export interface RenderPixels_req extends EventBase {
    type: EventKey.渲染像素,
    data: [number, number], //像素索引 start end; 
}

export interface RenderPixels_res extends EventBase {
    type: EventKey.回复渲染像素,
    data: Uint8ClampedArray
}

export type Message = BuildScene_req | BuildScene_res | RenderPixels_req | RenderPixels_res;
