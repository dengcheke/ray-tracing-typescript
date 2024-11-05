import { Camera } from "../camera";
import { DielectricMaterial, LambertianMaterial, MetalMaterial } from "../material/material";
import { HittableList } from "../object/hittable-list";
import { Sphere } from "../object/sphere";
import { CheckerTexture } from "../material/texture";
import { distance_between, random } from "../utils";
import { Color, Vector3 } from "../vec3";


export function scene_bouncing_shperes() {

    const world = new HittableList();

    const checker = new CheckerTexture(0.32, new Color(0.2, 0.3, 0.1), new Color(0.9, 0.9, 0.9));
    world.add(new Sphere(
        new Vector3(0, -1000, 0),
        1000,
        new LambertianMaterial(checker)
    ));

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

    return {
        camera, world
    }
}