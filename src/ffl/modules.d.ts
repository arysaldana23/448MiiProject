declare module "ffl.js/ffl-emscripten.cjs" {
  import type { Module } from "ffl.js"

  const ModuleFFL: (options?: {
    locateFile?: (path: string) => string
  }) => Promise<Module>
  export default ModuleFFL
}

declare module "ffl.js/materials/FFLShaderMaterial.js" {
  import { ShaderMaterial, ShaderMaterialParameters } from "three"

  export default class FFLShaderMaterial extends ShaderMaterial {
    constructor(parameters?: ShaderMaterialParameters)
  }
}
