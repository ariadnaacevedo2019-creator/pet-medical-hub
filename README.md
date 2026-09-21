# Pet Medical Hub

MVP del expediente médico digital para mascotas. Centraliza datos generales, consultas, tratamientos y documentos para que el tutor pueda llegar mejor preparado a cualquier consulta veterinaria.

## Funciones incluidas

- Alta y cambio entre mascotas.
- Resumen clínico con antecedentes, peso y consultas.
- Registro y eliminación de consultas.
- Archivo local de recetas, laboratorios, radiografías, vacunas y otros documentos (hasta 12 MB por archivo).
- Búsqueda transversal por diagnóstico, veterinario o documento.
- Resumen clínico para compartir.
- Persistencia local, experiencia móvil e instalación como PWA.

## Uso local

No requiere compilación ni dependencias. Sirve el directorio con cualquier servidor HTTP, por ejemplo:

```bash
python3 -m http.server 4173
```

Luego abre `http://localhost:4173`.

## Privacidad y alcance

Los datos y archivos permanecen en el almacenamiento local del navegador y no se suben a la nube. No ofrece diagnósticos ni reemplaza la valoración de un profesional veterinario.

## Publicación

El repositorio incluye un sitio estático compatible con GitHub Pages.
