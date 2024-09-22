//@ts-check
"use strict";

const start=performance.now();

if(process.argv.length<4){
    console.error("[ERROR] expected CLI parameters: INPUT.json OUTPUT.json [OUTPUT.dot]");
    process.exit(1);
}

const fs=require("node:fs");
const path=require("node:path");

const FileIn=path.resolve(process.argv[2]);//~ .../Satisfactory/CommunityResources/Docs/en-US.json
const FileOut=path.resolve(process.argv[3]);//~ data.json
const FileDot=process.argv.length<5?null:path.resolve(process.argv[4]);//~ data.dot

if(path.extname(FileIn)!==".json"){
    console.error("[ERROR] input file must have the JSON file-extension!");
    process.exit(2);
}
if(path.extname(FileOut)!==".json"){
    console.error("[ERROR] output file must have the JSON file-extension!");
    process.exit(3);
}
if(FileDot!=null&&path.extname(FileDot)!==".dot"){
    console.error("[ERROR] 2nd output file (if provided) must have the DOT file-extension!");
    process.exit(4);
}

const Locale=path.basename(FileIn,".json");
const strCom=Intl.Collator(Locale).compare;

const
    /**@type {Map<string,string>} Product: `ClassName` → `mDisplayName`*/
    ResolveProduct=new Map(),
    /**@type {Map<string,string>} Manufacturer: `ClassName` → `mDisplayName`*/
    ResolveManufacturer=new Map(),
    /**@type {Map<string,string>} (unprocessed) `ClassName` → `mSmallIcon`*/
    IMGraw=new Map(),
    /**@type {[string,string,string][]} `[NAME, IMG, DESCRIPTION]`*/
    ProductDesc=[],
    /**@type {[string,string,string][]} `[NAME, IMG, DESCRIPTION]`*/
    ManufacturerDesc=[],
    /**
     * @type {{name:string,input:[string,number][],output:[string,number][],machine:string[]}[]} list of recipes with the following structure each:
     * | key     | value                                                               |
     * |:------- |:------------------------------------------------------------------- |
     * | name    | recipe name; alternate recipes start with `Alternate: `             |
     * | input   | `[[PRODUCT_NAME, AMOUNT], ...]` (alphabetical order) ! can be empty |
     * | output  | `[[PRODUCT_NAME, AMOUNT], ...]` (alphabetical order)                |
     * | machine | `[MANUFACTURER_NAME]` (may include crafting bench/equipment shop)   |
     */
    Recipes=[];

//#region parse JSON file
let timeStart=performance.now();
for(const{NativeClass,Classes}of JSON.parse((()=>{
    try{return fs.readFileSync(FileIn,"utf-16le");}
    catch(e){
        if(e?.code==="ENOENT")console.error("[ERROR] input file could not be found!");
        else console.error(e?.message??e);
        process.exit(5);
    }
})().substring(1))){//! ignore BOM (0xFEFF) at start of file so JSON can be parsed
    const NC=NativeClass.match(/^[^']*'[^.]*\.FG(\w+)'$/)[1];
    if(/^(?:AmmoType(?:InstantHit|Projectile|Spreadshot)|(?:Consumable|Equipment|Resource|PowerShard)Descriptor|ItemDescriptor(?:Biomass|NuclearFuel)?)$/.test(NC))
        for(const{ClassName,mDisplayName,mDescription,mSmallIcon}of Classes){
            ResolveProduct.set(ClassName,mDisplayName);
            IMGraw.set(ClassName,mSmallIcon);
            ProductDesc.push([mDisplayName,"",mDescription.replaceAll("\r\n","\n")]);
        }
    else if(/^BuildableManufacturer(?:VariablePower)?$/.test(NC))
        for(const{ClassName,mDisplayName,mDescription}of Classes){
            ResolveManufacturer.set(ClassName,mDisplayName);
            ManufacturerDesc.push([mDisplayName,"",mDescription.replaceAll("\r\n","\n")]);
        }
    else if(NC==="Buildable")
        for(const{ClassName,mDisplayName,mDescription}of Classes){
            if(!/^Build_Work(?:Bench|shop)_C$/.test(ClassName))continue;
            ResolveManufacturer.set(ClassName,mDisplayName);
            ManufacturerDesc.push([mDisplayName,"",mDescription.replaceAll("\r\n","\n")]);
        }
    else if(NC==="BuildingDescriptor")
        for(const{ClassName,mSmallIcon}of Classes){
            //~ skip most of the redundant images
            if(/Beam|Blue|[Ww]alk|Conveyor|Foundation|Generator|Jump|Miner|Pi(?:llar|pe)|Power|Roof|Sign|Storage|Train|Wall|Set_|_8x/.test(ClassName))continue;
            IMGraw.set(ClassName,mSmallIcon);
        }
    else if(NC==="Recipe")
        outer:for(const{mDisplayName,mIngredients,mProduct,mProducedIn}of Classes){
            const machine=[];
            let craft=false,
                equip=false;
            if(mProducedIn==="")continue;//~ skip some broken (building) recipes
            for(const[,m]of mProducedIn.matchAll(/"[^".]*\.(\w+)"/g))switch(m){
                case"BP_BuildGun_C":
                case"FGBuildGun":
                    //~ skip building recipes like walls
                    continue outer;
                case"BP_WorkBenchComponent_C":
                case"Build_AutomatedWorkBench_C":
                case"FGBuildableAutomatedWorkBench":
                    craft=true;
                    break;
                case"BP_WorkshopComponent_C":
                    equip=true;
                    break;
                default:
                    machine.push(m);
            }
            if(craft)machine.push("Build_WorkBench_C");
            if(equip)machine.push("Build_Workshop_C");
            Recipes.push({
                name:mDisplayName,
                input:mIngredients===""?[]:mIngredients
                    .substring(2,mIngredients.length-2)
                    .split("),(")
                    .map(v=>[v.match(/ItemClass="[^']+'[^.]+\.(\w+)'"/)[1],Number(v.match(/Amount=([0-9]+)/)[1])])
                    .sort((a,b)=>strCom(a[0],b[0])),
                output:mProduct
                    .substring(2,mProduct.length-2)
                    .split("),(")
                    .map(v=>[v.match(/ItemClass="[^']+'[^.]+\.(\w+)'"/)[1],Number(v.match(/Amount=([0-9]+)/)[1])])
                    .sort((a,b)=>strCom(a[0],b[0])),
                machine
            });
        }
}
console.info(">> input JSON file read and parsed in %s ms",(performance.now()-timeStart).toFixed(4));
//#endregion

//#region resolve names
timeStart=performance.now();
for(const{input,output,machine}of Recipes){
    for(let i=0;i<input.length;++i)input[i][0]=ResolveProduct.get(input[i][0])??input[i][0];
    for(let i=0;i<output.length;++i)output[i][0]=ResolveProduct.get(output[i][0])??output[i][0];
    for(let i=0;i<machine.length;++i)machine[i]=ResolveManufacturer.get(machine[i])??machine[i];
}
console.info(">> class names resolved in %s ms",(performance.now()-timeStart).toFixed(4));
//#endregion

//#region string sort lists
timeStart=performance.now();
ManufacturerDesc.sort((a,b)=>strCom(a[0],b[0]));
ProductDesc.sort((a,b)=>strCom(a[0],b[0]));
Recipes.sort((a,b)=>strCom(a.name,b.name));
console.info(">> lists sorted in %s ms",(performance.now()-timeStart).toFixed(4));
//#endregion

//MARK: def BS
/**@type {<T extends{[K in P]:V},P extends PropertyKey,V extends string>(a:T[],k:P,v:V)=>T|null} Binary Search {@linkcode strCom} `a[k]===v` → `a[k]`*/
const BS=(a,k,v)=>{
    for(let l=0,r=a.length-1,i=Math.trunc((r-l)*.5);l<=r;i=Math.trunc(l+(r-l)*.5))
        switch(strCom(a[i][k],v)){
            case-1:l=i+1;break;
            case 1:r=i-1;break;
            case 0:return a[i];
        }
    return null;
};

let imgCount=0;

//#region resolve img path
timeStart=performance.now();
for(const[cname,name]of ResolveManufacturer.entries()){
    //~ `Build_WorkBench_C` → `Desc_WorkBench_C`
    const dname="Desc"+cname.substring(5);
    const img=IMGraw.get(dname);
    if(img==null)console.warn("! missing img for manufacturer:",name);
    else(++imgCount,BS(ManufacturerDesc,0,name)[1]=`./FactoryGame/Content/${img.replace("_512","_256").match(/Texture2D \/Game\/([^.]*)\./)[1]}.png`);
    IMGraw.delete(dname);
}
for(const[cname,name]of ResolveProduct.entries()){
    const img=IMGraw.get(cname);
    if(img==null)console.warn("! missing img for product:",name);
    else(++imgCount,BS(ProductDesc,0,name)[1]=`./FactoryGame/Content/${img.replace("_512","_256").match(/Texture2D \/Game\/([^.]*)\./)[1]}.png`);
    IMGraw.delete(cname);
}
console.info(">> img paths resolved in %s ms",(performance.now()-timeStart).toFixed(4));
//#endregion

//MARK: log stats + regexp
console.table({
    Recipes:Recipes.length,
    Products:ProductDesc.length,
    Manufacturers:ManufacturerDesc.length,
    "Resolved images":imgCount,
    "Redundant images":IMGraw.size
});
console.assert(ProductDesc.length+ManufacturerDesc.length===imgCount,"missing images");
console.log(`FModel IMG path regexp: \x1b[38;2;255;255;0;48;2;0;0;0mFactoryGame/Content/FactoryGame/(Resource/|Buildable/Factory/(${[...ResolveManufacturer.keys()].map(v=>v.substring(6,v.length-2)).join("|")})/).*_256\x1b[0m`);

//#region write JSON file
timeStart=performance.now();
const data=`{
\t"Descriptions": {
\t\t"Products": [
\t\t\t${ProductDesc.map(v=>JSON.stringify(v)).join(",\n\t\t\t")}
\t\t],
\t\t"Manufacturers": [
\t\t\t${ManufacturerDesc.map(v=>JSON.stringify(v)).join(",\n\t\t\t")}
\t\t]
\t},
\t"Recipes": [
\t\t${Recipes.map(r=>`{
\t\t\t"name": ${JSON.stringify(r.name)},
\t\t\t"input": ${JSON.stringify(r.input)},
\t\t\t"output": ${JSON.stringify(r.output)},
\t\t\t"machine": ${JSON.stringify(r.machine)}
\t\t}`).join(",\n\t\t")}
\t]
}\n`;
try{fs.writeFileSync(FileOut,data,{encoding:"utf-8"});}
catch(e){
    console.error(e?.message??e);
    process.exit(6);
}
console.info(">> output JSON file constructed and written in %s ms",(performance.now()-timeStart).toFixed(4));
//#endregion

// console.log("Example recipe \x1b[35mDesc_IonizedFuel_C\x1b[0m:");
// console.table(BS(Recipes,"name",ResolveProduct.get("Desc_IonizedFuel_C")));
// console.table(BS(ProductDesc,0,ResolveProduct.get("Desc_IonizedFuel_C")));

// console.log("Example recipe \x1b[35mDesc_ModularFrameHeavy_C\x1b[0m:");
// console.table(BS(Recipes,"name",ResolveProduct.get("Desc_ModularFrameHeavy_C")));
// console.table(BS(ProductDesc,0,ResolveProduct.get("Desc_ModularFrameHeavy_C")));

//#region write DOT file
if(FileDot!=null){
    timeStart=performance.now();
    let dotEl="",
        dotRl="";
    const next=new Set();
    for(let i=0;i<Recipes.length;++i){
        dotEl+=`\n\t${i} [label="${Recipes[i].name}"]`;
        next.clear();
        for(let j=0;j<Recipes.length;++j)
            if(Recipes[i].output.some(v=>Recipes[j].input.some(w=>v[0]===w[0])))next.add(j);
        if(next.size>0)dotRl+=`\n\t${i} -> ${[...next.values()].join(", ")}`;
    }
    try{fs.writeFileSync(FileDot,`digraph Recipes {${dotEl}\n${dotRl}\n}\n`,{encoding:"utf-8"});}
    catch(e){
        console.error(e?.message??e);
        process.exit(7);
    }
    console.log(">> output DOT file constructed and written in %s ms",(performance.now()-timeStart).toFixed(4));
}
//#endregion

console.info(">> total %s ms",(performance.now()-start).toFixed(4));
console.log("--success--");
