import { Camera } from "../camera";
import { DiffuseLightMaterial, LambertianMaterial } from "../material/material";
import { NoiseTexture } from "../material/texture";
import { HittableList } from "../object/hittable-list";
import { Quad } from "../object/quad";
import { Sphere } from "../object/sphere";
import { Color, Vector3 } from "../vec3";

export function scene_simple_light() {
    const world = new HittableList();

    const pertext = new NoiseTexture(4);
    world.add(new Sphere(new Vector3(0, -1000, 0), 1000, new LambertianMaterial(pertext)));
    world.add(new Sphere(new Vector3(0, 2, 0), 2, new LambertianMaterial(pertext)));

    const difflight = new DiffuseLightMaterial(new Color(4, 4, 4));
    world.add(new Sphere(new Vector3(0, 7, 0), 2, difflight));
    world.add(new Quad(
        new Vector3(3, 1, -2),
        new Vector3(2, 0, 0),
        new Vector3(0, 2, 0),
        difflight
    ));

    const camera = new Camera({
        aspect_ratio: 16 / 9,
        image_width: 400,
        samples_per_pixel: 100,
        max_depth: 50,
        background: new Color(0, 0, 0),

        vfov: 20,
        lookfrom: new Vector3(26, 3, 6),
        lookat: new Vector3(0, 2, 0),
        vup: new Vector3(0, 1, 0),

        defocus_angle: 0,
    })
    return { world, camera }
}