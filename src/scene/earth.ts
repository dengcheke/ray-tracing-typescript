import { Camera } from "../camera";
import { LambertianMaterial } from "../material/material";
import { ImageTexture } from "../material/texture";
import { HittableList, Sphere } from "../object/hittable";
import { resolve_image_url } from "../utils";
import { Vector3 } from "../vec3";

export function scene_earth() {
    const earth_texture = new ImageTexture(resolve_image_url("./earthmap.jpg"));
    const earth_surface = new LambertianMaterial(earth_texture);
    const globe = new Sphere(new Vector3(0, 0, 0), 2, earth_surface);

    const camera = new Camera({
        aspect_ratio: 16 / 9,
        image_width: 400,
        samples_per_pixel: 100,
        max_depth: 50,
        vfov: 20,
        lookfrom: new Vector3(0, 0, 12),
        lookat: new Vector3(0, 0, 0),
        vup: new Vector3(0, 1, 0),
        defocus_angle: 0,
    });

    return { camera, world: new HittableList(globe) }
}