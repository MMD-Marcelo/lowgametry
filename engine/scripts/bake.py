# bake.py - Blender headless: fotogrametria normal ou low poly estilizado.
# Uso: blender --background --python bake.py -- --entrada malha.obj --saida out.glb --modo lowpoly --faces 800 --res 256 --filtro nearest --paleta 32 --flat --dither --crunchy-uv --simple-material
import argparse
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--entrada", required=True)
ap.add_argument("--saida", required=True)
ap.add_argument("--saida-obj")
ap.add_argument("--modo", default="lowpoly")
ap.add_argument("--faces", type=int, default=800)
ap.add_argument("--res", type=int, default=256)
ap.add_argument("--filtro", choices=["nearest", "linear"], default="nearest")
ap.add_argument("--paleta", type=int, default=32)
ap.add_argument("--normal", action="store_true")
ap.add_argument("--flat", action="store_true")
ap.add_argument("--dither", action="store_true")
ap.add_argument("--crunchy-uv", action="store_true")
ap.add_argument("--simple-material", action="store_true")
a = ap.parse_args(argv)

# cena limpa
bpy.ops.wm.read_factory_settings(use_empty=True)

# importa a malha densa texturizada (OpenMVS exporta .obj + textura); caminho absoluto
bpy.ops.wm.obj_import(filepath=a.entrada)
denso = bpy.context.selected_objects[0]

# duplica e faz retopo em quads (QuadriFlow) no alvo de faces
bpy.ops.object.select_all(action="DESELECT")
denso.select_set(True)
bpy.context.view_layer.objects.active = denso
bpy.ops.object.duplicate()
low = bpy.context.active_object
bpy.ops.object.quadriflow_remesh(target_faces=a.faces)

if a.flat:
    for poly in low.data.polygons:
        poly.use_smooth = False
else:
    for poly in low.data.polygons:
        poly.use_smooth = True

# UV do low-poly. Margem baixa deixa o atlas mais compacto/crunchy no modo low poly.
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.005 if a.crunchy_uv else 0.03)
bpy.ops.object.mode_set(mode="OBJECT")

# material do low-poly com as imagens de destino do bake
mat = bpy.data.materials.new("lg_baked")
mat.use_nodes = True
low.data.materials.clear()
low.data.materials.append(mat)
nodes = mat.node_tree.nodes
links = mat.node_tree.links

img_alb = bpy.data.images.new("albedo", a.res, a.res)
img_nrm = bpy.data.images.new("normal", a.res, a.res, float_buffer=True)
img_nrm.colorspace_settings.name = "Non-Color"


def tex_node(image):
    n = nodes.new("ShaderNodeTexImage")
    n.image = image
    n.interpolation = "Closest" if a.filtro == "nearest" else "Linear"
    nodes.active = n
    return n


scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 4
bake_cfg = scene.render.bake
bake_cfg.use_selected_to_active = True
bake_cfg.cage_extrusion = 0.05
bake_cfg.margin = 2 if a.crunchy_uv else 8


def bake(tipo, image, **extra):
    tex_node(image)
    bpy.ops.object.select_all(action="DESELECT")
    denso.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type=tipo, **extra)


# albedo: so a cor (sem iluminacao, senao sai preto por nao haver luzes)
bake("DIFFUSE", img_alb, pass_filter={"COLOR"})
if a.normal:
    bake("NORMAL", img_nrm)


def quantize_channel(v, levels):
    if levels <= 1:
        return v
    return round(v * (levels - 1)) / (levels - 1)


def quantize_image(image, colors, dither):
    if colors <= 0:
        return
    levels = max(2, round(colors ** (1.0 / 3.0)))
    width, height = image.size
    pixels = list(image.pixels[:])
    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 4
            threshold = 0.0
            if dither:
                threshold = (((x & 1) ^ (y & 1)) - 0.5) / max(8, levels * 2)
            for c in range(3):
                pixels[i + c] = max(0.0, min(1.0, quantize_channel(pixels[i + c] + threshold, levels)))
    image.pixels.foreach_set(pixels)
    image.update()


quantize_image(img_alb, a.paleta, a.dither)

# monta o material final: albedo -> Base Color, normal -> Normal Map opcional
bsdf = nodes.get("Principled BSDF")
alb = tex_node(img_alb)
links.new(bsdf.inputs["Base Color"], alb.outputs["Color"])
if a.simple_material:
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 1
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0
if a.normal:
    nt = tex_node(img_nrm)
    nmap = nodes.new("ShaderNodeNormalMap")
    links.new(nmap.inputs["Color"], nt.outputs["Color"])
    links.new(bsdf.inputs["Normal"], nmap.outputs["Normal"])

# exporta so o low-poly como glb (texturas embutidas)
bpy.ops.object.select_all(action="DESELECT")
low.select_set(True)
bpy.ops.export_scene.gltf(filepath=a.saida, use_selection=True, export_format="GLB")

# exporta tambem .obj + .mtl + texturas soltas (o glb embute, o obj precisa dos png ao lado)
if a.saida_obj:
    destino = os.path.dirname(os.path.abspath(a.saida_obj))
    base = os.path.splitext(os.path.basename(a.saida_obj))[0]

    def salvar(image, sufixo):
        image.filepath_raw = os.path.join(destino, base + sufixo + ".png")
        image.file_format = "PNG"
        image.save()

    salvar(img_alb, "_albedo")
    if a.normal:
        salvar(img_nrm, "_normal")
    # AUTO deixa o .mtl apontando pros png que acabaram de ser gravados ao lado
    bpy.ops.wm.obj_export(filepath=a.saida_obj, export_selected_objects=True, path_mode="AUTO")

print("bake concluido 100%")
