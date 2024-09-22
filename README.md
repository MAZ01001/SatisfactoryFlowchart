# Satisfactory flowchart

Simple flowchart for [Satisfactory](https://www.satisfactorygame.com/ "Open official Satisfactory website"), a game developed & published by _Coffe Stain Studios_ ([game Steam page](https://store.steampowered.com/app/526870/Satisfactory/ "Open Satisfactory Steam page")).

> [!NOTE] WIP
>
> build interactive graph/flowchart
>

- [`data.json`](#datajson)
- [`data.dot`](#datadot)
- [`gephi.svg`](#gephisvg)
- [`convert_json.js`](#convert_jsonjs)
- [Extract images](#extract-images)
- [Parsing JSON data (notes)](#parsing-json-data-notes)
- [Legacy U3 flowchart](#legacy-u3-flowchart)

---

## `data.json`

`UTF-8` JSON file with the following structure/formatting (with some example data in `en-US` language)

```JSON
{
    "Descriptions": {
        "Products": [
            ["Heavy Modular Frame","./FactoryGame/Content/FactoryGame/Resource/Parts/ModularFrameHeavy/UI/IconDesc_ModularFrameHeavy_256.png","A more robust multipurpose frame."],
            ["Ionized Fuel","./FactoryGame/Content/FactoryGame/Resource/Parts/IonizedFuel/UI/IconDesc_IonizedFuel_256.png","Fuel that has been ionized, allowing it to deliver incredible output.\nCan be used as-is to power Fuel-Powered Generators, or packaged to be used as fuel for vehicles or the Jetpack."],
            // ...
        ],
        "Manufacturers": [
            ["Constructor","./FactoryGame/Content/FactoryGame/Buildable/Factory/ConstructorMk1/UI/IconDesc_ConstructorMk1_256.png","Crafts 1 part into another part.\n\nCan be automated by feeding component parts in via a Conveyor Belt connected to the input port. The resulting parts can be automatically extracted by connecting a Conveyor Belt to the output port."],
            ["Crafting Bench","./FactoryGame/Content/FactoryGame/Buildable/Factory/WorkBench/UI/Workbench_256.png","Allows you to manually craft a wide range of different parts. \nThese parts can then be used to construct various factory buildings, vehicles, and equipment."],
            // ...
        ]
    },
    "Recipes": [
        {
            "name": "Heavy Modular Frame",
            "input": [["Screw",120],["Modular Frame",5],["Steel Pipe",20],["Encased Industrial Beam",5]],
            "output": [["Heavy Modular Frame",1]],
            "machine": ["Manufacturer","Crafting Bench"]
        },
        {
            "name": "Ionized Fuel",
            "input": [["Power Shard",1],["Rocket Fuel",16000]],
            "output": [["Compacted Coal",2],["Ionized Fuel",16000]],
            "machine": ["Refinery"]
        },
        // ...
    ]
}
```

it uses one tab indentation and except top-levels everything is sorted alphabetically by _name_ with respect to language of _DOCS.json_ file, so binary search is possible (for names)

_there are narrow-non-break-spaces (U+202F) in descriptions between value and unit pairs ie `1000-2000\u202FMW`_

Scroll [UP](#datajson "Scroll to start of section: data.json")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## `data.dot`

directed graph of recipe order

> for all recipes `A` and `B`: when `A.outputs` matches at least one product in `B.inputs`: connect `A -> B`

all recipes are connected via index (same index as `data.json`) and labeled with their name (same language as `data.json`)

first all recipes (with label) then all connections for each recipe (all outgoing connections inline)

Scroll [UP](#datadot "Scroll to start of section: data.dot")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## `gephi.svg`

a (static) graph view of `data.dot` via <https://github.com/gephi/gephi/>

Scroll [UP](#datadot "Scroll to start of section: data.dot")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## `convert_json.js`

get `node.js`: <https://github.com/nodejs/node> (easier to install `Visual Studio (Community)` and add `node.js` as dev-environment)

```shell
# generate data.json with en-US language in current directory (overrides data.json)
node convert_json.js /Satisfactory/CommunityResources/Docs/en-US.json data.json

# optionally also generate data.dot for graphing (overrides data.json and data.dot)
node convert_json.js /Satisfactory/CommunityResources/Docs/en-US.json data.json data.dot
```

the script works with any of the languages in the `/Satisfactory/CommunityResources/Docs/` folder; sorting is also language dependent

_does not calculate graph connections when `data.dot` CLI-parameter is not supplied_

Scroll [UP](#convert_jsonjs "Scroll to start of section: convert_json.js")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## Extract images

run script ([`convert_json.js`](#convert_jsonjs)) and copy regexp "FModel IMG path regexp" logged to console (yellow on black, near the end)

- get `7Zip`: <https://7-zip.org/>
- get `FModel`: <https://github.com/4sval/FModel>

1. open `/Satisfactory/FactoryGameSteam.exe` via 7zip, go to folder `.rsrc` and open `version.txt` and see `PRODUCTVERSION` for Unreal-Engine version ~ `5,3,2,0` = `5.3`
2. open FModel and follow the steps at <https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html#FModel> \[[archive](https://github.com/satisfactorymodding/Documentation/blob/13a335186fb21965055007ecc9738ee8fa392708/modules/ROOT/pages/Development/ExtractGameFiles.adoc#fmodel "(GitHub) plain text permalink of website")\] (only `FModel` section) but with the Unreal-Engine version from previous step instead
3. then in `Archives` tab (Loading Mode: Multiple) select `FactoryGame-Windows.pak` and `FactoryGame-Windows.utoc` and click on Load, it should switch to the `Folders` tab
4. then click in the folder view and hit <kbd><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd></kbd> and paste in the "FModel IMG path regexp" from before
5. select all listed files (<kbd><kbd>Ctrl</kbd>+<kbd>A</kbd></kbd>) and right-click and `safe texture (.png)`

after all have finished extracting there should be a folder `FactoryGame` inside `/FModel/Output/Exports` with all the icons;
this is the root folder with the folder structure that the `data.json` expects,
so you can copy paste that to the same directory where you have the `data.json` stored (so the relative-paths in `data.json` work)

Scroll [UP](#extract-images "Scroll to start of section: Extract images")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## Parsing JSON data (notes)

the JSON file _Coffe Stain Studios_ provides is in `UTF-16 LE + BOM`

JavaScript (node.js) as most languages use UTF-16 natively so that is not a problem but the BOM (0xFEFF) at start of file needs to be ignored so JSON can be parsed → skip first (utf-16) character (2 bytes) when loading file

(relevant) `NativeClass` names (via regexp `\.(\w+)'$`) ! not ordered in JSON file

- product-recipes:
  - `FGRecipe`
  - _under `Classes` each as `{mDisplayName, mIngredients, mProduct, mProducedIn}`_
    - __ignore all that have empty `mProducedIn`__
    - __ignore all that have `BP_BuildGun_C` or `FGBuildGun` in `mProducedIn`__
    - `mProducedIn` ~> regexp match all `"[^".]*\.(\w+)"` for manufacturer-class-name
      - __replace `BP_WorkBenchComponent_C`, `FGBuildableAutomatedWorkBench`, and `Build_AutomatedWorkBench_C` with (just one) `Build_WorkBench_C`__
      - __replace `BP_WorkshopComponent_C` with `Build_Workshop_C`__
    - `mIngredients` and `mProduct` ~> skip first and last 2 chars; split at each `),(` then regexp match `ItemClass="[^']+'[^.]+\.(\w+)'"` (product-class-name) and `Amount=([0-9]+)` (convert to number) on each entry
- product descriptions & img path:
  - `FGAmmoTypeInstantHit`
  - `FGAmmoTypeProjectile`
  - `FGAmmoTypeSpreadshot`
  - `FGConsumableDescriptor`
  - `FGEquipmentDescriptor`
  - `FGItemDescriptor`
  - `FGItemDescriptorBiomass`
  - `FGItemDescriptorNuclearFuel`
  - `FGResourceDescriptor`
  - `FGPowerShardDescriptor`
  - _under `Classes` each as `{ClassName, mDisplayName, mDescription}`_
    - replace all `\r\n` in `mDescription` with `\n`
- manufacturer descriptions:
  - `FGBuildableManufacturer`
  - `FGBuildableManufacturerVariablePower`
  - __and from `FGBuildable` only `Build_WorkBench_C` and `Build_Workshop_C`__
  - _under `Classes` each as `{ClassName, mDisplayName, mDescription}`_
- manufacturer img path:
  - `FGBuildingDescriptor`
    - __includes more than those found under "manufacturer descriptions"__
  - _under `Classes` each as `{ClassName, mDisplayName, mSmallIcon}`_
    - ignore all where `ClassName` matches regexp `Beam|Blue|[Ww]alk|Conveyor|Foundation|Generator|Jump|Miner|Pi(?:llar|pe)|Power|Roof|Sign|Storage|Train|Wall|Set_|_8x` (for most but not all redundant images)

after parsing, when resolving class names in recipes, for every `mSmallIcon` replace `_512` with `_256` then match with regexp `Texture2D /Game/([^.]*)\.` and replace entire string with `"/FactoryGame/Content/$1.png"` (where `$1` is from the regexp match) to match [extracted images](#extract-images) paths/folder structure

Scroll [UP](#parsing-json-data-notes "Scroll to start of section: Parsing JSON data (notes)")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")

## Legacy U3 flowchart

if you wich to see the old flowchart I made for the U3 (0.3) version of Satisfactory, you can find the code in the legacy branch in this repo

and a wayback-machine snapshot of the website here: <https://web.archive.org/web/20240919112412/https://maz01001.github.io/site/satisfactory_u3_flowchart>

Scroll [UP](#legacy-u3-flowchart "Scroll to start of section: Legacy U3 flowchart")
    | [TOP](#satisfactory-flowchart "Scroll to top of document: Satisfactory flowchart")
