import { Camera } from "../camera";
import { DiffuseLightMaterial, LambertianMaterial } from "../material/material";
import { create_box, HittableList, Quad, Rotate_Y, Translate } from "../object/hittable";
import { Color, Vector3 } from "../vec3";

export function scene_cornell_box() {
    const world = new HittableList();

    const red = new LambertianMaterial(new Color(0.65, 0.05, 0.05));
    const white = new LambertianMaterial(new Color(0.73, 0.73, 0.73));
    const green = new LambertianMaterial(new Color(0.12, 0.45, 0.15));

    const light = new DiffuseLightMaterial(new Color(15, 15, 15));

    [
        { Q: new Vector3(555, 0, 0), u: new Vector3(0, 555, 0), v: new Vector3(0, 0, 555), mat: green },
        { Q: new Vector3(0, 0, 0), u: new Vector3(0, 555, 0), v: new Vector3(0, 0, 555), mat: red },
        { Q: new Vector3(343, 554, 332), u: new Vector3(-130, 0, 0), v: new Vector3(0, 0, -105), mat: light },
        { Q: new Vector3(0, 0, 0), u: new Vector3(555, 0, 0), v: new Vector3(0, 0, 555), mat: white },
        { Q: new Vector3(555, 555, 555), u: new Vector3(-555, 0, 0), v: new Vector3(0, 0, -555), mat: white },
        { Q: new Vector3(0, 0, 555), u: new Vector3(555, 0, 0), v: new Vector3(0, 555, 0), mat: white },
    ].forEach(({ Q, u, v, mat }) => {
        world.add(new Quad(Q, u, v, mat));
    });

    const box1 = create_box(new Vector3(0, 0, 0), new Vector3(165, 330, 165), white);
    world.add(new Translate(new Rotate_Y(box1, 15), new Vector3(265, 0, 295)));

    const box2 = create_box(new Vector3(0, 0, 0), new Vector3(165, 165, 165), white);
    world.add(new Translate(new Rotate_Y(box2, -18), new Vector3(130, 0, 65)));

    const camera = new Camera({
        aspect_ratio: 1,
        image_width: 600,
        samples_per_pixel: 200,
        max_depth: 50,
        background: new Color(0, 0, 0),

        vfov: 40,
        lookfrom: new Vector3(278, 278, -800),
        lookat: new Vector3(278, 278, 0),
        vup: new Vector3(0, 1, 0),

        defocus_angle: 0
    });
    return { camera, world }
}