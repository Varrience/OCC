# Online Code.org Compiler

> ## What is it?
- OCC is an online tool that allows anyone to compile an exported project from code.org and actually run it. Many of the undocumented or even regular features that work on their platform do not work when exported.

> ## Why was it made?
- For people like you obviously. the closing of public projects on code.org had accelerated the process of getting a tool ready for others to use weather your preserving the game for yourself or to share it with someone else

> ## How do I use it?
- First you must have an **original zip file** from code.org if you do not already posess a copy feel free to do that now.
Second **grab the project ID** of the project and put it into the first field. OCC needs this to make a few changes by pinging code.org's API for additional source information to fill in the blanks left behind by the exporter.
Third **load the zip file you downloaded from code.org** the program will extract it and build a new zip file for you to use.
Fourth is *optional* this is mainly if your level data or starter save data is important to you. If this is the case **navigate back to the project page and execute this code in your browsers console with either *ctrl + shift + i* or *f12***
```js
const link = location.href.match(new RegExp(`(?<=(applab|gamelab)/)[^/]+|^[^/]+(?!/)$`));
const id = link[0];
const path = `/datablock_storage/${id}/`;
const storage = { keys: {}, tables: {} };

(async function Main(type) {
    switch (type) {
        case "applab":
            await getTables();
        case "gamelab":
            await getKeyValues();
            const anchor = document.createElement("a");
            anchor.href = URL.createObjectURL(new Blob([JSON.stringify(storage)], {type: "text/json"}));
            anchor.download = `${type}_${id}_storage.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            break;
        default:
            throw "storage medium not supported";
    }
})(link[1])


async function getKeyValues() {
    try {
        storage.keys = (await (await fetch(path + "get_key_values")).json());
        for(let k in storage.keys) {
            storage.keys[k] = JSON.stringify(storage.keys[k])
        }
    } catch (err) {
        throw "unable to complete request: " + err;
    }
}

async function getTables() {
    let tableNames = (await (await fetch(path + "get_table_names")).json());
    for (let name of tableNames) {
        try {
            storage.tables[name] = (await (await fetch(path + "read_records?table_name=" + name)).json());
        } catch (err) {
            throw `unable to append table "${name}" with code: ${err}`
        }
    }
}
``` 
You must be **on the project** and **signed in**! This will not work if you do not follow these instructions exactly.
Otherwise leave it blank and press the convert button and wait
> ## How do i run it?
- For some browsers you may need to localhost the directory or use some form of CDN of your choice (you could even upload it to github and run it as a page!) once you have that set up its pretty much all set no complex server backend needed, enjoy!
> ## Who isn't this for
- If your expecting everything to run smoothly out of the box please do not use this tool, this is not a sandbox. specific variables will crash the enviroment because it is running directly on a browser window not a sandbox.
If you are expecting everything to work. things like text to speech was never fully implemented in the API so do not expect things like that to work, if you want to implement that yourself feel free to.