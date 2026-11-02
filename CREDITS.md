# Asset and technology credits

This is an unofficial educational UI/UX prototype inspired by Nintendo's Wii Mii Channel. Wii, Wii U, Mii, Miitomo, and the original Mii artwork and resources belong to Nintendo. The project is not affiliated with or endorsed by Nintendo.

## Artwork and resources

- **Wii Mii Channel category icons:** Cropped and recolored from the locally supplied “Body Part Icons” PNG sheet. A matching sheet is available at [The Spriters Resource: Body Part Icons](https://www.spriters-resource.com/wii/miichannel/asset/64626/), listed as uploaded by **Mr. C**. Original game artwork: Nintendo.
- **Mii wordmark:** Extracted from the locally supplied “Channel Icon” PNG sheet. A matching sheet is available at [The Spriters Resource: Channel Icon](https://www.spriters-resource.com/wii/miichannel/asset/607367/), listed as uploaded by **ElastedAlorian**. Original game artwork: Nintendo.
- **Wii U Mii Maker eye sprites:** An eye outline and catchlight are used in the approximate fallback preview. The supplied sheet is labeled “Ripped by xAct.” See the [Wii U Menu collection on The Spriters Resource](https://www.spriters-resource.com/wii_u/systembios/). The precise sheet URL for the supplied file has not been verified. Original game artwork: Nintendo.
- **Brand-mark face texture:** Mii Channel face texture from [WM4K](https://github.com/Alan-bur/WM4K), by **Alan-bur and contributors**. Original file: `0000000100000002/USA/Channels/Mii Channel/tex1_48x56_055a5fa475504cc8_14.png`. Original Mii imagery: Nintendo. No reuse license was identified in the source repository.
- **3D Mii resource:** The live head and its feature-choice thumbnails use Nintendo's Miitomo `AFLResHigh_2_3.dat` meshes and textures. The local source notes identify a [Wayback Machine archive of the Miitomo download](https://web.archive.org/web/20180502054513/http://download-cdn.miitomo.com/native/20180125111639/android/v2/asset_model_character_mii_AFLResHigh_2_3_dat.zip), also documented by [FFL-Testing](https://github.com/ariankordi/FFL-Testing). The resource is kept under `public/ffl/` and is gitignored.
- **Interface sound effects:** Samples from the locally supplied "Sound Effects" sheet for the Mii Channel, available at [The Sounds Resource: Sound Effects](https://sounds.spriters-resource.com/wii/miichannel/asset/423107/), listed as uploaded by **imJJ**. Original sounds: Nintendo. The sheet contains `Sample_0000.wav`–`Sample_0026.wav` with no action names. This prototype uses `Sample_0014` (select), `Sample_0016` (move focus), `Sample_0015` (back/cancel), `Sample_0005` (adjust a value), and `Sample_0025` (save/confirm). The mapping is this project's choice, made from acoustic analysis, not Nintendo's verified usage. The files are kept under `public/ffl/sfx/`, are gitignored, and are removed from production builds.
- **Body reference (not included):** The handmade body in `src/mii-body.ts` was proportioned by eye from Mii Channel screenshots and a render of the Mii Channel body models in the [MiiWiki Mii Maker gallery](https://miiwiki.org/wiki/Mii_Maker/gallery), and from [Nintendo Support: Types of Mii Characters](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2465/) for the gray default trousers. No Nintendo model or image is included in this project.
- **Typeface:** [Nunito](https://github.com/googlefonts/nunito), originally designed by **Vernon Adams** and developed by the Nunito project contributors, loaded through Google Fonts. [Font license](https://github.com/google/fonts/blob/main/ofl/nunito/OFL.txt).

The original PNG filenames and additional notes are recorded in `public/assets/wii/SOURCES.txt` and the `ATTRIBUTION.txt` files under `public/assets/`.

## Rendering and software

- [FFL.js v2.2.2](https://github.com/ariankordi/FFL.js/tree/v2.2.2), by **ariankordi and contributors**, provides the JavaScript bindings and Three.js shader for the Mii preview. It builds on the [Wii U FFL decompilation](https://github.com/aboood40091/ffl) by **aboood40091 and contributors**. FFL.js is [AGPL-3.0-only](https://github.com/ariankordi/FFL.js/blob/v2.2.2/LICENSE). The preview uses the Wii U shader port and Miitomo resource, not the original Wii renderer.
- [Three.js](https://github.com/mrdoob/three.js), by the three.js authors and contributors, provides 3D rendering. [MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE).

The UI also uses React, TypeScript, and Vite; their versions are recorded in `package.json` and `package-lock.json`. The initial interface was developed in Figma Make.

## AI assistance

[ChatGPT](https://chatgpt.com/) and [Cursor](https://cursor.com/) were used to assist with code generation for this project.

Attribution identifies the material and its sources; it does not itself grant permission to redistribute third-party artwork or resources. Check the applicable permissions and software licenses when sharing or publishing the project.
