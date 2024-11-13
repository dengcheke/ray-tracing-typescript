import { Camera } from "../camera";
import { LambertianMaterial } from "../material/material";
import { HittableList, Quad } from "../object/hittable";
import { Color, Vector3 } from "../vec3";

export function scene_quads() {
    const left_red = new LambertianMaterial(new Color(1, 0.2, 0.2));
    const back_green = new LambertianMaterial(new Color(0.2, 1.0, 0.2));
    const right_blue = new LambertianMaterial(new Color(0.2, 0.2, 1));
    const upper_orange = new LambertianMaterial(new Color(1, 0.5, 0));
    const lower_teal = new LambertianMaterial(new Color(0.2, 0.8, 0.8));

    const world = new HittableList();
    world.add(new Quad(new Vector3(-3, -2, 5), new Vector3(0, 0, -4), new Vector3(0, 4, 0), left_red));
    world.add(new Quad(new Vector3(-2, -2, 0), new Vector3(4, 0, 0), new Vector3(0, 4, 0), back_green));
    world.add(new Quad(new Vector3(3, -2, 1), new Vector3(0, 0, 4), new Vector3(0, 4, 0), right_blue));
    world.add(new Quad(new Vector3(-2, 3, 1), new Vector3(4, 0, 0), new Vector3(0, 0, 4), upper_orange));
    world.add(new Quad(new Vector3(-2, -3, 5), new Vector3(4, 0, 0), new Vector3(0, 0, -4), lower_teal));


    const camera = new Camera({
        aspect_ratio: 1,
        image_width: 400,
        samples_per_pixel: 100,
        max_depth: 50,

        vfov: 80,
        lookfrom: new Vector3(0, 0, 9),
        lookat: new Vector3(0, 0, 0),
        vup: new Vector3(0, 1, 0),

        defocus_angle: 0
    });

    return { world, camera }
}