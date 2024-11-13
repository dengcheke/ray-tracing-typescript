import { Camera } from "../camera";
import { LambertianMaterial } from "../material/material";

import { CheckerTexture } from "../material/texture";
import { HittableList, Sphere } from "../object/hittable";
import { Color, Vector3 } from "../vec3";

export function scene_checkered_spheres() {
    const world = new HittableList();
    const checker = new CheckerTexture(0.32, new Color(0.2, 0.3, 0.1), new Color(0.9, 0.9, 0.9));
    world.add(new Sphere(new Vector3(0, -10, 0), 10, new LambertianMaterial(checker)));
    world.add(new Sphere(new Vector3(0, 10, 0), 10, new LambertianMaterial(checker)));

    const camera = new Camera({
        aspect_ratio: 16 / 9,
        image_width: 400,
        samples_per_pixel: 100,
        max_depth: 50,

        vfov: 20,
        lookfrom: new Vector3(13, 2, 3),
        lookat: new Vector3(0, 0, 0),
        vup: new Vector3(0, 1, 0),

        defocus_angle: 0
    });

    return { world, camera }
}