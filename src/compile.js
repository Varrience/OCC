import { unzip, readLocalFile, readFormFile, getAllFiles, zip } from "./fileAPI.js";
const pollyfill = `// pollyfill ES5 dependency
Object.defineProperties(Object.prototype,{apply:{value:function(fn,args){if(typeof this==="object"&&"length"in this){return Function.prototype.apply.call(this,fn,args)}},enumerable:false,configurable:true,writable:true},concat:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.concat.apply(this,arguments)}return[]},enumerable:false,configurable:true,writable:true},every:{value:function(cb,_this){if(typeof this==="object"&&"length"in this){return Array.prototype.every.call(this,cb,_this)}return false},enumerable:false,configurable:true,writable:true},indexOf:{value:function(search,fromIndex){if(typeof this==="object"&&"length"in this){return Array.prototype.indexOf.call(this,search,fromIndex)}return -1},enumerable:false,configurable:true,writable:true},filter:{value:function(cb,_this){if(typeof this==="object"&&"length"in this){return Array.prototype.filter.call(this,cb,_this)}return[]},enumerable:false,configurable:true,writable:true},forEach:{value:function(cb,_this){if(typeof this==="object"&&"length"in this){return Array.prototype.forEach.call(this,cb,_this)}},enumerable:false,configurable:true,writable:true},join:{value:function(separator){if(typeof this==="object"&&"length"in this){return Array.prototype.join.call(this,separator)}return ""},enumerable:false,configurable:true,writable:true},lastIndexOf:{value:function(search,fromIndex){if(typeof this==="object"&&"length"in this){return Array.prototype.lastIndexOf.call(this,search,fromIndex)}return -1},enumerable:false,configurable:true,writable:true},map:{value:function(cb,_this){if(typeof this==="object"&&"length"in this){const mapped=[];for(let i in this){mapped.push(cb.call(_this, this[i], Number(i)))}return mapped}},enumerable:false,configurable:true,writable:true},push:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.push.apply(this,arguments)}return 0},enumerable:false,configurable:true,writable:true},pop:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.pop.apply(this)}return undefined},enumerable:false,configurable:true,writable:true},reduce:{value:function(cb,startValue){if(typeof this==="object"&&"length"in this){return Array.prototype.reduce.call(this,cb,startValue)}throw new TypeError("Cannot call reduce on a non-array object")},enumerable:false,configurable:true,writable:true},some:{value:function(cb,_this){if(typeof this==="object"&&"length"in this){return Array.prototype.some.call(this,cb,_this)}return false},enumerable:false,configurable:true,writable:true},shift:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.shift.call(this)}return undefined},enumerable:false,configurable:true,writable:true},splice:{value:function(start,amount,...items){if(typeof this==="object"&&"length"in this){return Array.prototype.splice.call(this,start,amount,...items)}return[]},enumerable:false,configurable:true,writable:true},unshift:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.unshift.apply(this,arguments)}return 0},enumerable:false,configurable:true,writable:true},reverse:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.reverse.call(this)}return this},enumerable:false,configurable:true,writable:true},slice:{value:function(){if(typeof this==="object"&&"length"in this){return Array.prototype.slice.apply(this,arguments)}},enumerable:false,configurable:true,writable:true},sort:{value:function(cb){if(typeof this==="object"&&"length"in this){return Array.prototype.sort.call(this,cb)}return this},enumerable:false,configurable:true,writable:true}});`;
class Compiler {
    constructor(projectZip, projectId, projectJSON) {
        let self = this;
        self.projectZip = projectZip;
        self.parrent = projectZip.value.replace(/.*\\/, "").slice(0, -4) + "/" || "";
        self.projectId = projectId || "";
        self.projectJSON = projectJSON;
        let source = {};
        self.libraries = ``;
        fetch(`https://rippler.onrender.com/request?data=${encodeURIComponent(JSON.stringify({ Method: "GET", Url: `https://studio.code.org/v3/sources/${self.projectId}/main.json`, responseType: "application/json" }))}`).then(request => {
            if (request.status > 199 && request.status < 300) {
                return request.json();
            }
        }).then(async json => {
            source = JSON.parse(json.data);
            source.libraries = source.libraries || [];
            source.libraries.forEach((library) => {
                let lib = library.name;
                let src = library.source;
                let funcs = library.functions.join("|");
                let pattern = new RegExp(`(?<!\\(\\s*|(?<!\\/\\/.*|\\/\\*[^\\*\\/]*|["'][^'"]*)function\\s+[\\S]+\\s*\\(\\)\\s*{[^}]+)function\\s+(${funcs})\\s*(?=\\()`, "g");
                src = src.replace(pattern, `var $1 = this.$1 = function`);
                self.libraries += `var ${lib} = window[${JSON.stringify(lib)}] || {};
(function ${lib}() {\n${src}\nreturn(this)\n}).bind(${lib})();\n`;
            });
            self.startCompile()
        }).catch(error => {
            console.warn(`no project associated with this id ERROR: ${error}`);
            self.startCompile();
        })
    }
    cwd(filepath) { return this.parrent + filepath }
    async startCompile() {
        const buffer = await unzip(this.projectZip);
        this.folder = await getAllFiles(buffer);
        if (this.folder[this.cwd("applab/applab-api.js")]) {
            this.folder = await this.applabExport(this.folder, this.projectId);
        } else if (this.folder[this.cwd("gamelab-api.js")]) {
            this.folder = await this.gamelabExport(this.folder, this.projectId)
        } else {
            throw "Error no project to convert";
        }
        zip(this.folder, this.parrent);
    }
    async applabExport(folder, projectId) {
        folder[this.cwd("applab/applab-api.js")] = await readLocalFile("./dependencies/applab/applab/applab-api.js");
        folder[this.cwd("applab/applab.css")] = await readLocalFile("./dependencies/applab/applab/applab.css");
        try {
            folder[this.cwd("applab/database.json")] = await readFormFile(this.projectJSON);
        } catch (e) {
            console.warn(e);
            folder[this.cwd("applab/database.json")] = await readLocalFile("./dependencies/applab/database.json");
        }
        folder[this.cwd("code.js")] = pollyfill + "\n" + this.libraries + folder[this.cwd("code.js")];
        folder[this.cwd("index.html")] = folder[this.cwd("index.html")].replace(`<script src="https://code.jquery.com/jquery-1.12.1.min.js"></script>`, `<script src="https://code.jquery.com/jquery-1.12.1.min.js"></script>
<script>
// set static user
localStorage.userId = "account";
// set local keyvalue storage limit 5MB?
localStorage.datablock = JSON.stringify({tables: {}, keys: {}});
// init config for applab-api.js
window.EXPORT_OPTIONS = {channel: "${projectId}", useDatablockStorage: true};
function setExportConfig(config) {window.EXPORT_OPTIONS = Object.assign(config, EXPORT_OPTIONS)}
// whats called after applab-api has finished initalizing
function inject() {
// pollyfill synchronous db calls
;(function(){const api=Applab.storage;let rv=null;const handleSuccess=function(v){rv=v,typeof this==="function"&&this(v)};const handleError=function(e){rv=e,(typeof this==="function"?this:console.warn)(e)};Object.defineProperties(window,{setKeyValueSync:{value:function(k,v,c,e){t=handleSuccess.bind(c);r=handleError.bind(e);try{api.setKeyValue(k,v,t,r);return rv}catch(e){r(e)}},writable:false},getKeyValueSync:{value:function(k,c,e){t=handleSuccess.bind(c);r=handleError.bind(e);try{api.getKeyValue(k,t,r);return rv}catch(e){r(e)}},writable:false},getColumn:{value:function(t,c,y,n){x=handleSuccess.bind(y);z=handleError.bind(n);try{if(typeof t!=="string"||typeof c!=="string"){throw "invalad param(s): table or column is not a string"}var table=JSON.parse(localStorage.getItem('datablock')).tables[t];var column=[];for(var i=0;i<table.records.length;i+=1){var record=table.records[i];column.push(record[c]!==undefined?record[c]:null)}x(column);return rv}catch(e){z(e)}},writable:false},createRecordSync:{value:function(t,r,y,n){x=handleSuccess.bind(y);z=handleError.bind(n);try{if(typeof t!=="string"||typeof r!=="object"||r===null){throw "invalid param(s): table <string> or record <object> is an invalid type"}var db=JSON.parse(localStorage.datablock);r=typeof r==="string"?JSON.parse(r):r;if(db.tables[t]===undefined){db.tables[t]={records:[],nextId:1}}r.id=db.tables[t].nextId++;db.tables[t].records.push(r);localStorage.datablock=JSON.stringify(db);x(true);return rv}catch(e){z(e)}},writable:false},readRecordsSync:{value:function(t,y,n){x=handleSuccess.bind(y);z=handleError.bind(n);try{if(typeof t!=="string"){throw "invalid param: table <string> is invalid"}var table=JSON.parse(localStorage.getItem('datablock')).tables[t];x(table.records);return rv}catch(e){z(e)}},writtable:false},updateRecordSync:{value:function(t,r,y,n){x=handleSuccess.bind(y);z=handleError.bind(n);try{if(typeof t!=="string"||typeof r!=="object"||r===null){throw "invalid param(s): table <string>, record <object>"}if(typeof r.id!=="number"&&r.id>-1&&r.id<Infinity){throw "invalid record entry id"}var db=JSON.parse(localStorage.datablock);var table=db.tables[t];r=typeof r==="string"?JSON.parse(r):r;var index=table.records.findIndex(function(o){return o.id===r.id});if(index>-1){table.records[index]=r;localStorage.datablock=JSON.stringify(db);if(typeof onSuccess==="function"){onSuccess(table.records)}}else{throw \`error \${ t } has no such entry\`}x(true);return rv}catch(e){z(e)}},writable:false},deleteRecordSync:{value:function(t,r,y,n){x=handleSuccess.bind(y);z=handleError.bind(n);try{if(typeof t!=="string"||typeof r!=="object"||r===null){throw "invalid param(s): table <string>, record <object>"}if(typeof r.id!=="number"&&r.id>-1&&r.id<Infinity){throw "invalid record entry id"}var db=JSON.parse(localStorage.datablock);var table=db.tables[t];var index=table.records.findIndex(function(o){return o.id===r.id});if(table===undefined||index<0){throw \`failed to remove record on table "\${ t }" at id "\${ r }"\`}table.records.splice(index,1);localStorage.datablock=JSON.stringify(db);x(true);return rv}catch(e){z(e)}},writable:false}})})();
// add autoscaler
;(function(){let element=document.getElementById("divApplab");let width="320px";let height="450px";let scaling;function rescale(){scaling="scale("+(window.innerHeight/450)+")";if(element.style.width===width&&element.style.height===height){element.style["transform"]=scaling}}rescale();window.onresize=rescale;element.style["transform-origin"]="top left";const observer=new MutationObserver((mutations,observe)=>{for(let mutation of mutations){let targetStyle=mutation.target.style;if(mutation.attributeName==="style"){if((targetStyle.width!==width||targetStyle.height!==height)&&targetStyle.transform!==""){targetStyle.transform=""}else if(targetStyle.width===width&&targetStyle.height===height){if(targetStyle.transform===""){targetStyle.width=width;targetStyle.height=height;targetStyle.transform=scaling}}}}});observer.observe(element,{attributes:true})})();
// prime the icon canvas
setProperty("BBA1E1582A51E627F185162F66A03477", "image", "icon://fa-search");
setTimeout(function(){document.body.querySelector("#BBA1E1582A51E627F185162F66A03477").remove()}, 3e3);
// fetch the db save file & start userspace code
fetch("applab/database.json")
.then(res => res.json()).then(json => {
if(typeof json?.keys === "object" && json?.keys !== null && typeof json?.tables === "object" && json?.tables !== null) {
  localStorage.datablock = JSON.stringify(json);
  let script = document.createElement("script");
  script.src = "code.js";
  document.head.appendChild(script);
}
});
}
</script>`).replace(/(<div id="divApplab" class="appModern running"[^\>]+\>)/, `$1
<button id="BBA1E1582A51E627F185162F66A03477" style="display: none; position: fixed"></button>`).replace(/\<script\>\s*function\s*setExportConfig\(config\)\s*\{\s*window.EXPORT_OPTIONS = config;\s*\}\s*\<\/script\>/, "");
        return folder;
    }
    async gamelabExport(folder, projectId) {
        folder[this.cwd("gamelab-api.js")] = await readLocalFile("./dependencies/gamelab/gamelab-api.js");
        folder[this.cwd("p5.js")] = await readLocalFile("./dependencies/gamelab/p5.js");
        folder[this.cwd("p5.play.js")] = await readLocalFile("./dependencies/gamelab/p5.play.js");
        folder[this.cwd("gamelab.css")] = await readLocalFile("./dependencies/gamelab/gamelab.css");
        try {
            folder[this.cwd("database.json")] = await readFormFile(this.projectJSON);
        } catch (e) {
            console.warn(e);
            folder[this.cwd("database.json")] = await readLocalFile("./dependencies/gamelab/database.json");
        }
        folder[this.cwd("code.js")] = pollyfill + folder[this.cwd("code.js")].replace(/(var\s*p5Inst\s*=\s*new\s*p5\(null,\s*'sketch'\);)/, `$1
// add p5Inst enties override
for(entry of["_fillSet","_doFill","_doStroke","_strokeSet","focused","_targetFrameRate","windowWidth","windowHeight","_curElement","canvas","width","height","_textLeading","_textSize","_textStyle","_textAscent","_textDescent","imageData","pixels","pAccelerationX","pAccelerationY","pAccelerationZ","pRotationX","pRotationY","pRotationZ","rotationX","rotationY","rotationZ","deviceOrientation","turnAxis","isKeyPressed","keyIsPressed","keyCode","key","_lastKeyCodeTyped","mouseX","mouseY","winMouseX","winMouseY","_hasMouseInteracted","pmouseX","pmouseY","pwinMouseX","pwinMouseY","mouseButton","isMousePressed","mouseIsPressed","touches","touchX","touchY","winTouchX","winTouchY","_hasTouchInteracted","ptouchX","ptouchY","pwinTouchX","pwinTouchY","touchIsDown","_textFont","tex","isTexture"]){(function setRegistry(entry,tpoint){Object.defineProperty(window,entry,{set:function(e){if(p5Inst[entry+"_modify"]!=="_EXCEPTION_: _OVERWRITTEN_"){setTimeout(()=>{if(p5Inst[entry]!==window[entry]){p5Inst[entry+"_modify"]="_EXCEPTION_: _OVERWRITTEN_"}},1)}return tpoint=e},get:function(){return tpoint},enumerable:true,configurable:true})})(entry,p5Inst[entry])}`).replace(/(initMobileControls\(p5Inst\))/, `p5Inst._startTime=Date.now();p5Inst.frameCount=0;
$1

// scaler
;(function(){const element=document.getElementById("sketch");function rescale(){element.style["transform"]="scale("+(Math.min(window.innerWidth,window.innerHeight)/400)+")"}rescale();window.onresize=rescale;element.style["transform-origin"]="top left"})();`).replace(/(?<=\/\/ -----\s\s)(.+)(?=\s+\/\/ -----)/s, source => `let script = document.createElement("script");
script.textContent = ${JSON.stringify(this.libraries + source).replace(/</g, "\\u003c")};`)
.replace(/try\s*{\s*window.draw\s*=\s*draw;\s*}\s*catch\s*\(e\)\s*{}\s*switch\s*\(stage\)\s*{\s*case 'preload':\s*if \(preload !== window.preload\) { preload\(\); }\s*break;\s*case 'setup':\s*if\s*\(setup\s*!==\s*window.setup\)\s*{\s*setup\(\);\s*}\s*break;\s*}/, `fetch("database.json").then(res => res.json()).then(json => {
    if (typeof json?.keys === "object" && json?.keys !== null) {
      localStorage.datablock = JSON.stringify(json);
    }
    const oldPreload = window.preload;
    const oldSetup = window.setup;
    document.head.appendChild(script);
    try { window.draw = draw; } catch (e) {}
    if (preload !== oldPreload) { preload(); }
    if (setup !== oldSetup) { setup(); }
});`);
        folder[this.cwd("index.html")] = folder[this.cwd("index.html")].replace(/(\<script\s*src="code\.js"\s*\>\s*<\/script\>)/, `<script>
// set static user
localStorage.userId = "account";
// set local keyvalue storage limit 5MB?
localStorage.datablock = JSON.stringify({keys: {}});
// init config for gamelab-api.js
window._FCONFIG_ = { channel: "${projectId}", useDatablockStorage: true};
function setExportConfig(config) { _FCONFIG_ = Object.assign(_FCONFIG_, config) }
_FCONFIG_.url = (function(){var url="https://studio.code.org/projects/gamelab/${projectId}";var params=location.search;if(params.startsWith("?u=")){params=params.slice(3)}var re=/[?&]([^&=]+)(?:[&=])([^&=]+)/gim;var m;while((m=re.exec(params))!=null){if(m.index===re.lastIndex){re.lastIndex+=1}url+=m[0]}return url})();
_FCONFIG_.pathname = "projects/gamelab/${projectId}";
</script>
<script src="gamelab-api.js"></script>
$1
<script src="https://studio.code.org/projects/gamelab/\${id}/export_config?script_call=setExportConfig"></script>`).replace(/\<script\s*src="gamelab-api\.js"\>\<\/script\>/, "");
        return folder;
    }
}

export default Compiler;
