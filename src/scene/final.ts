import { Camera } from "../camera";
import { DielectricMaterial, DiffuseLightMaterial, LambertianMaterial, MetalMaterial } from "../material/material";
import { ImageTexture, NoiseTexture } from "../material/texture";
import { BvhNode, ConstantMedium, create_box, Hittable, HittableList, Quad, Rotate_Y, Sphere, Translate } from "../object/hittable";

import { random, resolve_image_url } from "../utils";
import { Color, Vector3 } from "../vec3";

export function scene_final(
    image_width?: number,
    samples_per_pixel?: number,
    max_depth?: number
) {
    const boxes1 = [] as Hittable[];
    const ground = new LambertianMaterial(new Color(0.48, 0.83, 0.53));

    const boxes_per_side = 20;
    const w = 100;
    for (let i = 0; i < boxes_per_side; i++) {
        for (let j = 0; j < boxes_per_side; j++) {
            const x0 = -1000 + i * w;
            const z0 = -1000 + j * w;
            const y0 = 0;
            const x1 = x0 + w;
            const y1 = random(1, 101);
            const z1 = z0 + w;
            boxes1.push(create_box(
                new Vector3(x0, y0, z0),
                new Vector3(x1, y1, z1),
                ground
            ));
        }
    }

    const world = new HittableList();
    world.add(new BvhNode(boxes1));

    const light = new DiffuseLightMaterial(new Color(7, 7, 7));
    world.add(new Quad(
        new Vector3(123, 554, 147),
        new Vector3(300, 0, 0),
        new Vector3(0, 0, 265),
        light
    ));

    const center1 = new Vector3(400, 400, 200);
    const center2 = center1.clone().add(new Vector3(30, 0, 0));
    const sphere_material = new LambertianMaterial(new Color(0.7, 0.3, 0.1));
    world.add(new Sphere(center1, center2, 50, sphere_material));

    world.add(new Sphere(new Vector3(260, 150, 45), 50, new DielectricMaterial(1.5)));
    world.add(new Sphere(new Vector3(0, 150, 145), 50, new MetalMaterial(new Color(0.8, 0.8, 0.9), 1.0)));


    const boundary = new Sphere(new Vector3(360, 150, 145), 70, new DielectricMaterial(1.5));
    world.add(boundary);
    world.add(new ConstantMedium(boundary, 0.2, new Color(0.2, 0.4, 0.9)));

    const boundary2 = new Sphere(new Vector3(0, 0, 0), 5000, new DielectricMaterial(1.5));
    world.add(new ConstantMedium(boundary2, 0.0001, new Color(1, 1, 1)));

    const emat = new LambertianMaterial(new ImageTexture(resolve_image_url("./earthmap.jpg")))
    world.add(new Sphere(new Vector3(400, 200, 400), 100, emat));

    const pertext = new NoiseTexture(0.2);
    world.add(new Sphere(new Vector3(220, 280, 300), 80, new LambertianMaterial(pertext)));

    const boxes2 = [] as Hittable[];
    const white = new LambertianMaterial(new Color(0.73, 0.73, 0.73));
    for (let i = 0; i < 1000; i++) {
        boxes2.push(new Sphere(new Vector3().random(0, 165), 10, white));
    }
    world.add(new Translate(
        new Rotate_Y(
            new BvhNode(boxes2),
            15,
        ),
        new Vector3(-100, 270, 395)
    ));

    const camera = new Camera({
        aspect_ratio: 1,
        image_width: image_width,
        samples_per_pixel: samples_per_pixel,
        max_depth: max_depth,
        background: new Color(0, 0, 0),

        vfov: 40,
        lookfrom: new Vector3(478, 278, -600),
        lookat: new Vector3(278, 278, 0),
        vup: new Vector3(0, 1, 0),
        defocus_angle: 0
    });

    return { world, camera }
}