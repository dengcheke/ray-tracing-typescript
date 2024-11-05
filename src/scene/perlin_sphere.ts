import { Camera } from "../camera";
import { LambertianMaterial } from "../material/material";
import { NoiseTexture } from "../material/texture";
import { HittableList } from "../object/hittable-list";
import { Sphere } from "../object/sphere";
import { Vector3 } from "../vec3";

export function scene_perlin_spheres() {
    const world = new HittableList();
    const pertext = new NoiseTexture("scene_perlin_spheres");
    world.add(new Sphere(new Vector3(0, -1000, 0), 1000, new LambertianMaterial(pertext)));
    world.add(new Sphere(new Vector3(0, 2, 0), 2, new LambertianMaterial(pertext)));

    const camera = new Camera({
        aspect_ratio: 16 / 9,
        image_width: 400,
        samples_per_pixel: 100,
        max_depth: 50,
        vfov: 20,
        lookfrom: new Vector3(13, 2, 3),
        lookat: new Vector3(0, 0, 0),
        vup: new Vector3(0, 1, 0),
        defocus_angle: 0,
    });
    return { camera, world }
}